import { Schema,model } from "mongoose";
import {COLL_CLINIC_INFO_CHANGE_TRACKERS} from './collections';
export const collClinicTblChangeTrackers=new Schema({
    clinic_id:Number,
    appointments:Object,
    doctors:Object,
    last_modified_time:{type:Date}
});
export const clinicInfoChangeTrackerModel=model(COLL_CLINIC_INFO_CHANGE_TRACKERS,collClinicTblChangeTrackers);
