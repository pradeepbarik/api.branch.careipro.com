import { Schema,model } from "mongoose";
import { COLL_CAMPAIGNS,COLL_ADS } from "./collections";
const coll_ads = new Schema({
    branch_city: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: COLL_CAMPAIGNS, required: true },
    advatiserName: { type: String, required: true },
    isServicePromotion: { type: Boolean, default: false }, // true = internal service promotion, false = paid advertiser ad
    bidAmount: { type: Number, default: 1 }, // Bid amount for weighted ad selection
    pricingModel: { type: String, required: true }, // cpc, cpm, cpa, fixed
    campaign_name: { type: String, default: "" },
    media_type: { type: String, required: true },// image or video
    link: { type: String, default: "" },
    alt: { type: String, default: "" },
    asp_ratio:{type: String, required: true},// aspect ratio of the image, 1:1, 16:9, etc
    status: { type: String, required: true },// active, paused, completed
    page_types: [{ type: String }],// all, home, doctor_list, doctor_detail, clinic_list, clinic_detail
    banner_categories: [{ type: Number }],// specialist category IDs where banner should appear
    target_cities: [{ type: String }],// cities where ad should be displayed (empty = all cities)
    banner_link: { type: String, required: true },// URL where banner redirects on click
    cta_button_text: { type: String, default: "" },// Call-to-action button text
    cta_button_url: { type: String, default: "" },// Call-to-action button URL
    created_at: { type: Date, default: Date.now },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    target_impression: { type: Number, default: 0 },
    target_click: { type: Number, default: 0 },
    impression: { type: Number, default: 0 },
    click: { type: Number, default: 0 },
    conversion: { type: Number, default: 0 },
});
export const adsModel = model(COLL_ADS, coll_ads);