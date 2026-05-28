import { Request, Response } from "express";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, successResponse } from "../services/response";
import coll_pg_orders_model from "../mongo-schema/pg/coll_pg_orders";
import moment from "../services/datetime";

const reqSchema = {
    history: Joi.object({
        date: Joi.string().required(),
        clinic_id: Joi.number().allow("")
    }),
    countDayWiseOfMonth: Joi.object({
        clinic_id: Joi.number().allow(""),
        date: Joi.string().required(),
    })
}

const onlineTransactionController = {
    history: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.history.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        const { date, clinic_id } = value;
        try {
            const startOfDay = new Date(date + " 00:00:00");
            const endOfDay = new Date(date + " 23:59:59");
            const matchFilter: any = {
                create_time: { $gte: startOfDay, $lte: endOfDay }
            };
            if (clinic_id) {
                matchFilter["patient_info.clinic_id"] = clinic_id;
            }
            const rows = await coll_pg_orders_model.find(matchFilter).sort({ create_time: -1 });
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    countDayWiseOfMonth: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.countDayWiseOfMonth.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        const startOfMonth = moment(value.date, "YYYY-MM-DD").startOf("month").toDate();
        const endOfMonth = moment(value.date, "YYYY-MM-DD").endOf("month").toDate();
        try {
            const matchFilter: any = {
                create_time: { $gte: startOfMonth, $lte: endOfMonth }
            };
            if (value.clinic_id) {
                matchFilter["patient_info.clinic_id"] = value.clinic_id;
            }
            const rows = await coll_pg_orders_model.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: "$create_time" },
                            month: { $month: "$create_time" },
                            day: { $dayOfMonth: "$create_time" }
                        },
                        total: { $sum: 1 },
                        paid: { $sum: { $cond: [{ $eq: ["$payment_status", "PAID"] }, 1, 0] } },
                        unpaid: { $sum: { $cond: [{ $ne: ["$payment_status", "PAID"] }, 1, 0] } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: {
                                    $dateFromParts: {
                                        year: "$_id.year",
                                        month: "$_id.month",
                                        day: "$_id.day"
                                    }
                                }
                            }
                        },
                        total: 1,
                        paid: 1,
                        unpaid: 1
                    }
                },
                { $sort: { date: 1 } }
            ]);
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    }
}

export default onlineTransactionController;