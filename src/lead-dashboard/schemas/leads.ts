import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_leads';

const LeadSchema = new Schema({
    branch_id: { type: Number, required: true },
    lead_code: { type: String, default: '' },
    date_added: { type: String, required: true },
    clinic_name: { type: String, required: true },
    contact_person: { type: String, required: true },
    mobile: { type: String, required: true },
    alternate_mobile: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    lead_source: { type: String, enum: ['Field', 'Call', 'Referral', 'Website'], required: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
    status: {
        type: String,
        enum: ['New Lead', 'Contacted', 'Demo Scheduled', 'Demo Done', 'Interested', 'Negotiation', 'Closed Won', 'Closed Lost'],
        default: 'New Lead',
    },
    interest_level: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Warm' },
    requirement: { type: String, enum: ['Software', 'Website', 'Both'], default: 'Software' },
    project_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_projects', default: null },
    module_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_modules', default: null },
    last_contact_date: { type: String, default: '' },
    next_follow_up_date: { type: String, default: '' },
    expected_value: { type: Number, default: 0 },
    expected_business: { type: String, default: '' },
    notes: { type: String, default: '' },
    assignment_log: [{
        _id: false,
        assigned_to: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
        assigned_by: { type: Schema.Types.ObjectId, ref: 'coll_employees', default: null },
        assigned_at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
    }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const getLeadsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, LeadSchema);
};

export default getLeadsModel;
