import fs from 'fs';
import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, internalServerError, successResponse, unauthorizedResponse } from '../../services/response';
import { cache_directory, clinic_management_cache } from '../../config';
import { HOME_PAGE_CACHE_FILE, CARETAKER_SERVICE_HOMEPAGE_CACHE_FILE, CLINICS_PAGE_CACHE_FILE, DOCTORS_PAGE_CACHE_FILE, DOCTORS_DETAIL_CACHE_DIR, CLINICS_DETAIL_CACHE_DIR, MASSAGE_SERVICE_HOMEPAGE_CACHE_FILE, MASSAGE_SERVICE_CACHE_DIR, PHYSIOTHERAPY_SERVICE_HOMEPAGE_CACHE_FILE, PETCARE_SERVICE_HOMEPAGE_CACHE_FILE } from '../../constants';
const requestParams = {
    initClinicCacheDirectory: Joi.object({
        clinic_id: Joi.number().required(),
        state: Joi.string().required(),
        district: Joi.string().required()
    })
}
const cacheController = {
    clearCache: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (req.query.cache_type === "all") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}`);
                fs.rmdir(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "all_category") {
            try {
                fs.accessSync(`${cache_directory}/category/all-categories.json`);
                fs.unlink(`${cache_directory}/category/all-categories.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "category_doctor") {
            try {
                fs.accessSync(`${cache_directory}/category/DOCTOR.json`);
                fs.unlink(`${cache_directory}/category/DOCTOR.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "category_clinic") {
            try {
                fs.accessSync(`${cache_directory}/category/CLINIC.json`);
                fs.unlink(`${cache_directory}/category/CLINIC.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "category_disease") {
            try {
                fs.accessSync(`${cache_directory}/category/DISEASE.json`);
                fs.unlink(`${cache_directory}/category/DISEASE.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "category_caretaker") {
            try {
                fs.accessSync(`${cache_directory}/category/CARETAKER.json`);
                fs.unlink(`${cache_directory}/category/CARETAKER.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "service_available_cities") {
            try {
                fs.accessSync(`${cache_directory}/india/service-available-cities.json`);
                fs.unlink(`${cache_directory}/category/service-available-cities.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "all_cities") {
            try {
                fs.accessSync(`${cache_directory}/india/all-cities.json`);
                fs.unlink(`${cache_directory}/category/all-cities.json`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${HOME_PAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${HOME_PAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError(`Something went wrong`, res);
                return
            }
        } else if (req.query.cache_type === "doctors_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${DOCTORS_PAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${DOCTORS_PAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "all_doctor_details") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${DOCTORS_DETAIL_CACHE_DIR}`);
                await fs.promises.rm(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${DOCTORS_DETAIL_CACHE_DIR}`, { recursive: true, force: true });
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "clinics_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CLINICS_PAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CLINICS_PAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "all_clinic_details") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CLINICS_DETAIL_CACHE_DIR}`);
                fs.promises.rm(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CLINICS_DETAIL_CACHE_DIR}`, { recursive: true, force: true })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "caretakers_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CARETAKER_SERVICE_HOMEPAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${CARETAKER_SERVICE_HOMEPAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res)
                return
            }
        } else if (req.query.cache_type === "massage_service_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${MASSAGE_SERVICE_HOMEPAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${MASSAGE_SERVICE_HOMEPAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "physiotherapy_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${PHYSIOTHERAPY_SERVICE_HOMEPAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${PHYSIOTHERAPY_SERVICE_HOMEPAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "petcare_home_page") {
            try {
                fs.accessSync(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${PETCARE_SERVICE_HOMEPAGE_CACHE_FILE}`);
                fs.unlink(`${cache_directory}/${tokenInfo.bs.toLowerCase()}/${tokenInfo.bd}/${PETCARE_SERVICE_HOMEPAGE_CACHE_FILE}`, () => { })
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "doctor_list_by_specialist") {
            let city = tokenInfo.bd.toLowerCase();
            let state = tokenInfo.bs.toLowerCase();
            let specialist_id = req.query.specialist_id;
            if (specialist_id === undefined) {
                parameterMissingResponse("specialist_id is required", res);
                return;
            }
            try {
                fs.accessSync(`${cache_directory}/${state}/${city}/doctors/catid-${specialist_id}`);
                fs.readdirSync(`${cache_directory}/${state}/${city}/doctors/catid-${specialist_id}`).forEach((file) => {
                    fs.unlinkSync(`${cache_directory}/${state}/${city}/doctors/catid-${specialist_id}/${file}`);
                });
            } catch (err) {
                internalServerError("Something went wrong", res);
                return
            }
        } else if (req.query.cache_type === "doctor_detail") {
            let city = tokenInfo.bd.toLowerCase();
            let state = tokenInfo.bs.toLowerCase();
            if (req.query.doctor_id && req.query.clinic_id && req.query.service_loc_id) {
                try {
                    fs.accessSync(`${cache_directory}/${state}/${city}/doctor-details/DR${req.query.doctor_id}-SL${req.query.service_loc_id}-C${req.query.clinic_id}`);
                    fs.readdirSync(`${cache_directory}/${state}/${city}/doctor-details/DR${req.query.doctor_id}-SL${req.query.service_loc_id}-C${req.query.clinic_id}`).forEach((file) => {
                        fs.unlinkSync(`${cache_directory}/${state}/${city}/doctor-details/DR${req.query.doctor_id}-SL${req.query.service_loc_id}-C${req.query.clinic_id}/${file}`);
                    });
                } catch (err:any) {
                    internalServerError("Something went wrong "+err.message, res);
                    return
                }
            } else {
                parameterMissingResponse("doctor_id, clinic_id and service_loc_id are required", res);
            }
        } else {
            parameterMissingResponse("Invalid cache type", res);
            return
        }
        res.json(successResponse({}, "Cache cleared successfully"));
    },
    initClinicCacheDirectory: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.initClinicCacheDirectory.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let clinic_management_dir = `${clinic_management_cache}/${query.state}/${query.district}/${query.clinic_id}`;
        try {
            if (!fs.existsSync(clinic_management_dir)) {
                fs.mkdirSync(clinic_management_dir, { recursive: true });
            }
            fs.openSync(`${clinic_management_dir}/meta_data.json`, 'a')
            res.json(successResponse("Initialized successfully"));
        } catch (err: any) {
            internalServerError(err.message, res)
        }

    }
}
export default cacheController;