import { Schema } from "mongoose";
const COLLECTION_NAME = 'coll_employee_duty_settings';
/**
 * The duty rules applied to an employee. A document at emp_id 0 holds the branch wide default, an
 * employee document overrides only the fields it fills, so a branch can change one rule for one
 * employee without repeating the rest.
 */
const EmployeeDutySettingsSchema = new Schema({
    branch_id: { type: Number, required: true },
    //0 is the branch wide default used by every employee without their own settings
    emp_id: { type: Number, required: true },
    working_start_time: { type: String },
    working_end_time: { type: String },
    daily_working_hours: { type: Number },
    //a completed duty shorter than this is counted as a half day
    full_day_min_hours: { type: Number },
    updated_by: { emp_id: Number, emp_code: String, name: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

//one settings document per employee per branch, the upsert on save depends on it
EmployeeDutySettingsSchema.index({ branch_id: 1, emp_id: 1 }, { unique: true });

const getEmployeeDutySettingsModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, EmployeeDutySettingsSchema);
}
export default getEmployeeDutySettingsModel;
