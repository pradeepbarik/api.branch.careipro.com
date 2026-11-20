import { Request, Response } from "express";
import Joi from "joi";
import {
    internalServerError, parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse
} from "../services/response";
import { findDltIdOwner } from "./sms-template";

/**
 * Pre-approved SMS templates (table sms_template_library). Careipro registers these generic templates
 * on DLT once, and any clinic can add one to its own templates without applying for approval.
 * Adding copies the template into clinic_sms_template as APPROVED with library_template_id set, so
 * sending (phase 2) only ever reads clinic_sms_template. Saving a library template pushes the change
 * to every clinic copy, so a corrected DLT id or text reaches every clinic.
 * The library is shared by all clinics, it is not scoped to the staff's branch.
 */

const DLT_VARIABLE = '{#var#}';

const reqSchema = {
    save: Joi.object({
        //0 or missing adds a new library template
        id: Joi.number().integer().min(0).default(0),
        template_name: Joi.string().trim().min(3).max(100).required(),
        template_type: Joi.string().valid('SERVICE_IMPLICIT', 'SERVICE_EXPLICIT', 'PROMOTIONAL').required(),
        category: Joi.string().trim().max(50).allow('').default(''),
        template_content: Joi.string().trim().min(10).max(1000).required(),
        dlt_template_id: Joi.string().trim().pattern(/^[0-9]{10,25}$/).required()
            .messages({ 'string.pattern.base': 'DLT template id must be the numeric id shown on Jio TrueConnect' }),
        sender_id: Joi.string().trim().min(1).max(10).required(),
    }),
    setActive: Joi.object({
        id: Joi.number().integer().required(),
        is_active: Joi.boolean().required(),
    }),
}

//same rule the clinic dashboard applies to templates clinics write themselves
const contentProblem = (content: string): string => {
    const withoutVariables = content.split(DLT_VARIABLE).join('');
    if (/\{#|#\}/.test(withoutVariables)) {
        return `Variables must be written exactly as ${DLT_VARIABLE}`;
    }
    if (!withoutVariables.trim()) {
        return "The message needs some fixed text, it can not be only variables";
    }
    return '';
}

const smsTemplateLibraryController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        try {
            const rows = await DB.get_rows(
                `select l.id,l.template_name,l.template_type,l.category,l.template_content,l.dlt_template_id,l.sender_id,
                l.is_active,l.created_at,l.updated_at,ce.first_name as created_by,ue.first_name as updated_by,
                (select count(*) from clinic_sms_template t where t.library_template_id=l.id) as clinics_using
                from sms_template_library l
                left join employee ce on ce.id=l.created_by_emp_id
                left join employee ue on ue.id=l.updated_by_emp_id
                order by l.is_active desc, l.category, l.template_name`,
                []
            );
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    save: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        const { error, value } = reqSchema.save.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        const problem = contentProblem(value.template_content);
        if (problem) {
            return parameterMissingResponse(problem, res);
        }
        try {
            const owner = await findDltIdOwner(value.dlt_template_id, { libraryId: value.id });
            if (owner) {
                return serviceNotAcceptable(`This DLT template id is already used by ${owner}`, res);
            }
            const sender_id = value.sender_id.toUpperCase();
            if (!value.id) {
                const result: any = await DB.query(
                    "insert into sms_template_library set template_name=?,template_type=?,category=?,template_content=?,dlt_template_id=?,sender_id=?,created_by_emp_id=?",
                    [value.template_name, value.template_type, value.category, value.template_content, value.dlt_template_id, sender_id, tokenInfo.eid]
                );
                if (!result) {
                    return internalServerError("Could not add the template", res);
                }
                return res.json(successResponse({ id: result.insertId }, "Pre-approved template added, clinics can use it now"));
            }
            const result: any = await DB.query(
                "update sms_template_library set template_name=?,template_type=?,category=?,template_content=?,dlt_template_id=?,sender_id=?,updated_by_emp_id=? where id=?",
                [value.template_name, value.template_type, value.category, value.template_content, value.dlt_template_id, sender_id, tokenInfo.eid, value.id]
            );
            if (!result) {
                return internalServerError("Could not save the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Pre-approved template not found", res);
            }
            //the clinics that added it send with their copy, so the copy must follow the registered template
            const copies: any = await DB.query(
                "update clinic_sms_template set template_name=?,template_type=?,category=?,template_content=?,dlt_template_id=?,sender_id=? where library_template_id=?",
                [value.template_name, value.template_type, value.category, value.template_content, value.dlt_template_id, sender_id, value.id]
            );
            const updatedClinics = copies?.affectedRows || 0;
            res.json(successResponse(
                { clinics_updated: updatedClinics },
                updatedClinics ? `Template saved and updated for ${updatedClinics} clinic(s) using it` : "Template saved"
            ));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    //an inactive template can not be added any more, clinics that already added it keep it
    setActive: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        const { error, value } = reqSchema.setActive.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const result: any = await DB.query(
                "update sms_template_library set is_active=?,updated_by_emp_id=? where id=?",
                [value.is_active ? 1 : 0, tokenInfo.eid, value.id]
            );
            if (!result) {
                return internalServerError("Could not update the template", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("Pre-approved template not found", res);
            }
            res.json(successResponse(null, value.is_active ? "Template is available to clinics again" : "Template hidden from clinics"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
}

export default smsTemplateLibraryController;
