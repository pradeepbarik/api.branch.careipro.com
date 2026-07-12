import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_routine_tasks';

const RoutineTaskSchema = new Schema({
    branch_id: { type: Number, required: true },
    rep_id: { type: Schema.Types.ObjectId, ref: 'coll_employees', required: true },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    lead_name: { type: String, default: '' },
    task_type: {
        type: String,
        enum: ['Follow-up', 'Operational', 'Request Slot'],
        default: 'Operational',
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const getRoutineTasksModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, RoutineTaskSchema);
};

export default getRoutineTasksModel;
