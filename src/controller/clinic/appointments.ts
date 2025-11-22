
import { Request, Response } from "express";
import Joi, { ValidationResult } from "joi";
import { parameterMissingResponse, successResponse } from "../../services/response";
import { getAppointmentsList, bookedAppointments } from "../../model/clinic/booking";
import moment from "../../services/datetime";
const requestParams = {
    appointments: Joi.object({
        clinicId: Joi.number().required(),
        doctor_id: Joi.number().required(),
        service_location_id: Joi.number().required(),
        date: Joi.string().allow(""),
        fromdate: Joi.string().allow(""),
        todate: Joi.string().allow(""),
        consult_status: Joi.string().allow(""),
    })
}
const clinicAppointments = {
    apoointments: async (req: Request, res: Response) => {
        const validation: ValidationResult = requestParams.appointments.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const clinicId = parseInt(req.body.clinicId as string);
        const doctor_id = req.body.doctor_id ? parseInt(req.body.doctor_id as string) : undefined;
        const service_location_id = req.body.service_location_id ? parseInt(req.body.service_location_id as string) : undefined;
        const date = req.body.date as string;
        const fromdate = req.body.fromdate as string;
        const todate = req.body.todate as string;
        const consult_status = req.body.consult_status ? (req.body.consult_status as string).split(",") : undefined;
        const params = {
            doctor_id,
            service_location_id,
            date,
            fromdate,
            todate,
            consult_status
        };

        const appointments = await getAppointmentsList(clinicId, params);
        let consult_dates: Array<string> = [];
        let finalAppointments: Record<string, any[]> = {}
        for (let booking of appointments.appointments) {
            let cd = moment(booking.consult_date).format('YYYY-MM-DD');
            if (consult_dates.indexOf(cd) === -1) {
                finalAppointments[cd] = [];
                consult_dates.push(cd)
            }
            finalAppointments[cd].push(booking)
        }
        appointments.appointments = [];
        res.json(successResponse({ appointments: finalAppointments, fetched_from: 'db', consult_dates: consult_dates }));
    },
    bookings: async (req: Request, res: Response) => {
        const validation: ValidationResult = requestParams.appointments.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const clinicId = parseInt(req.body.clinicId as string);
        const doctor_id = req.body.doctor_id ? parseInt(req.body.doctor_id as string) : undefined;
        const date = req.body.date as string;
        const fromdate = req.body.fromdate as string;
        const todate = req.body.todate as string;
        const consult_status = req.body.consult_status ? (req.body.consult_status as string).split(",") : undefined;
        const params = {
            clinic_id: clinicId,
            doctor_id,
            date,
            fromdate,
            todate,
        };
        let appointments = await bookedAppointments(params);
        let consult_dates: Array<string> = [];
        let finalAppointments: Record<string, any[]> = {}
        for (let booking of appointments) {
            let cd = moment(booking.booking_time).format('YYYY-MM-DD');
            if (consult_dates.indexOf(cd) === -1) {
                finalAppointments[cd] = [];
                consult_dates.push(cd)
            }
            finalAppointments[cd].push(booking)
        }
        appointments = [];
        res.json(successResponse({ appointments: finalAppointments, fetched_from: 'db', consult_dates: consult_dates }));
    }
}
export default clinicAppointments;