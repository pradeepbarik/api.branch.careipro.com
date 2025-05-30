import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { unauthorizedResponse, parameterMissingResponse, successResponse } from '../../services/response';
import enquiryModel from '../../model/enquiry';
const requestParams = {
    enquiryList: Joi.object({
        from_date: Joi.string().allow(""),
        to_date: Joi.string().allow(""),
        vertical: Joi.string().allow(""),
        status: Joi.string().allow(""),
    })
}
const enquiryController = {
    enquiryList: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.enquiryList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let enquiries = await enquiryModel.getEnquiryList({
            city: tokenInfo.bd,
            from_date: query.from_date,
            to_date: query.to_date,
            vertical: query.vertical,
            status: query.status
        });
        res.jsonp(successResponse(enquiries,"enquiry list"));
    }
}
export default enquiryController;