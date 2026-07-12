import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable } from "../../services/response";
import getRoutineTasksModel from "../schemas/routine-tasks";
import getEmployeesModel from "../../management-mongo-schema/employee";

const routineTasksModel = {
    list: async (params: {
        branch_id: number;
        day?: string;
        rep_id?: string;
        sales_role?: 'admin' | 'sales_manager' | 'sales_rep';
        emp_id?: number;
        emp_mongo_id?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const filter: any = { branch_id: params.branch_id };

        if (params.day) filter.day = params.day;

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
        // admin and sales_rep with no rep_id filter: see all branch tasks (reps can view
        // the whole team's routine, but write access is still gated per-role/ownership)

        const tasks = await RoutineTasksModel.find(filter)
            .populate('rep_id', 'name region')
            .sort({ created_at: 1 })
            .lean();

        return successResponse(tasks, "Routine tasks fetched successfully");
    },

    create: async (params: {
        branch_id: number;
        rep_id: string;
        day: string;
        title: string;
        description?: string;
        lead_name?: string;
        task_type?: string;
        created_by?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const now = new Date();
        const doc = await new RoutineTasksModel({
            branch_id: params.branch_id,
            rep_id: new Types.ObjectId(params.rep_id),
            day: params.day,
            title: params.title,
            description: params.description || '',
            lead_name: params.lead_name || '',
            task_type: params.task_type || 'Operational',
            created_by: params.created_by ? new Types.ObjectId(params.created_by) : null,
            created_at: now,
            updated_at: now,
        }).save();
        return successResponse({ id: doc._id }, "Routine task created successfully");
    },

    update: async (params: {
        task_id: string;
        day?: string;
        title?: string;
        description?: string;
        lead_name?: string;
        task_type?: string;
    }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const { task_id, ...rest } = params;
        const update: any = { ...rest, updated_at: new Date() };

        const result = await RoutineTasksModel.findByIdAndUpdate(new Types.ObjectId(task_id), { $set: update });
        if (!result) return serviceNotAcceptable("Task not found");
        return successResponse({}, "Routine task updated successfully");
    },

    delete: async (params: { task_id: string }) => {
        const RoutineTasksModel = getRoutineTasksModel();
        const result = await RoutineTasksModel.findByIdAndDelete(new Types.ObjectId(params.task_id));
        if (!result) return serviceNotAcceptable("Task not found");
        return successResponse({}, "Routine task deleted successfully");
    },
};

export default routineTasksModel;
