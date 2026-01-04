import { Request, Response } from "express";
import Joi from "joi";
import taskManagementModel from "../../model/task-management";
import { parameterMissingResponse, successResponse, unauthorizedResponse } from "../../services/response";
const requestParams = {
    createTask: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow("", null),
        priority: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        due_date: Joi.string().allow('', null),
        target_start_time: Joi.string().allow('', null),
        tags: Joi.array().items(Joi.string()),
        parent_task_id: Joi.string().allow('', null),
        task_type:Joi.string().allow('', null),
    }),
    tasksList: Joi.object({
        case: Joi.string().valid('all_tasks', 'my_tasks').required(),
        status: Joi.string().allow('', null),
        status_not_in: Joi.string().allow('', null),
        priority: Joi.string().allow('', null),
    }),
    assignEmployeeToTask: Joi.object({
        emp_id: Joi.number().required(),
        emp_name: Joi.string().required(),
        task_id: Joi.string().required(),
    }),
    changeReporterOfTask: Joi.object({
        task_id: Joi.string().required(),
        emp_id: Joi.number().required(),
        emp_name: Joi.string().required(),
    }),
}
const manageTaskController = {
    employeeList: async (req: Request, res: Response) => {
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let rows = await DB.get_rows("select id,concat(first_name,' ',last_name) as name from employee where branch_id=? and status='active' order by first_name asc", [tokenInfo.bid]);
        res.json(successResponse(rows, "Employee list fetched successfully"));
    },
    createTask: async (req: Request, res: Response) => {
        // Logic to create a new task
        const { error, value } = requestParams.createTask.validate(req.body);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.createTask({
            branch_id: tokenInfo.bid,
            created_by: { emp_id: tokenInfo.eid, name: emp_info.first_name },
            task_type: req.body.task_type,
            title: req.body.title,
            description: req.body.description,
            priority: req.body.priority,
            due_date: req.body.due_date,
            tags: req.body.tags ? req.body.tags : [],
            target_start_time: req.body.target_start_time,
            parent_task_id: req.body.parent_task_id,
        });
        res.status(response.code).json(response);
    },
    tasksList: async (req: Request, res: Response) => {
        const { error, value } = requestParams.tasksList.validate(req.query);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            res.status(400).json({ success: false, message: error.details[0].message });
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let emp_id: number | undefined = undefined;
        if (req.query.case === 'my_tasks') {
            emp_id = tokenInfo.eid;
        }
        let response = await taskManagementModel.tasksList({
            branch_id: tokenInfo.bid,
            emp_id: emp_id,
            status: req.query.status ? (<string>req.query.status).split(',') : [],
            status_not_in: req.query.status_not_in ? (<string>req.query.status_not_in).split(',') : [],
            priority: req.query.priority ? (<string>req.query.priority).split(',') : [],
        });
        res.status(response.code).json(response);
    },
    taskDetail: async (req: Request, res: Response) => {
        const { task_id } = req.query;
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.taskDetail({
            task_id: <string>task_id,
        });
        res.status(response.code).json(response);
    },
    assignEmployeeToTask: async (req: Request, res: Response) => {
        // Logic to assign employee to a task
        const { error, value } = requestParams.assignEmployeeToTask.validate(req.body);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.assignTaskEmployee({
            logged_in_emp_id: tokenInfo.eid,
            logged_in_emp_name: emp_info.first_name,
            emp_id: req.body.emp_id,
            emp_name: req.body.emp_name,
            task_id: req.body.task_id,
        });
        res.status(response.code).json(response);
    },
    addCommentToTask: async (req: Request, res: Response) => {
        const { task_id, comment } = req.body;
        if (!task_id || !comment) {
            parameterMissingResponse("task_id and comment are required", res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.addCommentToTask({
            task_id: task_id,
            emp_id: tokenInfo.eid,
            emp_name: emp_info.first_name,
            comment: comment,
        });
        res.status(response.code).json(response);
    },
    changeReporterOfTask: async (req: Request, res: Response) => {
        const { error, value } = requestParams.changeReporterOfTask.validate(req.body);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.changeReporterOfTask({
            task_id: req.body.task_id,
            emp_id: req.body.emp_id,
            emp_name: req.body.emp_name,
        });
        res.status(response.code).json(response);
    },
    changeTaskStatus: async (req: Request, res: Response) => {
        const { task_id, status } = req.body;
        if (!task_id || !status) {
            parameterMissingResponse("task_id and status are required", res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.changeTaskStatus({
            emp_id: tokenInfo.eid,
            emp_name: emp_info.first_name,
            task_id: task_id,
            status: status,
        });
        res.status(response.code).json(response);
    },
    changePriorityOfTask: async (req: Request, res: Response) => {
        const { task_id, priority } = req.body;
        if (!task_id || !priority) {
            parameterMissingResponse("task_id and priority are required", res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.changePriorityOfTask({
            emp_id: tokenInfo.eid,
            emp_name: emp_info.first_name,
            task_id: task_id,
            priority: priority,
        });
        res.status(response.code).json(response);
    },
    deleteTask: async (req: Request, res: Response) => {
        const { task_id } = req.body;
        if (!task_id) {
            parameterMissingResponse("task_id is required", res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await taskManagementModel.deleteTask({
            task_id: task_id,
            emp_id: tokenInfo.eid,
        });
        res.status(response.code).json(response);
    },
}
export default manageTaskController;