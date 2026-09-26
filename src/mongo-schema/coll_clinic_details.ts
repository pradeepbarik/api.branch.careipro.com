import mongoose, { Schema } from "mongoose";
import { COLL_CLINIC_DETAILS } from "./collections";
const clinicDetailsSchema = new Schema({
    clinic_id: { type: String, required: true, unique: true },
    /* kept alongside the clinic so this collection can be read per city without
       joining back to mysql, the same way the page settings collection works */
    state: { type: String },
    city: { type: String },
    socialMediaVideos: [{ url: String, title: String,aspect_ratio:String,source:String }],
}, { timestamps: true });
clinicDetailsSchema.index({ clinic_id:1, city: 1 });
export const ClinicDetailsModel = mongoose.model(COLL_CLINIC_DETAILS, clinicDetailsSchema);