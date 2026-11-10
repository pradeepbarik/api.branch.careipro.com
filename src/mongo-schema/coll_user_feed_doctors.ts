import mongoose, { Schema } from "mongoose";
import { COLL_USER_FEED_DOCTORS } from "./collections";
/* Read side of the personalised user feed that api.careipro.com writes (POST /user/feed-track and
   the booking hook). One document per (user, doctor) holding raw counters; the branch only reports
   on it, so the schema is loose and the full field notes live with the writer in
   api.careipro.com/src/mongo-schema/coll_user_feed_doctors.ts */
const userFeedDoctorSchema = new Schema({
    user_id: { type: Number },
    doctor_id: { type: Number },
    service_loc_id: { type: Number },
    clinic_id: { type: Number },// the last clinic the user saw this doctor at
    cat_id: { type: Number },// last search specialty the doctor was opened from, 0 = never via search
    state: { type: String },
    city: { type: String },// the doctor's city
    views: { type: Number },// distinct days the detail page was opened
    actions: { type: Number },// call / whatsapp / direction clicks
    bookings: { type: Number },
    hidden: { type: Boolean },// user tapped x on the card
    first_at: { type: Date },
    last_at: { type: Date },
}, { versionKey: false, strict: false });
export const userFeedDoctorModel = mongoose.model(COLL_USER_FEED_DOCTORS, userFeedDoctorSchema);
