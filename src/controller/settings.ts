import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import fs from 'fs';
import path from 'path';
import { banner_path } from '../constants';
import { FormdataRequest } from '../types';
import { unauthorizedResponse, parameterMissingResponse, successResponse, internalServerError } from '../services/response';
import settingModel from '../model/settngs';
import { get_current_datetime } from '../services/datetime';
import { uploadFileToServer } from '../services/file-upload';
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
    saveClinicsPageSettings: Joi.object({
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
    saveHomePageSettings: Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        categories: Joi.array().items(Joi.number()),
        verticals: Joi.array().items(),
        section: Joi.object({
            _id: Joi.string().allow(''),
            name: Joi.string().required(),
            heading: Joi.string().allow(''),
            viewType: Joi.string().allow(''),
            enable: Joi.boolean().required(),
            verticals: Joi.array().items(Joi.string()),
            specialist_ids: Joi.array().items(Joi.number()),
            cards: Joi.any()
        })
    }),
    saveCaretakersPageSetting: Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        popular_specialists: Joi.array().items(Joi.number()),
        section: Joi.object({
            _id: Joi.string().allow(''),
            heading: Joi.string().allow(""),
            viewType: Joi.string().allow(""),
            enable: Joi.boolean().required(),
            cat_id: Joi.array().items(Joi.number()),
            doctor_ids: Joi.array().items(Joi.number()),
            clinic_ids: Joi.array().items(Joi.number()),
            section_type: Joi.string().required(),
            listing_count: Joi.number().allow(0, "")
        })
    }),
    savePhysiotherapyPageSetting: Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required(),
        page_name: Joi.string().required(),
        popular_specialists: Joi.array().items(Joi.number()),
        section: Joi.object({
            _id: Joi.string().allow(''),
            heading: Joi.string().allow(""),
            section_type: Joi.string().required(),
            viewType: Joi.string().allow(''),
            enable: Joi.boolean().required(),
            specialist_ids: Joi.array().items(Joi.number()),
            doctor_ids: Joi.array().items(Joi.number()),
            clinic_ids: Joi.array().items(Joi.number()),
            listing_count: Joi.number().allow(0, ""),
            banner:Joi.string().allow(''),
            banner_redirection_url:Joi.string().allow('')
        })
    }),
    updateBanner: Joi.object({
        id: Joi.number(),
        alt_text: Joi.string().required(),
        device_type: Joi.valid("mobile", "desktop", "all").required(),
        display_order: Joi.number().required(),
        banner_img_url: Joi.string().allow(''),
        redirection_url: Joi.string().allow(''),
        page: Joi.string().required(),
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
                verticals: body.verticals,
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
        } else if (body.page_name === 'clinics') {
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
        } else if (body.page_name === "caretakers") {
            const validation: ValidationResult = requestParams.saveCaretakersPageSetting.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            await settingModel.saveCaretakersPageData({
                state: body.state,
                city: body.city,
                popular_specialists: body.popular_specialists,
                section: body.section
            });
        } else if (body.page_name === "physiotherapy" || body.page_name === "petcare") {
            const validation: ValidationResult = requestParams.savePhysiotherapyPageSetting.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
             await settingModel.savePhysiotherapyPageData({
                state: body.state,
                city: body.city,
                page_name:body.page_name,
                popular_specialists: body.popular_specialists,
                section: body.section
            });
        }
        res.json(successResponse({}, "success"))
    },
    getBanners: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let data = await settingModel.getSiteBannersData({ city: tokenInfo.bd });
        res.json(successResponse(data, "success"))
    },
    updateBanner: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.updateBanner.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let image_name = '';
        if (body.banner_img_url) {
            image_name = body.banner_img_url;
        }
        if (!body.banner_img_url && files.banner) {
            let oldPath = files.banner.filepath;
            image_name = `${body.alt_text}-${body.page}`;
            image_name = image_name.replace(/[^a-zA-Z0-9\s]/g, '');
            image_name = image_name.replace(/\s/g, '-');
            image_name = image_name + path.extname(files.banner.originalFilename);
            let new_path = `${banner_path}/${image_name}`;
            try {
                await uploadFileToServer(oldPath, new_path)
            } catch (err: any) {
                internalServerError(err.message, res);
                return
            }
        }
        let now = get_current_datetime();
        if (body.id) {

        } else {
            await DB.query("INSERT INTO site_banners (image,alt_text,device_type,branch_id,link,active,display_order,city,page,upload_time) VALUES (?,?,?,?,?,?,?,?,?,?)", [image_name, body.alt_text, body.device_type, tokenInfo.bid, body.redirection_url, 1, body.display_order, tokenInfo.bd, body.page, now]);
            res.json(successResponse({}, "Banner added successfully"));
            return;
        }
        res.json(successResponse({}, "Banner updated successfully"));
    },
    deleteBanner: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body } = req;
        if (!body.id) {
            parameterMissingResponse("Banner id is required", res);
            return;
        }
        let banner = await DB.get_row<{ image: string }>("select image from site_banners where id = ? and city = ?", [body.id, tokenInfo.bd]);
        if (banner) {
            // Only delete if banner.image is not a URL
            if (!/^https?:\/\//i.test(banner.image)) {
                let image_path = path.join(banner_path, banner.image);
                if (fs.existsSync(image_path)) {
                    fs.unlinkSync(image_path);
                }
            }
        }
        await DB.query("delete from site_banners where id = ? and city = ?", [body.id, tokenInfo.bd]);
        res.json(successResponse({}, "Banner deleted successfully"));
    }
}
export default settingsController;