import path, { join } from 'path';
import { Request, Response } from 'express';
import Joi, { number, ValidationResult } from 'joi';
import { FormdataRequest } from '../../types';
import { specialist_icon_path } from '../../constants';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable, internalServerError } from '../../services/response';
import { uploadFileToServer, deleteFile } from '../../services/file-upload';
import { cleanString } from '../../helper/index';
import { categoryDetailsModel } from '../../mongo-schema/coll_category_details';

const requestParams = {
    getSpecialists: Joi.object({
        business_type: Joi.string().required()
    }),
    addNewSpecialist: Joi.object({
        id: Joi.number(),
        name: Joi.string().required(),
        parent_id: Joi.number().required(),
        enable: Joi.number().required(),
        short_description: Joi.string().allow(""),
        seo_url: Joi.string().required(),
        page_title: Joi.string().required(),
        meta_description: Joi.string().required(),
        h1_tag: Joi.string().allow('').optional(),
        business_type: Joi.string().required()
    }),
    updatespecialist: Joi.object({
        id: Joi.number().required(),
        name: Joi.string(),
        parent_id: Joi.number(),
        enable: Joi.number(),
        short_description: Joi.string().allow(''),
        seo_url: Joi.string(),
        page_title: Joi.string(),
        meta_description: Joi.string(),
        h1_tag: Joi.string().allow(''),
        business_type: Joi.string()
    }),
    updateCategorySetting: Joi.object({
        cat_id: Joi.number().required(),
        price: Joi.number(),
        lead_charge: Joi.number(),
        display_price: Joi.string().allow(''),
        service_duration_display: Joi.string().allow(''),
    }),
    updateDoctorScore: Joi.object({
        data: Joi.array().items(Joi.object({
            doctor_id: Joi.number().required(),
            category_id: Joi.number().required(),
            score: Joi.number().required()
        })).required()
    }),
    updateClinicScore: Joi.object({
        data: Joi.array().items(Joi.object({
            clinic_id: Joi.number().required(),
            category_id: Joi.number().required(),
            score: Joi.number().required()
        })).required()
    }),
    addCategoryFaq: Joi.object({
        action: Joi.string().valid("add", "update", "delete", "move_up", "move_down").required(),
        cat_id: Joi.number().required(),
        faq_id: Joi.string(),
        question: Joi.string().required(),
        answer: Joi.string().required(),
        state: Joi.string().optional().allow(''),
        city: Joi.string().optional().allow(''),
    })
}
const categoriesController = {
    getSpecialists: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getSpecialists.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let categories: Array<{ id: number, name: string }> = [];
        let parent_categories: Array<{ id: number, name: string }> = [];
        let rows = await DB.get_rows<{ id: number, name: string }>("select t1.*,t2.city,t2.price,t2.lead_charge,t2.display_price,t2.service_duration_display from (select * from specialists where group_category=? and parent_id=0 order by display_order) as t1 left join (select * from tbl_specialist_setting where city=?) as t2 on t1.id=t2.specialist_id", [query.business_type, tokenInfo.bd]);
        if (rows.length) {
            for (let row of rows) {
                categories.push(row);
                parent_categories.push({ id: row.id, name: row.name });
                let childRows = await DB.get_rows<{ id: number, name: string }>("select t1.*,t2.city,t2.price,t2.lead_charge,t2.display_price,t2.service_duration_display from (select * from specialists where group_category=? and parent_id=?) as t1 left join (select * from tbl_specialist_setting where city=?) as t2 on t1.id=t2.specialist_id", [query.business_type, row.id, tokenInfo.bd]);
                categories = categories.concat(childRows);
            }
        }
        res.json(successResponse({ categories: categories, parent_categories: parent_categories }, "Success"));
    },
    addNewSpecialist: async (req: FormdataRequest, res: Response) => {
        const { body, files } = req;
        const validation: ValidationResult = body.id ? requestParams.updatespecialist.validate(body) : requestParams.addNewSpecialist.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let icon = "";
        if (files && files.images) {
            icon = cleanString(body.name) + path.extname(files.images.originalFilename);
        }
        if (body.id) {
            let row = await DB.get_row<{ id: number, name: string, parent_id: number, enable: number, short_description: string, icon: string, seo_id: string }>("select * from specialists where id=?", [body.id]);
            let q = "update specialists set ";
            let sqlparams = [];
            let updateFielsd = [];
            if (body.name) {
                updateFielsd.push("name=?")
                sqlparams.push(body.name);
            }
            if (body.parent_id) {
                updateFielsd.push("parent_id=?")
                sqlparams.push(body.parent_id);
            }
            if (body.enable) {
                updateFielsd.push("enable=?")
                sqlparams.push(body.enable);
            }
            if (typeof body.short_description !== "undefined" && row?.short_description !== body.short_description) {
                updateFielsd.push("short_description=?")
                sqlparams.push(body.short_description);
            }
            if (body.seo_url) {
                updateFielsd.push("seo_url=?")
                sqlparams.push(body.seo_url);
            }
            if (body.page_title) {
                updateFielsd.push("page_title=?")
                sqlparams.push(body.page_title);
            }
            if (body.meta_description) {
                updateFielsd.push("meta_description=?")
                sqlparams.push(body.meta_description);
            }
            /* tested for presence rather than truthiness, unlike the fields above, because the
               h1 is optional: clearing it has to be possible, and a truthy test would make an
               empty value look like "field not sent" and silently keep the old heading. */
            if (typeof body.h1_tag !== "undefined") {
                updateFielsd.push("h1_tag=?")
                sqlparams.push(body.h1_tag);
            }
            if (icon) {
                updateFielsd.push("icon=?")
                sqlparams.push(icon);
            }
            if (!row?.seo_id) {
                let seo_id = `CATG${row?.id}-${body.business_type}`;
                updateFielsd.push("seo_id=?");
                sqlparams.push(seo_id);
            }
            if (updateFielsd.length) {
                q += updateFielsd.join(',');
                sqlparams.push(body.id);
                q += " where id=?";
                await DB.query(q, sqlparams, true);
                if (icon) {
                    let oldPath = files.images.filepath;
                    let new_path = `${specialist_icon_path}/${icon}`;
                    uploadFileToServer(oldPath, new_path).then(() => { });
                }
                if (row && row.icon && row.icon !== icon) {
                    deleteFile(`${specialist_icon_path}/${row.icon}`);
                }
                res.json(successResponse({}, "Updated successfully"))
            } else {
                serviceNotAcceptable("nothing to update", res)
            }
        } else {
            let q = "insert into specialists set name=?,parent_id=?,enable=?,icon=?,short_description=?,seo_url=?,page_title=?,meta_description=?,h1_tag=?,group_category=?";
            let insertRes: any = await DB.query(q, [body.name, body.parent_id, body.enable, icon, body.short_description, body.seo_url, body.page_title, body.meta_description, body.h1_tag || null, body.business_type]);
            if (insertRes.affectedRows >= 1) {
                if (files && files.images) {
                    let oldPath = files.images.filepath;
                    let new_path = `${specialist_icon_path}/${icon}`;
                    uploadFileToServer(oldPath, new_path).then(() => { });
                }
                let id = insertRes.insertId;
                let seo_id = `CATG${id}-${body.business_type}`;
                await DB.query("update specialists set seo_id=? where id=?", [seo_id, id]);
                res.json(successResponse({ id: id, seo_id: seo_id }, "Added new category successfully"))
            } else {
                internalServerError("something went wrong", res);
            }
        }
    },
    updateCategorySetting: async (req: Request, res: Response) => {
        const { body } = req;
        const validation: ValidationResult = requestParams.updateCategorySetting.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        await DB.query("insert into tbl_specialist_setting (specialist_id,city,price,lead_charge,display_price,service_duration_display) values (?,?,?,?,?,?) ON DUPLICATE KEY update price=?,lead_charge=?,display_price=?,service_duration_display=?", [body.cat_id, tokenInfo.bd, body.price, body.lead_charge, body.display_price, body.service_duration_display, body.price, body.lead_charge, body.display_price, body.service_duration_display], true);
        res.json(successResponse({}, "Updated successfully"));
    },
    getCategoryDoctors: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        if (!query.specialist_id) {
            parameterMissingResponse("specialist_id is required", res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let doctors = await DB.get_rows<{ id: number, name: string, clinic_name: string, city: string }>(`select t1.*,doctors.name as doctor_name,clinics.name as clinic_name from (select * from doctor_specialization where specialist=? and spl_city=?) as t1 join (select id,name,clinic_id from doctor where city=?) as doctors on t1.doctor_id=doctors.id left join clinics on doctors.clinic_id=clinics.id order by t1.score desc`, [query.specialist_id, tokenInfo.bd, tokenInfo.bd]);
        res.json(successResponse({ doctors: doctors }, "Success"));
    },
    updateDoctorScore: async (req: Request, res: Response) => {
        const { body } = req;
        const validation: ValidationResult = requestParams.updateDoctorScore.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        for (let item of body.data) {
            await DB.query("update doctor_specialization set score=? where doctor_id=? and specialist=? and spl_city=?", [item.score, item.doctor_id, item.category_id, tokenInfo.bd]);
        }
        res.json(successResponse({}, "Updated successfully"));
    },
    getCategoryClinics: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        /* tested as a number, not for truthiness: the query string "0" is truthy, and 0 is
           the id the facility rows are stored under, so letting it through returns one row
           per facility instead of one per clinic. */
        if (!(Number(query.specialist_id) > 0)) {
            parameterMissingResponse("specialist_id is required", res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        /* clinic_specialization carries no city of its own, unlike doctor_specialization,
           so the branch's city is applied through the clinic it points at. */
        let clinics = await DB.get_rows<{ clinic_id: number, clinic_name: string, locality: string, market_name: string, business_type: string, score: string }>("select cs.clinic_id,cs.score,clinics.name as clinic_name,clinics.locality,clinics.market_name,clinics.business_type from clinic_specialization as cs join clinics on cs.clinic_id=clinics.id where cs.specialist_id=? and clinics.city=? order by cs.score desc,clinics.name asc", [query.specialist_id, tokenInfo.bd]);
        res.json(successResponse({ clinics: clinics }, "Success"));
    },
    updateClinicScore: async (req: Request, res: Response) => {
        const { body } = req;
        const validation: ValidationResult = requestParams.updateClinicScore.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        /* the clinics join is what keeps a branch from scoring a clinic in another city,
           since the row being updated has no city column to test */
        for (let item of body.data) {
            await DB.query("update clinic_specialization as cs join clinics on cs.clinic_id=clinics.id set cs.score=? where cs.clinic_id=? and cs.specialist_id=? and clinics.city=?", [item.score, item.clinic_id, item.category_id, tokenInfo.bd]);
        }
        res.json(successResponse({}, "Updated successfully"));
    },
    addCategoryFaq: async (req: Request, res: Response) => {
        const { body } = req;
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (body.action === "add") {
            const validation: ValidationResult = requestParams.addCategoryFaq.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            categoryDetailsModel.findOneAndUpdate({ cat_id: body.cat_id }, { $push: { faqs: { question: body.question, answer: body.answer,state: body.state.toLowerCase(), city: body.city.toLowerCase() } } }, { upsert: true, new: true }).then((doc: any) => {
                res.json(successResponse({ faq_id: doc.faqs[doc.faqs.length - 1]._id }, "FAQ added successfully"));
            }).catch((err) => {
                internalServerError("something went wrong", res);
            })
        } else if (body.action === "update") {
            const validation: ValidationResult = requestParams.addCategoryFaq.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            categoryDetailsModel.findOneAndUpdate({ cat_id: body.cat_id, "faqs._id": body.faq_id }, { $set: { "faqs.$.question": body.question, "faqs.$.answer": body.answer, "faqs.$.state": body.state.toLowerCase(), "faqs.$.city": body.city.toLowerCase() } }, { new: true }).then((doc: any) => {
                res.json(successResponse({}, "FAQ updated successfully"));
            }).catch((err) => {
                internalServerError("something went wrong", res);
            })
        } else if (body.action === "delete") {
            const validation: ValidationResult = Joi.object({
                action: Joi.string().valid("delete").required(),
                cat_id: Joi.number().required(),
                faq_id: Joi.string().required(),
            }).validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            categoryDetailsModel.findOneAndUpdate({ cat_id: body.cat_id }, { $pull: { faqs: { _id: body.faq_id } } }).then((doc: any) => {
                res.json(successResponse({}, "FAQ deleted successfully"));
            }).catch((err) => {
                internalServerError("something went wrong", res);
            })
        } else if (body.action === "move_up" || body.action === "move_down") {
            const validation: ValidationResult = Joi.object({
                action: Joi.string().valid("move_up", "move_down").required(),
                cat_id: Joi.number().required(),
                faq_id: Joi.string().required(),
            }).validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            categoryDetailsModel.findOne({ cat_id: body.cat_id }).then((doc: any) => {
                if (doc) {
                    let faqs = doc.faqs;
                    let index = faqs.findIndex((f: any) => f._id.toString() === body.faq_id);
                    if (index > -1) {
                        if (body.action === "move_up" && index > 0) {
                            let temp = faqs[index - 1];
                            faqs[index - 1] = faqs[index];
                            faqs[index] = temp;
                        } else if (body.action === "move_down" && index < faqs.length - 1) {
                            let temp = faqs[index + 1];
                            faqs[index + 1] = faqs[index];
                            faqs[index] = temp;
                        }
                        categoryDetailsModel.updateOne({ cat_id: body.cat_id }, { faqs: faqs }).then(() => {
                            res.json(successResponse({}, "FAQ order updated successfully"));
                        }).catch((err) => {
                            internalServerError("something went wrong", res);
                        })
                    } else {
                        parameterMissingResponse("invalid faq_id", res);
                    }
                } else {
                    parameterMissingResponse("invalid cat_id", res);
                }
            }).catch((err) => {
                internalServerError("something went wrong", res);
            })
        } else {
            parameterMissingResponse("invalid action", res);
        }
    },
    getCategoryFaq: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        if (!query.cat_id) {
            parameterMissingResponse("cat_id is required", res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        // i want common faqs where city is blank faqs belongs to cat_id for given city
        categoryDetailsModel.aggregate([
            { $match: { cat_id: parseInt(query.cat_id) } },
            {
                $addFields: {
                    faqs: {
                        $filter: {
                            input: "$faqs",
                            as: "faq",
                            cond: {
                                $or: [
                                    { $eq: ["$$faq.city", tokenInfo.bd.toLowerCase()] },
                                    { $eq: ["$$faq.city", ""] }
                                ]
                            }
                        }
                    }
                }
            }
        ]).then((docs: any) => {
            if (docs.length) {
                res.json(successResponse({ faqs: docs[0].faqs }, "Success"));
            } else {
                res.json(successResponse({ faqs: [] }, "Success"));
            }
        }).catch((err) => {
            internalServerError("something went wrong", res);
        })
    }
}
export default categoriesController;