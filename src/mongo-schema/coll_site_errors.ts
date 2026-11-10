import mongoose, { Schema } from "mongoose";
import { COLL_SITE_ERRORS } from "./collections";
/* Read side of the errors careipro.com visitors run into, written by api.careipro.com
   (POST /log-error). The writer owns the indexes and the 7 day TTL - see
   api.careipro.com/src/mongo-schema/coll_site_errors.ts - so this schema does not declare any. */
const siteErrorSchema = new Schema({
    type: { type: String },// page_crash | js_error | promise_rejection | api_failure
    fingerprint: { type: String },// same problem = same fingerprint
    message: { type: String },
    stack: { type: String },
    page_url: { type: String },
    page_path: { type: String },
    api_url: { type: String },
    api_method: { type: String },
    api_status: { type: Number },// 0 = network error
    user_id: { type: Number },
    guid: { type: Number },
    device: { type: String },
    os: { type: String },
    browser: { type: String },
    created_at: { type: Date },
}, { versionKey: false, strict: false, autoIndex: false });
export const siteErrorModel = mongoose.model(COLL_SITE_ERRORS, siteErrorSchema);
