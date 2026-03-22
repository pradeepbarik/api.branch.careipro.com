import { Request, Response } from 'express';
import { moment, get_current_datetime } from '../services/datetime';
import { formatToDbTimeFromObj } from '../services/datetime';
import { parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse } from '../services/response';
import appointmentsModel from '../mongo-schema/coll_apoointments';
import Joi, { ValidationResult } from 'joi';
import {CipEncodeDecode} from '../services/encryption';
const requestParams = {
    appointments: Joi.object({
        consult_date: Joi.string().allow(""),
        booking_date: Joi.string().allow(""),
    })
}
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
        let bookings = await DB.get_rows<{ id: number, userid: number, user_type: string, doctor_id: number, servicelocation_id: number, clinic_id: number, patient_name: string, patient_mobile: string, patient_email: string, patient_address: string, patient_age: number | null, patient_gender: string, booking_time: string, consult_date: string, today_booking_id: string }>("select * from booking_backup where vertical='DOCTOR' and clinic_id>0 and user_type IS NOT NULL and date(booking_time) between ? and ? and NULLIF(case_id, '') IS NULL order by booking_time", [<string>req.query.start_date, <string>req.query.end_date]);
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
                DB.query("update booking set case_id=? where id=? limit 1", [caseDetail.id, booking_id]);
                DB.query("update booking_case set last_booking_time=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,user_id=?,user_type=?,booking_cnt=booking_cnt+1 where id=? limit 1", [booking.booking_time, booking.consult_date, booking.id, booking.today_booking_id, booking.userid, booking.user_type, caseDetail.id]);
                DB.query("insert into booking_case_users set case_id=?,user_id=?,user_type=?,last_booking_time=?,last_booking_id=?,last_booking_slno=?,last_booking_consult_time=?,doctor_id=?,clinic_id=?,service_loc_id=? ON DUPLICATE KEY UPDATE last_booking_time=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,doctor_id=?,clinic_id=?,service_loc_id=?", [caseDetail.id, booking.userid, booking.user_type, booking.booking_time, booking.id, booking.today_booking_id, booking.consult_date, booking.doctor_id, booking.clinic_id, booking.servicelocation_id, booking.booking_time, booking.consult_date, booking.id, booking.today_booking_id, booking.doctor_id, booking.clinic_id, booking.servicelocation_id]);
            } else {
                console.log("===========>New patient new case======>")
                let insertres: any = await DB.query("insert into booking_case set user_id=?,user_type=?,doctor_id=?,clinic_id=?,service_loc_id=?,patient_name=?,patient_mobile=?,create_time=?,last_booking_time=?,patient_date_of_birth=?,patient_age=?,patient_gender=?,patient_address=?,last_booking_consult_time=?,last_booking_id=?,last_booking_slno=?,booking_cnt=1", [userid, booking.user_type, doctor_id, clinic_id, servicelocation_id, patient_name, patient_mobile, now, booking.booking_time, patient_date_of_birth, booking.patient_age, booking.patient_gender, booking.patient_address, booking.consult_date, booking.id, booking.today_booking_id], true);
                if (insertres.affectedRows > 0) {
                    DB.query("update booking set case_id=? where id=? limit 1", [insertres.insertId, booking_id]);
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
    },
    getAppointmentsList: async (req: Request, res: Response) => {
        const validation: ValidationResult = requestParams.appointments.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res)
        }
        let sql = "select id,today_booking_id,userid,user_type,doctor_id,clinic_id,servicelocation_id,patient_name,patient_mobile,patient_address,patient_age,patient_gender,booked_through,booking_charge,service_charge,total_amount,booking_time,consult_date,status,payment_status,ask_for_feedback,city,follow_up_status,follow_up_log from booking where clinic_id in (select id from clinics where branch_id=? and business_type='CLINIC')";
        let conditions: Array<string | number> = [tokenInfo.bid];
        if (req.body.consult_date) {
            sql += " and date(consult_date)=?";
            conditions.push(req.body.consult_date);
        }
        if (req.body.booking_date) {
            sql += " and date(booking_time)=?";
            conditions.push(req.body.booking_date);
        }
        sql = "select t1.*, doctor.name as doctor_name, clinics.name as clinic_name,br.id as rev_id, br.rating, br.rating_date, br.review_date, br.experience, br.status as rating_status, br.review_tags, br.score from (" + sql + ") as t1 join (select id,name from doctor where branch_id=?) as doctor on t1.doctor_id=doctor.id join (select id,name from clinics where branch_id=?) as clinics on t1.clinic_id=clinics.id left join booking_review as br on t1.id=br.booking_id";
        conditions.push(tokenInfo.bid);
        conditions.push(tokenInfo.bid);
        sql += " order by booking_time desc";
        let rows = await DB.get_rows(sql, conditions);
        return res.json(successResponse(rows, "Appointments list"))
    },
    getPatientSymptomRecord: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required()
        }).validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let booking_id = parseInt(req.query.booking_id as string);
        let rows = await DB.get_rows("select * from patient_symptom_review where booking_id=?", [booking_id]);
        return res.json(successResponse(rows, "Patient symptom record"));
    },
    addPatientSymptomReview: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required(),
            doctor_id: Joi.number().required(),
            symptoms: Joi.string().required(),
            no_of_days: Joi.string().required(),
            cured: Joi.string().valid("in_observation", "full_cured", "partial_cured").required(),
            cat_id: Joi.number().allow("")
        }).validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (!tokenInfo || !emp_info) {
            return unauthorizedResponse("Something went wrong", res);
        }
        let booking_id = req.body.booking_id;
        let symptoms = req.body.symptoms;
        let no_of_days = req.body.no_of_days;
        let cured = req.body.cured;
        let now = get_current_datetime();
        await DB.query("insert into patient_symptom_review set booking_id=?,doctor_id=?,symptoms=?,no_of_days=?,cured=?,cat_id=?,entry_time=?", [booking_id, req.body.doctor_id, symptoms, no_of_days, cured, req.body.cat_id ? req.body.cat_id : 0, now]);
        return res.json(successResponse({}, "Patient symptom review added successfully"))
    },
    updateSymptomReview: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required(),
            doctor_id: Joi.number().required(),
            symptoms: Joi.string().required(),
            cured: Joi.string().valid("in_observation", "full_cured", "partial_cured").required(),
            cat_id: Joi.number().allow("")
        }).validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (!tokenInfo || !emp_info) {
            return unauthorizedResponse("Something went wrong", res);
        }
        let booking_id = req.body.booking_id;
        let symptoms = req.body.symptoms;
        let cured = req.body.cured;
        let now = get_current_datetime();
        let q = "update patient_symptom_review set cured=?"
        let conditions: Array<string | number> = [cured];
        if (req.body.cat_id) {
            q += ",cat_id=?";
            conditions.push(req.body.cat_id);
        }
        q += " where booking_id=? and doctor_id=? and symptoms=?";
        conditions.push(booking_id);
        conditions.push(req.body.doctor_id);
        conditions.push(symptoms);
        await DB.query(q, conditions);
        return res.json(successResponse({}, "Patient symptom review updated successfully"))
    },
    deleteSymptomReview: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required(),
            doctor_id: Joi.number().required(),
            symptoms: Joi.string().required()
        }).validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (!tokenInfo || !emp_info) {
            return unauthorizedResponse("Something went wrong", res);
        }
        let booking_id = req.body.booking_id;
        let symptoms = req.body.symptoms;
        await DB.query("delete from patient_symptom_review where booking_id=? and doctor_id=? and symptoms=?", [booking_id, req.body.doctor_id, symptoms]);
        return res.json(successResponse({}, "Patient symptom review deleted successfully"))
    },
    submitAppointmentFeedBack: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            rev_id: Joi.number().allow(""),
            booking_id: Joi.number().required(),
            userid: Joi.number().required(),
            doctor_id: Joi.number().required(),
            clinic_id: Joi.number().required(),
            service_loc_id: Joi.number().required(),
            rating: Joi.number().min(1).max(5).required(),
            experience: Joi.string().allow(""),
            review_tags: Joi.string().allow(""),
        }).validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("Something went wrong", res);
        }
        let booking_id = req.body.booking_id;
        let rating = req.body.rating;
        let experience = req.body.experience;
        let review_tags = req.body.review_tags || "";
        let now = get_current_datetime();
        let review_date = now;
        if (req.body.rev_id) {
            let updateRes: any = await DB.query("update booking_review set rating=?,experience=?,review_tags=?,review_date=?,status='unverified' where id=? and booking_id=? limit 1", [rating, experience, review_tags, review_date, req.body.rev_id, booking_id]);
            if (updateRes.affectedRows > 0) {
                res.json(successResponse({ rev_id: req.body.rev_id }, "Feedback updated successfully"))
                return;
            } else {
                res.json(serviceNotAcceptable("Something went wrong"))
                return;
            }
        } else {
            let userDetail = await DB.get_row<{ firstname: string, lastname: string }>("select firstname,lastname from users where id=?", [req.body.userid]);
            if (!userDetail) {
                return res.json(serviceNotAcceptable("User not found"))
            }
            let insertRes: any = await DB.query("insert into booking_review set booking_id=?,user_id=?,doctor_id=?,clinic_id=?,service_loc_id=?,rating=?,experience=?,review_tags=?,review_date=?,status='unverified',user_name=?", [booking_id, req.body.userid, req.body.doctor_id, req.body.clinic_id, req.body.service_loc_id, rating, experience, review_tags, review_date, `${userDetail.firstname} ${userDetail.lastname}`]);
            DB.query("update booking set ask_for_feedback=0 where id=? limit 1", [booking_id]);
            if (insertRes.affectedRows > 0) {
                res.json(successResponse({ rev_id: insertRes.insertId }, "Feedback submitted successfully"))
                return;
            } else {
                res.json(serviceNotAcceptable("Something went wrong"))
                return;
            }
        }
    },
    addFollowUpLog: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required(),
            follow_up_status: Joi.string().valid('pending', 'done', 'recall', 'call_not_received', 'invalid_contact_no', 'not_required').required(),
            follow_up_note: Joi.string().allow("")
        }).validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (!tokenInfo || !emp_info) {
            return unauthorizedResponse("Something went wrong", res);
        }
        let booking_id = req.body.booking_id;
        let status = req.body.follow_up_status;
        let notes = req.body.follow_up_note || "";
        let now = get_current_datetime();
        let logEntry = {
            time: now,
            status,
            notes,
            emp_id: emp_info.id,
            emp_name: emp_info.first_name
        }
        let booking = await DB.get_row<{ follow_up_log: string | null }>("select follow_up_log from booking where id=?", [booking_id]);
        let follow_up_log_arr = booking && booking.follow_up_log ? JSON.parse(booking.follow_up_log) : [];
        follow_up_log_arr.push(logEntry);
        await DB.query("update booking set follow_up_status=?,follow_up_log=? where id=? limit 1", [status, JSON.stringify(follow_up_log_arr), booking_id]);
        return res.json(successResponse({}, "Follow up log added successfully"))
    },
    getAppointmentDetailUrl:async(req: Request, res: Response)=>{
        const validation: ValidationResult = Joi.object({
            booking_id: Joi.number().required(),
        }).validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let booking_id = <string>req.query.booking_id;
        const encryptor = new CipEncodeDecode();
        let encryptBookingid=encryptor.encodeNumber(booking_id.toString(), "A");
        let bookingDetailLink = `https://careipro.com/check-status?case=appointment&id=${encryptBookingid}`;
        return res.json(successResponse({
            appointment_detail_url: bookingDetailLink,
            encoded_booking_id: encryptBookingid
        }, "message data fetched successfully"))
    }

}
export default appointmentController;
