import { Schema, model } from "mongoose";
import {COLL_PAGE_SETTINGS} from './collections';
const pageSettingsSchema=new Schema({
    state: { type: String },
    city: { type: String },
    page:{type:String},
    sections:[
        {
            heading:{type:String},
            viewType:{type:String},
            enable:{type:Boolean}
        }
    ]
},{ strict: false })
export const pageSettingsModel = model(COLL_PAGE_SETTINGS, pageSettingsSchema);