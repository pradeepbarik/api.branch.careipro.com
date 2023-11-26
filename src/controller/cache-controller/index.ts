import fs from 'fs';
import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, internalServerError, successResponse } from '../../services/response';
import { cache_directory, clinic_management_cache } from '../../config';
const requestParams = {
    initClinicCacheDirectory: Joi.object({
        clinic_id: Joi.number().required(),
        state: Joi.string().required(),
        district: Joi.string().required()
    })
}
const cacheController = {
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