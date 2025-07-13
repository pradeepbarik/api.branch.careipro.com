import { Request, Response } from 'express';
import { moment, get_current_datetime } from '../services/datetime';
import { formatToDbTimeFromObj } from '../services/datetime';
import { successResponse } from '../services/response';
const appointmentController = {
    moveMysqlToMongo: async (params: { booking_id: number }) => {

    },
    createBookingCase: async (req: Request, res: Response) => {
        let bookings = await DB.get_rows<{ id: number, userid: number, user_type: string, doctor_id: number, servicelocation_id: number, clinic_id: number, patient_name: string, patient_mobile: string, patient_email: string, patient_address: string, patient_age: number | null, patient_gender: string, booking_time: string, consult_date: string, today_booking_id: string }>("select * from booking_backup where vertical='DOCTOR' and clinic_id>0 and user_type IS NOT NULL and date(booking_time) between ? and ? and NULLIF(case_id, '') IS NULL order by booking_time", [<string>req.query.start_date, <string>req.query.end_date],true);
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
            caseDetail = await DB.get_row<{ id: number, user_type: string }>("select * from booking_case where patient_mobile=? and patient_name=? and clinic_id=? and doctor_id=?", [patient_mobile,patient_name, clinic_id,doctor_id], true);
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
// CREATE TABLE `careipro`.`boking_case_users` (
//   `case_id` BIGINT(30) NOT NULL,
//   `user_id` BIGINT(30) NULL,
//   `user_type` VARCHAR(45) NULL,
//   UNIQUE INDEX `index1` (`case_id` ASC, `user_id` ASC));
