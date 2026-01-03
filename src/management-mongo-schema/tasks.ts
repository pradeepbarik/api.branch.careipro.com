import { Schema } from "mongoose";
import { getManagementDevDb, getManagementDb } from "../db";

const COLLECTION_NAME = 'coll_tasks';
const DEV_MODE: string = <string>process.env.NODE_ENV;

// Get the correct database connection based on environment
const getManagementDB = () => {
    if (global.MANAGEMENT_DB) {
        return global.MANAGEMENT_DB;
    }
    // Fallback: initialize if not already done
    return DEV_MODE === 'production' ? getManagementDb() : getManagementDevDb();
};

const TaskSchema = new Schema({
    branch_id: { type: Number, required: true },
    task_type: { type: String },
    parent_task_id: { type: Schema.Types.ObjectId, ref: COLLECTION_NAME, default: null },
    title: { type: String, required: true },
    description: { type: String, required: false },
    additional_changes: { type: String, required: false },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    status: { type: String, enum: ['backlog', 'to_do', 'in_progress', 'on_hold', 'postponed', 'completed'], default: 'backlog' },
    tags: [String],
    created_at: { type: Date, default: Date.now },
    created_by: { emp_id: Number, name: String },
    due_date: { type: Date, default: null },
    target_start_time: { type: Date, required: false },
    start_time: { type: Date, required: false },
    end_time: { type: Date, required: false },
    assigned_to: { type: { emp_id: Number, name: String }, default: null },
    reporter: { type: { emp_id: Number, name: String }, default: null },
    assign_log: [
        {
            from: { emp_id: Number, name: String },
            to: { emp_id: Number, name: String },
            assigned_at: { type: Date, default: Date.now },
            assigned_by: { emp_id: Number, name: String }
        }
    ],
    comments: [{
        emp_id: Number,
        name: String,
        comment: String,
        commented_at: { type: Date, default: Date.now }
    }],
    activity_log: [{
        activity: String,
        activity_at: { type: Date, default: Date.now },
        activity_by: { emp_id: Number, name: String }
    }]
})

const getTasksModel = () => {
    const MANAGEMENT_DB = getManagementDB();
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, TaskSchema);
}

export default getTasksModel;