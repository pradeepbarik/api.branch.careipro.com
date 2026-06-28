import { Request, Response } from "express";
import Joi from "joi";
import targetsModel from "../models/targets";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";

const metricsSchema = Joi.object({
    clinic_onboard: Joi.number().min(0).default(0),
    banner_sales: Joi.number().min(0).default(0),
    software_sales: Joi.number().min(0).default(0),
    appointment_booking: Joi.number().min(0).default(0),
    website_development: Joi.number().min(0).default(0),
});

const schema = {
    set: Joi.object({
        rep_id: Joi.string().required(),
        month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
        metrics: metricsSchema.required(),
    }),
    get: Joi.object({
        month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
        rep_id: Joi.string().allow('', null),
    }),
};

const targetsController = {
    setTarget: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.set.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await targetsModel.setTarget({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    getTargets: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.get.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await targetsModel.getTargets({
            branch_id: tokenInfo.bid,
            month: req.query.month as string,
            rep_id: req.query.rep_id as string,
        });
        res.status(response.code).json(response);
    },

    setAchievement: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.set.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await targetsModel.setAchievement({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    getAchievements: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.get.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await targetsModel.getAchievements({
            branch_id: tokenInfo.bid,
            month: req.query.month as string,
            rep_id: req.query.rep_id as string,
        });
        res.status(response.code).json(response);
    },
};

export default targetsController;
