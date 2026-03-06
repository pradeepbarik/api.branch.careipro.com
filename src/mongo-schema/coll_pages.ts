import { Schema, model } from "mongoose";
import { COLL_PAGES, COLL_DFORM_SUBMISSIONS } from './collections';
const dynamicPageSchema = new Schema({
    pageType: { type: String, index: true },//form,articles
    state: { type: String },
    city: { type: String, index: true },
    vertical: { type: String },
    category: { type: String },
    lang: { type: String },
    seo_url: { type: String, index: true },// hire-care-taker-in-bhadrak
    pageId: { type: Number },
    seoDt: { pageTitle: String, pageDescription: String },
    pageAccess: { global: { type: Boolean }, cities: { type: [String] } },
    logo: { type: String },
    coverPhoto: { mobile: String, desktop: String },
    banners: [{
        _id: false,
        image: String,
        altText: String,
    }],
    heading: String,
    subHeading: String,
    images: [{ image: String, altText: String, _id: false,aspectRatio: String }],
    sections: [
        {
            section_name: String,
            campaign: String,
            heading: String,
            subHeading: String,
            sectionType: String,//form,text,
            content: String,
            inputFields: [{
                key: String,
                label: String,
                placeHolder: String,
                required: Boolean,
                element: String,//input,dropdown,
                type: String,//text,number,mobile,
                options: [{ label: String, value: Schema.Types.Mixed }]
            }],
            button: { label: String, style: Schema.Types.Mixed, icon: String, apiCall: String }
        }
    ],
    log: [
        {
            updatedAt: { type: Date },
            updatedBy: { emp_id: Number, emp_name: String },//employee id
            message: String,
        }
    ]
}, { strict: false })
const dynamicPageModel = model(COLL_PAGES, dynamicPageSchema);
const dformSubmissionsSchema = new Schema({
    state: String,
    city: String,
    page_id: Number,
    section_name: String,
    user_id: { type: Number },
    guser_id: { type: Number },
    submit_time: { type: Date },
}, { strict: false })
export const dFormSubmissionsModel = model(COLL_DFORM_SUBMISSIONS, dformSubmissionsSchema);
export default dynamicPageModel;