import { Schema, model } from "mongoose";
import { coll_appointments } from './collections';
const appointmentSchema = new Schema({
    branch_id: { type: Number },
    clinic_id: { type: Number, index: true },
    doctor_id: { type: Number, index: true },
    service_loc_id: { type: Number },
    year: { type: Number, index: true },
    month: { type: Number, index: true },
    appointments: [{
        id:{type:Number},
        today_booking_id:{type:String},
        user_id:{type:Number},
        user_type:{type:String},
        display_order:{type:String},
        patient_name:{type:String},
        patient_mobile:{type:String},
        patient_email:{type:String},
        patient_address:{type:String},
        patient_age:{type:Number},
        patient_gender:{type:String},
        booked_through:{type:String},
        booking_charge:{type:Number},
        doctor_fee_type:{type:Number},
        service_charge:{type:Number},
        total_amount:{type:Number},
        booking_time:{type:Date},
        consult_date:{type:Date},
        expired_time:{type:Date},
        status:{type:String},
        payment_status:{type:String},
        payment_method:{type:String},
        cancelled_time:{type:Date},
        is_auto_filled:{type:Number},
        prescription:[String],
        logs:[{time:Date,message:String}]
    }]
})