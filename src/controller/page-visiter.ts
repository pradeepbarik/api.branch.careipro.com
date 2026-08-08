import { Request, Response } from "express";
import Joi, { ValidationResult } from "joi";
import { parameterMissingResponse, successResponse, unauthorizedResponse } from "../services/response";
import siteVisiterLogModel from "../mongo-schema/coll_site_visiter_logs";
const reqSchema = {
    getPageVisitReport: Joi.object({
        page_name: Joi.string().allow(''),
        report_type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').required(),
        doctor_id: Joi.number().allow(''),
        clinic_id: Joi.number().allow(''),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    }),
    getPageVisiters: Joi.object({
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
        page_name: Joi.string().allow('')
    }),
    getSiteTrafficDashboard: Joi.object({
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    }),
    getClinicTraffic: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().allow(''),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    })
}
const pageVisiterController = {
    getPageVisitReport: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getPageVisitReport.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let matchParams={};
        if(query.page_name){
            matchParams={...matchParams, page_name:query.page_name}
        }
        if(query.clinic_id){
            matchParams={...matchParams, clinic_id:parseInt(query.clinic_id)}
        }
        if(query.doctor_id){
            matchParams={...matchParams, doctor_id:parseInt(query.doctor_id)}
        }
        let groupId:any={};
        if (query.report_type === 'DAILY') {
            groupId = {
                year: { $year: "$visit_time" },
                month: { $month: "$visit_time" },
                day: { $dayOfMonth: "$visit_time" }
            };
        } else if (query.report_type === 'WEEKLY') {
            groupId = {
                year: { $year: "$visit_time" },
                week: { $week: "$visit_time" }
            };
        } else if (query.report_type === 'MONTHLY') {
            groupId = {
                year: { $year: "$visit_time" },
                month: { $month: "$visit_time" }
            };
        }
        await siteVisiterLogModel.aggregate([
            {
                $match: {
                    visit_time: {
                        $gte: new Date(query.from_date + " 00:00:00"),
                        $lte: new Date(query.to_date + " 23:59:59")
                    },
                    city: tokenInfo.bd.toLowerCase(),
                    // keep bots out so these charts agree with the traffic dashboard
                    device: { $ne: "bot" },
                    ...matchParams
                }
            },
            {
                $group: {
                    // one document is one visitor per page per day, and repeat
                    // views of the same page increment visit_count on it
                    _id: groupId,
                    visit_count: { $sum: "$visit_count" },
                    unique_visiters: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: "$_id",
                    visit_count: 1,
                    unique_visiters: 1
                }
            }
        ]).then((rows) => {
            res.json(successResponse(rows, "success"));
        }).catch((error) => {
            console.error("Error fetching page visit report:", error);
            res.status(500).json({ message: "Internal server error" });
        });

    },
    /**
     * Everything the traffic dashboard renders, in one pass over the matched
     * documents via $facet. Aggregates only - no visitor rows.
     *
     * A document is one visitor on one page for one day; repeat views of that
     * page increment visit_count. So page views sum visit_count, while unique
     * visitors count distinct identities across the whole range.
     */
    getSiteTrafficDashboard: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getSiteTrafficDashboard.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        // older documents predate the visit_count field, treat them as a single view
        const pageViews = { $sum: { $ifNull: ["$visit_count", 1] } };
        const byViewsDesc: any = { $sort: { page_views: -1 } };
        try {
            const [result] = await siteVisiterLogModel.aggregate([
                {
                    $match: {
                        visit_time: {
                            $gte: new Date(query.from_date + " 00:00:00"),
                            $lte: new Date(query.to_date + " 23:59:59")
                        },
                        city: tokenInfo.bd.toLowerCase(),
                        device: { $ne: "bot" }
                    }
                },
                {
                    $addFields: {
                        // logged in visitors carry user_id, guests carry guid
                        visiter_key: {
                            $cond: [
                                { $gt: ["$user_id", 0] },
                                { $concat: ["u", { $toString: "$user_id" }] },
                                { $concat: ["g", { $toString: "$guid" }] }
                            ]
                        }
                    }
                },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, page_views: pageViews, visiters: { $addToSet: "$visiter_key" } } },
                            { $project: { _id: 0, page_views: 1, unique_visiters: { $size: "$visiters" } } }
                        ],
                        day_wise: [
                            {
                                $group: {
                                    _id: { year: { $year: "$visit_time" }, month: { $month: "$visit_time" }, day: { $dayOfMonth: "$visit_time" } },
                                    page_views: pageViews,
                                    unique_visiters: { $sum: 1 }
                                }
                            },
                            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
                            { $project: { _id: 0, period: "$_id", page_views: 1, unique_visiters: 1 } }
                        ],
                        top_pages: [
                            { $group: { _id: "$page_name", page_views: pageViews, unique_visiters: { $sum: 1 } } },
                            byViewsDesc,
                            { $limit: 15 },
                            { $project: { _id: 0, page_name: "$_id", page_views: 1, unique_visiters: 1 } }
                        ],
                        device_split: [
                            { $group: { _id: { $ifNull: ["$device", ""] }, page_views: pageViews } },
                            byViewsDesc,
                            { $project: { _id: 0, label: "$_id", page_views: 1 } }
                        ],
                        browser_split: [
                            { $group: { _id: { $ifNull: ["$browser", ""] }, page_views: pageViews } },
                            byViewsDesc,
                            { $project: { _id: 0, label: "$_id", page_views: 1 } }
                        ],
                        traffic_sources: [
                            { $match: { is_internal_referer: { $ne: true }, referer_host: { $nin: ["", null] } } },
                            { $group: { _id: "$referer_host", page_views: pageViews } },
                            byViewsDesc,
                            { $limit: 10 },
                            { $project: { _id: 0, label: "$_id", page_views: 1 } }
                        ],
                        utm_sources: [
                            { $match: { utm_source: { $nin: ["", null] } } },
                            { $group: { _id: "$utm_source", page_views: pageViews } },
                            byViewsDesc,
                            { $limit: 10 },
                            { $project: { _id: 0, label: "$_id", page_views: 1 } }
                        ],
                        utm_mediums: [
                            { $match: { utm_medium: { $nin: ["", null] } } },
                            { $group: { _id: "$utm_medium", page_views: pageViews } },
                            byViewsDesc,
                            { $limit: 10 },
                            { $project: { _id: 0, label: "$_id", page_views: 1 } }
                        ],
                        utm_campaigns: [
                            { $match: { utm_campaign: { $nin: ["", null] } } },
                            {
                                // source and medium ride along so a campaign name that
                                // runs on several channels stays distinguishable
                                $group: {
                                    _id: {
                                        campaign: "$utm_campaign",
                                        source: { $ifNull: ["$utm_source", ""] },
                                        medium: { $ifNull: ["$utm_medium", ""] }
                                    },
                                    page_views: pageViews,
                                    unique_visiters: { $sum: 1 }
                                }
                            },
                            byViewsDesc,
                            { $limit: 15 },
                            {
                                $project: {
                                    _id: 0,
                                    campaign: "$_id.campaign",
                                    source: "$_id.source",
                                    medium: "$_id.medium",
                                    page_views: 1,
                                    unique_visiters: 1
                                }
                            }
                        ],
                        top_doctor_pages: [
                            { $match: { doctor_id: { $gt: 0 } } },
                            {
                                $group: {
                                    _id: "$doctor_id",
                                    business_name: { $first: "$business_name" },
                                    clinic_id: { $first: "$clinic_id" },
                                    page_views: pageViews,
                                    unique_visiters: { $sum: 1 }
                                }
                            },
                            byViewsDesc,
                            { $limit: 10 },
                            { $project: { _id: 0, doctor_id: "$_id", business_name: 1, clinic_id: 1, page_views: 1, unique_visiters: 1 } }
                        ],
                        top_categories: [
                            { $match: { cat_id: { $gt: 0 } } },
                            {
                                $group: {
                                    _id: { cat_id: "$cat_id", group_category: "$group_category" },
                                    page_views: pageViews,
                                    unique_visiters: { $sum: 1 }
                                }
                            },
                            byViewsDesc,
                            { $limit: 10 },
                            { $project: { _id: 0, cat_id: "$_id.cat_id", group_category: "$_id.group_category", page_views: 1, unique_visiters: 1 } }
                        ],
                        events: [
                            { $unwind: "$events" },
                            {
                                $group: {
                                    // cat_id and group_category come off the parent visit
                                    // document, so events are segmentable by the category
                                    // listing they happened on without the client sending it
                                    _id: {
                                        ev_nm: "$events.ev_nm",
                                        ev_sec: { $ifNull: ["$events.ev_sec", ""] },
                                        ev_val: { $ifNull: ["$events.ev_val", ""] },
                                        cat_id: { $ifNull: ["$cat_id", 0] },
                                        group_category: { $ifNull: ["$group_category", ""] }
                                    },
                                    total: { $sum: 1 }
                                }
                            },
                            { $sort: { total: -1 } },
                            {
                                $project: {
                                    _id: 0,
                                    ev_nm: "$_id.ev_nm",
                                    section_name: "$_id.ev_sec",
                                    value: "$_id.ev_val",
                                    cat_id: "$_id.cat_id",
                                    group_category: "$_id.group_category",
                                    total: 1
                                }
                            }
                        ]
                    }
                }
            ]);
            res.json(successResponse({
                totals: result?.totals?.[0] || { page_views: 0, unique_visiters: 0 },
                day_wise: result?.day_wise || [],
                top_pages: result?.top_pages || [],
                device_split: result?.device_split || [],
                browser_split: result?.browser_split || [],
                traffic_sources: result?.traffic_sources || [],
                utm_sources: result?.utm_sources || [],
                utm_mediums: result?.utm_mediums || [],
                utm_campaigns: result?.utm_campaigns || [],
                top_doctor_pages: result?.top_doctor_pages || [],
                top_categories: result?.top_categories || [],
                events: result?.events || []
            }, "Site traffic dashboard"));
        } catch (error) {
            console.error("Error building site traffic dashboard:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    /**
     * Traffic and clicks for one clinic, optionally narrowed to a single doctor.
     * Scoped by clinic_id rather than city, because a clinic also picks up views
     * from nearby city listing pages and those are still its traffic.
     */
    getClinicTraffic: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getClinicTraffic.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const doctor_id = parseInt(query.doctor_id || "0");
        const pageViews = { $sum: { $ifNull: ["$visit_count", 1] } };
        try {
            const [result] = await siteVisiterLogModel.aggregate([
                {
                    $match: {
                        visit_time: {
                            $gte: new Date(query.from_date + " 00:00:00"),
                            $lte: new Date(query.to_date + " 23:59:59")
                        },
                        clinic_id: parseInt(query.clinic_id),
                        device: { $ne: "bot" },
                        ...(doctor_id > 0 ? { doctor_id } : {})
                    }
                },
                {
                    $addFields: {
                        visiter_key: {
                            $cond: [
                                { $gt: ["$user_id", 0] },
                                { $concat: ["u", { $toString: "$user_id" }] },
                                { $concat: ["g", { $toString: "$guid" }] }
                            ]
                        }
                    }
                },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, page_views: pageViews, visiters: { $addToSet: "$visiter_key" } } },
                            { $project: { _id: 0, page_views: 1, unique_visiters: { $size: "$visiters" } } }
                        ],
                        day_wise: [
                            {
                                $group: {
                                    _id: { year: { $year: "$visit_time" }, month: { $month: "$visit_time" }, day: { $dayOfMonth: "$visit_time" } },
                                    page_views: pageViews,
                                    unique_visiters: { $sum: 1 }
                                }
                            },
                            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
                            { $project: { _id: 0, period: "$_id", page_views: 1, unique_visiters: 1 } }
                        ],
                        top_pages: [
                            { $group: { _id: "$page_name", page_views: pageViews, unique_visiters: { $sum: 1 } } },
                            { $sort: { page_views: -1 } },
                            { $limit: 10 },
                            { $project: { _id: 0, page_name: "$_id", page_views: 1, unique_visiters: 1 } }
                        ],
                        events: [
                            { $unwind: "$events" },
                            {
                                $group: {
                                    _id: {
                                        ev_nm: "$events.ev_nm",
                                        ev_sec: { $ifNull: ["$events.ev_sec", ""] },
                                        ev_val: { $ifNull: ["$events.ev_val", ""] }
                                    },
                                    total: { $sum: 1 }
                                }
                            },
                            { $sort: { total: -1 } },
                            { $project: { _id: 0, ev_nm: "$_id.ev_nm", section_name: "$_id.ev_sec", value: "$_id.ev_val", total: 1 } }
                        ]
                    }
                }
            ]);
            res.json(successResponse({
                totals: result?.totals?.[0] || { page_views: 0, unique_visiters: 0 },
                day_wise: result?.day_wise || [],
                top_pages: result?.top_pages || [],
                events: result?.events || []
            }, "Clinic traffic"));
        } catch (error) {
            console.error("Error building clinic traffic report:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    getPageVisiters: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getPageVisiters.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let conditions={};
        if(query.page_name){
            conditions={...conditions, page_name:query.page_name}
        }
        let rows = await siteVisiterLogModel.find({
            city: tokenInfo.bd.toLowerCase(),
            visit_time: {
                $gte: new Date(query.from_date + " 00:00:00"),
                $lte: new Date(query.to_date + " 23:59:59")
            },
            ...conditions
        }).lean();
        res.json(successResponse(rows, "success"));
    }
}
export default pageVisiterController;