import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_monthly_targets';

const MonthlyTargetSchema = new Schema({
    branch_id: { type: Number, required: true },
    rep_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_reps', required: true },
    month: { type: String, required: true }, // format: YYYY-MM
    metrics: {
        clinic_onboard: { type: Number, default: 0 },
        banner_sales: { type: Number, default: 0 },
        software_sales: { type: Number, default: 0 },
        appointment_booking: { type: Number, default: 0 },
        website_development: { type: Number, default: 0 },
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

MonthlyTargetSchema.index({ rep_id: 1, month: 1 }, { unique: true });

const getMonthlyTargetsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, MonthlyTargetSchema);
};

export default getMonthlyTargetsModel;
