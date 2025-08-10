import { Request, Response } from "express";
import Joi, { ValidationResult } from "joi";
import { parameterMissingResponse, successResponse, unauthorizedResponse } from "../services/response";
import siteVisiterLogModel from "../mongo-schema/coll_site_visiter_logs";
const reqSchema = {
    getPageVisiters: Joi.object({
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
        page:Joi.string().allow('')
    })
}
const pageVisiterController = {
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