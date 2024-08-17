import path from 'path';
import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { FormdataRequest } from '../../types';
import { specialist_icon_path } from '../../constants';
import { parameterMissingResponse, successResponse, unauthorizedResponse, serviceNotAcceptable, internalServerError } from '../../services/response';
import { uploadFileToServer,deleteFile } from '../../services/file-upload';

const requestParams = {
    getSpecialists: Joi.object({
        business_type: Joi.string().required()
    }),
    addNewSpecialist: Joi.object({
        id: Joi.number(),
        name: Joi.string().required(),
        parent_id: Joi.number().required(),
        enable: Joi.number().required(),
        short_description: Joi.string(),
        seo_url: Joi.string().required(),
        page_title: Joi.string().required(),
        meta_description: Joi.string().required(),
        business_type: Joi.string().required()
    }),
    updatespecialist: Joi.object({
        id: Joi.number().required(),
        name: Joi.string(),
        parent_id: Joi.number(),
        enable: Joi.number(),
        short_description: Joi.string(),
        seo_url: Joi.string(),
        page_title: Joi.string(),
        meta_description: Joi.string(),
        business_type: Joi.string()
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
        let rows = await DB.get_rows<{ id: number, name: string }>("select * from specialists where business_type=? and parent_id=0 order by display_order", [query.business_type]);
        if (rows.length) {
            for (let row of rows) {
                categories.push(row);
                parent_categories.push({ id: row.id, name: row.name });
                let childRows = await DB.get_rows<{ id: number, name: string }>("select * from specialists where business_type=? and parent_id=?", [query.business_type, row.id]);
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
            icon = body.name.replace(" ", "-").replace(".", "") + path.extname(files.images.originalFilename);
        }
        if (body.id) {
            let row=await DB.get_row<{icon:string}>("select icon from specialists where id=?",[body.id]);
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
            if (body.short_description) {
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
            if (body.business_type) {
                updateFielsd.push("business_type=?")
                sqlparams.push(body.business_type);
            }
            if (icon) {
                updateFielsd.push("icon=?")
                sqlparams.push(icon);
            }
            if (updateFielsd.length) {
                q += updateFielsd.join(',');
                sqlparams.push(body.id);
                q += " where id=?";
                await DB.query(q, sqlparams);
                if (icon) {
                    let oldPath = files.images.filepath;
                    let new_path = `${specialist_icon_path}/${icon}`;
                    uploadFileToServer(oldPath, new_path).then(() => { });
                }
                if(row && row.icon && row.icon!==icon){
                    deleteFile(`${specialist_icon_path}/${row.icon}`);
                }
                res.json(successResponse({}, "Updated successfully"))
            } else {
                serviceNotAcceptable("nothing to update", res)
            }
        } else {
            let q = "insert into specialists set name=?,parent_id=?,enable=?,icon=?,short_description=?,seo_url=?,page_title=?,meta_description=?,business_type=?";
            let insertRes: any = await DB.query(q, [body.name, body.parent_id, body.enable, icon, body.short_description, body.seo_url, body.page_title, body.meta_description, body.business_type]);
            if (insertRes.affectedRows >= 1) {
                let oldPath = files.images.filepath;
                let new_path = `${specialist_icon_path}/${icon}`;
                console.log(oldPath, new_path)
                uploadFileToServer(oldPath, new_path).then(() => { });
                let id = insertRes.insertId;
                let seo_id = `CATG${id}-${body.business_type}`;
                await DB.query("update specialists set seo_id=? where id=?", [seo_id, id]);
                res.json(successResponse({ id: id, seo_id: seo_id }, "Added new category successfully"))
            } else {
                internalServerError("something went wrong", res);
            }
        }
    }
}
export default categoriesController;