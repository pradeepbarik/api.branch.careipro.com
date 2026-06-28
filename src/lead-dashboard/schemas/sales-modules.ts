import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_modules';

const SalesModuleSchema = new Schema({
    branch_id: { type: Number, required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'coll_sales_projects', required: true },
    name: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const getSalesModulesModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, SalesModuleSchema);
};

export default getSalesModulesModel;
