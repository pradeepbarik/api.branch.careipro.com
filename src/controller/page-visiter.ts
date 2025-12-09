import { Request, Response } from "express";
import Joi, { ValidationResult } from "joi";
import { parameterMissingResponse, successResponse, unauthorizedResponse } from "../services/response";
import siteVisiterLogModel from "../mongo-schema/coll_site_visiter_logs";
import { report } from "process";
const reqSchema = {
    getPageVisitReport: Joi.object({
        page_name: Joi.string().allow(''),
        report_type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').required(),
        doctor_id: Joi.number().allow(''),
        clinic_id: Joi.number().allow(''),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    }),
    getPageVisitSummary: Joi.object({
        page_name: Joi.string().allow(''),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    }),
    getPageVisiters: Joi.object({
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
        page: Joi.string().allow('')
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
                    ...matchParams
                }
            },
            {
                $group: {
                    _id: groupId,
                    visit_count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: "$_id",
                    visit_count: 1
                }
            }
        ]).then((rows) => {
            res.json(successResponse(rows, "success"));
        }).catch((error) => {
            console.error("Error fetching page visit report:", error);
            res.status(500).json({ message: "Internal server error" });
        });

    },
    getPageVisitSummary: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getPageVisitSummary.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let matchParams={};
        if(query.page_name){
            matchParams={...matchParams, page_name:query.page_name}
        }
        await siteVisiterLogModel.aggregate([
            {
                $match: {
                    visit_time: {
                        $gte: new Date(query.from_date + " 00:00:00"),
                        $lte: new Date(query.to_date + " 23:59:59")
                    },
                    city: tokenInfo.bd.toLowerCase(),
                    ...matchParams
                }
            },
            {
                $group: {
                    _id: "$page_name",
                    visit_count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    page_name: "$_id",
                    visit_count: 1
                }
            }
        ]).then((rows) => {
            res.json(successResponse(rows, "success"));
        }).catch((error) => {
            console.error("Error fetching page visit summary:", error);
            res.status(500).json({ message: "Internal server error" });
        });
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
        let rows = await siteVisiterLogModel.find({
            city: tokenInfo.bd.toLowerCase(),
            visit_time: {
                $gte: new Date(query.from_date + " 00:00:00"),
                $lte: new Date(query.to_date + " 23:59:59")
            }
        }).lean();
        res.json(successResponse(rows, "success"));
    }
}
export default pageVisiterController;