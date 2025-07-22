import mongoose, { Schema } from "mongoose";
import { COLL_CLINIC_REPORTS } from "./collections";
const clinicReportSchema = new Schema({
    clinic_id: { type:Number, index: true,unique: true },
    total_bookings: { type: Number, default: 0 },
    total_consulted: { type: Number, default: 0 },
    doctors:[{
        _id:false,
        doctor_id: { type: Number,unique: true, index: true },
        total_bookings: { type: Number, default: 0 },
        total_consulted: { type: Number, default: 0 },
        total_online_bookings: { type: Number, default: 0 },
    }]
});
export default mongoose.model(COLL_CLINIC_REPORTS, clinicReportSchema);