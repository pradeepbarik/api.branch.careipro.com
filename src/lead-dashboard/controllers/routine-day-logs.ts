import { Request, Response } from "express";
import Joi from "joi";
import routineDayLogsModel from "../models/routine-day-logs";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const schema = {
    save: Joi.object({
        rep_id: Joi.string().required(),
        date: Joi.string().required(),
        note: Joi.string().allow('', null),
    }),
    list: Joi.object({
        rep_id: Joi.string().allow('', null),
        date_from: Joi.string().allow('', null),
        date_to: Joi.string().allow('', null),
    }),
};

const routineDayLogsController = {
    save: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.save.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const EmployeesModel = getEmployeesModel();
        const empDoc = await EmployeesModel.findOne({ emp_id: tokenInfo.eid }).select('_id').lean() as any;
        const created_by: string | undefined = empDoc?._id?.toString();

        const response = await routineDayLogsModel.save({
            branch_id: tokenInfo.bid,
            rep_id: req.body.rep_id,
            date: req.body.date,
            note: req.body.note || '',
            created_by,
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

        const response = await routineDayLogsModel.list({
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

export default routineDayLogsController;
