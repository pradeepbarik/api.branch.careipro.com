import {json, Request,Response} from 'express';
import Joi,{ValidationResult} from 'joi';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable } from '../../services/response';

const requestParams={
    getSpecialists:Joi.object({
        business_type:Joi.string().required()
    })
}
const categoriesController={
    getSpecialists:async (req:Request,res:Response)=>{
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getSpecialists.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let rows = await DB.get_rows("select * from specialists where business_type=?",[query.business_type]);
        res.json(successResponse(rows,"Success"));   
    }
}
export default categoriesController;