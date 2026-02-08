import mongoose, { Schema } from "mongoose";
import { COLL_CLINIC_DAILY_REPORTS } from "./collections";
export const ClinicDailyReportSchema = new Schema({
    clinic_id: { type: Number, required: true, index: true },
    doctor_id: { type: Number, required: true, index: true },
    report_date: { type: Date, required: true, index: true },
    report_date_year: { type: Number, required: true },
    report_date_month: { type: Number, required: true },
    report_date_day: { type: Number, required: true },
    total_patients: { type: Number, default: 0 },
    online_booked_patients: { type: Number, default: 0 },
});
export const ClinicDailyReportModel = mongoose.model(COLL_CLINIC_DAILY_REPORTS, ClinicDailyReportSchema);