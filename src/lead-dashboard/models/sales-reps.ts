import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable } from "../../services/response";
import getEmployeesModel from "../../management-mongo-schema/employee";

const SALES_DEPT_CODE = 'SALES';

const salesRepsModel = {
    list: async (params: { branch_id: number; include_inactive?: boolean }) => {
        const EmployeesModel = getEmployeesModel();
        const filter: any = { branch_id: params.branch_id, department_code: SALES_DEPT_CODE };
        if (!params.include_inactive) filter.is_active = true;

        const reps = await EmployeesModel.find(filter).sort({ name: 1 }).lean();
        return successResponse(reps, "Sales reps fetched successfully");
    },

    create: async (params: {
        branch_id: number;
        name: string;
        email?: string;
        phone?: string;
        region?: string;
        role?: string;
        join_date?: string;
    }) => {
        const EmployeesModel = getEmployeesModel();
        // Auto-generate emp_id (max within branch + 1) and emp_code
        const last = await EmployeesModel.findOne({ branch_id: params.branch_id })
            .sort({ emp_id: -1 })
            .select('emp_id')
            .lean() as any;
        const emp_id = (last?.emp_id ?? 0) + 1;
        const emp_code = `SD${String(emp_id).padStart(4, '0')}`;

        const now = new Date();
        const rep = await new EmployeesModel({
            emp_id,
            emp_code,
            branch_id: params.branch_id,
            department_code: SALES_DEPT_CODE,
            name: params.name,
            email: params.email ?? '',
            phone: params.phone ?? '',
            region: params.region ?? '',
            sales_role: params.role ?? 'sales_rep',
            join_date: params.join_date ?? '',
            is_active: true,
            created_at: now,
            updated_at: now,
        }).save();
        return successResponse({ id: rep._id }, "Sales rep created successfully");
    },

    update: async (params: {
        rep_id: string;
        name?: string;
        email?: string;
        phone?: string;
        region?: string;
        role?: string;
        join_date?: string;
    }) => {
        const EmployeesModel = getEmployeesModel();
        const { rep_id, role, ...rest } = params;
        const update: any = { ...rest, updated_at: new Date() };
        if (role !== undefined) update.sales_role = role;

        const result = await EmployeesModel.findByIdAndUpdate(
            new Types.ObjectId(rep_id),
            { $set: update }
        );
        if (!result) return serviceNotAcceptable("Sales rep not found");
        return successResponse({}, "Sales rep updated successfully");
    },

    toggleStatus: async (params: { rep_id: string }) => {
        const EmployeesModel = getEmployeesModel();
        const rep = await EmployeesModel.findById(new Types.ObjectId(params.rep_id)) as any;
        if (!rep) return serviceNotAcceptable("Sales rep not found");

        rep.is_active = !rep.is_active;
        rep.updated_at = new Date();
        await rep.save();

        // Keep MySQL employee.status in sync
        const mysqlStatus = rep.is_active ? 'active' : 'in_active';
        await DB.query("update employee set status=? where emp_code=?", [mysqlStatus, rep.emp_code]);

        return successResponse({ is_active: rep.is_active }, "Status updated successfully");
    },
};

export default salesRepsModel;
