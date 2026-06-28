import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_follow_up_logs';

const FollowUpLogSchema = new Schema({
    lead_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_leads', required: true },
    contact_date: { type: String, required: true },
    contacted_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', required: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    status_after: {
        type: String,
        enum: ['New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation', 'Closed Won', 'Closed Lost'],
        required: true,
    },
    notes: { type: String, default: '' },
    next_follow_up_date: { type: String, default: '' },
    reminder_note: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    rating_comment: { type: String, default: '' },
    rated_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    rated_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
});

const getFollowUpLogsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, FollowUpLogSchema);
};

export default getFollowUpLogsModel;
