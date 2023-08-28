import {Request,Response} from 'express';
import Joi,{ValidationResult} from "joi";
import {parameterMissingResponse,successResponse,unauthorizedResponse} from '../../services/response';
import {
    getApointmentRatingAndReviews
} from '../../model/rating-and-review';
const requestParams={
    getAppointmentRatingandReviews:Joi.object({
        from_date:Joi.string().allow(''),
        to_date:Joi.string().allow(''),
        clinic_id:Joi.number().allow(''),
        doctor_id:Joi.number().allow(''),
        user_id:Joi.number().allow(''),
        status:Joi.valid('unverified','verified','approved','unapproved').allow('')
    })
}
const ratingAndReviewController={
    getAppointmentRatingandReviews:async (req:Request,res:Response)=>{
        const {query}:{query:any} = req;
        const validation: ValidationResult = requestParams.getAppointmentRatingandReviews.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const {tokenInfo}=res.locals;
        if(typeof tokenInfo === 'undefined'){
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await getApointmentRatingAndReviews({
            branch_id:tokenInfo.bid,
            from_date:query.from_date,
            to_date:query.to_date,
            clinic_id:query.clinic_id,
            doctor_id:query.doctor_id,
            user_id:query.user_id,
            status:query.status
        });
        res.json(response)
    }
}
export default ratingAndReviewController;