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
    }),
    saveClinicsPageSettings:Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        popular_specialists: Joi.array().items(Joi.number()),
        section: Joi.object({
            _id: Joi.string().allow(''),
            heading: Joi.string().required(),
            viewType: Joi.string().required(),
            enable: Joi.boolean().required(),
            cat_id: Joi.array().items(Joi.number()),
            section_type: Joi.string().required(),
            clinics_count: Joi.number().allow(0, "")
        })
    }),
    saveHomePageSettings:Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        categories:Joi.array().items(Joi.number()),
        verticals:Joi.array().items(),
        section:Joi.object({
            _id: Joi.string().allow(''),
            name:Joi.string().required(),
            heading: Joi.string().allow(''),
            viewType: Joi.string().allow(''),
            enable: Joi.boolean().required(),
            verticals:Joi.array().items(Joi.string()),
            specialist_ids:Joi.array().items(Joi.number()),
            cards:Joi.any()
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
            const validation: ValidationResult = requestParams.saveHomePageSettings.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            await settingModel.saveHomePageData({
                state: body.state,
                city: body.city,
                specialists: body.categories,
                verticals:body.verticals,
                section: body.section
            });
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
        }else if(body.page_name === 'clinics'){
            const validation: ValidationResult = requestParams.saveClinicsPageSettings.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            await settingModel.saveClinicsPageData({
                state: body.state,
                city: body.city,
                popular_specialists: body.popular_specialists,
                section: body.section
            });
        }
        res.json(successResponse({}, "sussess"))
    }
}
export default settingsController;