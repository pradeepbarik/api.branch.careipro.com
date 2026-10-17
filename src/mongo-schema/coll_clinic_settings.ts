import { model, Schema } from 'mongoose';
import { COLL_CLINIC_SETTINGS } from './collections';

/* Settings that govern how a clinic's own dashboard app behaves. The same collection
   clinic-dashboard-api reads, so what a branch employee saves here is what that clinic's staff get.
   Kept in step with clinic-dashboard-api/src/mongo-schema/clinic-settings.ts.

   There is at most one document per clinic, and until now nothing created it: the dashboard only
   ever read the collection, so saving has to upsert rather than assume a document is there. */
const clinicSettingsSchema = new Schema({
    clinic_id: { type: Number, index: true },
    /** shows the Actions menu beside Book Appointment on the dashboard's patient screen */
    show_appointment_action_btn: { type: Boolean },
    /** shows the Laboratory module in the dashboard's sidebar */
    show_lab_module: { type: Boolean },
});
export const clinicSettingsModel = model(COLL_CLINIC_SETTINGS, clinicSettingsSchema);
