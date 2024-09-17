import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { unauthorizedResponse, parameterMissingResponse, successResponse } from '../services/response';
import settingModel from '../model/settngs';
const requestParams = {
    getPageSettings: Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
    }),
    deletePageSettings: Joi.object({
        delete_section: Joi.number().required(),
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        section_id: Joi.string().required()
    }),
    saveDoctorsPageSetting: Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        popular_specialists: Joi.array().items(Joi.number()),
        sections: Joi.array().items(Joi.object({
            heading: Joi.string().required(),
            viewType: Joi.string().required(),
            enable: Joi.boolean().required(),
            specialist_id: Joi.array().items(Joi.number()),
            section_type: Joi.string().required(),
            doctors_count: Joi.number().allow(0, "")
        })),
        section: Joi.object({
            _id: Joi.string().allow(''),
            heading: Joi.string().required(),
            viewType: Joi.string().required(),
            enable: Joi.boolean().required(),
            specialist_id: Joi.array().items(Joi.number()),
            section_type: Joi.string().required(),
            doctors_count: Joi.number().allow(0, "")
        })
    })
}
const settingsController = {
    getPageSettings: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getPageSettings.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let data = await settingModel.getPageSettingsData({ state: query.state, city: query.city, page: query.page_name });
        res.json(successResponse(data, "succcess"))
    },
    savePageSettings: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        if (body.delete_section) {
            const validation: ValidationResult = requestParams.deletePageSettings.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            await settingModel.deleteSection({
                state: body.state,
                city: body.city,
                page: body.page_name,
                section_id: body.section_id
            })
            res.json(successResponse({}, "Section Deleted Successfully"))
            return;
        }
        if (body.page_name === 'home') {

        } else if (body.page_name === 'doctors') {
            const validation: ValidationResult = requestParams.saveDoctorsPageSetting.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            await settingModel.saveDoctorPageData({
                state: body.state,
                city: body.city,
                popular_specialists: body.popular_specialists,
                sections: body.sections,
                section: body.section
            });
        }
        res.json(successResponse({}, "sussess"))
    }
}
export default settingsController;