import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import path from 'path';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable, internalServerError } from '../../services/response';
import { banner_path, clinic_logo_path, doctor_logo_path } from '../../constants';
import cliniModel, { getDoctors, getDoctorCompleteDetails, approveDoctor, changeDoctorActiveStatus, getClinicBanners, getClinicSpecialization } from '../../model/clinic';
import { addClinicStaff, staffList } from '../../model/clinic-staff';
import doctorModel from '../../model/clinic/doctor';
import { encrypt } from '../../services/encryption';
import { FormdataRequest } from '../../types';
import { get_current_datetime } from '../../services/datetime';
import { uploadFileToServer, deleteFile } from '../../services/file-upload';
import fs from 'fs';
const requestParams = {
    getLoginToken: Joi.object({
        clinic_id: Joi.number().required(),
        branch_id: Joi.number().required()
    }),
    checkClinicSeourlAvailability: Joi.object({
        seourl: Joi.string().required(),
        city: Joi.string().required()
    }),
    checkClinicMobileUnique: Joi.object({
        mobile: Joi.number().required()
    }),
    checkClinicloginUserNameUnique: Joi.object({
        user_name: Joi.string().required()
    }),
    addNewClinic: Joi.object({
        business_type: Joi.string().required(),
        clinic_name: Joi.string().required(),
        clinic_seo_url: Joi.string().required(),
        contact_no: Joi.number().required(),
        alt_contact_no: Joi.number().allow(''),
        contact_email: Joi.string().allow(''),
        state: Joi.string().required(),
        state_code: Joi.string().required(),
        dist: Joi.string().required(),
        dist_code: Joi.string().required(),
        market: Joi.string().required(),
        area_name: Joi.string().required(),
        location: Joi.string().required(),
        latitude: Joi.number().allow(''),
        longitude: Joi.number().allow(''),
        user_name: Joi.string().allow(""),
        password: Joi.string().allow(""),
        partner_type: Joi.string().required(),
        //category: Joi.alternatives().conditional("business_type",{is:"CLINIC",then:Joi.string().required()})
        //category:Joi.string().when("business_type",{is:"CLINIC",then:Joi.required(),otherwise:Joi.optional()})
    }),
    getClinicList: Joi.object({
        page: Joi.number().required(),
        case: Joi.string().allow('')
    }),
    getClinicDetail: Joi.object({
        clinic_id: Joi.number().required(),
        case: Joi.string().required()
    }),
    saveClinicDetail: Joi.object({
        clinic_id: Joi.number().required(),
        branch_id: Joi.number().required(),
        name: Joi.string(),
        email: Joi.string(),
        mobile: Joi.number(),
        location: Joi.string(),
        city: Joi.string(),
        locality: Joi.string(),
        location_lat: Joi.number(),
        location_lng: Joi.number(),
        status: Joi.string(),
        approved: Joi.number(),
        verified: Joi.number(),
        active: Joi.number(),
        seo_url: Joi.string(),
        page_title: Joi.string(),
        meta_description: Joi.string(),
        is_prime: Joi.number(),
        alt_mob_no: Joi.number(),
        state: Joi.string(),
        market_name: Joi.string(),
        category: Joi.array().items(Joi.string()),
        partner_type: Joi.string(),
        whatsapp_number: Joi.string().allow(''),
        whatsapp_channel_link: Joi.string().allow(''),
        tag_line: Joi.string().allow(''),
        enable_enquiry: Joi.number().allow(''),
        show_patients_feedback: Joi.number().allow(''),
        crm_contact_number: Joi.string().allow(''),
        crm_name: Joi.string().allow('')
    }),
    saveClinicTiming: Joi.object({
        clinic_id: Joi.number().required(),
        type: Joi.string().valid('insert', 'update').required(),
        monday: Joi.number().valid(0, 1).required(),
        monday_1st_session_start: Joi.string().allow(''),
        monday_1st_session_end: Joi.string().allow(''),
        monday_2nd_session_start: Joi.string().allow(''),
        monday_2nd_session_end: Joi.string().allow(''),
        tuesday: Joi.number().valid(0, 1).required(),
        tuesday_1st_session_start: Joi.string().allow(''),
        tuesday_1st_session_end: Joi.string().allow(''),
        tuesday_2nd_session_start: Joi.string().allow(''),
        tuesday_2nd_session_end: Joi.string().allow(''),
        wednesday: Joi.number().valid(0, 1).required(),
        wednesday_1st_session_start: Joi.string().allow(''),
        wednesday_1st_session_end: Joi.string().allow(''),
        wednesday_2nd_session_start: Joi.string().allow(''),
        wednesday_2nd_session_end: Joi.string().allow(''),
        thursday: Joi.number().valid(0, 1).required(),
        thursday_1st_session_start: Joi.string().allow(''),
        thursday_1st_session_end: Joi.string().allow(''),
        thursday_2nd_session_start: Joi.string().allow(''),
        thursday_2nd_session_end: Joi.string().allow(''),
        friday: Joi.number().valid(0, 1).required(),
        friday_1st_session_start: Joi.string().allow(''),
        friday_1st_session_end: Joi.string().allow(''),
        friday_2nd_session_start: Joi.string().allow(''),
        friday_2nd_session_end: Joi.string().allow(''),
        saturday: Joi.number().valid(0, 1).required(),
        saturday_1st_session_start: Joi.string().allow(''),
        saturday_1st_session_end: Joi.string().allow(''),
        saturday_2nd_session_start: Joi.string().allow(''),
        saturday_2nd_session_end: Joi.string().allow(''),
        sunday: Joi.number().valid(0, 1).required(),
        sunday_1st_session_start: Joi.string().allow(''),
        sunday_1st_session_end: Joi.string().allow(''),
        sunday_2nd_session_start: Joi.string().allow(''),
        sunday_2nd_session_end: Joi.string().allow(''),
    }),
    updateClinicSpecialization: Joi.object({
        clinic_id: Joi.number().required(),
        branch_id: Joi.number().required(),
        specilization_business_type: Joi.string().required(),
        specializations: Joi.array().items(Joi.object({
            specialist_id: Joi.number().required(),
            specialist_business_type: Joi.string().required(),
            score: Joi.number().allow(''),
            service_price: Joi.number().allow(''),
            service_price_display: Joi.string().allow('')
        }))
    }),
    getSpecialists: Joi.object({
        clinic_id: Joi.number().required(),
        type: Joi.string().required()
    }),
    getDoctorsList: Joi.object({
        clinic_id: Joi.number().required()
    }),
    doctorCompleteDetails: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().required(),
        service_loc_id: Joi.number().required()
    }),
    getDoctorinfo: Joi.object({
        tab: Joi.string().required(),
        doctor_id: Joi.number().required(),
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        group_category: Joi.string(),
    }),
    saveDoctorBasicDetail: Joi.object({
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        name: Joi.string(),
        partner_type: Joi.string().valid('public_listing', 'partnered'),
        gender: Joi.string(),
        experience: Joi.number(),
        position: Joi.string(),
        description: Joi.string().allow(''),
        service_charge: Joi.number(),
        active: Joi.number(),
        display_order_for_clinic: Joi.number(),
        registration_no: Joi.string().allow(''),
        category: Joi.string().valid('allopathy', 'homeopathy', 'ayurveda').allow(''),
        qualification_disp: Joi.string().allow(''),
    }),
    saveDoctorSpecialization: Joi.object({
        service_loc_id: Joi.number().required(),
        cid: Joi.number().required(),
        selected_ids: Joi.array().items(Joi.number()),
        removed_ids: Joi.array().items(Joi.number())
    }),
    saveDoctorSeoDetail: Joi.object({
        seo_id: Joi.number(),
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        seo_url: Joi.string(),
        page_title: Joi.string(),
        meta_description: Joi.string(),
        ldjson: Joi.any().allow(''),
    }),
    updateDoctorSettings: Joi.object({
        service_loc_id: Joi.number().allow(''),
        service_loc_setting_id: Joi.number().required(),
        cid: Joi.number().required(),
        payment_type: Joi.string().valid('while_booking', 'at_clinic', 'all'),//ENUM('while_booking', 'at_clinic', 'after_consulting', 'all')
        cash_recived_mode: Joi.string().valid('one', 'multiple'),//ENUM('one', 'multiple')
        advance_booking_enable: Joi.number().valid(0, 1),
        emergency_booking_close: Joi.number().valid(0, 1),
        booking_close_message: Joi.string(),
        book_by: Joi.string().valid('app', 'call', 'manually'),//ENUM('app', 'call', 'manually')
        appointment_book_mode: Joi.string().valid('online', 'offline', 'online_offline'),//ENUM('online', 'offline', 'online_offline')
        allow_booking_request: Joi.number().valid(1, 0),
        slot_allocation_mode: Joi.string().valid('auto', 'manual'),//ENUM('auto', 'manual')
        slno_type: Joi.string().valid('number', 'group', 'group_without_time', 'group_for_advance_booking'),//enum('number','group','group_without_time','group_for_advance_booking'),
        enable_enquiry: Joi.number().valid(0, 1).allow(''),
        show_patients_feedback: Joi.number().valid(0, 1).allow(''),
        site_service_charge: Joi.number().allow(""),
        show_group_name_while_booking: Joi.number().valid(0, 1).allow(''),
        show_similar_business: Joi.number().valid(0, 1).allow(''),
        display_consulting_timing: Joi.string().allow(''),
        display_booking_timing: Joi.string().allow(''),
    }),
    updateDoctorWeeklyConsultingTiming: Joi.object({
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        availability: Joi.string().valid('per_week', 'per_day', 'per_month', 'per_week_per_month'),
        sunday: Joi.number().valid(0, 1),
        sunday_1st_session_start: Joi.string().allow(""),
        sunday_1st_session_end: Joi.string().allow(""),
        sunday_2nd_session_start: Joi.string().allow(""),
        sunday_2nd_session_end: Joi.string().allow(""),
        monday: Joi.number().valid(0, 1),
        monday_1st_session_start: Joi.string().allow(""),
        monday_1st_session_end: Joi.string().allow(""),
        monday_2nd_session_start: Joi.string().allow(""),
        monday_2nd_session_end: Joi.string().allow(""),
        tuesday: Joi.number().valid(0, 1),
        tuesday_1st_session_start: Joi.string().allow(""),
        tuesday_1st_session_end: Joi.string().allow(""),
        tuesday_2nd_session_start: Joi.string().allow(""),
        tuesday_2nd_session_end: Joi.string().allow(""),
        wednesday: Joi.number().valid(0, 1),
        wednesday_1st_session_start: Joi.string().allow(""),
        wednesday_1st_session_end: Joi.string().allow(""),
        wednesday_2nd_session_start: Joi.string().allow(""),
        wednesday_2nd_session_end: Joi.string().allow(""),
        thursday: Joi.number().valid(0, 1),
        thursday_1st_session_start: Joi.string().allow(""),
        thursday_1st_session_end: Joi.string().allow(""),
        thursday_2nd_session_start: Joi.string().allow(""),
        thursday_2nd_session_end: Joi.string().allow(""),
        friday: Joi.number().valid(0, 1),
        friday_1st_session_start: Joi.string().allow(""),
        friday_1st_session_end: Joi.string().allow(""),
        friday_2nd_session_start: Joi.string().allow(""),
        friday_2nd_session_end: Joi.string().allow(""),
        saturday: Joi.number().valid(0, 1),
        saturday_1st_session_start: Joi.string().allow(""),
        saturday_1st_session_end: Joi.string().allow(""),
        saturday_2nd_session_start: Joi.string().allow(""),
        saturday_2nd_session_end: Joi.string().allow(""),
        sunday_3rd_session_start: Joi.string().allow(""),
        sunday_3rd_session_end: Joi.string().allow(""),
        monday_3rd_session_start: Joi.string().allow(""),
        monday_3rd_session_end: Joi.string().allow(""),
        tuesday_3rd_session_start: Joi.string().allow(""),
        tuesday_3rd_session_end: Joi.string().allow(""),
        wednesday_3rd_session_start: Joi.string().allow(""),
        wednesday_3rd_session_end: Joi.string().allow(""),
        thursday_3rd_session_start: Joi.string().allow(""),
        thursday_3rd_session_end: Joi.string().allow(""),
        friday_3rd_session_start: Joi.string().allow(""),
        friday_3rd_session_end: Joi.string().allow(""),
        saturday_3rd_session_start: Joi.string().allow(""),
        saturday_3rd_session_end: Joi.string().allow("")
    }),
    updateDoctorMonthlyConsultingTiming: Joi.object({
        id: Joi.number(),
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        every_month: Joi.string().valid('1', '2', '3', '4', '5', 'last'),
        no_of_times: Joi.number().allow(''),
        day_name: Joi.string().valid('week', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'),
        first_session_start_time: Joi.string().allow(''),
        first_session_end_time: Joi.string().allow(''),
        second_session_start_time: Joi.string().allow(''),
        second_session_end_time: Joi.string().allow('')
    }),
    deleteDoctorMonthlyConsultingTiming: Joi.object({
        id: Joi.number(),
        cid: Joi.number().required(),
        service_loc_id: Joi.number().required(),
    }),
    updateSlnoGroup: Joi.object({
        action: Joi.string().required(),
        id: Joi.number(),
        group_name: Joi.string().required(),
        service_loc_id: Joi.number().required(),
        group_name_for_user: Joi.string(),
        limit: Joi.number().required(),
        booking_start: Joi.string(),
        booking_complete_time: Joi.string(),
        display_order: Joi.number().required(),
        reserved: Joi.number(),
        message: Joi.string(),
        enable: Joi.number(),
    }),
    similarBusiness: Joi.object({
        cid: Joi.number(),
        similar_business_sections: Joi.array().items(Joi.object({
            heading: Joi.string().required(),
            doctor_ids: Joi.string().allow(''),
            clinic_ids: Joi.string().allow('')
        }))
    }),
    treatedHealthConditions: Joi.object({
        cid: Joi.number(),
        service_loc_id: Joi.number().required(),
        treatments_available: Joi.string().allow(''),
        treated_health_conditions: Joi.array().items(Joi.object({
            condition: Joi.string().required(),
            severity_levels: Joi.string().allow(''),
            no_of_cases:Joi.number().allow('')
        }))
    }),
    approveDoctor: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().required(),
        service_loc_id: Joi.number().required()
    }),
    changeDoctorActiveStatus: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().required(),
        service_loc_id: Joi.number().required(),
        active: Joi.number().required()
    }),
    clinicBanners: Joi.object({
        clinic_id: Joi.number().required(),
        banner_id: Joi.number().allow('')
    }),
    clinicSpecializations: Joi.object({
        clinic_id: Joi.number().required(),
        case: Joi.string().required(),
        business_type: Joi.string().required()
    }),
    getClinicStaffs: Joi.object({
        clinic_id: Joi.number().required(),
    }),
    addClinicStaff: Joi.object({
        clinic_id: Joi.number().required(),
        mobile_no: Joi.number().required(),
        email: Joi.string().allow(''),
        name: Joi.string().required(),
        status: Joi.string().required(),
        password: Joi.string().required(),
        role: Joi.string().required(),
        clinic_staff_type: Joi.string().required()
    }),
    addClinicStaffNonRegistered: Joi.object({
        clinic_id: Joi.number().required(),
        mobile_no: Joi.number().required(),
        name: Joi.string().required(),
        email: Joi.string().allow(''),
        status: Joi.string().allow(''),
        password: Joi.string().allow(''),
        role: Joi.string().allow(''),
        clinic_staff_type: Joi.string().required()
    }),
    getDoctorsForDropDown: Joi.object({
        clinic_id: Joi.number().required()
    }),
    uploadClinicBanner: Joi.object({
        id: Joi.number(),
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().required(),
        banner_description: Joi.string().required(),
        device_type: Joi.valid("mobile", "desktop", "all").required(),
        display_order: Joi.number().required(),
        banner_img_url: Joi.string().allow(''),
        redirection_url: Joi.string().allow('')
    }),
    updateClinicLogo: Joi.object({
        clinic_id: Joi.number().required(),
        old_logo: Joi.string().allow(""),
        clinic_name: Joi.string().required(),
        clinic_city: Joi.string().required()
    }),
    updateDoctorProfilePic: Joi.object({
        clinic_id: Joi.number().required(),
        doctor_id: Joi.number().required(),
        old_logo: Joi.string().allow(""),
        doctor_name: Joi.string().required(),
        city: Joi.string().required(),
    }),
    saveSlNoConsultiming: Joi.object({
        service_loc_id: Joi.number(),
        consulting_timing: Joi.array().items(Joi.object({
            message: Joi.string().allow(''),
            patient_reach_time: Joi.string().allow(''),
            sl_no: Joi.string().required(),
            sl_no_exp_time: Joi.string().allow("")
        }))
    }),
    updateDbDetails: Joi.object({
        clinic_id: Joi.number().required(),
        mongo_db_connection_url: Joi.string().required(),
        mysql: Joi.any()
    })
}
const clinicController = {
    updateDbDetails: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.updateDbDetails.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        await DB.query("update clinics set db_details=? where id=? limit 1", [JSON.stringify({ mongo_db_connection_url: body.mongo_db_connection_url, mysql: body.mysql }), body.clinic_id], true);
        res.json(successResponse({}, "updated successfully"))
    },
    getLoginToken: async (req: Request, res: Response) => {
        const { query, ip }: { query: any, ip: string | undefined } = req;
        const validation: ValidationResult = requestParams.getLoginToken.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let mobile = 'BME' + tokenInfo.mob;
        await DB.query("delete from clinic_staffs where mobile=? limit 1", [mobile]);
        await DB.query("insert into clinic_staffs set clinic_id=?,mobile=?,name=?,status=?,password=md5(?),role=?,clinic_staff_type=?", [query.clinic_id, 'BME' + tokenInfo.mob, tokenInfo.eid, 'active', '123456', 'admin', 'registered']);
        let token = encrypt(JSON.stringify({ mob: mobile, password: "123456", ip: ip || "" }));
        res.json(successResponse({ token: token }, "success"));
    },
    checkClinicSeourlAvailability: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.checkClinicSeourlAvailability.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let avl = await cliniModel.checkClinicSeourlAvailability(query.seourl, query.city);
        if (avl) {
            res.json(successResponse(null, "Available"));
        } else {
            serviceNotAcceptable("Seo url not avialbe", res);
        }
    },
    checkClinicMobileUnique: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.checkClinicMobileUnique.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let avl = await cliniModel.checkClinicMobileUnique(query.mobile);
        if (avl) {
            res.json(successResponse(null, "Available"));
        } else {
            serviceNotAcceptable("Mobile no already exist", res);
        }
    },
    checkClinicloginUserNameUnique: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.checkClinicloginUserNameUnique.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let avl = await cliniModel.checkClinicloginUserNameUnique(query.user_name);
        if (avl) {
            res.json(successResponse(null, "Available"));
        } else {
            serviceNotAcceptable("username already exist", res);
        }
    },
    addNewClinic: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addNewClinic.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }

        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let seoUrlAvailable = await cliniModel.checkClinicSeourlAvailability(body.clinic_seo_url, body.dist);
        if (!seoUrlAvailable) {
            serviceNotAcceptable("clinic seo url already exist", res);
            return;
        }
        let mobileAvailable = await cliniModel.checkClinicMobileUnique(body.contact_no);
        if (!mobileAvailable) {
            serviceNotAcceptable("contact no already exist", res);
            return;
        }
        let userAvailable = await cliniModel.checkClinicloginUserNameUnique(body.user_name);
        if (!userAvailable) {
            serviceNotAcceptable("Username is already exit", res);
            return;
        }
        let addres = await cliniModel.addNewClinic({
            business_type: body.business_type,
            branch_id: tokenInfo.bid,
            clinic_name: body.clinic_name,
            clinic_seo_url: body.clinic_seo_url,
            contact_no: body.contact_no,
            alt_contact_no: body.alt_contact_no ? body.alt_contact_no : '',
            contact_email: body.contact_email ? body.contact_email : '',
            state: body.state,
            dist: body.dist,
            state_code: body.state_code,
            dist_code: body.dist_code,
            market: body.market,
            area_name: body.area_name,
            location: body.location,
            latitude: body.latitude,
            longitude: body.longitude,
            user_name: body.user_name,
            password: body.password,
            category: "",
            partner_type: body.partner_type,
            emp_info: emp_info
        });
        res.status(addres.code).json(addres);
    },
    getClinicList: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (query.case === 'clinic_list_for_ddl') {
            let q = "select id,name,market_name,category,business_type from clinics where branch_id=?";
            let rows = await DB.get_rows(q, [tokenInfo.bid]);
            res.json(successResponse({
                clinics: rows,
            }))
            return;
        } else if (query.case === 'all') {
            let q = `select * from clinics where branch_id=?`;
            let rows = await DB.get_rows(q, [tokenInfo.bid]);
            res.json(successResponse({
                clinics: rows,
            }))
            return;
        }
        const perpage = 20;
        let lower_limit = (query.page - 1) * perpage;
        let q = `select id,name,email,mobile,location,city,locality,location_lat,location_lng,status,approved,verified,active,logo,rating,seo_url,branch_id,wallet_balance,is_prime,prime_rank from clinics where branch_id=? limit ?,?`;
        let rows = await DB.get_rows(q, [tokenInfo.bid, lower_limit, perpage]);
        res.json(successResponse({
            clinics: rows,
            per_page: perpage
        }))
    },
    getClinicDetail: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicDetail.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (query.case === "basic_detail") {
            let row: any = await DB.get_row("select * from clinics where id=? limit 1", [query.clinic_id]);
            res.json(successResponse(row, "success"));
            return
        }
        if (query.case === "business_hour") {
            let row = await DB.get_row("select * from clinic_timings where clinic_id=? limit 1", [query.clinic_id]);
            res.json(successResponse(row, "success"));
            return
        }
    },
    saveClinicDetail: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.saveClinicDetail.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let postdata: any = {
            clinic_id: body.clinic_id,
            name: body.name,
            email: body.email,
            mobile: body.mobile,
            location: body.location,
            city: body.city,
            locality: body.locality,
            location_lat: body.location_lat,
            location_lng: body.location_lng,
            status: body.status,
            approved: body.approved,
            verified: body.verified,
            active: body.active,
            seo_url: body.seo_url,
            page_title: body.page_title,
            meta_description: body.meta_description,
            is_prime: body.is_prime,
            state: body.state,
            market_name: body.market_name,
            category: body.category,
            partner_type: body.partner_type,
            whatsapp_number: body.whatsapp_number,
            whatsapp_channel_link: body.whatsapp_channel_link,
            tag_line: body.tag_line,
            crm_contact_number: body.crm_contact_number,
            crm_name: body.crm_name,
        }
        if (typeof body.enable_enquiry !== "undefined") {
            postdata.enable_enquiry = body.enable_enquiry;
        }
        if (typeof body.show_patients_feedback !== "undefined") {
            postdata.show_patients_feedback = body.show_patients_feedback;
        }
        let updateRes = await cliniModel.updateClinicDetail(tokenInfo.bid, postdata);
        res.status(updateRes.code).json(updateRes);
    },
    saveClinicTiming: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.saveClinicTiming.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }

        let updateRes = await cliniModel.updateClinicTiming(tokenInfo.bid, body.clinic_id, {
            type: body.type,
            monday: body.monday,
            monday_1st_session_start: body.monday_1st_session_start,
            monday_1st_session_end: body.monday_1st_session_end,
            monday_2nd_session_start: body.monday_2nd_session_start,
            monday_2nd_session_end: body.monday_2nd_session_end,
            tuesday: body.tuesday,
            tuesday_1st_session_start: body.tuesday_1st_session_start,
            tuesday_1st_session_end: body.tuesday_1st_session_end,
            tuesday_2nd_session_start: body.tuesday_2nd_session_start,
            tuesday_2nd_session_end: body.tuesday_2nd_session_end,
            wednesday: body.wednesday,
            wednesday_1st_session_start: body.wednesday_1st_session_start,
            wednesday_1st_session_end: body.wednesday_1st_session_end,
            wednesday_2nd_session_start: body.wednesday_2nd_session_start,
            wednesday_2nd_session_end: body.wednesday_2nd_session_end,
            thursday: body.thursday,
            thursday_1st_session_start: body.thursday_1st_session_start,
            thursday_1st_session_end: body.thursday_1st_session_end,
            thursday_2nd_session_start: body.thursday_2nd_session_start,
            thursday_2nd_session_end: body.thursday_2nd_session_end,
            friday: body.friday,
            friday_1st_session_start: body.friday_1st_session_start,
            friday_1st_session_end: body.friday_1st_session_end,
            friday_2nd_session_start: body.friday_2nd_session_start,
            friday_2nd_session_end: body.friday_2nd_session_end,
            saturday: body.saturday,
            saturday_1st_session_start: body.saturday_1st_session_start,
            saturday_1st_session_end: body.saturday_1st_session_end,
            saturday_2nd_session_start: body.saturday_2nd_session_start,
            saturday_2nd_session_end: body.saturday_2nd_session_end,
            sunday: body.sunday,
            sunday_1st_session_start: body.sunday_1st_session_start,
            sunday_1st_session_end: body.sunday_1st_session_end,
            sunday_2nd_session_start: body.sunday_2nd_session_start,
            sunday_2nd_session_end: body.sunday_2nd_session_end,
        });
        res.status(updateRes.code).json(updateRes);
    },
    updateClinicSpecialization: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.updateClinicSpecialization.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let query = "insert into clinic_specialization (clinic_id,specialist_id,specialist_business_type,score,service_price,service_price_display) values ?";
        let sqlParams: any = [];
        for (let specialization of body.specializations) {
            sqlParams.push([body.clinic_id, specialization.specialist_id, body.specilization_business_type, specialization.score || null, specialization.service_price || null, specialization.service_price_display]);
        }
        await DB.query("delete from clinic_specialization where clinic_id=? and specialist_business_type=?", [body.clinic_id, body.specilization_business_type]);
        DB.query(query, [sqlParams], true);
        res.json(successResponse({}, "success"));
    },
    getDoctorsList: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getDoctorsList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let result = await getDoctors(tokenInfo.bid, query.clinic_id);
        res.json(successResponse(result))
    },
    getDoctorsForDropDown: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getDoctorsForDropDown.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let result = await cliniModel.getDoctorsForDropdown(tokenInfo.bid, query.clinic_id);
        res.status(result.code).json(result);
    },
    doctorCompleteDetails: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.doctorCompleteDetails.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let result = await getDoctorCompleteDetails(tokenInfo.bid, query.clinic_id, query.doctor_id, query.service_loc_id);
        res.json(successResponse(result))
    },
    getDoctorinfo: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getDoctorinfo.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            unauthorizedResponse("you are not authorised for this service", res);
            return;
        }
        const { cid } = query;
        if (query.tab === 'basic_detail') {
            let response = await doctorModel.getDoctorBasicInfo(query.doctor_id, cid);
            res.status(response.code).json(response);
        } else if (query.tab === "media_content") {
            let response = await doctorModel.getDoctorMediaContent(query.doctor_id, cid);
            res.status(response.code).json(response);
        } else if (query.tab === 'specialization') {
            let response = await doctorModel.getDoctorSpecializations(query.doctor_id, cid, query.group_category);
            res.status(response.code).json(response);
        } else if (query.tab === 'disease_treatments') {
            let response = await doctorModel.getDiseaseTreatmentList(query.doctor_id, cid, query.service_loc_id);
            res.status(response.code).json(response);
        } else if (query.tab === 'seo_details') {
            let response = await doctorModel.getDoctorSeoDetails(query.doctor_id, cid);
            res.status(response.code).json(response);
        } else if (query.tab === 'settings') {
            let response = await doctorModel.getDoctorSettings(query.doctor_id, cid, query.service_loc_id);
            res.status(response.code).json(response);
        } else if (query.tab === "slno_groups") {
            let response = await doctorModel.getDoctorSlnoGroups(query.service_loc_id);
            res.status(response.code).json(response);
        } else if (query.tab === 'consulting_timing') {
            let response = await doctorModel.getconsultingTiming(query.doctor_id, cid, query.service_loc_id);
            res.status(response.code).json(response);
        } else if (query.tab === "cash_receive_modes") {
            let rows = await DB.get_rows("select * from cash_recive_modes where service_location_id=? order by display_order", [query.service_loc_id]);
            res.json(successResponse(rows, "success"));
        } else if (query.tab === "similar_business") {
            let response = await doctorModel.getDoctorSettingsFromMongo(query.doctor_id, cid);
            res.status(response.code).json(response);
        } else {
            serviceNotAcceptable("Invalid tab name", res);
        }
    },
    saveDoctorInfo: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            unauthorizedResponse("you are not authorised for this service", res);
            return;
        }
        console.log(body);
        const { cid } = body;
        const { doctor_id, tab, ...restParams } = body;
        if (body.doctor_id && typeof body.doctor_id === 'number' && body.tab) {
            if (body.tab === 'basic_detail') {
                const validation: ValidationResult = requestParams.saveDoctorBasicDetail.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                if (Object.keys(restParams).length === 0) {
                    serviceNotAcceptable("No Changes to update", res);
                    return;
                }
                let response = await doctorModel.updateDoctorBasicInfo(body.doctor_id, cid, restParams);
                res.status(response.code).json(response);
                return;
            } else if (body.tab === 'specialization') {
                const validation: ValidationResult = requestParams.saveDoctorSpecialization.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateDoctorSpecialization(doctor_id, cid, body.service_loc_id, {
                    selected: restParams.selected_ids,
                    removed: restParams.removed_ids
                }, tokenInfo.bd)
                res.status(response.code).json(response);
            } else if (body.tab === 'disease_treatments') {
                const validation: ValidationResult = requestParams.saveDoctorSpecialization.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateDoctordiseaseTreatment(doctor_id, cid, body.service_loc_id, {
                    selected: restParams.selected_ids,
                    removed: restParams.removed_ids
                }, tokenInfo.bd)
                res.status(response.code).json(response);
            } else if (tab === 'seo_details') {
                const validation: ValidationResult = requestParams.saveDoctorSeoDetail.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateDoctorSeoInfo(doctor_id, cid, restParams)
                res.status(response.code).json(response);
            } else if (tab === 'settings') {
                const validation: ValidationResult = requestParams.updateDoctorSettings.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateDoctorSettings(doctor_id, cid, body.service_loc_id, restParams);
                res.status(response.code).json(response);
            } else if (tab === "consulting_timing") {
                const { section, ...timings } = restParams;
                if (section === 'weekly') {
                    const validation: ValidationResult = requestParams.updateDoctorWeeklyConsultingTiming.validate(timings);
                    if (validation.error) {
                        parameterMissingResponse(validation.error.details[0].message, res);
                        return;
                    }
                    let response = await doctorModel.updateWeeklyConsultingTiming(doctor_id, cid, body.service_loc_id, timings)
                    res.status(response.code).json(response);
                } else if (section === 'monthly') {
                    const validation: ValidationResult = requestParams.updateDoctorMonthlyConsultingTiming.validate(timings);
                    if (validation.error) {
                        parameterMissingResponse(validation.error.details[0].message, res);
                        return;
                    }
                    let response = await doctorModel.updateMonthlyConsultingTiming(doctor_id, cid, body.service_loc_id, timings)
                    res.status(response.code).json(response);
                } else if (section === 'delete_monthly') {
                    const { section, ...timings } = restParams;
                    const validation: ValidationResult = requestParams.deleteDoctorMonthlyConsultingTiming.validate(timings);
                    if (validation.error) {
                        parameterMissingResponse(validation.error.details[0].message, res);
                        return;
                    }
                    let response = await doctorModel.deleteMonthyConsultingTimeing({ id: body.id, doctor_id: doctor_id, service_loc_id: timings.service_loc_id, clinic_id: cid })
                    res.status(response.code).json(response);
                }
            } else if (tab === "slno_groups") {
                let { action, ...params } = restParams;
                if (action === "add_update") {
                    const validation: ValidationResult = requestParams.updateSlnoGroup.validate(restParams);
                    if (validation.error) {
                        parameterMissingResponse(validation.error.details[0].message, res);
                        return;
                    }
                    let response = await doctorModel.updateSlnoGroup({
                        id: params.id,
                        group_name: params.group_name,
                        service_loc_id: params.service_loc_id,
                        group_name_for_user: params.group_name_for_user,
                        limit: params.limit,
                        booking_start: params.booking_start,
                        booking_complete_time: params.booking_complete_time,
                        display_order: params.display_order,
                        reserved: params.reserved,
                        message: params.message,
                        enable: params.enable
                    });
                    res.status(response.code).json(response);
                } else if (action === 'delete') {
                    let response = await doctorModel.deleteSlnoGroup(params.id, params.service_loc_id)
                    res.status(response.code).json(response);
                }
            } else if (tab === "slno_conculting_timing") {
                const validation: ValidationResult = requestParams.saveSlNoConsultiming.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                await DB.query("update doctor_servicelocation_setting set consulting_timing_messages=? where service_location_id=?", [JSON.stringify(restParams.consulting_timing), restParams.service_loc_id]);
                res.json(successResponse({}, "updated successfully"));
                return;
            } else if (tab === "similar_business") {
                const validation: ValidationResult = requestParams.similarBusiness.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateSimilarBusinessSettings({
                    clinic_id: parseInt(cid),
                    doctor_id: parseInt(doctor_id),
                    similar_business_sections: restParams.similar_business_sections
                })
                res.status(response.code).json(response);
            } else if (tab === "treated_health_conditions") {
                const validation: ValidationResult = requestParams.treatedHealthConditions.validate(restParams);
                if (validation.error) {
                    parameterMissingResponse(validation.error.details[0].message, res);
                    return;
                }
                let response = await doctorModel.updateTreatedHealthConditions({
                    clinic_id: parseInt(cid),
                    doctor_id: parseInt(doctor_id),
                    conditions: restParams.treated_health_conditions,
                    treatments_available: restParams.treatments_available
                })
                res.status(response.code).json(response);
            } else {
                serviceNotAcceptable("invalid tab name", res);
            }
        } else {
            parameterMissingResponse("paramiter missing", res);
        }
    },
    approveDoctor: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.approveDoctor.validate(body);
        const { tokenInfo, emp_info } = res.locals;
        if (validation.error || typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            parameterMissingResponse(validation.error ? validation.error.details[0].message : "something went wrong! Please logout and login again", res);
            return;
        }
        let result = await approveDoctor({
            doctor_id: body.doctor_id,
            service_location_id: body.service_loc_id,
            clinic_id: body.clinic_id,
            emp_info: emp_info
        });
        res.status(result.code).json(result);
    },
    changeDoctorActiveStatus: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.changeDoctorActiveStatus.validate(body);
        const { tokenInfo, emp_info } = res.locals;
        if (validation.error || typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            parameterMissingResponse(validation.error ? validation.error.details[0].message : "something went wrong! Please logout and login again", res);
            return;
        }
        let result = await changeDoctorActiveStatus({
            doctor_id: body.doctor_id,
            service_location_id: body.service_loc_id,
            clinic_id: body.clinic_id,
            active: parseInt(body.active),
            emp_info: emp_info
        });
        res.status(result.code).json(result);
    },
    clinicBanners: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.clinicBanners.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await getClinicBanners({
            clinic_id: query.clinic_id
        })
        res.status(response.code).json(response);
    },
    clinicSpecializations: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.clinicSpecializations.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await getClinicSpecialization({
            clinic_id: query.clinic_id,
            case: query.case,
            business_type: query.business_type
        })
        res.status(response.code).json(response);
    },
    getClinicStaffs: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicStaffs.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await staffList({
            branch_id: tokenInfo.bid,
            clinic_id: query.clinic_id
        })
        res.status(response.code).json(response);
    },
    addClinicStaff: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        if (body.clinic_staff_type === 'registered') {
            const validation: ValidationResult = requestParams.addClinicStaff.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
        } else {
            const validation: ValidationResult = requestParams.addClinicStaffNonRegistered.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let resonse = await addClinicStaff({
            clinic_id: body.clinic_id,
            mobile_no: body.mobile_no,
            name: body.name,
            email: body.email ? body.email : '',
            status: body.status ? body.status : null,
            role: body.role ? body.role : null,
            password: body.password ? body.password : '',
            clinic_staff_type: body.clinic_staff_type
        });
        res.status(resonse.code).json(resonse);
    },
    uploadClinicBanner: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.uploadClinicBanner.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let state = '';
        let city = '';
        let user_id = "";
        let user_type = "";
        if (parseInt(body.clinic_id)) {
            let row = await DB.get_row<{ state: string, city: string }>("select state,city from clinics where id=?", [body.clinic_id]);
            state = row?.state || '';
            city = row?.city || '';
        } else if (parseInt(body.doctor_id) && (state == '' || city == '')) {
            let row = await DB.get_row<{ state: string, city: string }>("select state,city from doctor where id=?", [body.doctor_id]);
            state = row?.state || '';
            city = row?.city || '';
        }
        if (parseInt(body.doctor_id)) {
            user_id = body.doctor_id;
            user_type = "doctor";
        } else if (!parseInt(body.doctor_id) && parseInt(body.clinic_id)) {
            user_id = body.clinic_id;
            user_type = "clinic";
        }
        let image_name = '';
        if (body.banner_img_url) {
            image_name = body.banner_img_url;
        }
        if (!body.banner_img_url && files.banner) {
            let oldPath = files.banner.filepath;
            image_name = `${body.banner_description}-${body.user_type}${body.user_id}}`;
            image_name = image_name.replace(/[^a-zA-Z0-9\s]/g, '');
            image_name = image_name.replace(/\s/g, '-');
            image_name = image_name + path.extname(files.banner.originalFilename);
            let bannerDirectory = `${banner_path}/${state.toLowerCase()}/${city.toLowerCase()}/C${body.clinic_id}D${body.doctor_id}`;
            // replace space to -
            bannerDirectory = bannerDirectory.replace(/\s/g, '-');
            if (fs.existsSync(bannerDirectory) == false) {
                fs.mkdirSync(bannerDirectory, { recursive: true });
            }
            let new_path = `${bannerDirectory}/${image_name}`;
            image_name = `${state.toLowerCase()}/${city.toLowerCase()}/C${body.clinic_id}D${body.doctor_id}/${image_name}`;
            image_name = image_name.replace(/\s/g, '-');
            try {
                await uploadFileToServer(oldPath, new_path)
            } catch (err: any) {
                internalServerError(err.message, res);
                return
            }
        }
        let now = get_current_datetime();
        if (body.id) {

        } else {
            await DB.query("insert into banners set image=?,display_order=?,user_id=?,user_type=?,device_type=?,redirection_url=?,banner_description=?,upload_time=?", [
                image_name, body.display_order, user_id, user_type, body.device_type, body.redirection_url, body.banner_description, now
            ])
        }
        res.json(successResponse("Banner Updated successfully"))
    },
    updateClinicLogo: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.updateClinicLogo.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        if (files.logo) {
            let oldPath = files.logo.filepath;
            let clinic_logo = `${body.clinic_name}-${body.clinic_city}}`;
            clinic_logo = clinic_logo.replace(/[^a-zA-Z0-9\s-]/g, '');
            clinic_logo = clinic_logo.replace(/\s/g, '-');
            clinic_logo = clinic_logo + path.extname(files.logo.originalFilename);
            try {
                uploadFileToServer(oldPath, `${clinic_logo_path}/${clinic_logo}`);
                const now = new Date(get_current_datetime());
                clinic_logo = clinic_logo + "?t=" + now.getSeconds();
                await DB.query("update clinics set logo=? where id=?", [clinic_logo, body.clinic_id]);
                if (body.old_logo !== clinic_logo) {
                    deleteFile(`${clinic_logo_path}/${body.old_logo}`)
                }
                res.json(successResponse({ logo: clinic_logo }, "Logo updated successfully"));
            } catch (err: any) {
                res.json(internalServerError("Something went wrong", res));
            }
        } else {
            res.json(parameterMissingResponse("Please select an image", res));
        }
    },
    updateDoctorProfilePic: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.updateDoctorProfilePic.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        if (files.logo) {
            let row = await DB.get_row<{ name: string }>("select name from clinics where id=?", [body.clinic_id]);
            if (row == null) {
                serviceNotAcceptable("Invalid clinic detail", res);
                return;
            }
            let oldPath = files.logo.filepath;
            let doctor_logo = `${body.doctor_name}-${row?.name}-at-${body.city}}`;
            doctor_logo = doctor_logo.replace(/[^a-zA-Z0-9\s-]/g, '');
            doctor_logo = doctor_logo.replace(/\s/g, '-');
            doctor_logo = doctor_logo + path.extname(files.logo.originalFilename);
            try {
                uploadFileToServer(oldPath, `${doctor_logo_path}/${doctor_logo}`);
                const now = new Date(get_current_datetime());
                doctor_logo = doctor_logo + "?t=" + now.getSeconds();
                await DB.query("update doctor set image=? where id=?", [doctor_logo, body.doctor_id]);
                if (body.old_logo !== doctor_logo) {
                    deleteFile(`${clinic_logo_path}/${body.old_logo}`);
                }
                res.json(successResponse({ logo: doctor_logo }, "Logo updated successfully"));
            } catch (err: any) {
                res.json(internalServerError("Something went wrong", res));
            }
        } else {
            res.json(parameterMissingResponse("Please select an image", res));
        }
    }
}
export default clinicController;