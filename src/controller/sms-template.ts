import { Request, Response } from "express";
import Joi from "joi";
import {
    internalServerError, parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse
} from "../services/response";

/**
 * SMS templates clinics applied for from the clinic dashboard (table clinic_sms_template).
 * Staff register them on Jio TrueConnect under Careipro's DLT entity and record the outcome here:
 * PENDING -> SUBMITTED -> APPROVED (with the DLT template id), or REJECTED with a reason.
 * Every query joins clinics on the logged in employee's branch, staff only see their own clinics.
 */

//sender ids Careipro is registered with on DLT, the sending code (careipro-webservice
//message_model sendJioSms) uses CIPMSG for service SMS and 609045 for promotional SMS
const DEFAULT_SENDER_ID: Record<string, string> = {
    SERVICE_IMPLICIT: 'CIPMSG',
    SERVICE_EXPLICIT: 'CIPMSG',
    PROMOTIONAL: '609045',
};

const reqSchema = {
    list: Joi.object({
        status: Joi.string().valid('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', '').default(''),
        clinic_id: Joi.number().allow(''),
    }),
    //Jio TrueConnect gives the template id as soon as it is submitted, so it is recorded at submit time
    //and the same fields can be corrected later (update-dlt-details) or confirmed on approval
    dltDetails: Joi.object({
        id: Joi.number().integer().required(),
        //Jio TrueConnect template ids are 19 digit numbers
        dlt_template_id: Joi.string().trim().pattern(/^[0-9]{10,25}$/).required()
            .messages({
                'string.pattern.base': 'DLT template id must be the numeric id shown on Jio TrueConnect',
                'any.required': 'DLT template id is required',
                'string.empty': 'DLT template id is required',
            }),
        sender_id: Joi.string().trim().max(10).allow(''),
        //the exact text registered on DLT, sending must match it character for character in phase 2
        template_content: Joi.string().trim().min(10).max(1000).required(),
    }),
    markRejected: Joi.object({
        id: Joi.number().integer().required(),
        reject_reason: Joi.string().trim().min(3).max(500).required(),
    }),
}

const getTemplateOfBranch = (id: number, branch_id: number) => {
    return DB.get_row(
        "select t.id,t.status,t.template_type from clinic_sms_template t inner join clinics c on c.id=t.clinic_id where t.id=? and c.branch_id=? and t.library_template_id is null",
        [id, branch_id]
    );
}

/**
 * A DLT template id belongs to exactly one registered template: either a clinic's own template or a
 * library template. Clinic copies of a library template share the library's id, so they are skipped.
 * Returns what already uses the id (for the error message), or an empty string when it is free.
 */
export const findDltIdOwner = async (dlt_template_id: string, exclude: { templateId?: number, libraryId?: number }) => {
    const template: any = await DB.get_row(
        "select id from clinic_sms_template where dlt_template_id=? and library_template_id is null and id<>?",
        [dlt_template_id, exclude.templateId || 0]
    );
    if (template) {
        return `clinic template #${template.id}`;
    }
    const library: any = await DB.get_row(
        "select id,template_name from sms_template_library where dlt_template_id=? and id<>?",
        [dlt_template_id, exclude.libraryId || 0]
    );
    if (library) {
        return `pre-approved template "${library.template_name}"`;
    }
    return '';
}

/**
 * Validates the DLT fields and finds the template in the staff's branch. Replies to the request
 * itself and returns null when anything is wrong, otherwise the template and the cleaned values.
 */
const prepareDltDetails = async (req: Request, res: Response) => {
    const { tokenInfo } = res.locals;
    if (!tokenInfo) {
        unauthorizedResponse("you are not authorised for this service", res);
        return null;
    }
    const { error, value } = reqSchema.dltDetails.validate(req.body);
    if (error) {
        parameterMissingResponse(error.details[0].message, res);
        return null;
    }
    const template: any = await getTemplateOfBranch(value.id, tokenInfo.bid);
    if (!template) {
        serviceNotAcceptable("Template not found in your branch", res);
        return null;
    }
    const duplicate = await findDltIdOwner(value.dlt_template_id, { templateId: value.id });
    if (duplicate) {
        serviceNotAcceptable(`This DLT template id is already used by ${duplicate}`, res);
        return null;
    }
    return {
        tokenInfo,
        template,
        dlt_template_id: value.dlt_template_id as string,
        sender_id: (value.sender_id || DEFAULT_SENDER_ID[template.template_type] || 'CIPMSG') as string,
        template_content: value.template_content as string,
    };
}

