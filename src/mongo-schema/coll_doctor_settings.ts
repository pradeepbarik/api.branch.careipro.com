import {COLL_DOCTORS_SETTINGS} from './collections';
import { model, Schema } from 'mongoose';
const doctorSettingsSchema = new Schema({
    doctor_id: {type:Number,index:true},
    clinic_id: Number,
    city: {type:String,index:true},
    treated_health_conditions: [{condition: String, severity_levels: [String],no_of_cases:Number}],
    treatments_available: [String],
    similar_business_sections: [{_id:false, heading: String, doctor_ids: [Number],clinic_ids:[Number]}],
});
const doctorSettingsMongoModel = model(COLL_DOCTORS_SETTINGS, doctorSettingsSchema);
export default doctorSettingsMongoModel;