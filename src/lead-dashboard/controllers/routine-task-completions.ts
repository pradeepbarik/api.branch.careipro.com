import { Request, Response } from "express";
import Joi from "joi";
import routineTaskCompletionsModel from "../models/routine-task-completions";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const STATUSES = ['Pending', 'In Progress', 'Done', 'Skipped'];

const schema = {
    setStatus: Joi.object({
        task_id: Joi.string().required(),
        date: Joi.string().required(),
        status: Joi.string().valid(...STATUSES).required(),
    }),
    list: Joi.object({
        rep_id: Joi.string().allow('', null),
        date_from: Joi.string().allow('', null),
        date_to: Joi.string().allow('', null),
    }),
    setNote: Joi.object({
        task_id: Joi.string().required(),
        date: Joi.string().required(),
        note: Joi.string().allow('', null),
    }),
    rate: Joi.object({
        task_id: Joi.string().required(),
        date: Joi.string().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        rating_comment: Joi.string().allow('', null),
    }),
};

const routineTaskCompletionsController = {
    setStatus: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.setStatus.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id sales_role').lean() as any;
        const updated_by: string | undefined = empDoc?._id?.toString();
        const rawRole = empDoc?.sales_role ?? '';
        const caller_sales_role: 'admin' | 'sales_manager' | 'sales_rep' =
            rawRole === 'sales_rep' || rawRole === 'sales_manager' ? rawRole : 'admin';

        const response = await routineTaskCompletionsModel.setStatus({
            branch_id: tokenInfo.bid,
            task_id: req.body.task_id,
            date: req.body.date,
            status: req.body.status,
            updated_by,
            caller_sales_role,
            caller_emp_mongo_id: updated_by,
        });
        res.status(response.code).json(response);
    },

    setNote: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.setNote.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id sales_role').lean() as any;
        const updated_by: string | undefined = empDoc?._id?.toString();
        const rawRole = empDoc?.sales_role ?? '';
        const caller_sales_role: 'admin' | 'sales_manager' | 'sales_rep' =
            rawRole === 'sales_rep' || rawRole === 'sales_manager' ? rawRole : 'admin';

        const response = await routineTaskCompletionsModel.setNote({
            branch_id: tokenInfo.bid,
            task_id: req.body.task_id,
            date: req.body.date,
            note: req.body.note || '',
            updated_by,
            caller_sales_role,
            caller_emp_mongo_id: updated_by,
        });
        res.status(response.code).json(response);
    },

    rate: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.rate.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id sales_role').lean() as any;
        const sr = empDoc?.sales_role ?? '';
        if (sr === 'sales_rep') { unauthorizedResponse("Only managers can rate routine tasks", res); return; }

        const response = await routineTaskCompletionsModel.rate({
            branch_id: tokenInfo.bid,
            task_id: req.body.task_id,
            date: req.body.date,
            rating: req.body.rating,
            rating_comment: req.body.rating_comment,
            rated_by: empDoc?._id?.toString(),
        });
        res.status(response.code).json(response);
    },

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

        const response = await routineTaskCompletionsModel.list({
            branch_id: tokenInfo.bid,
            rep_id: req.query.rep_id as string,
            date_from: req.query.date_from as string,
            date_to: req.query.date_to as string,
            sales_role,
            emp_id: tokenInfo.eid,
            emp_mongo_id,
        });
        res.status(response.code).json(response);
    },
};

export default routineTaskCompletionsController;
