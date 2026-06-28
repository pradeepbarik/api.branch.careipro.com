import { Schema } from "mongoose";

const COLLECTION_NAME = 'coll_sales_incentive_slabs';

const IncentiveSlabSchema = new Schema({
    branch_id: { type: Number, required: true },
    min_percent: { type: Number, required: true },
    max_percent: { type: Number, default: null },
    amount: { type: Number, required: true },
    label: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const getIncentiveSlabsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) return MANAGEMENT_DB.models[COLLECTION_NAME];
    return MANAGEMENT_DB.model(COLLECTION_NAME, IncentiveSlabSchema);
};

export default getIncentiveSlabsModel;
