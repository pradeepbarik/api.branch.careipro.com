import { Schema } from "mongoose";
const COLLECTION_NAME = 'coll_employee_leave_requests';
/**
 * A leave applied by an employee and reviewed by the branch manager. The request keeps the approval
 * trail, the day wise effect is written to the attendance collection once it is approved, so every
 * report keeps reading the attendance of a day from one place.
 */
const EmployeeLeaveRequestSchema = new Schema({
    branch_id: { type: Number, required: true },
    emp_id: { type: Number, required: true },
    emp_code: { type: String, required: true },
    emp_name: { type: String },
    department_id: { type: Number },
    from_date: { type: String, required: true },
    to_date: { type: String, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    //decided while approving, drives how the days are counted in attendance. a leave can be split,
    //the first paid_days of the range are paid and the rest are loss of pay, leave_type stays set
    //only when the whole leave went one way
    leave_type: { type: String, enum: ['paid_leave', 'lop'] },
    paid_days: { type: Number, default: 0 },
    lop_days: { type: Number, default: 0 },
    //days of an approved leave the employee turned up for after all, the day was given back and its
    //attendance now carries the worked hours. paid_days and lop_days are reduced for each of them,
    //so days stays what was applied for while the two counts stay what was actually granted
    cancelled_dates: [{ type: String }],
    admin_remark: { type: String },
    reviewed_by: { emp_id: Number, emp_code: String, name: String },
    reviewed_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

//the manager inbox, pending requests of the branch
EmployeeLeaveRequestSchema.index({ branch_id: 1, status: 1, from_date: -1 });
//leaves of one employee
EmployeeLeaveRequestSchema.index({ branch_id: 1, emp_id: 1, from_date: -1 });

const getEmployeeLeaveRequestModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, EmployeeLeaveRequestSchema);
}
export default getEmployeeLeaveRequestModel;
