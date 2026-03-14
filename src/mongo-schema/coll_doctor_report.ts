import { Schema,model } from "mongoose";
const doctorReportSchema = new Schema({
    doctor_id: { type: Number, index: true, unique: true },
    clinic_id: { type: Number, index: true },
    city: { type: String },
    total_bookings: { type: Number, default: 0 },
    total_consulted: { type: Number, default: 0 },
    total_online_bookings: { type: Number, default: 0 },
    avg_rating:{type:Number,default:0},
    total_rating:{type:Number,default:0},
    one_star:{type:Number,default:0},
    two_star:{type:Number,default:0},
    three_star:{type:Number,default:0},
    four_star:{type:Number,default:0},
    five_star:{type:Number,default:0}
},{strict:false});
export const doctorReportModel = model("coll_doctor_reports", doctorReportSchema);