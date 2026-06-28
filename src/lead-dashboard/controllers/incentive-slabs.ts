import { Request, Response } from "express";
import Joi from "joi";
import incentiveSlabsModel from "../models/incentive-slabs";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";

const schema = {
    setSlabs: Joi.object({
        slabs: Joi.array().items(
            Joi.object({
                min_percent: Joi.number().min(0).required(),
                max_percent: Joi.number().allow(null),
                amount: Joi.number().min(0).required(),
                label: Joi.string().required(),
            })
        ).required(),
    }),
};

const incentiveSlabsController = {
    getSlabs: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const response = await incentiveSlabsModel.getSlabs({ branch_id: tokenInfo.bid });
        res.status(response.code).json(response);
    },

    setSlabs: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.setSlabs.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await incentiveSlabsModel.setSlabs({ branch_id: tokenInfo.bid, slabs: req.body.slabs });
        res.status(response.code).json(response);
    },
};

export default incentiveSlabsController;
