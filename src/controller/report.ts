import { Request, Response } from 'express';
import { fork } from 'child_process';
import Joi, { ValidationResult } from 'joi';
import { internalServerError, parameterMissingResponse, successResponse } from '../services/response';
import clinicReportsMongoModel from '../mongo-schema/coll_clinic_reports';
import { doctorReportModel} from '../mongo-schema/coll_doctor_report';
import { categoryReportMongoModel } from '../mongo-schema/coll_category_report';
import { ClinicDailyReportModel } from '../mongo-schema/coll_clinic-daily_report';
import appointmentsModel from '../mongo-schema/coll_apoointments';
import path from 'path';
import { get_current_datetime, getDateTime } from '../services/datetime';
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
        const validation: ValidationResult = reqSchema.generateClinicDailyReport.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        res.write("Processing clinic daily report generation...\n");
        DB.get_rows<any>("select clinic_id,doctor_id,date(consult_date) as consult_date,count(1) as total,sum(if(booked_through='online',1,0)) as online_booked_patients from booking where date(consult_date)>=? and date(consult_date)<=? group by clinic_id,doctor_id,date(consult_date)", [<string>query.from_date, <string>query.to_date]).then((rows) => {
            for(let i=0;i<rows.length;i++){
                updateClinicDailyReport(rows[i], res, i === rows.length - 1)
            }
             res.end();
        })
    },
    generateRatingReviewReport: async (req: Request, res: Response) => {
        res.write("Processing appointment rating review report generation...\n");
        let doctors_rating_symmry=await DB.get_rows<{
            doctor_id: number,
            avg_rating: number,
            total_rating: number,
            total_review: number,
            one_star: number,
            two_star: number,
            three_star: number,
            four_star: number,
            five_star: number,
            clinic_id: number,
        }>("select t1.*,doctor.clinic_id from (select doctor_id,avg(rating) as avg_rating,sum(1) as total_rating,sum(if(NULLIF(experience, '') IS NOT NULL OR NULLIF(review_tags,'') IS NOT NULL,1,0)) as total_review,sum(if(rating=1,1,0)) as one_star,sum(if(rating=2,1,0)) as two_star,sum(if(rating=3,1,0)) as three_star,sum(if(rating=4,1,0)) as four_star,sum(if(rating=5,1,0)) as five_star from booking_review where status='verified' group by doctor_id) as t1 left join doctor on t1.doctor_id=doctor.id",[]);
        doctors_rating_symmry.forEach(doctor => {
            res.write(JSON.stringify(doctor)+"\n");
            updateDoctorRatingSummary(doctor);
        });
        res.write(`----------------------------------------\n`);
        res.write(`Appointment rating review report generation completed.\n`);
        res.write(`specialist wise rating summary report generation started.\n`);
        let specialist_rating_summary=await DB.get_rows<{
    id: number,
    city: string,
    name: string,
    avg_rating: number|null,
    total_rating: number|null,
    total_review: number|null,
    one_star: number|null,
    two_star: number|null,
    three_star: number|null,
    four_star: number|null,
    five_star: number|null,
        }>(`select t3.id,t3.name,avg(t3.avg_rating) as avg_rating,sum(t3.total_rating) as total_rating,sum(t3.total_review) as total_review,sum(t3.one_star) as one_star,sum(t3.two_star) as two_star,sum(t3.three_star) as three_star,sum(t3.four_star) as four_star,sum(t3.five_star) as five_star,t3.city from (
select t1.*,t2.avg_rating,t2.total_rating,t2.total_review,t2.one_star,t2.two_star,t2.three_star,t2.four_star,t2.five_star,d.city from 
(select s.id,s.name,ds.doctor_id from specialists as s left join doctor_specialization as ds on s.id=ds.specialist where s.enable=1) as t1 left join 
(select doctor_id,avg(rating) as avg_rating,sum(1) as total_rating,sum(if(NULLIF(experience, '') IS NOT NULL OR NULLIF(review_tags,'') IS NOT NULL,1,0)) as total_review,sum(if(rating=1,1,0)) as one_star,sum(if(rating=2,1,0)) as two_star,sum(if(rating=3,1,0)) as three_star,sum(if(rating=4,1,0)) as four_star,sum(if(rating=5,1,0)) as five_star from booking_review where status='verified' group by doctor_id) as t2 on t1.doctor_id=t2.doctor_id 
join doctor as d on t2.doctor_id=d.id
) as t3 group by t3.id,t3.city`,[]);
        specialist_rating_summary.forEach(specialist=>{
            res.write(JSON.stringify(specialist)+"\n");
            updateSpecialistRatingSummary(specialist);
        })
        res.end();
    },
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
    }
}
const updateDoctorRatingSummary = async (data:{
    doctor_id: number,
    clinic_id: number,
    avg_rating: number,
    total_rating: number,
    total_review: number,
    one_star: number,
    two_star: number,
    three_star: number,
    four_star: number,
    five_star: number,
}) => {
    DB.query("update doctor set rating=?,rating_count=?,review_count=? where id=?", [data.avg_rating, data.total_rating, data.total_review, data.doctor_id]);
    let existingReport = await doctorReportModel.findOne({ doctor_id: data.doctor_id, clinic_id: data.clinic_id });
    if (existingReport) {
        existingReport.avg_rating = data.avg_rating;
        existingReport.total_rating = data.total_rating;
        existingReport.total_review = data.total_review;
        existingReport.one_star = data.one_star;
        existingReport.two_star = data.two_star;
        existingReport.three_star = data.three_star;
        existingReport.four_star = data.four_star;
        existingReport.five_star = data.five_star;
        await existingReport.save();
    } else {
        let newReport = new doctorReportModel({
            doctor_id: data.doctor_id,
            clinic_id: data.clinic_id,
            avg_rating: data.avg_rating,
            total_rating: data.total_rating,
            total_review: data.total_review,
            one_star: data.one_star,
            two_star: data.two_star,
            three_star: data.three_star,
            four_star: data.four_star,
            five_star: data.five_star,
        });
        await newReport.save();
    }
}
const updateSpecialistRatingSummary = async (data:{
    id: number,
    city: string,
    name: string,
    avg_rating: number|null,
    total_rating: number|null,
    total_review: number|null,
    one_star: number|null,
    two_star: number|null,
    three_star: number|null,
    four_star: number|null,
    five_star: number|null,
}) => {
    let city=(data.city||"").toLowerCase();
    let existingReport = await categoryReportMongoModel.findOne({ cat_id: data.id, city: city });
    if (existingReport) {
        existingReport.name = data.name;
        existingReport.avg_rating = data.avg_rating||0;
        existingReport.total_rating = data.total_rating||0;
        existingReport.total_review = data.total_review||0;
        existingReport.one_star = data.one_star||0;
        existingReport.two_star = data.two_star||0;
        existingReport.three_star = data.three_star||0;
        existingReport.four_star = data.four_star||0;
        existingReport.five_star = data.five_star||0;
        await existingReport.save();
    } else {
        let newReport = new categoryReportMongoModel({
            cat_id: data.id,
            city: city,
            name: data.name,
            avg_rating: data.avg_rating||0,
            total_rating: data.total_rating||0,
            total_review: data.total_review||0,
            one_star: data.one_star||0,
            two_star: data.two_star||0,
            three_star: data.three_star||0,
            four_star: data.four_star||0,
            five_star: data.five_star||0,
        });
        await newReport.save();
    }
}
export default reportController;

