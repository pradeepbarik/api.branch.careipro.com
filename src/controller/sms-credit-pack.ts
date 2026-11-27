import { Request, Response } from "express";
import Joi from "joi";
import {
    internalServerError, parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse
} from "../services/response";

/**
 * SMS credit packs (table sms_credit_pack, see clinic-dashboard-api/sql/sms_credit_pack.sql).
 * Clinic owners buy an active pack from the clinic dashboard SMS Transactions page and pay from
 * the business wallet. Packs are shared by all clinics and are never deleted, only hidden, so a
 * changed price only applies to purchases made after the change.
 */

const reqSchema = {
    save: Joi.object({
        //0 or missing adds a new pack
        id: Joi.number().integer().min(0).default(0),
        pack_name: Joi.string().trim().min(2).max(60).required(),
        sms_credit: Joi.number().integer().min(1).max(10000000).required(),
        //whole rupees, clinic_sms_recharge_history.amount is an int
        price: Joi.number().integer().min(1).max(10000000).required(),
    }),
    setActive: Joi.object({
        id: Joi.number().integer().required(),
        is_active: Joi.boolean().required(),
    }),
}

const smsCreditPackController = {
    list: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            return unauthorizedResponse("you are not authorised for this service", res);
        }
        try {
            const rows = await DB.get_rows(
                `select p.id,p.pack_name,p.sms_credit,p.price,p.is_active,p.created_at,p.updated_at,
                ce.first_name as created_by,ue.first_name as updated_by
                from sms_credit_pack p
                left join employee ce on ce.id=p.created_by_emp_id
                left join employee ue on ue.id=p.updated_by_emp_id
                order by p.is_active desc, p.sms_credit`,
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
        try {
            if (!value.id) {
                const result: any = await DB.query(
                    "insert into sms_credit_pack set pack_name=?,sms_credit=?,price=?,created_by_emp_id=?",
                    [value.pack_name, value.sms_credit, value.price, tokenInfo.eid]
                );
                if (!result) {
                    return internalServerError("Could not add the pack", res);
                }
                return res.json(successResponse({ id: result.insertId }, "SMS pack added, clinics can buy it now"));
            }
            const result: any = await DB.query(
                "update sms_credit_pack set pack_name=?,sms_credit=?,price=?,updated_by_emp_id=? where id=?",
                [value.pack_name, value.sms_credit, value.price, tokenInfo.eid, value.id]
            );
            if (!result) {
                return internalServerError("Could not save the pack", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("SMS pack not found", res);
            }
            res.json(successResponse(null, "SMS pack saved"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    //a hidden pack can not be bought, credits already bought with it stay
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
                "update sms_credit_pack set is_active=?,updated_by_emp_id=? where id=?",
                [value.is_active ? 1 : 0, tokenInfo.eid, value.id]
            );
            if (!result) {
                return internalServerError("Could not update the pack", res);
            }
            if (result.affectedRows < 1) {
                return serviceNotAcceptable("SMS pack not found", res);
            }
            res.json(successResponse(null, value.is_active ? "Pack is available to clinics again" : "Pack hidden from clinics"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
}

export default smsCreditPackController;
