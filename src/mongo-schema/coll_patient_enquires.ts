import { Schema, model } from "mongoose";
import { COLL_PATIENT_ENQUIRES } from "./collections";
/*
status lifecycle: open -> resolved, or open -> cancelled
open = patient has submitted a query; staff may respond (resolution_note) while it stays open
resolved = the PATIENT has marked their own query resolved and rated it; terminal
cancelled = withdrawn/rejected while still open (by patient or staff); terminal, no rating
Note: only the patient can move a query to "resolved" - staff responses never change status.
*/
const coll_patient_enquires_schema = new Schema({
    user_id: { type: Number, required: true },
    patient_mobile: { type: String },
    doctor_id: { type: Number, required: true },
    clinic_id: { type: Number, required: true },
    servicelocation_id: { type: Number },
    doctor_name: { type: String },
    clinic_name: { type: String },
    city: { type: String },
    query: { type: String, required: true },
    status: { type: String, default: "open" }, // open, resolved, cancelled
    resolution_note: { type: String, default: "" }, // staff's response to the patient
    responded_by_emp_id: { type: Number, default: 0 },
    responded_at: { type: Date, default: null },
    resolved_by_user_id: { type: Number, default: 0 }, // patient who marked it resolved
    resolved_at: { type: Date, default: null },
    rating: { type: Number, default: 0 }, // 1-5, given by patient on resolve
    rating_feedback: { type: String, default: "" },
    cancelled_by: { type: String, default: "" }, // "patient" or "staff"
    cancelled_at: { type: Date, default: null },
    create_time: { type: Date, default: Date.now },
});
const coll_patient_enquires_model = model(COLL_PATIENT_ENQUIRES, coll_patient_enquires_schema);
export default coll_patient_enquires_model;
