import {COLL_DOCTORS_SETTINGS} from './collections';
import { model, Schema } from 'mongoose';
const doctorSettingsSchema = new Schema({
    doctor_id: {type:Number,index:true},
    clinic_id: Number,
    city: {type:String,index:true},
    treated_health_conditions: [{condition: String, severity_levels: [String],no_of_cases:Number}],
    treatments_available: [String],
    similar_business_sections: [{_id:false, heading: String, doctor_ids: [Number],clinic_ids:[Number]}],
    faqs: [{question: String, answer: String}],
    sms_email_settings: {
        online_booking: {sms_to_patient: Boolean,patient_support_contact_no: String,sms_to_vendor: Boolean,watcher_emails:[String]},
        offline_booking: {sms_to_patient: Boolean,patient_support_contact_no: String,sms_to_vendor: Boolean,watcher_emails:[String]},
        booking_request: {sms_to_patient: Boolean,patient_support_contact_no: String,sms_to_vendor: Boolean,watcher_emails:[String]},
        send_enquiry: {sms_to_patient: Boolean,patient_support_contact_no: String,sms_to_vendor: Boolean,watcher_emails:[String]},
    }
});
const doctorSettingsMongoModel = model(COLL_DOCTORS_SETTINGS, doctorSettingsSchema);
export default doctorSettingsMongoModel;