import { Schema,model } from "mongoose";
import {coll_clinic_tbl_change_logs} from './collections';
const clinicprofileChangeLogSchema=new Schema({
    clinic_id:{type:Number,index:true},
    activity_log:[{
        _id:false,
        activity:{type:String},
        activity_by:{type:String},
        activity_time:{type:Date},
        log_message:{type:String},
        emp_info:{
            emp_id:{type:Number},
            emp_code:{type:String},
            branch_id:{type:Number},
            department_id:{type:Number},
            first_name:{type:String},
            last_name:{type:String}
        },
        clinic_staff_info:{

        }
    }]
})
export const clinicprofileChangeLogModel=model(coll_clinic_tbl_change_logs,clinicprofileChangeLogSchema);