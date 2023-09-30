import { model, Schema } from 'mongoose';
import {coll_village_lists} from './collections';
const villageSchema = new Schema({
    state: String,
    district: String,
    sub_district: String,
    sub_dist_code: Number,
    villages:[{
        name:String,
        lgd_code:Number,
        village_status:String        
    }]
})
const villageMongoModel=model(coll_village_lists,villageSchema);
export default villageMongoModel;