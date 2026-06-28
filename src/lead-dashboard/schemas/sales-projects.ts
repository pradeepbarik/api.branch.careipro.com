import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_projects';

const SalesProjectSchema = new Schema({
    branch_id: { type: Number, required: true },
    name: { type: String, required: true },
    prefix: { type: String, required: true, uppercase: true },
    is_public: { type: Boolean, default: true },
    created_by: { type: Number, default: null },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const getSalesProjectsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, SalesProjectSchema);
};

export default getSalesProjectsModel;
