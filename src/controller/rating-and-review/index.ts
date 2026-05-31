import { Request, Response } from 'express';
import Joi, { ValidationResult } from "joi";
import { parameterMissingResponse, successResponse, unauthorizedResponse } from '../../services/response';
import {
    getApointmentRatingAndReviews,
    verifiedReview,
    rejectReview,
    deleteReview,
    makePublicReview
} from '../../model/rating-and-review';
const requestParams = {
    getAppointmentRatingandReviews: Joi.object({
        from_date: Joi.string().allow(''),
        to_date: Joi.string().allow(''),
        clinic_id: Joi.number().allow(''),
        doctor_id: Joi.number().allow(''),
        user_id: Joi.number().allow(''),
        status: Joi.valid('unverified', 'verified', 'rejected').allow('')
    }),
    verifiedReview: Joi.object({
        id: Joi.number().required()
    })
}
const ratingAndReviewController = {
    getBookingPatinetDetails: async (req: Request, res: Response) => {
        if (!req.query.booking_id || !req.query.user_id) {
            parameterMissingResponse("booking_id and user_id are required", res);
            return;
        }
        let {query}:{query: any}=req;
        let patient_info = await DB.get_row(`select t1.*,t2.* from (select patient_name,patient_mobile from booking where id=?)as t1 cross join (select firstname as booked_by,mobile as booked_by_mobile from users where id=?) as t2`,[query.booking_id, query.user_id]);
        res.json(successResponse(patient_info,"success"));
    },
    getAppointmentRatingandReviews: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getAppointmentRatingandReviews.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await getApointmentRatingAndReviews({
            branch_id: tokenInfo.bid,
            from_date: query.from_date,
            to_date: query.to_date,
            clinic_id: query.clinic_id,
            doctor_id: query.doctor_id,
            user_id: query.user_id,
            status: query.status
        });
        res.json(response)
    },
    verifiedReview: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.verifiedReview.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return;
        }
        let response = await verifiedReview({ id: body.id });
        res.status(response.code).json(response);
    },
    rejectReview: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.verifiedReview.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return;
        }
        let response = await rejectReview({ id: body.id });
        res.status(response.code).json(response);
    },
    deleteReview: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.verifiedReview.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return;
        }
        let response = await deleteReview({ id: body.id });
        res.status(response.code).json(response);
    },
    makePublicReview: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = Joi.object({
            id: Joi.number().required(),
            is_public: Joi.number().valid(0, 1).required()
        }).validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return;
        }
        let response = await makePublicReview({ id: body.id, is_public: body.is_public });
        res.status(response.code).json(response);
    },
    getSiteFeedbacks: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const { query }: { query: any } = req;
        const validation = Joi.object({
            status: Joi.string().valid('open', 'seen', 'close', '').allow('').optional(),
            from_date: Joi.string().allow('').optional(),
            to_date: Joi.string().allow('').optional(),
            campaign: Joi.string().allow('').optional(),
            from: Joi.number().default(0),
        }).validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let conditions: string[] = [];
        let params: any[] = [];
        if (query.status) {
            conditions.push('status = ?');
            params.push(query.status);
        }
        if (query.campaign) {
            conditions.push('campaign like ?');
            params.push(`%${query.campaign}%`);
        }
        if (query.from_date) {
            conditions.push('date(feedback_date) >= ?');
            params.push(query.from_date);
        }
        if (query.to_date) {
            conditions.push('date(feedback_date) <= ?');
            params.push(query.to_date);
        }
        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const from = parseInt(query.from || 0);
        params.push(from, 30);
        const rows = await DB.get_rows(
            `SELECT user_id, guser_id, mobile_no, message, rating, feedback_date, status, management_comment, campaign, user_name FROM site_feedback ${where} ORDER BY feedback_date DESC LIMIT ?,?`,
            params
        );
        res.json(successResponse(rows, "success"));
    },
    updateSiteFeedback: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const { body }: { body: any } = req;
        const validation = Joi.object({
            user_id: Joi.number().required(),
            guser_id: Joi.number().allow(null).optional(),
            feedback_date: Joi.string().required(),
            status: Joi.string().valid('open', 'seen', 'close').required(),
            management_comment: Joi.string().allow('', null).optional(),
        }).validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        await DB.query(
            `UPDATE site_feedback SET status=?, management_comment=? WHERE user_id=? AND feedback_date=?`,
            [body.status, body.management_comment || null, body.user_id, body.feedback_date]
        );
        res.json(successResponse({}, "Feedback updated successfully"));
    }
}
export default ratingAndReviewController;