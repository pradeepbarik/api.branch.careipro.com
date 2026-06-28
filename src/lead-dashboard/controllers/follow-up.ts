import { Request, Response } from "express";
import Joi from "joi";
import followUpModel from "../models/follow-up";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const schema = {
    rate: Joi.object({
        log_id: Joi.string().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        rating_comment: Joi.string().allow('', null),
    }),
    log: Joi.object({
        lead_id: Joi.string().required(),
        contact_date: Joi.string().required(),
        status_after: Joi.string().valid('New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation', 'Closed Won', 'Closed Lost').required(),
        notes: Joi.string().allow('', null),
        next_follow_up_date: Joi.string().allow('', null),
        reminder_note: Joi.string().allow('', null),
    }),
};

const followUpController = {
    log: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.log.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        // Resolve the caller's MongoDB _id from the token so the frontend doesn't need to send it
        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id').lean() as any;
        if (!empDoc) { parameterMissingResponse("Employee not found", res); return; }

        const response = await followUpModel.log({ ...req.body, contacted_by: empDoc._id.toString() });
        res.status(response.code).json(response);
    },

    rate: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.rate.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        // Only admin and sales_manager can rate follow-ups
        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id sales_role').lean() as any;
        const sr = empDoc?.sales_role ?? '';
        if (sr === 'sales_rep') { unauthorizedResponse("Only managers can rate follow-ups", res); return; }

        const response = await followUpModel.rate({ ...req.body, rated_by: empDoc._id.toString() });
        res.status(response.code).json(response);
    },

    history: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { lead_id } = req.query;
        if (!lead_id) { parameterMissingResponse("lead_id is required", res); return; }

        const response = await followUpModel.history({ lead_id: lead_id as string });
        res.status(response.code).json(response);
    },

    todayAndOverdue: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const today = new Date().toISOString().slice(0, 10);
        const response = await followUpModel.todayAndOverdue({ branch_id: tokenInfo.bid, today });
        res.status(response.code).json(response);
    },
};

export default followUpController;
