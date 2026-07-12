import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_routine_day_logs';

const RoutineDayLogSchema = new Schema({
    branch_id: { type: Number, required: true },
    rep_id: { type: Schema.Types.ObjectId, ref: 'coll_employees', required: true },
    date: { type: String, required: true },
    note: { type: String, default: '' },
    created_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

RoutineDayLogSchema.index({ rep_id: 1, date: 1 }, { unique: true });

const getRoutineDayLogsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, RoutineDayLogSchema);
};

export default getRoutineDayLogsModel;
