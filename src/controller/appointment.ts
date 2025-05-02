import { Request, Response } from 'express';
import { moment, get_current_datetime } from '../services/datetime';
import { formatToDbTimeFromObj } from '../services/datetime';
import { successResponse } from '../services/response';
const appointmentController = {
    moveMysqlToMongo: async (params: { booking_id: number }) => {

    },
    createBookingCase: async (req: Request, res: Response) => {
        let bookings = await DB.get_rows<{ id: number, userid: number, user_type: string, doctor_id: number, servicelocation_id: number, clinic_id: number, patient_name: string, patient_mobile: string, patient_email: string, patient_address: string, patient_age: number | null, patient_gender: string, booking_time: string, consult_date: string }>("select * from booking where vertical='DOCTOR' and date(booking_time) between ? and ? and NULLIF(case_id, '') IS NULL", [<string>req.query.start_date, <string>req.query.end_date],true);
        for (let booking of bookings) {
            let booking_id = booking.id;
            let userid = booking.userid;
            let user_type = booking.user_type;
            let doctor_id = booking.doctor_id;
            let servicelocation_id = booking.servicelocation_id;
            let clinic_id = booking.clinic_id;
            let patient_name = booking.patient_name;
            let patient_mobile = booking.patient_mobile;
            let patient_email = booking.patient_email;
            let patient_address = booking.patient_address;
            let patient_age = booking.patient_age;
            let patient_gender = booking.patient_gender;
            let now = get_current_datetime();
            let patient_date_of_birth = booking.patient_age?formatToDbTimeFromObj(moment(<string>booking.booking_time).subtract(booking.patient_age, "years")):null;
            let caseDetail = await DB.get_row<{ id: number, user_type: string }>("select * from booking_case where patient_mobile=? and clinic_id=? and doctor_id=? and patient_name=?", [patient_mobile,clinic_id, doctor_id, patient_name],true);
            if (caseDetail) {
                await DB.query("update booking set case_id=? where id=? limit 1", [caseDetail.id, booking_id]);
                await DB.query("update booking_case set last_booking_time=?,last_booking_consult_time=? where id=? limit 1", [booking.booking_time,booking.consult_date, caseDetail.id]);
                if (caseDetail.user_type != "user" && user_type == "user") {
                    console.log("user id changed from clinic staff to user ===>");
                    await DB.query("update booking_case set user_id=?,user_type=? where id=? limit 1", [userid, user_type, caseDetail.id],true);
                }
            } else {
                let insertres:any = await DB.query("insert into booking_case set user_id=?,user_type=?,doctor_id=?,clinic_id=?,service_loc_id=?,patient_name=?,patient_mobile=?,create_time=?,last_booking_time=?,patient_date_of_birth=?,patient_age=?,patient_gender=?,patient_address=?,last_booking_consult_time=?", [userid, user_type, doctor_id, clinic_id, servicelocation_id, patient_name, patient_mobile, now, booking.booking_time, patient_date_of_birth,booking.patient_age,booking.patient_gender,booking.patient_address,booking.consult_date],true);
                if(insertres.affectedRows>0){
                    await DB.query("update booking set case_id=? where id=? limit 1", [insertres.insertId, booking_id]);
                }
            }
        }
        res.json(successResponse({}, "success"));
    }
}
export default appointmentController;


const clinic_appoitments = [
    {
        clinic_id: 8,
        month: "march",
        doctor_id: 2,
        service_loc_id: 22,
        appointments: []// appointments those consulted on march month

    }
]
const user_appointments = [
    {
        user_id: 6,
        user_type: "user",
        case_id: 1,
        appointments: []
    }
]