import { ILoggedinEmpInfo } from '../../types';
import { get_current_datetime } from '../../services/datetime';
import { Iresponse, unauthorizedResponse, successResponse, internalServerError } from '../../services/response';
import { doctorprofileChangeLogModel } from '../../mongo-schema/coll_doctor_tbl_change_log';
import { clinicprofileChangeLogModel } from '../../mongo-schema/coll_clinic_tbl_chnage_logs';
type TaddNewClinicParams = {
    branch_id: number,
    clinic_name: string,
    clinic_seo_url: string,
    contact_no: number,
    alt_contact_no: number,
    contact_email: string,
    state: string,
    dist: string,
    market: string,
    area_name: string,
    location: string,
    latitude: number,
    longitude: number,
    user_name: string,
    password: string,
    emp_info:ILoggedinEmpInfo
}
const clinicModel = {
    checkClinicSeourlAvailability: async (seourl: string, city: string) => {
        let row = await DB.get_row("select seo_url,city from clinics where seo_url=? and city=?", [seourl, city]);
        if (row) {
            return false
        }
        return true;
    },
    checkClinicMobileUnique: async (mobile: number) => {
        let row = await DB.get_row("select seo_url,city from clinics where mobile=?", [mobile]);
        if (row) {
            return false
        }
        return true;
    },
    checkClinicloginUserNameUnique: async (user_name: string) => {
        let row = await DB.get_row("select seo_url,city from clinics where username=?", [user_name]);
        if (row) {
            return false
        }
        return true;
    },
    addNewClinic: async (params: TaddNewClinicParams) => {
        let q = 'insert into clinics set name=?,username=?,password=md5(?),email=?,mobile=?,location=?,city=?,locality=?,location_lat=?,location_lng=?,status=?,approved=0,verified=0,active=0,seo_url=?,branch_id=?,alt_mob_no=?,state=?,market_name=?';
        let insertRes: any = await DB.query(q, [params.clinic_name, params.user_name, params.password, params.contact_email, params.contact_no, params.location, params.dist, params.area_name, params.latitude, params.longitude, 'close', params.clinic_seo_url, params.branch_id, params.alt_contact_no, params.state, params.market]);
        if (insertRes.affectedRows >= 1) {
            let clinic_id = insertRes.insertId;
            let now = get_current_datetime();
            q = 'insert into clinic_detail (clinic_id,register_date) values (?,?)';
            DB.query(q, [clinic_id, now]);
            new clinicprofileChangeLogModel({
                clinic_id: clinic_id,
                activity_log: [{
                    activity: 'registered',
                    activity_by: 'branch_employee',
                    activity_time: now,
                    log_message: 'registered as a new clinic',
                    emp_info: {
                        emp_id: params.emp_info.id,
                        emp_code: params.emp_info.emp_code,
                        branch_id: params.emp_info.branch_id,
                        department_id: params.emp_info.department_id,
                        first_name: params.emp_info.first_name,
                    }
                }]
            }).save()
            return successResponse(null, "Clinic registered successfully");
        } else {
            return internalServerError("something went wrong! try again");
        }
    }
}
export const getDoctors = async (branch_id: number, clinic_id: number) => {
    let rows: any = await DB.get_rows("select t1.id as service_loc_id,t1.service_charge as consulting_fee,doctor.id,doctor.name,doctor.gender,doctor.experience,doctor.image,doctor.position,doctor.rating,doctor.active,doctor.clinic_id,group_concat(spl.name SEPARATOR ', ') as specialist from (SELECT * FROM `doctor_service_location` WHERE  clinic_id=?) as t1 join (select * from doctor where branch_id=? and clinic_id=?) as doctor on t1.`doctor_id`=doctor.id left join service_location_specialization as slp on t1.id=slp.service_location left join specialists as spl on slp.specialist_id=spl.id group by t1.id", [clinic_id, branch_id, clinic_id]);
    let activeDoctors = [];
    let inActiveDoctors = [];
    let unApprovedDoctors = [];
    for (let row of rows) {
        if (row.active === 0) {
            inActiveDoctors.push(row);
        } else if (row.active === 1) {
            activeDoctors.push(row);
        } else if (row.active < 0) {
            unApprovedDoctors.push(row);
        }
    }
    return {
        activeDoctors, inActiveDoctors, unApprovedDoctors
    };
}
export const getDoctorCompleteDetails = async (branch_id: number, clinic_id: number, doctor_id: number, service_location_id: number) => {
    const ps = [
        new Promise((resolve, reject) => {
            DB.get_row(`select contact_no,service_charge,site_service_charge,availability,slno_type,consulting_time,
            sunday,sunday_1st_session_start,sunday_1st_session_end,sunday_2nd_session_start,sunday_2nd_session_end,
            monday,monday_1st_session_start,monday_1st_session_end,monday_2nd_session_start,monday_2nd_session_end,
            tuesday,tuesday_1st_session_start,tuesday_1st_session_end,tuesday_2nd_session_start,tuesday_2nd_session_end,
            wednesday,wednesday_1st_session_start,wednesday_1st_session_end,wednesday_2nd_session_start,wednesday_2nd_session_end,
            thursday,thursday_1st_session_start,thursday_1st_session_end,thursday_2nd_session_start,thursday_2nd_session_end,
            friday,friday_1st_session_start,friday_1st_session_end,friday_2nd_session_start,friday_2nd_session_end,
            saturday,saturday_1st_session_start,saturday_1st_session_end,saturday_2nd_session_start,saturday_2nd_session_end,active 
             from doctor_service_location where id=? and doctor_id=? and clinic_id=?`, [service_location_id, doctor_id, clinic_id]).then((row) => {
                resolve(row)
            });
        }),
        new Promise((resolve, reject) => {
            DB.get_row(`select payment_type,advance_booking_enable,
            mon_limit,mon_booking_start_time,tue_limit,tue_booking_start_time,
            wed_limit,wed_booking_start_time,thu_limit,thu_booking_start_time,fri_limit,fri_booking_start_time,sat_limit,sat_booking_start_time,
            sun_limit,sun_booking_start_time,emergency_booking_close,booking_close_message,book_by,cash_recived_mode,show_group_name_while_booking,consulting_timing_messages,
            raw_information
            from doctor_servicelocation_setting where service_location_id=? limit 1`, [service_location_id]).then((row: any) => {
                if (row.consulting_timing_messages) {
                    row.consulting_timing_messages = JSON.parse(row.consulting_timing_messages);
                }
                resolve(row)
            });
        }),
        new Promise((resolve, reject) => {
            DB.get_row(`select name,image,position,description,seo_url,active from doctor where id=? and branch_id=? and clinic_id=?`, [
                doctor_id, branch_id, clinic_id
            ]).then((row) => {
                resolve(row)
            })
        }),
        new Promise((resolve, reject) => {
            DB.get_row(`select page_title,meta_key_words,meta_description from doctor_seo_details where doctor_id=?`, [doctor_id]).then((row) => {
                resolve(row)
            })
        })
    ];
    const { 0: service_location, 1: service_location_setting, 2: doctor, 3: seo_details } = await Promise.all(ps);
    return {
        doctor,
        service_location,
        service_location_setting,
        seo_details
    };
}
type approveDoctorParams = {
    doctor_id: number,
    clinic_id: number,
    service_location_id: number,
    emp_info: ILoggedinEmpInfo
}
export const approveDoctor = async (params: approveDoctorParams): Promise<Iresponse<{ active: number } | null>> => {
    try {
        let doctor: any = await DB.get_row("select doctor.* from (select id,branch_id,active from doctor where id=?) as doctor join (select id,doctor_id from doctor_service_location where id=? and doctor_id=? and clinic_id=?) as dsl on doctor.id=dsl.doctor_id", [params.doctor_id, params.service_location_id, params.doctor_id, params.clinic_id]);
        if (!doctor) {
            throw new Error("doctor doesn't exist");
        }
        if (doctor.branch_id !== params.emp_info.branch_id) {
            throw new Error("you are not authorised to acivate other branch doctor");
        }
        if (doctor.active !== -1) {
            throw new Error("Already doctor profile is approved");
        }
        await DB.query("update doctor set active=1 where id=?", [params.doctor_id]);
        await DB.query("update doctor_service_location set active=1 where id=? and doctor_id=?", [params.service_location_id, params.doctor_id]);
        let now = get_current_datetime();
        let logdocument = await doctorprofileChangeLogModel.findOne({
            doctor_id: params.doctor_id,
            service_loc_id: params.service_location_id,
            clinic_id: params.clinic_id
        }).exec();
        let activitylog = {
            activity: "profile_approve",
            activity_by: "branch_employee",
            activity_time: now,
            log_message: 'doctor profile approved',
            emp_info: {
                emp_id: params.emp_info.id,
                emp_code: params.emp_info.emp_code,
                branch_id: params.emp_info.branch_id,
                department_id: params.emp_info.department_id,
                first_name: params.emp_info.first_name,
            }
        };
        if (logdocument) {
            logdocument.updateOne({
                $push: {
                    activity_log: activitylog
                }
            }).exec();
        } else {
            logdocument = new doctorprofileChangeLogModel({
                doctor_id: params.doctor_id,
                clinic_id: params.clinic_id,
                service_loc_id: params.service_location_id,
                activity_log: [activitylog]
            });
            logdocument.save();
        }
        return successResponse({ active: 1 }, "Doctor profile approved Successfully")
    } catch (err: any) {
        return unauthorizedResponse(err.message)
    }
}
type TchangeDoctorActiveStatusParams = approveDoctorParams & {
    active: number
}
export const changeDoctorActiveStatus = async (params: TchangeDoctorActiveStatusParams): Promise<Iresponse<{ active: number } | null>> => {
    try {
        let doctor: any = await DB.get_row("select doctor.* from (select id,branch_id,active from doctor where id=?) as doctor join (select id,doctor_id from doctor_service_location where id=? and doctor_id=? and clinic_id=?) as dsl on doctor.id=dsl.doctor_id", [params.doctor_id, params.service_location_id, params.doctor_id, params.clinic_id]);
        if (!doctor) {
            throw new Error("doctor doesn't exist");
        }
        if (doctor.branch_id !== params.emp_info.branch_id) {
            throw new Error("you are not authorised to acivate other branch doctor");
        }
        if (params.active === 1 && doctor.active === 1) {
            throw new Error("Already doctor profile is active");
        }
        if (params.active === 0 && doctor.active === 0) {
            throw new Error("Already doctor profile is in-active");
        }
        let activity = '';
        let log_message = '';
        if (params.active === 1) {
            await DB.query("update doctor set active=1 where id=?", [params.doctor_id]);
            await DB.query("update doctor_service_location set active=1 where id=? and doctor_id=?", [params.service_location_id, params.doctor_id]);
            activity = 'profile_activate';
            log_message = 'Doctor profile made activate'
        } else if (params.active === 0) {
            await DB.query("update doctor set active=0 where id=?", [params.doctor_id]);
            await DB.query("update doctor_service_location set active=0 where id=? and doctor_id=?", [params.service_location_id, params.doctor_id]);
            activity = 'profile_deactivate'
            log_message = 'Doctor profile made deactivate'
        }
        let now = get_current_datetime();
        let logdocument = await doctorprofileChangeLogModel.findOne({
            doctor_id: params.doctor_id,
            service_loc_id: params.service_location_id,
            clinic_id: params.clinic_id
        }).exec();
        let activitylog = {
            activity: activity,
            activity_by: "branch_employee",
            activity_time: now,
            log_message: log_message,
            emp_info: {
                emp_id: params.emp_info.id,
                emp_code: params.emp_info.emp_code,
                branch_id: params.emp_info.branch_id,
                department_id: params.emp_info.department_id,
                first_name: params.emp_info.first_name,
            }
        };
        if (logdocument) {
            logdocument.updateOne({
                $push: {
                    activity_log: activitylog
                }
            }).exec();
        } else {
            logdocument = new doctorprofileChangeLogModel({
                doctor_id: params.doctor_id,
                clinic_id: params.clinic_id,
                service_loc_id: params.service_location_id,
                activity_log: [activitylog]
            });
            logdocument.save();
        }
        if (params.active === 1) {
            return successResponse({ active: 1 }, "Doctor profile activated Successfully")
        } else {
            return successResponse({ active: 0 }, "Doctor profile de-activated Successfully")
        }

    } catch (err: any) {
        return unauthorizedResponse(err.message)
    }
}
export const getClinicBanners = async (params: {
    clinic_id: number,
    banner_id?: number
}) => {
    try {
        let sql = "select id,image,display_order,user_id as clinic_id from banners where user_id=? and user_type='clinic'";
        let sql_params = [params.clinic_id];
        let rows = await DB.get_rows(sql, sql_params);
        return successResponse(rows, "succes")
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
export const getClinicSpecialization = async (params: {
    clinic_id: number
}) => {
    try {
        let sql = "select t1.*,t2.name as specialization_name from (SELECT * FROM `clinic_specialization` WHERE clinic_id=?) as t1 left join specialists as t2 on t1.specialist_id=t2.id";
        let sql_params = [params.clinic_id];
        let rows = await DB.get_rows(sql, sql_params);
        return successResponse(rows, "succes")
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
export default clinicModel;