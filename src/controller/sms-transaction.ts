import { Request, Response } from "express";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, successResponse } from "../services/response";
import moment from "../services/datetime";
const reqSchema = {
    getSmsHistory: Joi.object({
        date: Joi.string().required(),
        clinic_id: Joi.number().allow("")
    }),
    smsCountDayWiseOfMonth: Joi.object({
        clinic_id: Joi.number().allow(""),
        date: Joi.string().required(),
    })
}
const smsTransactionsController = {
    getSmsHistory: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.getSmsHistory.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        const { date, clinic_id } = value;
        try {
            let q = "select * from sms_message where date(entry_time)=?";
            let params: any[] = [date];
            if (clinic_id) {
                q += " and source='clinic' and source_user_id=?";
                params.push(clinic_id);
            }
            let rows = await DB.get_rows(q, params);
            res.json(successResponse(rows));
        } catch (err) {
            res.status(500).json({ success: false, message: "Something went wrong" });
        }
    },
    smsCountDayWiseOfMonth: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.smsCountDayWiseOfMonth.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        let startDateOfMonth = moment(value.date, "YYYY-MM-DD").startOf("month").format("YYYY-MM-DD");
        let endDateOfMonth = moment(value.date, "YYYY-MM-DD").endOf("month").format("YYYY-MM-DD");
        try {
            let q = `select date(entry_time) as date,count(*) as count from sms_message where date(entry_time) between ? and ?`;
            let params: any[] = [startDateOfMonth, endDateOfMonth];
            if (value.clinic_id) {
                q += " and source='clinic' and source_user_id=?";
                params.push(value.clinic_id);
            }
            q += " group by date(entry_time)";
            let rows = await DB.get_rows(q, params);
            res.json(successResponse(rows));
        } catch (err) {
           internalServerError("Something went wrong", res);
        }
    }
}
export default smsTransactionsController;