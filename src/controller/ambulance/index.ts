import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import fs from 'fs';
import path from 'path';
import { ambulance_photo_path, CLINICS_DETAIL_CACHE_DIR, AMBULANCE_SERVICE_HOMEPAGE_CACHE_FILE } from '../../constants';
import { cache_directory } from '../../config';
import { FormdataRequest } from '../../types';
import { unauthorizedResponse, parameterMissingResponse, internalServerError } from '../../services/response';
import { uploadFileToServer, deleteFile } from '../../services/file-upload';
import ambulanceModel from '../../model/ambulance';

/* the vehicle classes the careipro.com ambulance page lists; kept in sync with
   careipro.com/app/ambulance/data.ts */
const VEHICLE_TYPES = ["BLS", "ALS", "ICU", "PTV", "NEONATAL", "MORTUARY", "AIR"];

/* The routes arrive as a json string from the form. Re-serialising from parsed values keeps
   whatever the admin typed from reaching the column verbatim, and drops rows with no from/to,
   which the repeatable form can produce when a blank row is left behind. */
const normaliseServiceRoutes = (raw: string | undefined): string => {
    if (!raw) return '[]';
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        return '[]';
    }
    if (!Array.isArray(parsed)) return '[]';
    const routes = parsed
        .filter((r) => r && String(r.from || '').trim() !== '' && String(r.to || '').trim() !== '')
        .map((r) => ({
            from: String(r.from).trim(),
            to: String(r.to).trim(),
            distance_km: Number(r.distance_km) || 0,
            fare: Number(r.fare) || 0,
            note: String(r.note || '').trim(),
        }));
    return JSON.stringify(routes);
}

const requestParams = {
    getClinicAmbulances: Joi.object({
        clinic_id: Joi.number().required()
    }),
    /* this arrives as multipart form data, so every field is a string here even where the column
       is numeric -- Joi.number() still accepts a numeric string and casts it */
    saveAmbulance: Joi.object({
        id: Joi.number().allow('', null),
        clinic_id: Joi.number().required(),
        vehicle_no: Joi.string().required(),
        vehicle_type: Joi.string().valid(...VEHICLE_TYPES).required(),
        title: Joi.string().allow(''),
        driver_name: Joi.string().allow(''),
        driver_mobile: Joi.string().allow(''),
        base_fare: Joi.number().allow('', null),
        per_km_charge: Joi.number().allow('', null),
        facilities: Joi.string().allow(''),
        /* a json array of {from,to,distance_km,fare,note}; validated for shape after parsing
           rather than as a string here, because it arrives as multipart form data */
        service_routes: Joi.string().allow(''),
        available_24x7: Joi.number().valid(0, 1),
        active: Joi.number().valid(0, 1),
    }),
    deleteAmbulance: Joi.object({
        id: Joi.number().required(),
        clinic_id: Joi.number().required()
    })
}

/* careipro.com serves the provider's detail page and the city ambulance listing from json files
   the public api wrote, so a fleet edit is invisible there until those files go. Both are rebuilt
   on the next request, and a missing file is fine, hence the silent unlink. */
const invalidatePublicCache = async (clinic_id: number) => {
    const clinic = await DB.get_row<{ state: string, city: string, bid: string }>(
        "select state,city,bid from clinics where id=?", [clinic_id]
    );
    if (!clinic) return;
    const state = (clinic.state || '').toLowerCase().replace(/ /g, '-');
    const city = (clinic.city || '').toLowerCase().replace(/ /g, '-');
    const targets = [
        `${cache_directory}/${state}/${city}/${CLINICS_DETAIL_CACHE_DIR}/${clinic.bid}/details.json`,
        `${cache_directory}/${state}/${city}/${AMBULANCE_SERVICE_HOMEPAGE_CACHE_FILE}`,
    ];
    targets.forEach((file) => {
        fs.unlink(file, () => { });
    });
}

const ambulanceController = {
    getClinicAmbulances: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicAmbulances.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const result = await ambulanceModel.getClinicAmbulances(query.clinic_id);
        res.status(result.code).json(result);
    },
    saveAmbulance: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.saveAmbulance.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let photo: string | undefined;
        if (files && files.photo) {
            const directory = `${ambulance_photo_path}/C${body.clinic_id}`;
            if (fs.existsSync(directory) === false) {
                fs.mkdirSync(directory, { recursive: true });
            }
            let file_name = `${body.vehicle_no}-${new Date().getTime()}`;
            file_name = file_name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s/g, '-');
            file_name = file_name + path.extname(files.photo.originalFilename);
            try {
                await uploadFileToServer(files.photo.filepath, `${directory}/${file_name}`);
            } catch (err: any) {
                internalServerError(err.message, res);
                return;
            }
            photo = `C${body.clinic_id}/${file_name}`;
            if (body.id) {
                /* a vehicle keeps one photo, so the replaced file is removed rather than left
                   orphaned on disk */
                const existing = await ambulanceModel.getAmbulance(body.id);
                if (existing?.photo && existing.photo !== photo) {
                    deleteFile(`${ambulance_photo_path}/${existing.photo}`);
                }
            }
        }
        const result = await ambulanceModel.saveAmbulance({
            id: body.id ? Number(body.id) : undefined,
            clinic_id: Number(body.clinic_id),
            branch_id: tokenInfo.bid,
            vehicle_no: body.vehicle_no,
            vehicle_type: body.vehicle_type,
            title: body.title || '',
            driver_name: body.driver_name || '',
            driver_mobile: body.driver_mobile || '',
            base_fare: Number(body.base_fare) || 0,
            per_km_charge: Number(body.per_km_charge) || 0,
            facilities: body.facilities || '',
            service_routes: normaliseServiceRoutes(body.service_routes),
            available_24x7: Number(body.available_24x7) || 0,
            active: typeof body.active === 'undefined' ? 1 : Number(body.active),
            photo: photo,
        });
        if (result.code === 200) {
            await invalidatePublicCache(Number(body.clinic_id));
        }
        res.status(result.code).json(result);
    },
    deleteAmbulance: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.deleteAmbulance.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const existing = await ambulanceModel.getAmbulance(body.id);
        const result = await ambulanceModel.deleteAmbulance(body.id, body.clinic_id);
        if (result.code === 200) {
            if (existing?.photo) {
                deleteFile(`${ambulance_photo_path}/${existing.photo}`);
            }
            await invalidatePublicCache(Number(body.clinic_id));
        }
        res.status(result.code).json(result);
    }
}
export default ambulanceController;
