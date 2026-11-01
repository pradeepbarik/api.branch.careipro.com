import { Request, Response } from "express";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, successResponse, unauthorizedResponse } from "../services/response";

const reqSchema = {
    raise: Joi.object({
        clinic_id: Joi.number().required(),
        amount: Joi.number().min(1).required(),
        description: Joi.string().max(255).required(),
    }),
    list: Joi.object({
        clinic_id: Joi.number().required(),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(20),
    })
}

const walletInvoiceController = {
    raise: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (!tokenInfo) {
            unauthorizedResponse("you are not authorised for this service", res);
            return;
        }
        const { error, value } = reqSchema.raise.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const result: any = await DB.query(
                "insert into business_wallet_invoice set clinic_id=?,amount=?,description=?,raised_by_emp_id=?",
                [value.clinic_id, value.amount, value.description, tokenInfo.eid]
            );
            if (!result) {
                return internalServerError("Could not raise the payment request", res);
            }
            res.json(successResponse({ id: result.insertId }, "Payment request sent to the clinic owner"));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    list: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.list.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const offset = (value.page - 1) * value.limit;
            const rows = await DB.get_rows(
                "select id,amount,description,status,created_at,responded_at from business_wallet_invoice where clinic_id=? order by created_at desc limit ?,?",
                [value.clinic_id, offset, value.limit]
            );
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    }
}

export default walletInvoiceController;
