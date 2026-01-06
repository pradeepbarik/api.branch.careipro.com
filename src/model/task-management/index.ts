import { serviceNotAcceptable, successResponse } from "../../services/response";
import getTasksModel from "../../management-mongo-schema/tasks";
import { Types } from "mongoose";
import { moment, get_current_datetime } from "../../services/datetime";
import getRemindersModel from "../../management-mongo-schema/reminders";
const taskManagementModel = {
    createTask: async (params: {
        branch_id: number;
        created_by: { emp_id: number, name: string };
        task_type: string;
        parent_task_id?: string;
        title: string;
        description: string;
        priority: string;
        tags?: string[];
        due_date: string;
        target_start_time?: string;
    }) => {
        let now = moment(get_current_datetime()).toDate(); // Get current date as Date object directly
        const TasksModel = getTasksModel();
        await new TasksModel({
            branch_id: parseInt(params.branch_id.toString()),
            task_type: params.task_type,
            parent_task_id: params.parent_task_id ? new Types.ObjectId(params.parent_task_id) : null,
            title: params.title,
            description: params.description,
            priority: params.priority,
            status: 'backlog',
            tags: params.tags ? params.tags : [],
            created_at: now,
            created_by: { emp_id: params.created_by.emp_id, name: params.created_by.name },
            due_date: params.due_date ? moment(params.due_date).toDate() : null,
            target_start_time: params.target_start_time ? moment(params.target_start_time).toDate() : undefined,
            activity_log: [{
                activity: "Task created",
                activity_at: now,
                activity_by: { emp_id: params.created_by.emp_id, name: params.created_by.name }
            }]
        }).save();
        return successResponse({}, "Task created successfully");
    },
    assignTaskEmployee: async (params: {
        logged_in_emp_id: number;
        logged_in_emp_name: string;
        emp_id: number;
        emp_name: string;
        task_id: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return successResponse({}, "Task not found");
        }
        task.assign_log.push({
            from: task.assigned_to ? task.assigned_to : { emp_id: 0, name: 'Unassigned' },
            to: { emp_id: parseInt(params.emp_id.toString()), name: params.emp_name },
            assigned_at: new Date(get_current_datetime()),
            assigned_by: { emp_id: params.logged_in_emp_id, name: params.logged_in_emp_name } // This should be the actual assigner info
        });
        task.assigned_to = { emp_id: parseInt(params.emp_id.toString()), name: params.emp_name };
        await task.save();
        return successResponse({}, "Employee assigned to task successfully");
    },
    tasksList: async (params: {
        branch_id: number;
        emp_id?: number;
        status?: string[];
        status_not_in?: string[];
        priority?: string[];
    }) => {
        const TasksModel = getTasksModel();
        let filter: any = {
            branch_id: parseInt(params.branch_id.toString()),
        };
        if (params.emp_id) {
            filter['assigned_to.emp_id'] = parseInt(params.emp_id.toString());
        }
        if (params.status && params.status.length > 0) {
            filter['status'] = { $in: params.status };
        }
        if (params.status_not_in && params.status_not_in.length > 0) {
            filter['status'] = { $nin: params.status_not_in };
        }
        if (params.priority && params.priority.length > 0) {
            filter['priority'] = { $in: params.priority };
        }
        let tasks = await TasksModel.find(filter, "_id branch_id task_type title priority status tags created_at created_by due_date target_start_time assigned_to").sort({ due_date: 1 }).lean();
        return successResponse({ tasks }, "Tasks fetched successfully");
    },
    taskDetail: async (params: {
        task_id: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id)).lean();
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        let sub_tasks = await TasksModel.find({ parent_task_id: new Types.ObjectId(params.task_id) }, "_id branch_id task_type title priority status tags created_at created_by due_date target_start_time assigned_to").sort({ due_date: 1 }).lean();
        for(let st of sub_tasks){
          let sbts  = await TasksModel.find({parent_task_id: st._id}, "_id").lean();
           st.sub_task_cnt = sbts.length;
        }
        task = { ...task, sub_tasks: sub_tasks };
        return successResponse(task, "Task detail fetched successfully");
    },
    addCommentToTask: async (params: {
        task_id: string;
        emp_id: number;
        emp_name: string;
        comment: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        task.comments.push({
            emp_id: parseInt(params.emp_id.toString()),
            name: params.emp_name,
            comment: params.comment,
            commented_at: new Date(get_current_datetime())
        });
        await task.save();
        return successResponse({}, "Comment added to task successfully");
    },
    changeReporterOfTask: async (params: {
        task_id: string;
        emp_id: number;
        emp_name: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        if (task.status !== "backlog" && task.status !== "to_do") {
            if (task.reporter === undefined || task.reporter === null) {
                // If no reporter is set, allow setting it
            } else {
                return serviceNotAcceptable("Reporter can be changed only for tasks in backlog or to_do status");
            }
        }
        task.activity_log.push({
            activity: `Reporter changed from ${task.reporter?.name || 'unknown'} to ${params.emp_name}`,
            activity_at: new Date(get_current_datetime()),
            activity_by: { emp_id: params.emp_id, name: params.emp_name }
        });
        task.reporter = { emp_id: parseInt(params.emp_id.toString()), name: params.emp_name };
        await task.save();
        return successResponse({}, "Reporter changed successfully");
    },
    changeTaskStatus: async (params: {
        emp_id: number;
        emp_name: string;
        task_id: string;
        status: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        task.activity_log.push({
            activity: `Status changed from ${task.status} to ${params.status}`,
            activity_at: new Date(get_current_datetime()),
            activity_by: { emp_id: params.emp_id, name: params.emp_name }
        });
        task.status = params.status;
        await task.save();
        return successResponse({}, "Task status updated successfully");
    },
    changePriorityOfTask: async (params: {
        emp_id: number;
        emp_name: string;
        task_id: string;
        priority: string;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        task.activity_log.push({
            activity: `Priority changed from ${task.priority} to ${params.priority}`,
            activity_at: new Date(get_current_datetime()),
            activity_by: { emp_id: params.emp_id, name: params.emp_name }
        });
        task.priority = params.priority;
        await task.save();
        return successResponse({}, "Task priority updated successfully");
    },
    deleteTask: async (params: {
        task_id: string;
        emp_id: number;
    }) => {
        const TasksModel = getTasksModel();
        let task = await TasksModel.findById(new Types.ObjectId(params.task_id));
        if (!task) {
            return serviceNotAcceptable("Task not found");
        }
        // check if task is in backlog and params.emp_id is the creator of the task
        if(task.status!=="backlog"){
            return serviceNotAcceptable("Only tasks in backlog can be deleted");
        }
        if (task.created_by.emp_id !== params.emp_id) {
            return serviceNotAcceptable("Only the creator can delete tasks");
        }
        let sub_tasks = await TasksModel.find({ parent_task_id: new Types.ObjectId(params.task_id) }, "_id").lean();
        if (sub_tasks.length > 0) {
            return serviceNotAcceptable("Cannot delete task with existing sub-tasks");
        }
        await TasksModel.deleteOne({ _id: new Types.ObjectId(params.task_id) });
        return successResponse({}, "Task deleted successfully");
    },
    getAllReminders: async (params: {
        emp_id: number;
    }) => {
        // Placeholder for fetching reminders from the database
        const remindersModel = getRemindersModel();
        let remindersDoc = await remindersModel.findOne({ emp_id: parseInt(params.emp_id.toString()) }).lean();
        let reminders = [];
        if (remindersDoc && remindersDoc.reminders) {
            reminders = remindersDoc.reminders.map((r: any) => ({
                id: r._id.toString(),
                message: r.message,
                due_date: r.due_date,
                created_at: r.created_at
            }));
        }
        return successResponse({ reminders }, "Reminders fetched successfully");
    },
    createReminder: async (params: {
        emp_id: number;
        message: string;
        due_date?: string;
    }) => {
        // Placeholder for creating a reminder in the database
        const remindersModel = getRemindersModel();
        remindersModel.findOneAndUpdate(
            { emp_id: parseInt(params.emp_id.toString()) },
            {
                $push: {
                    reminders: {
                        message: params.message,
                        due_date: params.due_date ? moment(params.due_date).toDate() : undefined,
                        created_at: new Date(get_current_datetime())
                    }
                }
            },
            { upsert: true, new: true }
        ).exec();   
        return successResponse({}, "Reminder created successfully");
    },
    deleteReminder: async (params: {
        emp_id: number;
        reminder_id: string;
    }) => {
        // Placeholder for deleting a reminder from the database
        const remindersModel = getRemindersModel();
        await remindersModel.findOneAndUpdate(
            { emp_id: parseInt(params.emp_id.toString()) },
            {
                $pull: {
                    reminders: { _id: new Types.ObjectId(params.reminder_id) }
                }
            }
        ).exec();
        return successResponse({}, "Reminder deleted successfully");
    },
};

export default taskManagementModel;