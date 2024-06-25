import {model,Schema} from 'mongoose';
import {COLL_CITY_PINCODES} from './collections';
export const citySettingsSchema=new Schema({
    state: String,
    city: String,
    pincodes:[{
        _id:false,
        pincode: String,
        name: String,
        description: String,
        branch_type: String,
        circle: String,
        district: String,
        division: String,
        region: String,
        block: String,
        lastUpdateTime:Date
    }],
    nearbyCities:[{
        _id:false,
        state:String,
        city:String
    }]
})
const citySettingsModel=model(COLL_CITY_PINCODES,citySettingsSchema);
export default citySettingsModel;