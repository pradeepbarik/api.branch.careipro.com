import { Request, Response } from 'express';
import Joi from 'joi';
import { parameterMissingResponse, successResponse } from '../services/response';
import clinicReportsMongoModel from '../mongo-schema/coll_clinic_reports';
import appointmentsModel from '../mongo-schema/coll_apoointments';
const reqSchema = {
    generateClinicReports: Joi.object({
        clinic_id: Joi.string().required(),
    })
}
const reportController = {
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