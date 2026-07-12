import { Types } from "mongoose";
import { successResponse } from "../../services/response";
import getRoutineDayLogsModel from "../schemas/routine-day-logs";
import getEmployeesModel from "../../management-mongo-schema/employee";

const routineDayLogsModel = {
    save: async (params: {
        branch_id: number;
        rep_id: string;
        date: string;
        note: string;
        created_by?: string;
    }) => {
        const RoutineDayLogsModel = getRoutineDayLogsModel();
        const now = new Date();

        const doc = await RoutineDayLogsModel.findOneAndUpdate(
            { rep_id: new Types.ObjectId(params.rep_id), date: params.date },
            {
                $set: {
                    branch_id: params.branch_id,
                    note: params.note,
                    updated_at: now,
                },
                $setOnInsert: {
                    created_by: params.created_by ? new Types.ObjectId(params.created_by) : null,
                    created_at: now,
                },
            },
            { upsert: true, new: true }
        );
        return successResponse({ id: doc._id }, "Day log saved successfully");
    },

    list: async (params: {
        branch_id: number;
        rep_id?: string;
        date_from?: string;
        date_to?: string;
        sales_role?: 'admin' | 'sales_manager' | 'sales_rep';
        emp_id?: number;
        emp_mongo_id?: string;
    }) => {
        const RoutineDayLogsModel = getRoutineDayLogsModel();
        const filter: any = { branch_id: params.branch_id };

        if (params.rep_id) {
            filter.rep_id = new Types.ObjectId(params.rep_id);
        } else if (params.sales_role === 'sales_rep' && params.emp_mongo_id) {
            filter.rep_id = new Types.ObjectId(params.emp_mongo_id);
        } else if (params.sales_role === 'sales_manager' && params.emp_id) {
            const EmployeesModel = getEmployeesModel();
            const reportees = await EmployeesModel
                .find({ branch_id: params.branch_id, 'reporting_employee.emp_id': params.emp_id })
                .select('_id')
                .lean();
            const ids: Types.ObjectId[] = reportees.map((r: any) => r._id);
            if (params.emp_mongo_id) ids.push(new Types.ObjectId(params.emp_mongo_id));
            if (ids.length > 0) filter.rep_id = { $in: ids };
        }

        if (params.date_from || params.date_to) {
            filter.date = {};
            if (params.date_from) filter.date.$gte = params.date_from;
            if (params.date_to) filter.date.$lte = params.date_to;
        }

        const logs = await RoutineDayLogsModel.find(filter)
            .populate('rep_id', 'name region')
            .sort({ date: -1 })
            .lean();

        return successResponse(logs, "Day logs fetched successfully");
    },
};

export default routineDayLogsModel;
