import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_daily_activities';

const DailyActivitySchema = new Schema({
    branch_id: { type: Number, required: true },
    rep_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_reps', required: true },
    date: { type: String, required: true },
    visits_done: { type: Number, default: 0 },
    calls_made: { type: Number, default: 0 },
    demos_given: { type: Number, default: 0 },
    closures: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

DailyActivitySchema.index({ rep_id: 1, date: 1 }, { unique: true });

const getDailyActivitiesModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, DailyActivitySchema);
};

export default getDailyActivitiesModel;
