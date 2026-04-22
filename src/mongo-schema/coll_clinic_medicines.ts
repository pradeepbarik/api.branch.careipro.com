import { Schema,model } from "mongoose";
import { COLL_CLINIC_MEDICINES } from "./collections";
const clinicMedicineSchema = new Schema({
    clinic_id: { type: String, index: true },
    medicines:[{
        _id: false,
        medicine_id: { type: Schema.Types.ObjectId, index: true },
        store_price: { type: Number, required: true },
        discount_tag: { type: String }, // e.g. "10% off", "Buy 1 Get 1 Free"
        delivery_time_tag: { type: String }, // e.g. "Instant delivery", "2 days delivery"
        entry_date: { type: Date, default: Date.now }
    }],
}, { strict: false });
const clinicMedicineMongoModel = model(COLL_CLINIC_MEDICINES, clinicMedicineSchema);
export default clinicMedicineMongoModel;