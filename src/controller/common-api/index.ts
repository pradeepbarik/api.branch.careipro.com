import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { unauthorizedResponse, parameterMissingResponse, successResponse } from '../../services/response';
const requestParams = {
    searchOtp: Joi.object({
        mobile: Joi.number().required()
    })
}
const commonapiController = {
    searchOtp: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.searchOtp.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let rows = await DB.get_rows("select * from otp where mobile_no=? order create_time desc", [query.mobile]);
        res.json(successResponse(rows,"success"))
    }
}
export default commonapiController