import { query, Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable } from '../../services/response';
import cliniModel, { getDoctors, getDoctorCompleteDetails, approveDoctor, changeDoctorActiveStatus, getClinicBanners, getClinicSpecialization } from '../../model/clinic';
import { addClinicStaff, staffList } from '../../model/clinic-staff';
import doctorModel from '../../model/clinic/doctor';
import { encrypt } from '../../services/encryption';
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
        user_name: Joi.string().required(),
        password: Joi.string().required(),
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
        partner_type: Joi.string()
    }),
    updateClinicSpecialization: Joi.object({
        clinic_id: Joi.number().required(),
        branch_id: Joi.number().required(),
        specilization_business_type: Joi.string().required(),
        specialization_ids: Joi.array().items(Joi.number())
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
        gender: Joi.string(),
        experienc: Joi.number(),
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
        meta_description: Joi.string()
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
        slno_type: Joi.string().valid('number', 'group', 'group_without_time', 'group_for_advance_booking')//enum('number','group','group_without_time','group_for_advance_booking')
    }),
    updateDoctorWeeklyConsultingTiming: Joi.object({
        service_loc_id: Joi.number().allow(''),
        cid: Joi.number().required(),
        availability: Joi.string().valid('per_week', 'per_day', 'per_month', 'per_week_per_month'),
        sunday: Joi.number().valid(0, 1),
        sunday_1st_session_start: Joi.string(),
        sunday_1st_session_end: Joi.string(),
        sunday_2nd_session_start: Joi.string(),
        sunday_2nd_session_end: Joi.string(),
        monday: Joi.number().valid(0, 1),
        monday_1st_session_start: Joi.string(),
        monday_1st_session_end: Joi.string(),
        monday_2nd_session_start: Joi.string(),
        monday_2nd_session_end: Joi.string(),
        tuesday: Joi.number().valid(0, 1),
        tuesday_1st_session_start: Joi.string(),
        tuesday_1st_session_end: Joi.string(),
        tuesday_2nd_session_start: Joi.string(),
        tuesday_2nd_session_end: Joi.string(),
        wednesday: Joi.number().valid(0, 1),
        wednesday_1st_session_start: Joi.string(),
        wednesday_1st_session_end: Joi.string(),
        wednesday_2nd_session_start: Joi.string(),
        wednesday_2nd_session_end: Joi.string(),
        thursday: Joi.number().valid(0, 1),
        thursday_1st_session_start: Joi.string(),
        thursday_1st_session_end: Joi.string(),
        thursday_2nd_session_start: Joi.string(),
        thursday_2nd_session_end: Joi.string(),
        friday: Joi.number().valid(0, 1),
        friday_1st_session_start: Joi.string(),
        friday_1st_session_end: Joi.string(),
        friday_2nd_session_start: Joi.string(),
        friday_2nd_session_end: Joi.string(),
        saturday: Joi.number().valid(0, 1),
        saturday_1st_session_start: Joi.string(),
        saturday_1st_session_end: Joi.string(),
        saturday_2nd_session_start: Joi.string(),
        saturday_2nd_session_end: Joi.string()
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
    })
}
const clinicController = {
    getLoginToken: async (req: Request, res: Response) => {
        const { query, ip }: { query: any, ip: string } = req;
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
        let token = encrypt(JSON.stringify({ mob: mobile, password: "123456", ip: ip }));
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
            let q = "select id,name,market_name,category from clinics where branch_id=?";
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
        let updateRes = await cliniModel.updateClinicDetail(tokenInfo.bid, {
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
            partner_type: body.partner_type
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
        let query = "insert into clinic_specialization (clinic_id,specialist_id,specialist_business_type) values ?";
        let sqlParams: any = [];
        for (let id of body.specialization_ids) {
            sqlParams.push([body.clinic_id, id, body.specilization_business_type]);
        }
        await DB.query("delete from clinic_specialization where clinic_id=? and specialist_business_type=?", [body.clinic_id, body.specilization_business_type]);
        DB.query(query, [sqlParams]);
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
                })
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
                })
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
                }
            } else if (tab === "slno_groups") {
                let { action, ...params } = restParams;
                if (action === "add_update") {
                    const validation: ValidationResult = requestParams.updateSlnoGroup.validate(params);
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
    }
}
export default clinicController;