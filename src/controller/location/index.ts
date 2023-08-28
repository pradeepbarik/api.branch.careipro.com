import { Request, Response } from 'express';
import Joi,{ValidationResult} from 'joi';
import {parameterMissingResponse,unauthorizedResponse} from '../../services/response';
import { getMissingVillageList } from '../../model/location';
const requestParams = {
    getMissedareaList:Joi.object({
        state:Joi.string().allow(''),
        district:Joi.string().allow('')
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
    }
}
export default locationController;