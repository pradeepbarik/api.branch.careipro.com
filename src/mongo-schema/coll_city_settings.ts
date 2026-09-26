import mongoose, { Schema } from "mongoose";
import { COLL_CITY_SETTINGS } from "./collections";
const citySettingsSchema = new Schema({
    city: { type: String, required: true, unique: true },
    state: { type: String },
    patient_support_contact_no: { type: String },
    patient_support_staff_name: { type: String },
    support_time_message: { type: String },
    city_manager_name: { type: String },
    city_manager_contact_no: { type: String },
}, { timestamps: true });
citySettingsSchema.index({ city: 1 });
export const CitySettingsModel = mongoose.model(COLL_CITY_SETTINGS, citySettingsSchema);