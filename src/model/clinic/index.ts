import { ILoggedinEmpInfo } from '../../types';
import { get_current_datetime } from '../../services/datetime';
import { Iresponse, unauthorizedResponse, successResponse, internalServerError } from '../../services/response';
import { doctorprofileChangeLogModel } from '../../mongo-schema/coll_doctor_tbl_change_log';
import { clinicprofileChangeLogModel } from '../../mongo-schema/coll_clinic_tbl_chnage_logs';
import { getGroupCategoryShortName } from '../../helper';
type TaddNewClinicParams = {
    branch_id: number,
    business_type: string,
    clinic_name: string,
    clinic_seo_url: string,
    contact_no: number,
    alt_contact_no: number,
    contact_email: string,
    state: string,
    dist: string,
    state_code: string,
    dist_code: string,
    market: string,
    area_name: string,
    location: string,
    latitude: number,
    longitude: number,
    user_name: string,
    password: string,
    partner_type: string,
    category: string,
    emp_info: ILoggedinEmpInfo,
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
        //C12-ODBHC
        let q = 'insert into clinics set name=?,username=?,password=md5(?),email=?,mobile=?,location=?,city=?,locality=?,location_lat=?,location_lng=?,status=?,approved=0,verified=0,active=0,seo_url=?,branch_id=?,alt_mob_no=?,state=?,market_name=?,category=?,partner_type=?,business_type=?';
        let insertRes: any = await DB.query(q, [params.clinic_name, params.user_name, params.password, params.contact_email, params.contact_no, params.location, params.dist, params.area_name, params.latitude, params.longitude, 'close', params.clinic_seo_url, params.branch_id, params.alt_contact_no, params.state, params.market, params.category, params.partner_type, params.business_type]);
        if (insertRes.affectedRows >= 1) {
            let clinic_id = insertRes.insertId;
            let now = get_current_datetime();
            q = 'insert into clinic_detail (clinic_id,register_date,registered_by_emp_id) values (?,?,?)';
            DB.query(q, [clinic_id, now, params.emp_info.id]);
            let bid = `${getGroupCategoryShortName(params.business_type)}${clinic_id}-${params.state_code}${params.dist_code}`;
            DB.query("update clinics set bid=? where id=?", [bid, clinic_id]);
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
    },
    getDoctorsForDropdown: async (branch_id: number, clinic_id: number) => {
        let doctors = await DB.get_rows("select id as value,name from doctor where branch_id=? and clinic_id=? and active=1", [branch_id, clinic_id]);
        return successResponse(doctors, "success");
    },
    updateClinicDetail: async (branch_id: number, params: {
        clinic_id: number,
        name?: string,
        email?: string,
        mobile?: string,
        location?: string,
        city?: string,
        locality?: string,
        location_lat?: number,
        location_lng?: number,
        status?: string,
        approved?: number,
        verified?: number,
        active?: number,
        seo_url?: string,
        page_title?: string,
        meta_description?: string,
        is_prime?: number,
        alt_mob_no?: number,
        state?: string,
        market_name?: string,
        category?: string[],
        partner_type?: string,
        whatsapp_number?: string,
        whatsapp_channel_link?: string,
        tag_line?: string,
        enable_enquiry?: number,
        show_patients_feedback?: number
        crm_contact_number?: string
        crm_name?:string|null,
        patient_support_contact_no?:string|null
    }) => {
        try {
            let q = "update clinics set ";
            let sql_params = [];
            let updateFields = [];
            if (params.name) {
                updateFields.push("name=?");
                sql_params.push(params.name);
            }
            if (params.email) {
                updateFields.push("email=?");
                sql_params.push(params.email);
            }
            if (params.mobile) {
                updateFields.push("mobile=?");
                sql_params.push(params.mobile);
            }
            if (params.location) {
                updateFields.push("location=?");
                sql_params.push(params.location);
            }
            if (params.city) {
                updateFields.push("city=?");
                sql_params.push(params.city);
            }
            if (params.locality) {
                updateFields.push("locality=?");
                sql_params.push(params.locality);
            }
            if (params.location_lat) {
                updateFields.push("location_lat=?");
                sql_params.push(params.location_lat);
            }
            if (params.location_lng) {
                updateFields.push("location_lng=?");
                sql_params.push(params.location_lng);
            }
            if (params.status) {
                updateFields.push("status=?");
                sql_params.push(params.status);
            }
            if (params.approved) {
                updateFields.push("approved=?");
                sql_params.push(params.approved);
            }
            if (params.verified) {
                updateFields.push("verified=?");
                sql_params.push(params.verified);
            }
            if (params.active) {
                updateFields.push("active=?");
                sql_params.push(params.active);
            }
            if (params.seo_url) {
                updateFields.push("seo_url=?");
                sql_params.push(params.seo_url);
            }
            if (params.page_title) {
                updateFields.push("page_title=?");
                sql_params.push(params.page_title);
            }
            if (params.meta_description) {
                updateFields.push("meta_description=?");
                sql_params.push(params.meta_description);
            }
            if (params.is_prime) {
                updateFields.push("is_prime=?");
                sql_params.push(params.is_prime);
            }
            if (params.state) {
                updateFields.push("state=?");
                sql_params.push(params.state);
            }
            if (params.market_name) {
                updateFields.push("market_name=?");
                sql_params.push(params.market_name);
            }
            if (params.category) {
                updateFields.push("category=?");
                sql_params.push(params.category.join(','));
            }
            if (params.partner_type) {
                updateFields.push("partner_type=?");
                sql_params.push(params.partner_type);
            }
            if (params.whatsapp_number) {
                updateFields.push("whatsapp_number=?");
                sql_params.push(params.whatsapp_number);
            }
            if (params.whatsapp_channel_link) {
                updateFields.push("whatsapp_channel_link=?");
                sql_params.push(params.whatsapp_channel_link);
            }
            if (params.tag_line) {
                updateFields.push("tag_line=?");
                sql_params.push(params.tag_line);
            }
            if (params.enable_enquiry !== undefined) {
                if (params.enable_enquiry == 1 || params.enable_enquiry == 0) {
                    updateFields.push("enable_enquiry=?");
                    sql_params.push(params.enable_enquiry);
                }
            }
            if (params.show_patients_feedback !== undefined) {
                if (params.show_patients_feedback == 1 || params.show_patients_feedback == 0) {
                    updateFields.push("show_patients_feedback=?");
                    sql_params.push(params.show_patients_feedback);
                }
            }
            if (params.crm_contact_number !== undefined) {
                updateFields.push("crm_contact_number=?");
                sql_params.push(params.crm_contact_number);
            }
            if (params.crm_name !== undefined) {
                updateFields.push("crm_name=?");
                sql_params.push(params.crm_name);
            }
            if (params.patient_support_contact_no !== undefined) {
                updateFields.push("patient_support_contact_no=?");
                sql_params.push(params.patient_support_contact_no);
            }
            if (updateFields.length > 0) {
                q += updateFields.join(',');
                q += " where id=? and branch_id=?";
                sql_params.push(params.clinic_id, branch_id);
                await DB.query(q, sql_params);
            }
            return successResponse({}, "Updated Successfully");
        } catch (err: any) {
            return internalServerError(err.message)
        }
    },
    updateClinicTiming: async (branch_id: number, clinic_id: number, params: {
        type: "insert" | "update",
        monday: number,
        monday_1st_session_start: string,
        monday_1st_session_end: string,
        monday_2nd_session_start: string,
        monday_2nd_session_end: string,
        tuesday: number,
        tuesday_1st_session_start: string,
        tuesday_1st_session_end: string,
        tuesday_2nd_session_start: string,
        tuesday_2nd_session_end: string,
        wednesday: number,
        wednesday_1st_session_start: string,
        wednesday_1st_session_end: string,
        wednesday_2nd_session_start: string,
        wednesday_2nd_session_end: string,
        thursday: number,
        thursday_1st_session_start: string,
        thursday_1st_session_end: string,
        thursday_2nd_session_start: string,
        thursday_2nd_session_end: string,
        friday: number,
        friday_1st_session_start: string,
        friday_1st_session_end: string,
        friday_2nd_session_start: string,
        friday_2nd_session_end: string,
        saturday: number,
        saturday_1st_session_start: string,
        saturday_1st_session_end: string,
        saturday_2nd_session_start: string,
        saturday_2nd_session_end: string,
        sunday: number,
        sunday_1st_session_start: string,
        sunday_1st_session_end: string,
        sunday_2nd_session_start: string,
        sunday_2nd_session_end: string,
    }) => {
        if (params.type === "update") {
            await DB.query("update clinic_timings set monday=?,monday_1st_session_start=?,monday_1st_session_end=?,monday_2nd_session_start=?,monday_2nd_session_end=?,tuesday=?,tuesday_1st_session_start=?,tuesday_1st_session_end=?,tuesday_2nd_session_start=?,tuesday_2nd_session_end=?,wednesday=?,wednesday_1st_session_start=?,wednesday_1st_session_end=?,wednesday_2nd_session_start=?,wednesday_2nd_session_end=?,thursday=?,thursday_1st_session_start=?,thursday_1st_session_end=?,thursday_2nd_session_start=?,thursday_2nd_session_end=?,friday=?,friday_1st_session_start=?,friday_1st_session_end=?,friday_2nd_session_start=?,friday_2nd_session_end=?,saturday=?,saturday_1st_session_start=?,saturday_1st_session_end=?,saturday_2nd_session_start=?,saturday_2nd_session_end=?,sunday=?,sunday_1st_session_start=?,sunday_1st_session_end=?,sunday_2nd_session_start=?,sunday_2nd_session_end=? where clinic_id=?", [params.monday, params.monday_1st_session_start, params.monday_1st_session_end, params.monday_2nd_session_start, params.monday_2nd_session_end, params.tuesday, params.tuesday_1st_session_start, params.tuesday_1st_session_end, params.tuesday_2nd_session_start, params.tuesday_2nd_session_end, params.wednesday, params.wednesday_1st_session_start, params.wednesday_1st_session_end, params.wednesday_2nd_session_start, params.wednesday_2nd_session_end, params.thursday, params.thursday_1st_session_start, params.thursday_1st_session_end, params.thursday_2nd_session_start, params.thursday_2nd_session_end, params.friday, params.friday_1st_session_start, params.friday_1st_session_end, params.friday_2nd_session_start, params.friday_2nd_session_end, params.saturday, params.saturday_1st_session_start, params.saturday_1st_session_end, params.saturday_2nd_session_start, params.saturday_2nd_session_end, params.sunday, params.sunday_1st_session_start, params.sunday_1st_session_end, params.sunday_2nd_session_start, params.sunday_2nd_session_end, clinic_id]);
        } else {
            await DB.query("insert into clinic_timings set clinic_id=?,monday=?,monday_1st_session_start=?,monday_1st_session_end=?,monday_2nd_session_start=?,monday_2nd_session_end=?," +
                "tuesday=?,tuesday_1st_session_start=?,tuesday_1st_session_end=?,tuesday_2nd_session_start=?,tuesday_2nd_session_end=?," +
                "wednesday=?,wednesday_1st_session_start=?,wednesday_1st_session_end=?,wednesday_2nd_session_start=?,wednesday_2nd_session_end=?," +
                "thursday=?,thursday_1st_session_start=?,thursday_1st_session_end=?,thursday_2nd_session_start=?,thursday_2nd_session_end=?," +
                "friday=?,friday_1st_session_start=?,friday_1st_session_end=?,friday_2nd_session_start=?,friday_2nd_session_end=?," +
                "saturday=?,saturday_1st_session_start=?,saturday_1st_session_end=?,saturday_2nd_session_start=?,saturday_2nd_session_end=?," +
                "sunday=?,sunday_1st_session_start=?,sunday_1st_session_end=?,sunday_2nd_session_start=?,sunday_2nd_session_end=?", [clinic_id, params.monday, params.monday_1st_session_start, params.monday_1st_session_end, params.monday_2nd_session_start, params.monday_2nd_session_end, params.tuesday, params.tuesday_1st_session_start, params.tuesday_1st_session_end, params.tuesday_2nd_session_start, params.tuesday_2nd_session_end, params.wednesday, params.wednesday_1st_session_start, params.wednesday_1st_session_end, params.wednesday_2nd_session_start, params.wednesday_2nd_session_end, params.thursday, params.thursday_1st_session_start, params.thursday_1st_session_end, params.thursday_2nd_session_start, params.thursday_2nd_session_end, params.friday, params.friday_1st_session_start, params.friday_1st_session_end, params.friday_2nd_session_start, params.friday_2nd_session_end, params.saturday, params.saturday_1st_session_start, params.saturday_1st_session_end, params.saturday_2nd_session_start, params.saturday_2nd_session_end, params.sunday, params.sunday_1st_session_start, params.sunday_1st_session_end, params.sunday_2nd_session_start, params.sunday_2nd_session_end]);
        }
        return successResponse({}, "Clinic timing updated successfully");
    }
}
export const getDoctors = async (branch_id: number, clinic_id: number) => {
    let rows: any = await DB.get_rows("select t1.id as service_loc_id,t1.service_charge as consulting_fee,doctor.id,doctor.name,doctor.gender,doctor.experience,doctor.image,doctor.position,doctor.rating,doctor.active,doctor.clinic_id,doctor.business_type,group_concat(spl.name SEPARATOR ', ') as specialist from (SELECT * FROM `doctor_service_location` WHERE  clinic_id=?) as t1 join (select * from doctor where branch_id=? and clinic_id=?) as doctor on t1.`doctor_id`=doctor.id left join service_location_specialization as slp on t1.id=slp.service_location left join specialists as spl on slp.specialist_id=spl.id group by t1.id", [clinic_id, branch_id, clinic_id]);
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
        if (doctor.active !== -5) {
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
        let sql = "select * from banners where user_id=? and user_type='clinic' order by display_order";
        let sql_params = [params.clinic_id];
        let rows = await DB.get_rows(sql, sql_params);
        return successResponse(rows, "succes")
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
export const getClinicSpecialization = async (params: {
    clinic_id: number,
    case: string,
    business_type: string
}) => {
    try {
        if (params.case == "all") {
            if (params.business_type === 'DOCTOR') {
                let parent_categories: string[] = [];
                //et clinic = await DB.get_row<{ category: string }>("select category from clinics where id=?", [params.clinic_id])
                //parent_categories = clinic && clinic.category ? clinic.category.split(',') : [];
                if (parent_categories.length === 0) {
                    let categories_row = await DB.get_row<{ categories: string }>(`select group_concat(name) as categories from specialists where parent_id=0 and group_category=?`, [params.business_type]);
                    parent_categories = categories_row && categories_row.categories ? categories_row.categories.split(',') : [];
                }
                let specialistRows = await DB.get_rows(`select t1.id as specialist_id,t1.name as specialization_name,if(1=1,${params.clinic_id},0) as clinic_id,if(t1.id=csp.specialist_id,1,0) as selected,t1.p_id as parent_id,t1.parent_name as parent_specialization_name,csp.service_price,csp.service_price_display,csp.specialist_business_type,csp.score from (select t1.*,t2.id as p_id,t2.name as parent_name from (select * from specialists where group_category=? and enable=1) as t1 left join (select id,name from specialists where parent_id=0 and name in (?)) as t2 on t1.parent_id=t2.id) as t1
                 left join 
                (select * from clinic_specialization where clinic_id=?) as csp on t1.id=csp.specialist_id`, [params.business_type, parent_categories, params.clinic_id]);
                return successResponse(specialistRows, "succes")
            } else {
                let rows: any = await DB.get_rows(`select t1.id as specialist_id,t1.name as specialization_name,if(1=1,${params.clinic_id},0) as clinic_id,if(t1.id=csp.specialist_id,1,0) as selected,t1.parent_id as parent_id,csp.service_price,csp.service_price_display,csp.specialist_business_type,csp.score from (select * from specialists where group_category=? and parent_id=0
                union
                select * from specialists where group_category=? and parent_id!=0) as t1 left join 
                (select * from clinic_specialization where clinic_id=?) as csp on t1.id=csp.specialist_id
                order by t1.parent_id`, [params.business_type, params.business_type, params.clinic_id]);
                let obj: any = {};
                for (let row of rows) {
                    if (row.parent_id === 0) {
                        if (!obj[row.specialist_id]) {
                            obj[row.specialist_id] = [];
                        }
                        obj[row.specialist_id].push(row)
                    } else {
                        if (!obj[row.parent_id]) {
                            obj[row.parent_id] = [];
                        }
                        obj[row.parent_id].push(row)
                    }
                }
                let finalRows: any = []
                for (let arr of Object.values(obj)) {
                    finalRows = finalRows.concat(arr)
                }
                return successResponse(finalRows, "succes")
            }
        } else if (params.case == "selected") {
            let specialistRows = await DB.get_rows(`select t2.id as specialist_id,t2.name as specialization_name,if(1=1,${params.clinic_id},0) as clinic_id,if(t1.specialist_id=t2.id,1,0) as selected,t1.service_price,t1.service_price_display,t1.specialist_business_type,t1.score from (SELECT * FROM clinic_specialization WHERE clinic_id=? and specialist_business_type=?) as t1 join specialists as t2 on t1.specialist_id=t2.id`, [params.clinic_id, params.business_type], true);
            return successResponse(specialistRows, "succes");
        }
        return successResponse([], "succes")
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
export default clinicModel;