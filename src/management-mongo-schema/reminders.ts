import { Schema } from "mongoose";
const COLLECTION_NAME = 'coll_reminders';

const ReminderSchema = new Schema({
    emp_id: { type: Number, required: true },
    reminders: [{
        message: { type: String, required: true },
        created_at: { type: Date, default: Date.now },
        due_date: { type: Date, required: false }
    }]
});

const getRemindersModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, ReminderSchema);
}

export default getRemindersModel;