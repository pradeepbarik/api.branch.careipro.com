import { Schema } from "mongoose";
const COLLECTION_NAME = 'coll_employee_attendances';
/**
 * One document per employee per day. A day can be worked in parts, so the hours live in
 * duty_hour_logs and the totals are always read from there rather than from check_in to check_out.
 * The marked location is kept for the record only, an employee is never stopped from marking duty
 * because of where they are, field staff work away from the branch office.
 */
const EmployeeAttendanceSchema = new Schema({
    branch_id: { type: Number, required: true },
    emp_id: { type: Number, required: true },
    emp_code: { type: String, required: true },
    department_id: { type: Number },
    date: { type: String, required: true },
    duty_hour_logs: [{ start_time: { type: String }, end_time: { type: String }, duration: { type: Number } }],
    check_in_time: { type: String },
    check_out_time: { type: String },
    //where the employee was standing while marking, recorded but never enforced
    check_in_location: { lat: { type: Number }, lng: { type: Number }, accuracy: { type: Number } },
    check_out_location: { lat: { type: Number }, lng: { type: Number }, accuracy: { type: Number } },
    status: { type: String, enum: ['working', 'full_day', 'half_day', 'paid_leave', 'lop'], default: 'working' },
    leave_reason: { type: String, required: false },
    source: { type: String, required: true, enum: ['self', 'admin'], default: 'self' },
    //set when the branch manager wrote the day instead of the employee
    marked_by: { emp_id: Number, emp_code: String, name: String },
    admin_remark: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

//one attendance record per employee per day, keeps a double tap on start duty from creating a
//second record and doubling the reported hours, also serves the start/end duty lookup
EmployeeAttendanceSchema.index({ branch_id: 1, emp_id: 1, date: 1 }, { unique: true });
//branch wide day view, todays attendance of every employee
EmployeeAttendanceSchema.index({ branch_id: 1, date: 1 });
//one employee over a date range, attendance history and monthly summary
EmployeeAttendanceSchema.index({ emp_id: 1, date: 1 });

const getEmployeeAttendanceModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, EmployeeAttendanceSchema);
}
export default getEmployeeAttendanceModel;
