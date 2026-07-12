import { Request, Response } from "express";
import Joi from "joi";
import routineTasksModel from "../models/routine-tasks";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TASK_TYPES = ['Follow-up', 'Operational', 'Request Slot'];

const schema = {
    list: Joi.object({
        day: Joi.string().valid(...DAYS).allow('', null),
        rep_id: Joi.string().allow('', null),
    }),
    create: Joi.object({
        rep_id: Joi.string().required(),
        day: Joi.string().valid(...DAYS).required(),
        title: Joi.string().required(),
        description: Joi.string().allow('', null),
        lead_name: Joi.string().allow('', null),
        task_type: Joi.string().valid(...TASK_TYPES).allow('', null),
    }),
    update: Joi.object({
        task_id: Joi.string().required(),
        day: Joi.string().valid(...DAYS),
        title: Joi.string(),
        description: Joi.string().allow('', null),
        lead_name: Joi.string().allow('', null),
        task_type: Joi.string().valid(...TASK_TYPES),
    }),
    delete: Joi.object({
        task_id: Joi.string().required(),
    }),
};

const routineTasksController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.list.validate(req.query);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel
            .findOne({ emp_id: tokenInfo.eid })
            .select('_id sales_role')
            .lean() as any;
        const rawRole = empDoc?.sales_role ?? '';
        const sales_role: 'admin' | 'sales_manager' | 'sales_rep' =
            rawRole === 'sales_rep' || rawRole === 'sales_manager' ? rawRole : 'admin';
        const emp_mongo_id: string | undefined = empDoc?._id?.toString();

        const response = await routineTasksModel.list({
            branch_id: tokenInfo.bid,
            day: req.query.day as string,
            rep_id: req.query.rep_id as string,
            sales_role,
            emp_id: tokenInfo.eid,
            emp_mongo_id,
        });
        res.status(response.code).json(response);
    },

    create: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.create.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id sales_role').lean() as any;
        if ((empDoc?.sales_role ?? '') === 'sales_rep') { unauthorizedResponse("Only managers can create routine tasks", res); return; }
        const created_by: string | undefined = empDoc?._id?.toString();

        const response = await routineTasksModel.create({ branch_id: tokenInfo.bid, created_by, ...req.body });
        res.status(response.code).json(response);
    },

    update: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.update.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('sales_role').lean() as any;
        if ((empDoc?.sales_role ?? '') === 'sales_rep') { unauthorizedResponse("Only managers can edit routine tasks", res); return; }

        const response = await routineTasksModel.update(req.body);
        res.status(response.code).json(response);
    },

    delete: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.delete.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('sales_role').lean() as any;
        if ((empDoc?.sales_role ?? '') === 'sales_rep') { unauthorizedResponse("Only managers can delete routine tasks", res); return; }

        const response = await routineTasksModel.delete(req.body);
        res.status(response.code).json(response);
    },
};

export default routineTasksController;
