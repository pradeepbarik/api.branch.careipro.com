import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_routine_task_completions';

const RoutineTaskCompletionSchema = new Schema({
    branch_id: { type: Number, required: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_routine_tasks', required: true },
    rep_id: { type: Schema.Types.ObjectId, ref: 'coll_employees', required: true },
    date: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Done', 'Skipped'],
        default: 'Pending',
    },
    updated_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    note: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    rating_comment: { type: String, default: '' },
    rated_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    rated_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

RoutineTaskCompletionSchema.index({ task_id: 1, date: 1 }, { unique: true });

const getRoutineTaskCompletionsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, RoutineTaskCompletionSchema);
};

export default getRoutineTaskCompletionsModel;
