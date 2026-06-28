import { Request, Response } from "express";
import Joi from "joi";
import projectsModel from "../models/projects";
import { parameterMissingResponse, unauthorizedResponse } from "../../services/response";

const schema = {
    createProject: Joi.object({
        name: Joi.string().required(),
        prefix: Joi.string().min(2).max(8).required(),
        is_public: Joi.boolean().default(true),
    }),
    updateProject: Joi.object({
        project_id: Joi.string().required(),
        name: Joi.string().required(),
        prefix: Joi.string().min(2).max(8).required(),
        is_public: Joi.boolean().required(),
    }),
    createModule: Joi.object({ project_id: Joi.string().required(), name: Joi.string().required() }),
    updateModule: Joi.object({ module_id: Joi.string().required(), name: Joi.string().required() }),
};

const projectsController = {
    listProjects: async (_req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const response = await projectsModel.listProjects({ branch_id: tokenInfo.bid, emp_id: tokenInfo.eid });
        res.status(response.code).json(response);
    },

    createProject: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.createProject.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await projectsModel.createProject({ branch_id: tokenInfo.bid, emp_id: tokenInfo.eid, ...req.body });
        res.status(response.code).json(response);
    },

    updateProject: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.updateProject.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await projectsModel.updateProject(req.body);
        res.status(response.code).json(response);
    },

    listModules: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const response = await projectsModel.listModules({
            branch_id: tokenInfo.bid,
            project_id: req.query.project_id as string,
        });
        res.status(response.code).json(response);
    },

    createModule: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.createModule.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await projectsModel.createModule({ branch_id: tokenInfo.bid, ...req.body });
        res.status(response.code).json(response);
    },

    updateModule: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) { unauthorizedResponse("permission denied", res); return; }

        const { error } = schema.updateModule.validate(req.body);
        if (error) { parameterMissingResponse(error.details[0].message, res); return; }

        const response = await projectsModel.updateModule(req.body);
        res.status(response.code).json(response);
    },
};

export default projectsController;
