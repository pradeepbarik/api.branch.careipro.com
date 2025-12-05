import { Request, Response } from 'express';
import { fork } from 'child_process';
import Joi from 'joi';
import { internalServerError, parameterMissingResponse, successResponse } from '../services/response';
import clinicReportsMongoModel from '../mongo-schema/coll_clinic_reports';
import appointmentsModel from '../mongo-schema/coll_apoointments';
import path from 'path';
import { get_current_datetime } from '../services/datetime';
const reqSchema = {
    generateClinicReports: Joi.object({
        clinic_id: Joi.string().required(),
    })
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
        let now=get_current_datetime();
        try {
            const childprocess = fork(path.join(__dirname, "../child-process/report.js"),[], { silent: false });
            childprocess.send({ action: "generate_business_listing_summary", data: { clinics, doctors,current_time: now } });
            clinics=[];
            doctors=[];
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
}
export default reportController;