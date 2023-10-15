import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { popular_clinic_image_path } from '../../constants';
import { FormdataRequest } from '../../types';
import { unauthorizedResponse, parameterMissingResponse, internalServerError, serviceNotAcceptable } from '../../services/response';
import {get_current_datetime} from '../../services/datetime';
import popularClinicModel from "../../model/clinic/popular-clinic";
const requestParams = {
    updatePopularClinic: Joi.object({
        id: Joi.number(),
        clinic_id: Joi.number().min(1).required(),
        banner_message: Joi.string().allow(''),
        prev_img: Joi.string(),
        display_order: Joi.number().required(),
        active:Joi.number().valid(0,1),
        action:Joi.string().valid('active','deactive','delete')
    })
}
const popularClinicController = {
    getClinicList: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access");
            return
        }
        let response = await popularClinicModel.getClinicList(tokenInfo.bid, tokenInfo.bd);
        res.status(response.code).json(response);
    },
    updatePopularClinic: async (req: FormdataRequest, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        const { body, files } = req;
        const validation: ValidationResult = requestParams.updatePopularClinic.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        if (body.id && !files) {
            parameterMissingResponse("Please upload a image", res);
            return;
        }
        let clinic: any = await DB.get_row("select id,name,city from clinics where id=? and branch_id=?", [body.clinic_id, tokenInfo.bid]);
        if (!clinic) {
            unauthorizedResponse("You don't have access for this clinic", res);
            return;
        }
        if(!body.id){
            let existingClinic = await DB.get_row('select id from popular_clinics where clinic_id=? limit 1', [body.clinic_id]);
            if (existingClinic) {
                serviceNotAcceptable(clinic.name + " already marked as a popular clinic", res);
                return;
            }
        }
        let image_name = '';
        if (files && files.images) {
            let oldPath = files.images.filepath;
            image_name = `${clinic.name}-${clinic.city}-${get_current_datetime()}${path.extname(files.images.originalFilename)}`;
            image_name=image_name.replace(/\s/g,'-');
            let new_path = `${popular_clinic_image_path}${image_name}`;
            try {
                await new Promise((resolve, reject) => {
                    fs.rename(oldPath, new_path, (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(null)
                        }
                    });
                })
            } catch (err: any) {
                internalServerError(err.message, res);
                return
            }
        }
        let response = await popularClinicModel.updatePopularClinic({
            id: body.id,
            city: tokenInfo.bd,
            clinic_id: body.clinic_id,
            banner: image_name,
            banner_message: body.banner_message,
            display_order: body.display_order,
            active:body.active,
            action:body.action,
        });
        if(response.code===200 && body.id && image_name && body.prev_img){
            fs.unlink(`${popular_clinic_image_path}${body.prev_img}`,()=>{});
        }else if(response.code!==200 && image_name){
            fs.unlink(`${popular_clinic_image_path}${image_name}`,()=>{});
        }else if(response.code===200 && body.action==='delete' && body.prev_img){
            fs.unlink(`${popular_clinic_image_path}${body.prev_img}`,()=>{});
        }
        res.status(response.code).json(response);
    }
}
export default popularClinicController;