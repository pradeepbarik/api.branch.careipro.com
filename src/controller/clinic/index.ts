import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable } from '../../services/response';
import cliniModel, { getDoctors, getDoctorCompleteDetails, approveDoctor, changeDoctorActiveStatus, getClinicBanners, getClinicSpecialization } from '../../model/clinic';
import { addClinicStaff, staffList } from '../../model/clinic-staff';
import {encrypt} from '../../services/encryption';
const requestParams = {
    getLoginToken:Joi.object({
        clinic_id:Joi.number().required(),
        branch_id:Joi.number().required()
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
        category: Joi.string().required()
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
    updateClinicSpecialization:Joi.object({
        clinic_id:Joi.number().required(),
        branch_id:Joi.number().required(),
        specilization_business_type:Joi.string().required(),
        specialization_ids:Joi.array().items(Joi.number())
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
        business_type:Joi.string().required()
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
    getLoginToken:async (req:Request,res:Response)=>{
        const { query,ip }: { query: any,ip:string } = req;
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
        let mobile='BME'+tokenInfo.mob;
        await DB.query("delete from clinic_staffs where mobile=? limit 1",[mobile]);
        await DB.query("insert into clinic_staffs set clinic_id=?,mobile=?,name=?,status=?,password=md5(?),role=?,clinic_staff_type=?",[query.clinic_id,'BME'+tokenInfo.mob,tokenInfo.eid,'active','123456','admin','registered']);
        let token=encrypt(JSON.stringify({mob:mobile,password:"123456",ip:ip}));
        res.json(successResponse({token:token},"success"));
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
            category: body.category,
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
            email:body.email,
            mobile:body.mobile,
            location:body.location,
            city:body.city,
            locality:body.locality,
            location_lat:body.location_lat,
            location_lng:body.location_lng,
            status:body.status,
            approved:body.approved,
            verified:body.verified,
            active:body.active,
            seo_url:body.seo_url,
            page_title:body.page_title,
            meta_description:body.meta_description,
            is_prime:body.is_prime,
            state:body.state,
            market_name:body.market_name,
            category:body.category,
            partner_type:body.partner_type
        });
        res.status(updateRes.code).json(updateRes);
    },
    updateClinicSpecialization:async (req:Request,res:Response)=>{
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
        let query="insert into clinic_specialization (clinic_id,specialist_id,specialist_business_type) values ?";
        let sqlParams:any=[];
        for(let id of body.specialization_ids){
            sqlParams.push([body.clinic_id,id,body.specilization_business_type]);
        }
        await DB.query("delete from clinic_specialization where clinic_id=? and specialist_business_type=?",[body.clinic_id,body.specilization_business_type]);
        DB.query(query,[sqlParams]);
        res.json(successResponse({},"success"));
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
            business_type:query.business_type
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