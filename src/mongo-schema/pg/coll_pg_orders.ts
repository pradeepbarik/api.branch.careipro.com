import { Schema,model } from "mongoose";
import { COLL_PG_ORDERS } from "../collections";
/*
cp = careipro
payment_status= 'PENDING', 'PAID', 'FAILED'
order_for= BOOK_APPOINTMENT, MEDICINEORDER
  BOOK_APPOINTMENT = when patient book appointment and pay online, when clinic staff cretae appointment and send payment link to patient|| when careipro staff create appointment and send payment link to patient
  MEDICINEORDER = when patient order medicine and pay online || when store staff create medicine order and send payment link to patient || when careipro staff create medicine order and send payment link to patient
*/     
const coll_pg_orders_schema=new Schema({
    mobile_no:{type:String,required:true},
    order_for:{type:String,required:true},// BOOK_APPOINTMENT, MEDICINEORDER,
    created_by_user_type:{type:String,required:true},
    created_by_user_id:{type:Number,required:true},
    create_time:{type:Date,default:Date.now},
    clinic_id:{type:Number},
    doctor_id:{type:Number},
    branch_id:{type:Number},
    patient_info:{
        book_by:{type:String,required:true},//app, call, manually
        case_id:{type:Number,required:true},
        userid:{type:Number,required:true},
        user_type:{type:String},
        doctor_id:{type:Number,required:true},
        clinic_id:{type:Number,required:true},
        servicelocation_id:{type:Number,required:true},
        patient_name:{type:String},
        patient_mobile:{type:String},
        patient_age:{type:String},
        patient_gender:{type:String},
        patient_address:{type:String},
        consult_date:{type:String},
        group_name:{type:String},
        patient_extra_info:{type:Schema.Types.Mixed},
        merchant:{type:String},
        device:{type:String},
    },
    order_amount:{type:Number,required:true},
    cp_order_id:{type:String},//booking id or medicine order id
    pg_name:{type:String},
    pg_order_id:{type:String},
    pg_session_id:{type:String},
    payment_status:{type:String,default:"PENDING"},// PENDING, SUCCESS, FAILED
    refund_order_id:{type:String},//refund id from payment gateway
    refund_status:{type:String},//refund status from payment gateway
    refund_initiated_at:{type:Date,default:null},
    refund_response_data:{type:Schema.Types.Mixed},
    refund_request_data:{type:Schema.Types.Mixed},
    tp_detail:{
        clinic_id:{type:Number},
        doctor_id:{type:Number},
        servicelocation_id:{type:Number},
        rurl:{type:String},
    }
})
const coll_pg_orders_model=model(COLL_PG_ORDERS,coll_pg_orders_schema);
export default coll_pg_orders_model;