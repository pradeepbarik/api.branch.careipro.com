import { Request, Response } from "express";
import Joi from "joi";
import salesRepsModel from "../models/sales-reps";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";

const schema = {
    create: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().allow('', null),
        phone: Joi.string().allow('', null),
        region: Joi.string().allow('', null),
        role: Joi.string().valid('admin', 'sales_manager', 'sales_rep').allow('', null),
        join_date: Joi.string().allow('', null),
    }),
    update: Joi.object({
        rep_id: Joi.string().required(),
        name: Joi.string().allow('', null),
        email: Joi.string().email().allow('', null),
        phone: Joi.string().allow('', null),
        region: Joi.string().allow('', null),
        role: Joi.string().valid('admin', 'sales_manager', 'sales_rep').allow('', null),
        join_date: Joi.string().allow('', null),
    }),
    toggleStatus: Joi.object({
        rep_id: Joi.string().required(),
    }),
};

const salesRepsController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const include_inactive = req.query.include_inactive === 'true';
        const response = await salesRepsModel.list({ branch_id: tokenInfo.bid, include_inactive });
        res.status(response.code).json(response);
    },

    create: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.create.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await salesRepsModel.create({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    update: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.update.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await salesRepsModel.update(req.body);
        res.status(response.code).json(response);
    },

    toggleStatus: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.toggleStatus.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await salesRepsModel.toggleStatus(req.body);
        res.status(response.code).json(response);
    },
};

export default salesRepsController;