const smsTemplateController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        const { error, value } = reqSchema.list.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            let q = `select t.id,t.clinic_id,c.name as clinic_name,c.city as clinic_city,c.mobile as clinic_mobile,
                t.template_name,t.template_type,t.category,t.template_content,t.status,t.dlt_template_id,t.sender_id,
                t.reject_reason,t.created_at,t.updated_at,t.submitted_at,t.reviewed_at,
                se.first_name as submitted_by,re.first_name as reviewed_by
                from clinic_sms_template t
                inner join clinics c on c.id=t.clinic_id
                left join employee se on se.id=t.submitted_by_emp_id
                left join employee re on re.id=t.reviewed_by_emp_id
                where c.branch_id=? and t.library_template_id is null`;
            const params: any[] = [tokenInfo.bid];
            if (value.status) {
                q += " and t.status=?";
                params.push(value.status);
            }
            if (value.clinic_id) {
                q += " and t.clinic_id=?";
                params.push(value.clinic_id);
            }
            //oldest waiting first, that is the order staff should work through them
            q += " order by t.created_at asc limit 500";
            const rows = await DB.get_rows(q, params);
            const counts = await DB.get_rows(
                "select t.status,count(*) as total from clinic_sms_template t inner join clinics c on c.id=t.clinic_id where c.branch_id=? and t.library_template_id is null group by t.status",
                [tokenInfo.bid]
            );
            res.json(successResponse({ templates: rows, counts }));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    markSubmitted: async (req: Request, res: Response) => {
        try {
            const details = await prepareDltDetails(req, res);
            if (!details) return;
            //the status in the where clause keeps two staff from acting on the same template at once
            const result: any = await DB.query(
                "update clinic_sms_template set status='SUBMITTED',dlt_template_id=?,sender_id=?,template_content=?,submitted_by_emp_id=?,submitted_at=now() where id=? and status='PENDING'",
                [details.dlt_template_id, details.sender_id, details.template_content, details.tokenInfo.eid, details.template.id]
            );
            if (!result) {
                return internalServerError("Could not update the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Only a pending template can be marked as submitted", res);
            }
            res.json(successResponse(null, "Template marked as submitted, DLT template id saved"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    //corrects the DLT template id, sender or registered text of a template already on DLT
    updateDltDetails: async (req: Request, res: Response) => {
        try {
            const details = await prepareDltDetails(req, res);
            if (!details) return;
            const result: any = await DB.query(
                "update clinic_sms_template set dlt_template_id=?,sender_id=?,template_content=? where id=? and status in ('SUBMITTED','APPROVED')",
                [details.dlt_template_id, details.sender_id, details.template_content, details.template.id]
            );
            if (!result) {
                return internalServerError("Could not update the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Only a submitted or approved template has DLT details to update", res);
            }
            res.json(successResponse(null, "DLT details updated"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    markApproved: async (req: Request, res: Response) => {
        try {
            const details = await prepareDltDetails(req, res);
            if (!details) return;
            const { tokenInfo } = details;
            //a pending template can be approved directly, staff may have submitted it before opening this screen
            const result: any = await DB.query(
                `update clinic_sms_template set status='APPROVED',dlt_template_id=?,sender_id=?,template_content=?,reject_reason=null,
                reviewed_by_emp_id=?,reviewed_at=now(),
                submitted_by_emp_id=ifnull(submitted_by_emp_id,?),submitted_at=ifnull(submitted_at,now())
                where id=? and status in ('PENDING','SUBMITTED')`,
                [details.dlt_template_id, details.sender_id, details.template_content, tokenInfo.eid, tokenInfo.eid, details.template.id]
            );
            if (!result) {
                return internalServerError("Could not update the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Only a pending or submitted template can be approved", res);
            }
            res.json(successResponse(null, "Template approved, the clinic can now use it"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    markRejected: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        const { error, value } = reqSchema.markRejected.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const template: any = await getTemplateOfBranch(value.id, tokenInfo.bid);
            if (!template) {
                return serviceNotAcceptable("Template not found in your branch", res);
            }
            const result: any = await DB.query(
                "update clinic_sms_template set status='REJECTED',reject_reason=?,reviewed_by_emp_id=?,reviewed_at=now() where id=? and status in ('PENDING','SUBMITTED')",
                [value.reject_reason, tokenInfo.eid, value.id]
            );
            if (!result) {
                return internalServerError("Could not update the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Only a pending or submitted template can be rejected", res);
            }
            res.json(successResponse(null, "Template rejected, the clinic will see the reason"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
}

export default smsTemplateController;
