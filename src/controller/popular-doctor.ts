import {Request,Response} from 'express';
import Joi,{ValidationResult} from 'joi';
import {parameterMissingResponse,successResponse,unauthorizedResponse} from '../services/response';
import popularDoctorModel from '../model/popular-doctor';
const requestParams = {
    updatePopularDoctor:Joi.object({
        service_location_id:Joi.number(),
        doctor_id:Joi.number().required(),
        clinic_id:Joi.number().required(),
        start_date:Joi.string().required(),
        end_date:Joi.string().required(),
        display_order:Joi.number().required(),
        active:Joi.number().valid(1,0)
    })
}
const popularDoctorController={
    getDoctorsList:async (req:Request,res:Response)=>{
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let rows = await DB.get_rows("select psl.*,doctor.name as doctor_name,clinics.name as clinic_name from popular_service_location as psl join doctor on psl.doctor_id=doctor.id join clinics on psl.clinic_id=clinics.id where psl.branch_id=? order by psl.display_order", [tokenInfo.bid]);
        res.json(successResponse(rows,"success"))
    },
    updatePopularDoctor:async (req:Request,res:Response)=>{
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.updatePopularDoctor.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
       let response = await popularDoctorModel.updatePopularDoctor({
            branch_id:tokenInfo.bid,
            service_location_id:body.service_location_id,
            doctor_id:body.doctor_id,
            clinic_id:body.clinic_id,
            start_date:body.start_date,
            end_date:body.end_date,
            active:body.active,
            city:tokenInfo.bd,
            display_order:body.display_order
        })
        res.status(response.code).json(response);
    }
}
export default popularDoctorController;