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
        comments: Joi.string().allow(""),
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
    },
    updateEnquiryStatus: async (req: Request, res: Response) => {
        const { tokenInfo,emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body }: { body: any } = req;
        const { enquiry_id, status } = body;
        if (typeof enquiry_id === 'undefined' || typeof status === 'undefined') {
            parameterMissingResponse("enquiry_id or status missing", res);
            return;
        }
        await enquiryModel.updateEnquiryStatus({
            enquiry_id: enquiry_id,
            status: status,
            emp_id: tokenInfo.eid,
            emp_name: emp_info?.first_name || "",
            comments: body.comments || ""
        });
        res.jsonp(successResponse(null,"enquiry status updated"));
    }
}
export default enquiryController;