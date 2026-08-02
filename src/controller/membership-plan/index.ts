import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable, internalServerError } from '../../services/response';

const requestParams = {
    getPlans: Joi.object({
        plan_for: Joi.string().valid('user', 'clinic')
    }),
    addPlan: Joi.object({
        id: Joi.number(),
        plan_name: Joi.string().required(),
        service_includs: Joi.string().allow(''),
        service_excludes: Joi.string().allow(''),
        amount: Joi.number().required(),
        duration: Joi.number().required(),
        plan_for: Joi.string().valid('user', 'clinic').required(),
        active: Joi.number().valid(0, 1),
        display_order: Joi.number(),
        city: Joi.string().allow('', null)
    }),
    updatePlan: Joi.object({
        id: Joi.number().required(),
        plan_name: Joi.string(),
        service_includs: Joi.string().allow(''),
        service_excludes: Joi.string().allow(''),
        amount: Joi.number(),
        duration: Joi.number(),
        plan_for: Joi.string().valid('user', 'clinic'),
        active: Joi.number().valid(0, 1),
        display_order: Joi.number(),
        city: Joi.string().allow('', null)
    })
}
const membershipPlanController = {
    getPlans: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getPlans.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let q = "select * from tbl_membership_plan where (city=? or city is null or city='')";
        let params: any[] = [tokenInfo.bd];
        if (query.plan_for) {
            q += " and plan_for=?";
            params.push(query.plan_for);
        }
        q += " order by display_order";
        let plans = await DB.get_rows(q, params);
        res.json(successResponse({ plans }, "Success"));
    },
    savePlan: async (req: Request, res: Response) => {
        const { body } = req;
        const validation: ValidationResult = body.id ? requestParams.updatePlan.validate(body) : requestParams.addPlan.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (body.id) {
            let updateFields: string[] = [];
            let sqlparams: any[] = [];
            if (typeof body.plan_name !== 'undefined') { updateFields.push("plan_name=?"); sqlparams.push(body.plan_name); }
            if (typeof body.service_includs !== 'undefined') { updateFields.push("service_includs=?"); sqlparams.push(body.service_includs); }
            if (typeof body.service_excludes !== 'undefined') { updateFields.push("service_excludes=?"); sqlparams.push(body.service_excludes); }
            if (typeof body.amount !== 'undefined') { updateFields.push("amount=?"); sqlparams.push(body.amount); }
            if (typeof body.duration !== 'undefined') { updateFields.push("duration=?"); sqlparams.push(body.duration); }
            if (typeof body.plan_for !== 'undefined') { updateFields.push("plan_for=?"); sqlparams.push(body.plan_for); }
            if (typeof body.active !== 'undefined') { updateFields.push("active=?"); sqlparams.push(body.active); }
            if (typeof body.display_order !== 'undefined') { updateFields.push("display_order=?"); sqlparams.push(body.display_order); }
            if (typeof body.city !== 'undefined') { updateFields.push("city=?"); sqlparams.push(body.city || null); }
            if (!updateFields.length) {
                serviceNotAcceptable("nothing to update", res);
                return;
            }
            let q = "update tbl_membership_plan set " + updateFields.join(',') + " where id=?";
            sqlparams.push(body.id);
            let updateRes: any = await DB.query(q, sqlparams);
            if (updateRes.affectedRows >= 1) {
                res.json(successResponse({}, "Updated successfully"));
            } else {
                internalServerError("something went wrong", res);
            }
        } else {
            let q = "insert into tbl_membership_plan set plan_name=?,service_includs=?,service_excludes=?,amount=?,duration=?,plan_for=?,active=?,display_order=?,city=?";
            let sqlparams = [body.plan_name, body.service_includs || '', body.service_excludes || '', body.amount, body.duration, body.plan_for, typeof body.active !== 'undefined' ? body.active : 1, body.display_order || 0, body.city || null];
            let insertRes: any = await DB.query(q, sqlparams);
            if (insertRes.affectedRows >= 1) {
                res.json(successResponse({ id: insertRes.insertId }, "Membership plan created successfully"));
            } else {
                internalServerError("something went wrong", res);
            }
        }
    }
}
export default membershipPlanController;
