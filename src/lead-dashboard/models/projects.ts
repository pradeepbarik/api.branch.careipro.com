import { Types } from "mongoose";
import { successResponse, serviceNotAcceptable } from "../../services/response";
import getSalesProjectsModel from "../schemas/sales-projects";
import getSalesModulesModel from "../schemas/sales-modules";

const projectsModel = {
    listProjects: async (params: { branch_id: number; emp_id: number }) => {
        const ProjectsModel = getSalesProjectsModel();
        const projects = await ProjectsModel.find({
            branch_id: params.branch_id,
            is_active: true,
            $or: [{ is_public: true }, { created_by: params.emp_id }],
        })
            .sort({ name: 1 })
            .lean();
        return successResponse(projects, "Projects fetched successfully");
    },

    createProject: async (params: { branch_id: number; emp_id: number; name: string; prefix: string; is_public: boolean }) => {
        const ProjectsModel = getSalesProjectsModel();
        const now = new Date();
        const project = await new ProjectsModel({
            branch_id: params.branch_id,
            name: params.name,
            prefix: params.prefix.toUpperCase(),
            is_public: params.is_public,
            created_by: params.emp_id,
            is_active: true,
            created_at: now,
            updated_at: now,
        }).save();
        return successResponse({ id: project._id }, "Project created successfully");
    },

    updateProject: async (params: { project_id: string; name: string; prefix: string; is_public: boolean }) => {
        const ProjectsModel = getSalesProjectsModel();
        const result = await ProjectsModel.findByIdAndUpdate(
            new Types.ObjectId(params.project_id),
            { $set: { name: params.name, prefix: params.prefix.toUpperCase(), is_public: params.is_public, updated_at: new Date() } }
        );
        if (!result) return serviceNotAcceptable("Project not found");
        return successResponse({}, "Project updated successfully");
    },

    listModules: async (params: { branch_id: number; project_id?: string }) => {
        const ModulesModel = getSalesModulesModel();
        const filter: any = { branch_id: params.branch_id, is_active: true };
        if (params.project_id) filter.project_id = new Types.ObjectId(params.project_id);

        const modules = await ModulesModel.find(filter)
            .populate('project_id', 'name')
            .sort({ name: 1 })
            .lean();
        return successResponse(modules, "Modules fetched successfully");
    },

    createModule: async (params: { branch_id: number; project_id: string; name: string }) => {
        const ModulesModel = getSalesModulesModel();
        const now = new Date();
        const module = await new ModulesModel({
            branch_id: params.branch_id,
            project_id: new Types.ObjectId(params.project_id),
            name: params.name,
            is_active: true,
            created_at: now,
            updated_at: now,
        }).save();
        return successResponse({ id: module._id }, "Module created successfully");
    },

    updateModule: async (params: { module_id: string; name: string }) => {
        const ModulesModel = getSalesModulesModel();
        const result = await ModulesModel.findByIdAndUpdate(
            new Types.ObjectId(params.module_id),
            { $set: { name: params.name, updated_at: new Date() } }
        );
        if (!result) return serviceNotAcceptable("Module not found");
        return successResponse({}, "Module updated successfully");
    },
};

export default projectsModel;
