import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { successResponse, parameterMissingResponse, internalServerError, unauthorizedResponse, serviceNotAcceptable } from '../../services/response';
import { announcementModel } from '../../mongo-schema/coll_announcements';
import { get_current_datetime } from '../../services/datetime';

/* Announcements belong to a clinic and are already writable by that clinic's own staff through
   clinic-dashboard-api. This is the same collection seen from the branch side: an employee works
   across many clinics, so clinic_id arrives with the request rather than from the token, and every
   write checks the clinic is under the employee's branch before touching anything. */

const requestParams = {
    list: Joi.object({
        clinic_id: Joi.number().required(),
        /* when given, narrows to what that doctor would see: clinic-wide notices plus ones
           aimed at them */
        doctor_id: Joi.number().allow('', null),
    }),
    save: Joi.object({
        announcement_id: Joi.string().allow('', null),
        clinic_id: Joi.number().required(),
        title: Joi.string().trim().min(3).max(200).required(),
        message: Joi.string().trim().min(10).max(1000).required(),
        target_type: Joi.string().valid('all', 'specific').required(),
        target_doctor_ids: Joi.array().items(Joi.number()).default([]),
        expiry_type: Joi.string().valid('forever', 'datetime').required(),
        expiry_date: Joi.string().allow('', null),
        is_active: Joi.boolean().default(true),
    }),
    remove: Joi.object({
        announcement_id: Joi.string().required(),
        clinic_id: Joi.number().required(),
    })
};

/** an employee may only touch clinics registered under their own branch */
const clinicIsUnderBranch = async (clinic_id: number, branch_id: number) => {
    const row = await DB.get_row<{ id: number }>("select id from clinics where id=? and branch_id=?", [clinic_id, branch_id]);
    return Boolean(row);
};

const announcementController = {
    getAnnouncements: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.list.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const filter: any = { clinic_id: Number(query.clinic_id) };
        if (query.doctor_id) {
            filter.$or = [
                { target_type: 'all' },
                { target_type: 'specific', target_doctor_ids: Number(query.doctor_id) }
            ];
        }
        /* expired and inactive ones are returned too: this is the management screen, and an
           employee needs to see what has lapsed in order to edit or remove it */
        const rows = await announcementModel.find(filter).sort({ created_at: -1 }).lean();
        res.json(successResponse(rows, "success"));
    },

    saveAnnouncement: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.save.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const value = validation.value;
        if (value.target_type === 'specific' && (value.target_doctor_ids || []).length === 0) {
            serviceNotAcceptable("Select at least one doctor for a doctor specific announcement", res);
            return;
        }
        if (value.expiry_type === 'datetime' && !value.expiry_date) {
            serviceNotAcceptable("Please choose the date this announcement expires on", res);
            return;
        }
        if (!await clinicIsUnderBranch(value.clinic_id, tokenInfo.bid)) {
            unauthorizedResponse("This clinic is not under your branch", res);
            return;
        }
        const now = new Date(get_current_datetime());
        const fields = {
            clinic_id: value.clinic_id,
            title: value.title,
            message: value.message,
            target_type: value.target_type,
            target_doctor_ids: value.target_type === 'specific' ? value.target_doctor_ids : [],
            expiry_type: value.expiry_type,
            /* a forever notice must drop any date it previously carried, or it would keep
               expiring on the old one */
            expiry_date: value.expiry_type === 'datetime' ? new Date(value.expiry_date) : null,
            is_active: value.is_active,
            updated_at: now,
        };
        if (value.announcement_id) {
            const updated = await announcementModel.findOneAndUpdate(
                { _id: value.announcement_id, clinic_id: value.clinic_id },
                { $set: fields }
            ).exec();
            if (!updated) {
                serviceNotAcceptable("Announcement not found", res);
                return;
            }
            res.json(successResponse(null, "Announcement updated successfully"));
            return;
        }
        await new announcementModel({
            ...fields,
            created_at: now,
            created_by_user_id: emp_info.id,
            created_by_user_name: emp_info.first_name || emp_info.emp_code,
        }).save();
        res.json(successResponse(null, "Announcement added successfully"));
    },

    deleteAnnouncement: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.remove.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        if (!await clinicIsUnderBranch(body.clinic_id, tokenInfo.bid)) {
            unauthorizedResponse("This clinic is not under your branch", res);
            return;
        }
        const removed = await announcementModel.deleteOne({ _id: body.announcement_id, clinic_id: body.clinic_id }).exec();
        if (removed.deletedCount === 0) {
            serviceNotAcceptable("Announcement not found", res);
            return;
        }
        res.json(successResponse(null, "Announcement removed successfully"));
    }
};
export default announcementController;
