import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable } from "../../services/response";
import getLeadsModel from "../schemas/leads";
import getSalesProjectsModel from "../schemas/sales-projects";
import getEmployeesModel from "../../management-mongo-schema/employee";

const leadsModel = {
    list: async (params: {
        branch_id: number;
        // Role-based visibility: if omitted, returns all leads (admin behaviour)
        sales_role?: 'admin' | 'sales_manager' | 'sales_rep';
        emp_id?: number;        // MySQL emp_id of the caller
        emp_mongo_id?: string;  // MongoDB _id of the caller (for sales_rep filter)
        search?: string;
        status?: string;
        city?: string;
        interest_level?: string;
        assigned_to?: string;
    }) => {
        const LeadsModel = getLeadsModel();
        const filter: any = { branch_id: params.branch_id };

        // Role-based scope applied before any UI filters
        if (params.sales_role === 'sales_rep' && params.emp_mongo_id) {
            filter.assigned_to = new Types.ObjectId(params.emp_mongo_id);
        } else if (params.sales_role === 'sales_manager' && params.emp_id) {
            const EmployeesModel = getEmployeesModel();
            const reportees = await EmployeesModel
                .find({ branch_id: params.branch_id, 'reporting_employee.emp_id': params.emp_id })
                .select('_id')
                .lean();
            const ids: Types.ObjectId[] = reportees.map((r: any) => r._id);
            // Also include leads directly assigned to the manager themselves
            if (params.emp_mongo_id) ids.push(new Types.ObjectId(params.emp_mongo_id));
            // If no ids resolved (reportees not yet linked), fall back to all branch leads
            if (ids.length > 0) filter.assigned_to = { $in: [...ids, null] };
        }
        // admin: no assigned_to filter — sees all branch leads

        // UI filters (applied on top of role scope)
        if (params.status) filter.status = params.status;
        if (params.city) filter.city = params.city;
        if (params.interest_level) filter.interest_level = params.interest_level;
        if (params.assigned_to) filter.assigned_to = new Types.ObjectId(params.assigned_to);
        if (params.search) {
            const q = new RegExp(params.search, 'i');
            filter.$or = [
                { clinic_name: q },
                { contact_person: q },
                { mobile: q },
                { city: q },
            ];
        }
        const leads = await LeadsModel.find(filter)
            .populate('assigned_to', 'name email region sales_role')
            .populate('project_id', 'name')
            .populate('module_id', 'name')
            .sort({ created_at: -1 })
            .lean();

        return successResponse(leads, "Leads fetched successfully");
    },

    detail: async (params: { lead_id: string }) => {
        const LeadsModel = getLeadsModel();
        const lead = await LeadsModel.findById(new Types.ObjectId(params.lead_id))
            .populate('assigned_to', 'name email region sales_role')
            .populate('project_id', 'name')
            .populate('module_id', 'name')
            .lean();

        if (!lead) return serviceNotAcceptable("Lead not found");
        return successResponse(lead, "Lead fetched successfully");
    },

    create: async (params: {
        branch_id: number;
        date_added: string;
        clinic_name: string;
        contact_person: string;
        mobile: string;
        alternate_mobile?: string;
        area?: string;
        city?: string;
        lead_source: string;
        assigned_to?: string;
        status?: string;
        interest_level?: string;
        requirement?: string;
        project_id?: string;
        module_id?: string;
        last_contact_date?: string;
        next_follow_up_date?: string;
        expected_value?: number;
        notes?: string;
    }) => {
        const LeadsModel = getLeadsModel();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        // Use the project's prefix if a project is selected, otherwise fall back to 'LD'
        let codePrefix = 'LD';
        if (params.project_id) {
            const ProjectsModel = getSalesProjectsModel();
            const project = await ProjectsModel.findById(new Types.ObjectId(params.project_id)).lean() as any;
            if (project?.prefix) codePrefix = project.prefix;
        }
        const fullPrefix = `${codePrefix}-${year}${month}-`;
        const count = await LeadsModel.countDocuments({ lead_code: { $regex: `^${fullPrefix}` } });
        const lead_code = `${fullPrefix}${String(count + 1).padStart(4, '0')}`;
        const doc = await new LeadsModel({
            ...params,
            lead_code,
            assigned_to: params.assigned_to ? new Types.ObjectId(params.assigned_to) : null,
            project_id: params.project_id ? new Types.ObjectId(params.project_id) : null,
            module_id: params.module_id ? new Types.ObjectId(params.module_id) : null,
            created_at: now,
            updated_at: now,
        }).save();
        return successResponse({ lead_code, lead_id: doc._id }, "Lead created successfully");
    },

    update: async (params: {
        lead_id: string;
        clinic_name?: string;
        contact_person?: string;
        mobile?: string;
        alternate_mobile?: string;
        area?: string;
        city?: string;
        lead_source?: string;
        assigned_to?: string;
        status?: string;
        interest_level?: string;
        requirement?: string;
        project_id?: string;
        module_id?: string;
        last_contact_date?: string;
        next_follow_up_date?: string;
        expected_value?: number;
        notes?: string;
    }) => {
        const LeadsModel = getLeadsModel();
        const { lead_id, ...rest } = params;
        const update: any = { ...rest, updated_at: new Date() };

        if (rest.assigned_to !== undefined) update.assigned_to = rest.assigned_to ? new Types.ObjectId(rest.assigned_to) : null;
        if (rest.project_id !== undefined) update.project_id = rest.project_id ? new Types.ObjectId(rest.project_id) : null;
        if (rest.module_id !== undefined) update.module_id = rest.module_id ? new Types.ObjectId(rest.module_id) : null;

        const result = await LeadsModel.findByIdAndUpdate(new Types.ObjectId(lead_id), { $set: update });
        if (!result) return serviceNotAcceptable("Lead not found");
        return successResponse({}, "Lead updated successfully");
    },

    changeStatus: async (params: { lead_id: string; status: string }) => {
        const LeadsModel = getLeadsModel();
        const result = await LeadsModel.findByIdAndUpdate(
            new Types.ObjectId(params.lead_id),
            { $set: { status: params.status, updated_at: new Date() } }
        );
        if (!result) return serviceNotAcceptable("Lead not found");
        return successResponse({}, "Status updated successfully");
    },

    assign: async (params: { lead_id: string; rep_id: string; assigned_by?: string; note?: string }) => {
        const LeadsModel = getLeadsModel();
        const logEntry: any = {
            assigned_to: params.rep_id ? new Types.ObjectId(params.rep_id) : null,
            assigned_at: new Date(),
            note: params.note || '',
        };
        if (params.assigned_by) logEntry.assigned_by = new Types.ObjectId(params.assigned_by);

        const result = await LeadsModel.findByIdAndUpdate(
            new Types.ObjectId(params.lead_id),
            {
                $set: { assigned_to: params.rep_id ? new Types.ObjectId(params.rep_id) : null, updated_at: new Date() },
                $push: { assignment_log: logEntry },
            }
        );
        if (!result) return serviceNotAcceptable("Lead not found");
        return successResponse({}, "Lead assigned successfully");
    },

    assignmentLog: async (params: { lead_id: string }) => {
        const LeadsModel = getLeadsModel();
        const lead = await LeadsModel.findById(new Types.ObjectId(params.lead_id))
            .select('assignment_log')
            .populate('assignment_log.assigned_to', 'name')
            .populate('assignment_log.assigned_by', 'name')
            .lean() as any;
        if (!lead) return serviceNotAcceptable("Lead not found");
        const log = (lead.assignment_log || []).slice().reverse();
        return successResponse(log, "Assignment log fetched successfully");
    },

    delete: async (params: { lead_id: string }) => {
        const LeadsModel = getLeadsModel();
        const result = await LeadsModel.findByIdAndDelete(new Types.ObjectId(params.lead_id));
        if (!result) return serviceNotAcceptable("Lead not found");
        return successResponse({}, "Lead deleted successfully");
    },
};

export default leadsModel;
