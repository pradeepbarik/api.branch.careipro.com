import { Request, Response } from 'express';
import Joi,{ValidationResult} from 'joi';
import {parameterMissingResponse,unauthorizedResponse} from '../../services/response';
import { getMissingVillageList,getClinicAvailableAreas,addClinicAvailableMarket } from '../../model/location';
const requestParams = {
    getMissedareaList:Joi.object({
        state:Joi.string().allow(''),
        district:Joi.string().allow('')
    }),
    getClinicAvailableAreas:Joi.object({
        state:Joi.string().required(),
        district:Joi.string().required()
    }),
    addClinicAvailableArea:Joi.object({
        state:Joi.string().required(),
        dist_name:Joi.string().required(),
        market_name:Joi.string().required()
    })
}
export const locationController = {
    getMissedareaList: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getMissedareaList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response= await getMissingVillageList({
            district:query.district?query.district:tokenInfo.bd,
            state:query.state
        });
        res.status(response.code).json(response);
    },
    getClinicAvailableAreas:async (req:Request,res:Response)=>{
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicAvailableAreas.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await getClinicAvailableAreas(query.state,query.district);
        res.status(response.code).json(response);
    },
    addClinicAvailableMarket:async (req:Request,res:Response)=>{
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addClinicAvailableArea.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await addClinicAvailableMarket({
            state:body.state,
            dist_name:body.dist_name,
            area_name:body.market_name
        });
        res.status(response.code).json(response);
    }
}
export default locationController;