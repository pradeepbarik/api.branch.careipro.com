import { Request, Response } from "express";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, successResponse } from "../services/response";

const reqSchema = {
    balance: Joi.object({
        clinic_id: Joi.number().required(),
    }),
    history: Joi.object({
        clinic_id: Joi.number().required(),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(20),
    })
}

const walletTransactionController = {
    balance: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.balance.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const row: any = await DB.get_row("select balance from business_wallet where clinic_id=?", [value.clinic_id]);
            res.json(successResponse({ balance: row ? row.balance : 0 }));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    history: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.history.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const offset = (value.page - 1) * value.limit;
            const rows = await DB.get_rows(
                "select id,type,amount,balance_after,remark,created_at from business_wallet_transaction where clinic_id=? order by created_at desc limit ?,?",
                [value.clinic_id, offset, value.limit]
            );
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    }
}

export default walletTransactionController;
