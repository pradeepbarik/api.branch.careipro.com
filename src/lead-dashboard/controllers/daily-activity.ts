import { Request, Response } from "express";
import Joi from "joi";
import dailyActivityModel from "../models/daily-activity";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";

const schema = {
    log: Joi.object({
        rep_id: Joi.string().required(),
        date: Joi.string().required(),
        visits_done: Joi.number().min(0).required(),
        calls_made: Joi.number().min(0).required(),
        demos_given: Joi.number().min(0).required(),
        closures: Joi.number().min(0).required(),
        remarks: Joi.string().allow('', null),
    }),
    list: Joi.object({
        rep_id: Joi.string().allow('', null),
        date_from: Joi.string().allow('', null),
        date_to: Joi.string().allow('', null),
    }),
};

const dailyActivityController = {
    log: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.log.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await dailyActivityModel.log({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.list.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await dailyActivityModel.list({
            branch_id: tokenInfo.bid,
            rep_id: req.query.rep_id as string,
            date_from: req.query.date_from as string,
            date_to: req.query.date_to as string,
        });
        res.status(response.code).json(response);
    },
};

export default dailyActivityController;
