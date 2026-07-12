import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable, unauthorizedResponse } from "../../services/response";
import getRoutineTaskCompletionsModel from "../schemas/routine-task-completions";
import getRoutineTasksModel from "../schemas/routine-tasks";
import getEmployeesModel from "../../management-mongo-schema/employee";

const routineTaskCompletionsModel = {
    setStatus: async (params: {
        branch_id: number;
        task_id: string;
        date: string;
        status: string;
        updated_by?: string;
        caller_sales_role?: 'admin' | 'sales_manager' | 'sales_rep';
        caller_emp_mongo_id?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const task = await RoutineTasksModel.findById(new Types.ObjectId(params.task_id)).select('rep_id').lean() as any;
        if (!task) return serviceNotAcceptable("Task not found");

        if (params.caller_sales_role === 'sales_rep') {
            const isOwnTask = params.caller_emp_mongo_id && task.rep_id?.toString() === params.caller_emp_mongo_id;
            if (!isOwnTask) return unauthorizedResponse("You can only update status on your own tasks");
        }

        const RoutineTaskCompletionsModel = getRoutineTaskCompletionsModel();
        const now = new Date();
        const doc = await RoutineTaskCompletionsModel.findOneAndUpdate(
            { task_id: new Types.ObjectId(params.task_id), date: params.date },
            {
                $set: {
                    branch_id: params.branch_id,
                    rep_id: task.rep_id,
                    status: params.status,
                    updated_by: params.updated_by ? new Types.ObjectId(params.updated_by) : null,
                    updated_at: now,
                },
                $setOnInsert: { created_at: now },
            },
            { upsert: true, new: true }
        );
        return successResponse({ id: doc._id }, "Task status updated successfully");
    },

    setNote: async (params: {
        branch_id: number;
        task_id: string;
        date: string;
        note: string;
        caller_sales_role?: 'admin' | 'sales_manager' | 'sales_rep';
        caller_emp_mongo_id?: string;
        updated_by?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const task = await RoutineTasksModel.findById(new Types.ObjectId(params.task_id)).select('rep_id').lean() as any;
        if (!task) return serviceNotAcceptable("Task not found");

        if (params.caller_sales_role === 'sales_rep') {
            const isOwnTask = params.caller_emp_mongo_id && task.rep_id?.toString() === params.caller_emp_mongo_id;
            if (!isOwnTask) return unauthorizedResponse("You can only log notes on your own tasks");
        }

        const RoutineTaskCompletionsModel = getRoutineTaskCompletionsModel();
        const now = new Date();
        const doc = await RoutineTaskCompletionsModel.findOneAndUpdate(
            { task_id: new Types.ObjectId(params.task_id), date: params.date },
            {
                $set: {
                    branch_id: params.branch_id,
                    rep_id: task.rep_id,
                    note: params.note,
                    updated_by: params.updated_by ? new Types.ObjectId(params.updated_by) : null,
                    updated_at: now,
                },
                $setOnInsert: { created_at: now, status: 'Pending' },
            },
            { upsert: true, new: true }
        );
        return successResponse({ id: doc._id }, "Task note saved successfully");
    },

    rate: async (params: {
        branch_id: number;
        task_id: string;
        date: string;
        rating: number;
        rating_comment?: string;
        rated_by?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const task = await RoutineTasksModel.findById(new Types.ObjectId(params.task_id)).select('rep_id').lean() as any;
        if (!task) return serviceNotAcceptable("Task not found");

        const RoutineTaskCompletionsModel = getRoutineTaskCompletionsModel();
        const now = new Date();
        const doc = await RoutineTaskCompletionsModel.findOneAndUpdate(
            { task_id: new Types.ObjectId(params.task_id), date: params.date },
            {
                $set: {
                    branch_id: params.branch_id,
                    rep_id: task.rep_id,
                    rating: params.rating,
                    rating_comment: params.rating_comment || '',
                    rated_by: params.rated_by ? new Types.ObjectId(params.rated_by) : null,
                    rated_at: now,
                    updated_at: now,
                },
                $setOnInsert: { created_at: now, status: 'Pending' },
            },
            { upsert: true, new: true }
        );
        return successResponse({ id: doc._id }, "Task rated successfully");
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
        const RoutineTaskCompletionsModel = getRoutineTaskCompletionsModel();
        const filter: any = { branch_id: params.branch_id };

        if (params.rep_id) {
            filter.rep_id = new Types.ObjectId(params.rep_id);
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
        // admin and sales_rep with no rep_id filter: see all branch completions — the
        // frontend hides rating/rating_comment on rows that aren't the viewer's own task

        if (params.date_from || params.date_to) {
            filter.date = {};
            if (params.date_from) filter.date.$gte = params.date_from;
            if (params.date_to) filter.date.$lte = params.date_to;
        }

        const completions = await RoutineTaskCompletionsModel.find(filter)
            .populate('rated_by', 'name')
            .lean();
        return successResponse(completions, "Task completions fetched successfully");
    },
};

export default routineTaskCompletionsModel;
