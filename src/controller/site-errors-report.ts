import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { internalServerError, parameterMissingResponse, successResponse, unauthorizedResponse } from '../services/response';
import { siteErrorModel } from '../mongo-schema/coll_site_errors';

const reqSchema = {
    getSiteErrors: Joi.object({
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
        type: Joi.string().valid('', 'page_crash', 'js_error', 'promise_rejection', 'api_failure').allow(''),
    })
};

/* a visitor is a logged in user or a guest; one with neither (a first visit that crashed before a
   guest key existed) still counts, under a single "anonymous" bucket */
const visitorKey = {
    $cond: [{ $gt: ["$user_id", 0] }, { $concat: ["u", { $toString: "$user_id" }] },
        { $cond: [{ $gt: ["$guid", 0] }, { $concat: ["g", { $toString: "$guid" }] }, "anonymous"] }]
};

const siteErrorsReportController = {
    /**
     * Errors careipro.com visitors ran into, grouped by fingerprint (the same problem across
     * pages, ids and builds) so the list reads "this error, N times, M visitors". Kept 7 days.
     */
    getSiteErrors: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res);
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = reqSchema.getSiteErrors.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        // dates are picked in IST, created_at is stored in UTC
        const match: any = {
            created_at: { $gte: new Date(`${query.from_date}T00:00:00+05:30`), $lte: new Date(`${query.to_date}T23:59:59+05:30`) },
            ...(query.type ? { type: query.type } : {})
        };
        try {
            const [result] = await siteErrorModel.aggregate([
                { $match: match },
                { $addFields: { visitor: visitorKey } },
                { $sort: { created_at: -1 } },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, occurrences: { $sum: 1 }, errors: { $addToSet: "$fingerprint" }, visitors: { $addToSet: "$visitor" } } },
                            { $project: { _id: 0, occurrences: 1, errors: { $size: "$errors" }, visitors: { $size: "$visitors" } } }
                        ],
                        by_type: [
                            { $group: { _id: "$type", occurrences: { $sum: 1 } } },
                            { $project: { _id: 0, type: "$_id", occurrences: 1 } }
                        ],
                        day_wise: [
                            { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at", timezone: "+05:30" } }, type: "$type" }, occurrences: { $sum: 1 } } },
                            { $project: { _id: 0, date: "$_id.date", type: "$_id.type", occurrences: 1 } },
                            { $sort: { date: 1 } }
                        ],
                        groups: [
                            // documents are sorted newest first, so $first is the latest occurrence
                            {
                                $group: {
                                    _id: "$fingerprint",
                                    type: { $first: "$type" },
                                    message: { $first: "$message" },
                                    stack: { $first: "$stack" },
                                    page_url: { $first: "$page_url" },
                                    api_url: { $first: "$api_url" },
                                    api_method: { $first: "$api_method" },
                                    api_status: { $first: "$api_status" },
                                    occurrences: { $sum: 1 },
                                    visitors: { $addToSet: "$visitor" },
                                    pages: { $push: "$page_path" },
                                    devices: { $addToSet: "$device" },
                                    browsers: { $addToSet: "$browser" },
                                    last_seen: { $first: "$created_at" },
                                    first_seen: { $last: "$created_at" },
                                }
                            },
                            { $sort: { occurrences: -1 } },
                            { $limit: 100 },
                            { $project: { _id: 0, fingerprint: "$_id", type: 1, message: 1, stack: 1, page_url: 1, api_url: 1, api_method: 1, api_status: 1, occurrences: 1, visitors: { $size: "$visitors" }, pages: 1, devices: 1, browsers: 1, last_seen: 1, first_seen: 1 } }
                        ]
                    }
                }
            ]);
            /* the busiest pages for each error, counted here rather than in the pipeline */
            const groups = (result?.groups || []).map((g: any) => {
                const counts: Record<string, number> = {};
                for (const p of g.pages || []) counts[p || "/"] = (counts[p || "/"] || 0) + 1;
                const top_pages = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([path, count]) => ({ path, count }));
                const { pages, ...rest } = g;
                return { ...rest, top_pages, page_count: Object.keys(counts).length };
            });
            res.json(successResponse({
                totals: result?.totals?.[0] || { occurrences: 0, errors: 0, visitors: 0 },
                by_type: result?.by_type || [],
                day_wise: result?.day_wise || [],
                groups,
            }));
        } catch (err: any) {
            internalServerError(err.message, res);
        }
    }
}
export default siteErrorsReportController;
