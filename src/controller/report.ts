import { Request, Response } from 'express';
import { fork } from 'child_process';
import Joi, { ValidationResult } from 'joi';
import { internalServerError, parameterMissingResponse, successResponse } from '../services/response';
import clinicReportsMongoModel from '../mongo-schema/coll_clinic_reports';
import { ClinicDailyReportModel } from '../mongo-schema/coll_clinic-daily_report';
import appointmentsModel from '../mongo-schema/coll_apoointments';
import path from 'path';
import { get_current_datetime, getDateTime, moment } from '../services/datetime';
const reqSchema = {
    generateClinicReports: Joi.object({
        clinic_id: Joi.string().required(),
    }),
    generateClinicDailyReport: Joi.object({
        clinic_id: Joi.string().optional().allow(""),
        from_date: Joi.string().required(),
        to_date: Joi.string().required(),
    }),
}
const reportController = {
    businessListingSummary: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            parameterMissingResponse("permission denied! Please login to access", res);
            return
        }
        let clinics = await DB.get_rows("select * from clinics where branch_id=?", [tokenInfo.bid]);
        let doctors = await DB.get_rows("select * from doctor where branch_id=?", [tokenInfo.bid]);
        let now = get_current_datetime();
        try {
            const childprocess = fork(path.join(__dirname, "../child-process/report.js"), [], { silent: false });
            childprocess.send({ action: "generate_business_listing_summary", data: { clinics, doctors, current_time: now } });
            clinics = [];
            doctors = [];
            childprocess.on('message', (message: { status: string, data: any }) => {
                if (message.status === "done") {
                    res.json(successResponse(message.data, "Business listing summary generated successfully"));
                }
            });
        } catch (e) {
            internalServerError("Error generating business listing summary", res);
        }
    },
    generateClinicReports: async (req: Request, res: Response) => {
        const { error } = reqSchema.generateClinicReports.validate(req.query);
        if (error) {
            parameterMissingResponse(error.message, res);
            return;
        }
        const { clinic_id } = req.query;
        let rows = await appointmentsModel.aggregate([
            { $match: { clinic_id: parseInt(<string>clinic_id) } },
            {
                $facet: {
                    total_bookings: [
                        {
                            $match: { is_auto_filled: 0 },
                        },
                        {
                            "$count": "total_bookings"
                        }
                    ]
                }
            }
        ]).exec();
        let reportDoc = await clinicReportsMongoModel.findOne({ clinic_id: parseInt(<string>clinic_id) })
        if (reportDoc) {
            // If report document exists, merge the new data with the existing report
            reportDoc.total_bookings = rows[0].total_bookings[0].total_bookings;
            await reportDoc.save();
        } else {
            // If report document does not exist, create a new one
            reportDoc = new clinicReportsMongoModel({
                clinic_id: parseInt(<string>clinic_id),
                total_bookings: rows[0].total_bookings[0].total_bookings || 0,
            });
            await reportDoc.save();
        }
        res.json(successResponse(reportDoc, "success"));
    },
    generateClinicDailyReport: async (req: Request, res: Response) => {
        const { query } = req;
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            parameterMissingResponse("permission denied! Please login to access", res);
            return
        }
        const validation: ValidationResult = reqSchema.generateClinicDailyReport.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        res.write("Processing clinic daily report generation...\n");
        DB.get_rows<any>("select clinic_id,doctor_id,date(consult_date) as consult_date,count(1) as total,sum(if(booked_through='online',1,0)) as online_booked_patients from booking where date(consult_date)>=? and date(consult_date)<=? group by clinic_id,doctor_id,date(consult_date)", [<string>query.from_date, <string>query.to_date]).then((rows) => {
            rows.forEach((row, index) => {
                updateClinicDailyReport(row, res, index === rows.length - 1)
            })
        })

    }
}
const updateClinicDailyReport = async (row: any, res: any, islast: boolean) => {
    let reportDateObject = getDateTime(row.consult_date);
    let reportDate = reportDateObject.format('YYYY-MM-DD 00:00:00');
    let reportDateYear = reportDateObject.year();
    let reportDateMonth = reportDateObject.month() + 1;
    let reportDateDay = reportDateObject.date();
    let existingReport = await ClinicDailyReportModel.findOne({ clinic_id: row.clinic_id, doctor_id: row.doctor_id, report_date: reportDate });
    res.write(`-------------------${row.clinic_id}---------------------\n`);
    res.write(`Updating report for Clinic ID: ${row.clinic_id}, Doctor ID: ${row.doctor_id}, Date: ${row.consult_date},total: ${row.total} online_booked_patients: ${row.online_booked_patients} \n`);
    if (existingReport) {
        existingReport.total_patients = row.total;
        existingReport.online_booked_patients = row.online_booked_patients;
        await existingReport.save();
        res.write(`clinic_id: ${row.clinic_id} doctor_id: ${row.doctor_id} date: ${row.consult_date} - Report exists. Updating total patients and online booked patients.\n`);
    } else {
        let newReport = new ClinicDailyReportModel({
            clinic_id: row.clinic_id,
            doctor_id: row.doctor_id,
            report_date: reportDate,
            report_date_year: reportDateYear,
            report_date_month: reportDateMonth,
            report_date_day: reportDateDay,
            total_patients: row.total,
            online_booked_patients: row.online_booked_patients
        });
        await newReport.save();
        res.write(`clinic_id: ${row.clinic_id} doctor_id: ${row.doctor_id} date: ${row.consult_date} - Report does not exist. Creating new report entry.\n`);
    }
    if (islast) {
        res.write(`----------------------------------------\n`);
        res.write(`Clinic daily report generation completed.\n`);
        res.end();
    }
}
export default reportController;