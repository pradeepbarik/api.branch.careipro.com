import { Schema,model } from "mongoose";
import { COLL_ADS, COLL_CAMPAIGNS } from "./collections";
const coll_campaigns = new Schema({
    branch_city: { type: String, required: true },
    sales_emp_id: { type: Number, required: true },
    advertiserId: { type: Number, default: null },// clinic id or doctor id,caretaker id depending on campaign (null for service promotions)
    advertiserName: { type: String, required: true },
    doctor_id: { type: Number },// optional, only for clinic campaign, to target ads to specific doctor page
    advertiserBusinessType: { type: String, required: true },// clinic, doctor, caretaker
    isServicePromotion: { type: Boolean, default: false },// true = internal service/promotion ad (no advertiser), false = paid advertiser ad
    campaignName: { type: String, required: true },
    campaignType: { type: String, required: true },// banner, video, etc
    status: { type: String, required: true },// active, paused, completed
    budget: { total:Number, daily: Number  },
    pricingModel: { type: String, default: null },// cpc, cpm, cpa, fixed (null for service promotions)
    bidAmount: { type: Number, default: null },// (null for service promotions)
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    targetImpression: { type: Number, default: 0 },
    targetClick: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    ads: [{ type: Schema.Types.ObjectId, ref: COLL_ADS }],
});
export const campaignsModel = model(COLL_CAMPAIGNS, coll_campaigns);