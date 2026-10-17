import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { successResponse, parameterMissingResponse, internalServerError, unauthorizedResponse } from '../../services/response';
import { clinicSettingsModel } from '../../mongo-schema/coll_clinic_settings';

/* Settings that decide how a clinic's own dashboard app behaves. They live in mongo and until now
   had no write path at all: clinic-dashboard-api reads them at login and nothing ever saved them.
   An employee works across many clinics, so clinic_id arrives with the request rather than from the
   token, and every write checks the clinic is under the employee's branch first.

   To add a setting: give it a key in the schema, a key in requestParams.save below, and a row in
   the branch ui's SETTING_FIELDS. Nothing else needs to change. */

const requestParams = {
    get: Joi.object({
        clinic_id: Joi.number().required(),
    }),
    save: Joi.object({
        clinic_id: Joi.number().required(),
        show_appointment_action_btn: Joi.boolean().required(),
        show_lab_module: Joi.boolean().required(),
    })
};

/** an employee may only touch clinics registered under their own branch */
const clinicIsUnderBranch = async (clinic_id: number, branch_id: number) => {
    const row = await DB.get_row<{ id: number }>("select id from clinics where id=? and branch_id=?", [clinic_id, branch_id]);
    return Boolean(row);
};

/* what applies to a clinic with nothing saved yet. everything is off: a clinic gets a module or a
   button once somebody here turns it on for them, never by default.
   keep in step with DEFAULTS in the branch ui's dashboard-settings screen. */
const DEFAULTS = {
    show_appointment_action_btn: false,
    show_lab_module: false,
};

const clinicSettingsController = {
    getClinicSettings: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.get.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const saved = await clinicSettingsModel.findOne({ clinic_id: Number(query.clinic_id) }).lean();
        /* the defaults are filled in rather than returned as nulls, so the screen can show every
           setting whether or not this clinic has ever had one saved */
        res.json(successResponse({ ...DEFAULTS, ...(saved || {}), clinic_id: Number(query.clinic_id) }, "success"));
    },

    saveClinicSettings: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.save.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const value = validation.value;
        if (!await clinicIsUnderBranch(value.clinic_id, tokenInfo.bid)) {
            unauthorizedResponse("This clinic is not under your branch", res);
            return;
        }
        try {
            const { clinic_id, ...settings } = value;
            /* upsert: no document exists for most clinics, the collection has only ever been read */
            const saved = await clinicSettingsModel.findOneAndUpdate(
                { clinic_id },
                { $set: settings },
                { upsert: true, new: true }
            ).lean();
            res.json(successResponse(saved, "Settings saved successfully"));
        } catch (err: any) {
            internalServerError(err.message || "Something went wrong", res);
        }
    }
};
export default clinicSettingsController;
