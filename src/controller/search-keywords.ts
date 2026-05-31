import { Request, Response } from "express";
import Joi from "joi";
import {parameterMissingResponse, successResponse, internalServerError, serviceNotAcceptable} from "../services/response";
import { searchTextsModel } from "../mongo-schema/coll_search_texts";
const reqSchema={
    update: Joi.object({
        id: Joi.string().required(),
        text: Joi.string().required(),
        ln: Joi.string().required(),
        type: Joi.string().required(),
        location: Joi.string().allow(""),
        icon: Joi.string().allow(""),
        rating: Joi.number().allow(""),
        vertical: Joi.string().required(),
        resolver_url: Joi.object({
            url: Joi.string().allow(""),
            target: Joi.string()
        }),
        resolver: Joi.object().required(),
    }),
    search: Joi.object({
        q: Joi.string().allow(""),
        vertical: Joi.string().allow(""),
        type: Joi.string().allow(""),
        ln: Joi.string().allow(""),
        limit: Joi.number().default(20),
    }),
    addnewSearchText:Joi.object({
        text:Joi.string().required(),
        ln:Joi.string().required(),//en,hi
        type:Joi.string().required(),
        location:Joi.string().allow(""),
        icon:Joi.string().allow(""),
        rating:Joi.number().allow(""),
        vertical:Joi.string().required(),
        resolver_url:Joi.object({
            url:Joi.string(),
            target:Joi.string()
        }),
        resolver:Joi.object().required(),
        doctor_info:Joi.object().allow(null)
    })
}
const searchKeywordsController = {
    addnewSearchText: async (req:Request, res:Response) => {
        const { error, value } = reqSchema.addnewSearchText.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const existing = await searchTextsModel.findOne({
                text: { $regex: new RegExp(`^${value.text.trim().toLowerCase()}$`, 'i') }
            });
            if (existing) {
                return serviceNotAcceptable("Search text already exists", res);
            }
            let doctor_info = undefined;
            if(value.type === 'doctor' && value.resolver?.doctor_id){
                if(!value.doctor_info){
                    return serviceNotAcceptable("Doctor info is required for doctor type keywords", res);
                }
                doctor_info = value.doctor_info || undefined;
            }
            const doc = await searchTextsModel.create({
                text: value.text.trim().toLowerCase(),
                ln: value.ln,
                type: value.type,
                location: value.location || null,
                icon: value.icon || null,
                rating: value.rating || null,
                vertical: value.vertical,
                resolver_url: value.resolver_url?.url ? value.resolver_url : undefined,
                resolver: value.resolver,
                doctor_info: doctor_info,
                click_count: 0,
            });
            return res.json(successResponse(doc, "Search text added successfully"));
        } catch (err) {
            return internalServerError("Something went wrong", res);
        }
    },
    update: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.update.validate(req.body);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const doc = await searchTextsModel.findByIdAndUpdate(
                value.id,
                {
                    $set: {
                        text: value.text.trim().toLowerCase(),
                        ln: value.ln,
                        type: value.type,
                        location: value.location || null,
                        icon: value.icon || null,
                        rating: value.rating || null,
                        vertical: value.vertical,
                        resolver_url: value.resolver_url?.url ? value.resolver_url : undefined,
                        resolver: value.resolver,
                    }
                },
                { new: true }
            );
            if (!doc) {
                return res.status(404).json({ success: false, message: 'Keyword not found' });
            }
            return res.json(successResponse(doc, 'Updated successfully'));
        } catch (err) {
            return internalServerError('Something went wrong', res);
        }
    },
    search: async (req: Request, res: Response) => {
        const { error, value } = reqSchema.search.validate(req.query);
        if (error) {
            return parameterMissingResponse(error.details[0].message, res);
        }
        try {
            const filter: any = {};
            if (value.q) {
                filter.text = { $regex: new RegExp(value.q.trim(), 'i') };
            }
            if (value.vertical) filter.vertical = value.vertical;
            if (value.type) filter.type = value.type;
            if (value.ln) filter.ln = value.ln;
            const rows = await searchTextsModel
                .find(filter)
                .sort({ click_count: -1, text: 1 })
                .limit(value.limit);
            return res.json(successResponse(rows));
        } catch (err) {
            return internalServerError("Something went wrong", res);
        }
    },
    delete: async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            return parameterMissingResponse("id is required", res);
        }
        try {
            const doc = await searchTextsModel.findByIdAndDelete(id);
            if (!doc) {
                return serviceNotAcceptable("Keyword not found", res);
            }
            return res.json(successResponse(null, 'Deleted successfully'));
        } catch (err) {
            return internalServerError("Something went wrong", res);
        }
    }
}
export default searchKeywordsController;