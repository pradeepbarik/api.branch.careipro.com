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
    }),
    primeEnquiriesList: Joi.object({
        status: Joi.string().allow("")
    }),
    updatePrimeEnquiry: Joi.object({
        id: Joi.string().required(),
        resolution_note: Joi.string().allow("")
    }),
    cancelPrimeEnquiry: Joi.object({
        id: Joi.string().required()
    }),
    addPrimeEnquiryWatcher: Joi.object({
        email: Joi.string().email({ tlds: false }).required()
    }),
    deletePrimeEnquiryWatcher: Joi.object({
        id: Joi.number().required()
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
        res.json(successResponse(enquiries,"enquiry list"));
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
        res.json(successResponse(null,"enquiry status updated"));
    },
    getDynamicFormSubmissionsList: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { query }: { query: any } = req;        
        let submissions = await enquiryModel.getDynamicFormSubmissionsList({
            city: tokenInfo.bd,
            state: tokenInfo.bs,
        });
        res.status(submissions.code).json(submissions);
    },
    primeEnquiriesList: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.primeEnquiriesList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let enquiries = await enquiryModel.getPrimeEnquiriesList({ status: query.status });
        res.status(enquiries.code).json(enquiries);
    },
    updatePrimeEnquiry: async (req: Request, res: Response) => {
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.updatePrimeEnquiry.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let response = await enquiryModel.updatePrimeEnquiry({
            id: body.id,
            resolution_note: body.resolution_note || "",
            responded_by_emp_id: emp_info?.id || tokenInfo.eid
        });
        res.status(response.code).json(response);
    },
    cancelPrimeEnquiry: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.cancelPrimeEnquiry.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let response = await enquiryModel.cancelPrimeEnquiry({ id: body.id });
        res.status(response.code).json(response);
    },
    getPrimeEnquiryWatchers: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let response = await enquiryModel.getPrimeEnquiryWatchers();
        res.status(response.code).json(response);
    },
    addPrimeEnquiryWatcher: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addPrimeEnquiryWatcher.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let response = await enquiryModel.addPrimeEnquiryWatcher({
            city: tokenInfo.bd,
            email: body.email
        });
        res.status(response.code).json(response);
    },
    deletePrimeEnquiryWatcher: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.deletePrimeEnquiryWatcher.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let response = await enquiryModel.deletePrimeEnquiryWatcher(body.id);
        res.status(response.code).json(response);
    }
}
export default enquiryController;