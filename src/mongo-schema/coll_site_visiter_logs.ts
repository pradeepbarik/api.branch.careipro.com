import { Schema, model } from 'mongoose';
import { COLL_SITE_VISITER_LOGS } from './collections';
const siteVisiterLogsSchema = new Schema({
    guid: { type: Number },
    user_id: { type: Number },
    visit_time: { type: Date },
    page_name: { type: String, index: true },
    page_type: { type: String, default: "" },
    section_name: { type: String, default: "" },
    last_visit_time: { type: Date },
    visit_count:{type:Number},
    referer: { type: String },
    referer_host: { type: String, default: "" },
    is_internal_referer: { type: Boolean, default: false },
    device: { type: String, default: "" },// mobile\tablet\desktop\bot
    os: { type: String, default: "" },
    browser: { type: String, default: "" },
    state: { type: String },
    city: { type: String, index: true },
    clinic_id: { type: Number, index: true },
    doctor_id: { type: Number, index: true },
    utm_campaign: { type: String },
    utm_medium: { type: String },
    utm_source: { type: String },
    events: [
        {
            ev_tp: { type: String },//event_type = imp\click
            ev_tm: { type: Date },// event_time
            ev_nm: { type: String },// event_name= call_click,whatspapp_click,
            ev_sec: { type: String },// section of the page the event fired from
            ev_val: { type: String },// optional value, eg the filter option chosen
        }
    ]
})
const siteVisiterLogModel = model(COLL_SITE_VISITER_LOGS, siteVisiterLogsSchema);
export default siteVisiterLogModel;