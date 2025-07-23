import { Request, Response } from 'express';
import { moment, get_current_datetime } from '../services/datetime';
import { formatToDbTimeFromObj } from '../services/datetime';
import { successResponse, unauthorizedResponse } from '../services/response';
import appointmentsModel from '../mongo-schema/coll_apoointments';
const appointmentController = {
    moveMysqlToMongo: async (req: Request, res: Response) => {
        let bookings = await DB.get_rows<any>("select t1.*,t2.document,t2.logs,br.rating,br.rating_date,br.visited_for,br.experience,br.ques_ans,br.review_date,br.replay,br.replay_date,br.status as rating_status,br.rating_processed,br.review_processed,br.score,br.review_tags from booking_backup as t1 left join booking_detail_backup as t2 on t1.id=t2.booking_id left join booking_review as br on t1.id=br.booking_id where t1.vertical='DOCTOR' and t1.clinic_id>0 and t1.user_type IS NOT NULL and date(t1.booking_time) between ? and ? order by booking_time", [<string>req.query.start_date, <string>req.query.end_date], true);
        for (let booking of bookings) {
            let consult_date = moment(booking.consult_date).format('YYYY-MM-DD');
            let consult_date_arr = consult_date.split("-");
            let year = consult_date_arr[0];
            let month = consult_date_arr[1];
            let day = consult_date_arr[2];
            let document = await appointmentsModel.findOne({ appointment_id: booking.id }).exec()
            if (!document) {
                console.log("=================Processing booking (" + booking.id + ")===========>")
                await new appointmentsModel({
                    appointment_id: parseInt(booking.id),
                    branch_id: 1,
                    clinic_id: parseInt(booking.clinic_id),
                    doctor_id: parseInt(booking.doctor_id),
                    service_loc_id: parseInt(booking.servicelocation_id),
                    today_booking_id: booking.today_booking_id.toString().toLowerCase(),
                    user_id: parseInt(booking.userid),
                    user_type: booking.user_type.toLowerCase(),
                    display_order: parseInt(booking.display_order),
                    patient_name: booking.patient_name.toLowerCase(),
                    patient_mobile: booking.patient_mobile.toString(),
                    patient_email: "",
                    patient_address: booking.patient_address ? booking.patient_address.toLowerCase() : "",
                    patient_age: booking.patient_age ? parseInt(booking.patient_age) : 0,
                    patient_gender: booking.patient_gender ? booking.patient_gender.toLowerCase() : "",
                    booked_through: booking.booked_through,
                    booking_charge: parseInt(booking.booking_charge),
                    doctor_fee_type: booking.doctor_fee_type ? parseInt(booking.doctor_fee_type) : "",
                    service_charge: booking.service_charge ? parseInt(booking.service_charge) : 0,
                    total_amount: parseInt(booking.total_amount),
                    booking_time: new Date(booking.booking_time),
                    consult_date: new Date(booking.consult_date),
                    consult_year: parseInt(year),
                    consult_month: parseInt(month),
                    consult_day: parseInt(day),
                    status: booking.status,
                    payment_status: booking.payment_status,
                    payment_method: booking.payment_method,
                    cancelled_time: booking.cancelled_time ? new Date(booking.cancelled_time) : "",
                    is_auto_filled: parseInt(booking.is_auto_filled),
                    ask_for_feedback: parseInt(booking.ask_for_feedback),
                    slno_group: booking.slno_group ? booking.slno_group.toLowerCase() : "",
                    vertical: booking.vertical.toLowerCase(),
                    case_id: parseInt(booking.case_id),
                    patient_paid_amount: "",
                    prescription: booking.document ? JSON.parse(booking.document) : [],
                    logs: booking.logs ? JSON.parse(booking.logs) : []
                }).save()
            } else {
                console.log("=================updating booking (" + booking.id + ")===========>")
                await appointmentsModel.findOneAndUpdate({
                    appointment_id: parseInt(booking.id)
                }, {
                    consult_date: new Date(booking.consult_date),
                    consult_year: parseInt(year),
                    consult_month: parseInt(month),
                    consult_day: parseInt(day),
                }).exec()
            }
        }
        res.json(successResponse({}, "success"))
    },
    createBookingCase: async (req: Request, res: Response) => {
        let bookings = await DB.get_rows<{ id: number, userid: number, user_type: string, doctor_id: number, servicelocation_id: number, clinic_id: number, patient_name: string, patient_mobile: string, patient_email: string, patient_address: string, patient_age: number | null, patient_gender: string, booking_time: string, consult_date: string, today_booking_id: string }>("select * from booking where vertical='DOCTOR' and clinic_id>0 and user_type IS NOT NULL and date(booking_time) between ? and ? and NULLIF(case_id, '') IS NULL order by booking_time", [<string>req.query.start_date, <string>req.query.end_date]);
        for (let booking of bookings) {
            console.log("=============processing new booking=============>")
            let booking_id = booking.id;
            let userid = booking.userid;
            let user_type = booking.user_type;
            let doctor_id = booking.doctor_id;
            let servicelocation_id = booking.servicelocation_id;
            let clinic_id = booking.clinic_id;
            let patient_name = booking.patient_name;
            let patient_mobile = booking.patient_mobile;
            let now = get_current_datetime();
            let patient_date_of_birth = booking.patient_age ? formatToDbTimeFromObj(moment(<string>booking.booking_time).subtract(booking.patient_age, "years")) : null;
            let caseDetail: any = null;
            caseDetail = await DB.get_row<{ id: number, user_type: string }>("select * from booking_case where patient_mobile=? and patient_name=? and clinic_id=? and doctor_id=?", [patient_mobile, patient_name, clinic_id, doctor_id]);
            if (caseDetail) {
                console.log("===========>patient exist==================================================>")
                DB.query("update booking_backup set case_id=? where id=? limit 1", [caseDetail.id, booking_id]);
                DB.query("update booking_case set last_booking_time=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,user_id=?,user_type=?,booking_cnt=booking_cnt+1 where id=? limit 1", [booking.booking_time, booking.consult_date, booking.id, booking.today_booking_id, booking.userid, booking.user_type, caseDetail.id]);
                DB.query("insert into booking_case_users set case_id=?,user_id=?,user_type=?,last_booking_time=?,last_booking_id=?,last_booking_slno=?,last_booking_consult_time=?,doctor_id=?,clinic_id=?,service_loc_id=? ON DUPLICATE KEY UPDATE last_booking_time=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,doctor_id=?,clinic_id=?,service_loc_id=?", [caseDetail.id, booking.userid, booking.user_type, booking.booking_time, booking.id, booking.today_booking_id, booking.consult_date, booking.doctor_id, booking.clinic_id, booking.servicelocation_id, booking.booking_time, booking.consult_date, booking.id, booking.today_booking_id, booking.doctor_id, booking.clinic_id, booking.servicelocation_id]);
            } else {
                console.log("===========>New patient new case======>")
                let insertres: any = await DB.query("insert into booking_case set user_id=?,user_type=?,doctor_id=?,clinic_id=?,service_loc_id=?,patient_name=?,patient_mobile=?,create_time=?,last_booking_time=?,patient_date_of_birth=?,patient_age=?,patient_gender=?,patient_address=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,booking_cnt=1", [userid, booking.user_type, doctor_id, clinic_id, servicelocation_id, patient_name, patient_mobile, now, booking.booking_time, patient_date_of_birth, booking.patient_age, booking.patient_gender, booking.patient_address, booking.consult_date, booking.id, booking.today_booking_id], true);
                if (insertres.affectedRows > 0) {
                    DB.query("update booking_backup set case_id=? where id=? limit 1", [insertres.insertId, booking_id]);
                }
                DB.query("insert into booking_case_users set case_id=?,user_id=?,user_type=?,last_booking_time=?,last_booking_id=?,last_booking_slno=?,last_booking_consult_time=?,doctor_id=?,clinic_id=?,service_loc_id=? ON DUPLICATE KEY UPDATE last_booking_time=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,doctor_id=?,clinic_id=?,service_loc_id=?", [insertres.insertId, booking.userid, booking.user_type, booking.booking_time, booking.id, booking.today_booking_id, booking.consult_date, booking.doctor_id, booking.clinic_id, booking.servicelocation_id, booking.booking_time, booking.consult_date, booking.id, booking.today_booking_id, booking.doctor_id, booking.clinic_id, booking.servicelocation_id]);
            }
        }
        res.json(successResponse({}, "success"));
    },
    getTodaysAppointmentBookedDoctors: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        let today = get_current_datetime(true);
        let rows = await DB.get_rows("select clinics.name as clinic_name,doctor.name as doctor_name,t1.* from (select doctor_id,clinic_id,count(1) as total_booking,sum(if(booked_through='online',1,0)) as online,sum(if(booked_through!='online',1,0)) as offline from booking where city=? and date(booking_time)=? group by doctor_id,clinic_id) as t1 join doctor on t1.doctor_id=doctor.id join clinics on t1.clinic_id=clinics.id order by t1.total_booking", [tokenInfo.bd, today]);
        return res.json(successResponse(rows, "Today's booked appointments"));
    },
    getTodaysPatientsDoctorList: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        let date = req.query.date ? <string>req.query.date : get_current_datetime(true);
        let rows = await DB.get_rows("select clinics.name as clinic_name,doctor.name as doctor_name,t1.* from (select doctor_id,clinic_id,count(1) as total_booking,sum(if(booked_through='online',1,0)) as online,sum(if(booked_through!='online',1,0)) as offline from booking where city=? and date(consult_date)=? group by doctor_id,clinic_id) as t1 join doctor on t1.doctor_id=doctor.id join clinics on t1.clinic_id=clinics.id order by t1.total_booking", [tokenInfo.bd, date]);
        return res.json(successResponse(rows, "Today's booked appointments"));
    }
}
export default appointmentController;
