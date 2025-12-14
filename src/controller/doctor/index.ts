import { Request, Response } from "express";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse } from "../../services/response";
import doctorModel from "../../model/doctor";
import { FormdataRequest } from "../../types";
import path from "path";
import fs from "fs";
import { uploadFileToServer } from "../../services/file-upload";
import { banner_path } from "../../constants";
import { get_current_datetime } from "../../services/datetime";
const requestParams = {
    getAllDoctors: Joi.object({
        business_type: Joi.string().required(),
        partner_type: Joi.string().allow(""),
        clinic_id: Joi.number().allow(""),
    }),
    addNewDoctor: Joi.object({
        business_type: Joi.string().required(),
        partner_type: Joi.string().required(),
        clinic_id: Joi.number().required(),
        doctor_name: Joi.string().required(),
        contact_no: Joi.string().allow(""),
        position: Joi.string().required(),
        qualification: Joi.string().required(),
        reg_no: Joi.string().allow(''),
        years_of_experience: Joi.number().allow(""),
        gender: Joi.string().required(),
        consultation_fee: Joi.number().allow(''),
        medicine_category: Joi.string().allow(''),
        about_doctor: Joi.string().allow(''),
        profile_pic: Joi.any().allow(null),
        state: Joi.string().required(),
        dist: Joi.string().required(),
        market: Joi.string().required(),
        area_name: Joi.string().required(),
        location: Joi.string().required(),
        latitude: Joi.string().allow(''),
        longitude: Joi.string().allow(''),
        clinic_name: Joi.string().allow(''),
        seo_url: Joi.string().required(),
        other_information: Joi.string().allow('')
    })
}
const doctorController = {
    getAllDoctors: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let q = "select id,name,gender,experience,position,image,description,rating,clinic_id,seo_url,active,business_type,partner_type,market_name,city from doctor where branch_id=? and city=?";
        let sqlParams = [tokenInfo.bid, tokenInfo.bd];
        if (req.query.business_type) {
            q += " and business_type=?";
            sqlParams.push(<string>req.query.business_type);
        }
        if (req.query.partner_type) {
            q += " and partner_type=?";
            sqlParams.push(<string>req.query.partner_type);
        }
        let rows = await DB.get_rows("select doctors.*,t2.id as service_location_id,t2.clinic as clinic_name from (" + q + ") as doctors join doctor_service_location as t2 on doctors.id=t2.doctor_id", sqlParams);
        res.json(successResponse(rows, "doctors list fetched successfully"));
    },
    addNewDoctor: async (req: FormdataRequest, res: Response) => {
        const { body, files } = req;
        const validation = requestParams.addNewDoctor.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let result = await doctorModel.addNewDoctor({
            business_type: body.business_type,
            partner_type: body.partner_type,
            clinic_id: body.clinic_id,
            doctor_name: body.doctor_name,
            contact_no: body.contact_no,
            position: body.position,
            qualification: body.qualification,
            reg_no: body.reg_no,
            years_of_experience: body.years_of_experience,
            gender: body.gender,
            consultation_fee: body.consultation_fee,
            medicine_category: body.medicine_category,
            about_doctor: body.about_doctor,
            profile_pic: body.profile_pic,
            state: body.state,
            state_code: body.state_code,
            dist: body.dist,
            dist_code: body.dist_code,
            market: body.market,
            area_name: body.area_name,
            location: body.location,
            latitude: body.latitude,
            longitude: body.longitude,
            seo_url: body.seo_url,
            clinic_name: body.clinic_name,
            branch_city: tokenInfo.bd,
            branch_id: tokenInfo.bid,
            other_information: body.other_information || ""
        }, emp_info)
        if (result.error) {
            serviceNotAcceptable(result.message, res);
            return;
        }
        let now = get_current_datetime()
        if (result.data?.doctor_id) {
            //save doctor images
            let state = body.state;
            let city = body.dist;
            let user_id = result.data?.doctor_id;
            if (files) {
                let i = 1;
                for (let key in files) {
                    let img = files[key];
                    let oldPath = img.filepath;
                    let doctor_photos = `${body.doctor_name}-${tokenInfo.bd}}-${i}`;
                    doctor_photos = doctor_photos.replace(/[^a-zA-Z0-9\s-]/g, '');
                    doctor_photos = doctor_photos.replace(/\s/g, '-');
                    doctor_photos = doctor_photos + path.extname(img.originalFilename);
                    let bannerDirectory = `${banner_path}/${state.toLowerCase()}/${city.toLowerCase()}/C${body.clinic_id||0}D${user_id}`;
                    bannerDirectory = bannerDirectory.replace(/\s/g, '-');
                    if (fs.existsSync(bannerDirectory) == false) {
                        fs.mkdirSync(bannerDirectory, { recursive: true });
                    }
                    let new_path = `${bannerDirectory}/${doctor_photos}`;
                    try {
                        doctor_photos = `${state.toLowerCase()}/${city.toLowerCase()}/C${body.clinic_id||0}D${user_id}/${doctor_photos}`;
                        doctor_photos = doctor_photos.replace(/\s/g, '-');
                        await uploadFileToServer(oldPath, new_path)
                        DB.query("insert into banners set image=?,display_order=?,user_id=?,user_type=?,device_type=?,redirection_url=?,banner_description=?,upload_time=?", [
                            doctor_photos, i, result.data?.doctor_id, "doctor", "all", "", body.doctor_name + " " + "clinic photos", now
                        ])
                    } catch (err: any) {
                        console.log("File upload error:", err.message);
                    }
                    i++;
                }
            }
            res.json(successResponse(result.data, result.message));
        }
    }
}

export default doctorController