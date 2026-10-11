import { model, Schema } from 'mongoose';
import { COLL_ANNOUNCEMENTS } from './collections';

/* The same collection the clinic dashboard writes to, so a notice a branch employee posts and one
   a clinic's own staff posts are the same record and appear in the same places. Kept in step with
   clinic-dashboard-api/src/mongo-schema/coll_announcements.ts. */
const announcementSchema = new Schema({
    clinic_id: { type: Number, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    /** "all" is the whole clinic; "specific" names doctors in target_doctor_ids */
    target_type: { type: String, enum: ['all', 'specific'], required: true, default: 'all' },
    target_doctor_ids: { type: [Number], default: [], index: true },
    service_location_ids: { type: [Number], default: [] },
    expiry_type: { type: String, enum: ['forever', 'datetime'], required: true, default: 'datetime' },
    expiry_date: { type: Date, index: true },
    is_active: { type: Boolean, default: true, index: true },
    created_by_user_id: { type: Number, required: true },
    created_by_user_name: { type: String, required: true },
    created_at: { type: Date },
    updated_at: { type: Date }
});
export const announcementModel = model(COLL_ANNOUNCEMENTS, announcementSchema);
