import { Request, Response } from "express";
import Joi from "joi";
import leadsModel from "../models/leads";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const schema = {
    list: Joi.object({
        search: Joi.string().allow('', null),
        status: Joi.string().allow('', null),
        city: Joi.string().allow('', null),
        interest_level: Joi.string().allow('', null),
        assigned_to: Joi.string().allow('', null),
    }),
    create: Joi.object({
        date_added: Joi.string().required(),
        clinic_name: Joi.string().required(),
        contact_person: Joi.string().required(),
        mobile: Joi.string().required(),
        alternate_mobile: Joi.string().allow('', null),
        area: Joi.string().allow('', null),
        city: Joi.string().allow('', null),
        lead_source: Joi.string().valid('Field', 'Call', 'Referral', 'Website').required(),
        assigned_to: Joi.string().allow('', null),
        status: Joi.string().allow('', null),
        interest_level: Joi.string().valid('Hot', 'Warm', 'Cold').allow('', null),
        requirement: Joi.string().valid('Software', 'Website', 'Both').allow('', null),
        project_id: Joi.string().allow('', null),
        module_id: Joi.string().allow('', null),
        last_contact_date: Joi.string().allow('', null),
        next_follow_up_date: Joi.string().allow('', null),
        expected_value: Joi.number().min(0).allow(null),
        expected_business: Joi.string().allow('', null),
        notes: Joi.string().allow('', null),
    }),
    update: Joi.object({
        lead_id: Joi.string().required(),
        clinic_name: Joi.string().allow('', null),
        contact_person: Joi.string().allow('', null),
        mobile: Joi.string().allow('', null),
        alternate_mobile: Joi.string().allow('', null),
        area: Joi.string().allow('', null),
        city: Joi.string().allow('', null),
        lead_source: Joi.string().valid('Field', 'Call', 'Referral', 'Website').allow('', null),
        assigned_to: Joi.string().allow('', null),
        status: Joi.string().allow('', null),
        interest_level: Joi.string().valid('Hot', 'Warm', 'Cold').allow('', null),
        requirement: Joi.string().valid('Software', 'Website', 'Both').allow('', null),
        project_id: Joi.string().allow('', null),
        module_id: Joi.string().allow('', null),
        last_contact_date: Joi.string().allow('', null),
        next_follow_up_date: Joi.string().allow('', null),
        expected_value: Joi.number().min(0).allow(null),
        expected_business: Joi.string().allow('', null),
        notes: Joi.string().allow('', null),
    }),
    changeStatus: Joi.object({
        lead_id: Joi.string().required(),
        status: Joi.string().valid('New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation', 'Closed Won', 'Closed Lost').required(),
    }),
    assign: Joi.object({
        lead_id: Joi.string().required(),
        rep_id: Joi.string().allow('', null),
        note: Joi.string().allow('', null),
    }),
    assignmentLog: Joi.object({
        lead_id: Joi.string().required(),
    }),
    delete: Joi.object({
        lead_id: Joi.string().required(),
    }),
};

const leadsController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.list.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        // Resolve caller's sales_role and MongoDB _id for role-based scoping
        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel
            .findOne({ emp_id: tokenInfo.eid })
            .select('_id sales_role')
            .lean() as any;
        // Empty sales_role means no role assigned yet — treat as admin so they see all leads
        const rawRole = empDoc?.sales_role ?? '';
        const sales_role: 'admin' | 'sales_manager' | 'sales_rep' =
            rawRole === 'sales_rep' || rawRole === 'sales_manager' ? rawRole : 'admin';
        const emp_mongo_id: string | undefined = empDoc?._id?.toString();

        const response = await leadsModel.list({
            branch_id: tokenInfo.bid,
            sales_role,
            emp_id: tokenInfo.eid,
            emp_mongo_id,
            search: req.query.search as string,
            status: req.query.status as string,
            city: req.query.city as string,
            interest_level: req.query.interest_level as string,
            assigned_to: req.query.assigned_to as string,
        });
        res.status(response.code).json(response);
    },

    detail: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { lead_id } = req.query;
        if (!lead_id) { parameterMissingResponse("lead_id is required", res); return; }

        const response = await leadsModel.detail({ lead_id: lead_id as string });
        res.status(response.code).json(response);
    },

    create: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.create.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await leadsModel.create({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    update: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.update.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await leadsModel.update(req.body);
        res.status(response.code).json(response);
    },

    changeStatus: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.changeStatus.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await leadsModel.changeStatus(req.body);
        res.status(response.code).json(response);
    },

    assign: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.assign.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        // Look up caller's MongoDB _id to record who made the assignment
        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id').lean() as any;
        const assigned_by: string | undefined = empDoc?._id?.toString();

        const response = await leadsModel.assign({ ...req.body, assigned_by });
        res.status(response.code).json(response);
    },

    assignmentLog: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.assignmentLog.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await leadsModel.assignmentLog({ lead_id: req.query.lead_id as string });
        res.status(response.code).json(response);
    },

    delete: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.delete.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await leadsModel.delete(req.body);
        res.status(response.code).json(response);
    },
};

export default leadsController;
