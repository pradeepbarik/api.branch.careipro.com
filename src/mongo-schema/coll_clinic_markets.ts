import { Schema, model } from "mongoose";
import { coll_clinic_markets } from './collections';
const clinicMarketsSchema = new Schema({
    state: { type: String },
    city: { type: String },
    markets: [
        {
            _id:false,
            name: String,
            is_prime:Boolean
        }
    ]
})
export const clinicMarketsModel = model(coll_clinic_markets, clinicMarketsSchema);