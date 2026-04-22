import { Schema, model } from 'mongoose';
import { COLL_MEDICINES } from './collections';
const medicineSchema = new Schema({
    seo_id: { type: String, index: true },
    medical_type: { type: String }, // e.g. "Allopathy", "Ayurvedic", "Homeopathic"
    cat_ids: [Number],
    name: { type: String, required: true },
    generic_name: { type: String },
    brand_name: { type: String },
    composition: { type: String },
    dosage_form: { type: String },// tablet, syrup, injection
    image: [{ _id: false, type: String }],
    strength: { type: String },// 500mg, 250ml
    manufacturer: { type: String },
    mrp: { type: Number },
    description: [{
        _id: false,
        heading: { type: String },
        message: { type: String },
        icon: { type: String }
    }],
    is_prescription_required: { type: Boolean, default: false },
    entry_date: { type: Date, default: Date.now },
    storage_conditions: { type: String }, // e.g. "Store in a cool, dry place away from direct sunlight."
    uses_for: [{
        _id: false,
        heading: { type: String },
        message: { type: String },
        icon: { type: String }
    }], // comma separated values of treatment ids for which this medicine is used 
    precautions: [{
        _id: false,
        heading: { type: String },
        message: { type: String },
        icon: { type: String }
    }], // comma separated values of precautions to be taken while using this medicine
    side_effects: [{
        _id: false,
        heading: { type: String },
        message: { type: String },
        icon: { type: String }
    }], // comma separated values of side effects of this medicine
    related_products:[String],
    similar_products:[String],
    seo_data:{
        url: { type: String },
        title: { type: String },
        description: { type: String },
        keywords: [String]
    }
}, { strict: false });
const medicineMongoModel = model(COLL_MEDICINES, medicineSchema);
export default medicineMongoModel;