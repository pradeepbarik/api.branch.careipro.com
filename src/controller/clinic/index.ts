import {Request,Response} from 'express';
import Joi,{ValidationResult} from 'joi';
import {parameterMissingResponse,successResponse,unauthorizedResponse} from '../../services/response';
import {getDoctors,getDoctorCompleteDetails,approveDoctor,changeDoctorActiveStatus,getClinicBanners,getClinicSpecialization} from '../../model/clinic';
const requestParams={
    addNewClinic:Joi.object({
        clinic_name:Joi.string().required(),
        clinic_seo_url:Joi.string().required(),
        contact_no:Joi.string().required(),
        contact_email:Joi.string().allow(''),
        state:Joi.string().required(),
        dist:Joi.string().required(),
        dist_city:Joi.string().required()
    }),
    getClinicList:Joi.object({
        page:Joi.number().required()
    }),
    getDoctorsList:Joi.object({
        clinic_id:Joi.number().required()
    }),
    doctorCompleteDetails:Joi.object({
        clinic_id:Joi.number().required(),
        doctor_id:Joi.number().required(),
        service_loc_id:Joi.number().required()
    }),
    approveDoctor:Joi.object({
        clinic_id:Joi.number().required(),
        doctor_id:Joi.number().required(),
        service_loc_id:Joi.number().required()
    }),
    changeDoctorActiveStatus:Joi.object({
        clinic_id:Joi.number().required(),
        doctor_id:Joi.number().required(),
        service_loc_id:Joi.number().required(),
        active:Joi.number().required()
    }),
    clinicBanners:Joi.object({
        clinic_id:Joi.number().required(),
        banner_id:Joi.number().allow('')
    }),
    clinicSpecializations:Joi.object({
        clinic_id:Joi.number().required(),
    })
}
const clinicController={
    addNewClinic:async (req:Request,res:Response)=>{
        const {body}:{body:any} = req;
        const validation: ValidationResult = requestParams.addNewClinic.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }

    },
    getClinicList:async (req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.getClinicList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        const perpage=20;
        let lower_limit = (query.page - 1) * perpage;
        let q = `select id,name,email,mobile,location,city,locality,location_lat,location_lng,status,approved,verified,active,logo,rating,seo_url,branch_id,wallet_balance,is_prime,prime_rank from clinics where branch_id=? limit ?,?`;
        let rows = await DB.get_rows(q, [tokenInfo.bid, lower_limit, perpage]);
        res.json(successResponse({
            clinics:rows,
            per_page:perpage
        }))
    },
    getDoctorsList:async (req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.getDoctorsList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let result = await getDoctors(tokenInfo.bid,query.clinic_id);
        res.json(successResponse(result))
    },
    doctorCompleteDetails:async (req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.doctorCompleteDetails.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let result = await getDoctorCompleteDetails(tokenInfo.bid,query.clinic_id,query.doctor_id,query.service_loc_id);
        res.json(successResponse(result))
    },
    approveDoctor:async (req:Request,res:Response)=>{
        const {body}:{body:any} = req;
        const validation: ValidationResult = requestParams.approveDoctor.validate(body);
        const {tokenInfo,emp_info}=res.locals;
        if (validation.error || typeof tokenInfo==='undefined' || typeof emp_info==='undefined') {
            parameterMissingResponse(validation.error?validation.error.details[0].message:"something went wrong! Please logout and login again", res);
            return;
        }
        let result = await approveDoctor({
            doctor_id:body.doctor_id,
            service_location_id:body.service_loc_id,
            clinic_id:body.clinic_id,
            emp_info:emp_info
        });
        res.status(result.code).json(result);
    },
    changeDoctorActiveStatus:async (req:Request,res:Response)=>{
        const {body}:{body:any} = req;
        const validation: ValidationResult = requestParams.changeDoctorActiveStatus.validate(body);
        const {tokenInfo,emp_info}=res.locals;
        if (validation.error || typeof tokenInfo==='undefined' || typeof emp_info==='undefined') {
            parameterMissingResponse(validation.error?validation.error.details[0].message:"something went wrong! Please logout and login again", res);
            return;
        }
        let result = await changeDoctorActiveStatus({
            doctor_id:body.doctor_id,
            service_location_id:body.service_loc_id,
            clinic_id:body.clinic_id,
            active:parseInt(body.active),
            emp_info:emp_info
        });
        res.status(result.code).json(result);
    },
    clinicBanners:async(req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.clinicBanners.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await getClinicBanners({
            clinic_id:query.clinic_id
        })
        res.status(response.code).json(response);
    },
    clinicSpecializations:async (req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.clinicSpecializations.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await getClinicSpecialization({
            clinic_id:query.clinic_id
        })
        res.status(response.code).json(response);
    }
}
export default clinicController;