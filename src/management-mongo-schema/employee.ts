import e from "express";
import { Schema } from "mongoose";
const COLLECTION_NAME = 'coll_employees';
const EmployeeSchema = new Schema({
    emp_id: { type: Number, required: true },
    emp_code: { type: String, required: true,index:true },
    branch_id: { type: Number, required: true },
    department_code: { type: String, required: true },
    name: { type: String, required: true },
    reporting_employee: { emp_id: Number,emp_code: String, name: String,mobile_no:String,email_id:String },
    permanent_address:{state:String, city:String, address:String},
    documents: [{
        name: { type: String, required: true },
        type:{ type: String, required: true },
        file_name: { type: String, required: true },
        uploaded_at: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    }],
    profile_change_log: [{
        _id: false,
        time: { type: Date, default: Date.now },
        changed_by: { emp_id: Number, emp_code: String, name: String },
        message: { type: String }
    }]
});

const getEmployeesModel = () => {
    if (MANAGEMENT_DB.models[COLLECTION_NAME]) {
        return MANAGEMENT_DB.models[COLLECTION_NAME];
    }
    return MANAGEMENT_DB.model(COLLECTION_NAME, EmployeeSchema);
}
export default getEmployeesModel;