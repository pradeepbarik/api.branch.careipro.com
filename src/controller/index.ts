import { Request, Response } from "express";
import Joi,{ValidationResult} from 'joi';
import { successResponse,parameterMissingResponse } from "../services/response";
import dataChangesTrackerModel from '../model/data_changes_metadata';
const requestParams = {
    getDistricts:Joi.object({
        state:Joi.string().allow(''),
    }),
    updateClinicInfoChangeTracker:Joi.object({
        clinic_id:Joi.number().required(),
        change_type:Joi.valid('appointment','doctor_info','clinic_info').required(),
        doctor_id:Joi.number(),
        table_name:Joi.string().required(),
        event_type:Joi.string().required()
    })
}
const homeController = {
    branches: async (req: Request, res: Response) => {
        let rows = await DB.get_rows('select * from branch', []);
        res.json(successResponse(rows, "success"));
    },
    getStateList: async (req: Request, res: Response) => {
        let rows = await DB.get_rows("select id,name,icon from region_lvl1 order by is_serviceable desc,name asc", []);
        res.json(successResponse(rows, "success"));
    },
    getDistricts: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getDistricts.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let rows = await DB.get_rows("select id,name,city_icon,is_serviceable,name_ln from tbl_districts where state=? order by name", [query.state]);
        res.json(successResponse(rows, "success"));
    },
    updateClinicInfoChangeTracker:async (req: Request, res: Response)=>{
        const {body}=req;
        const validation: ValidationResult = requestParams.updateClinicInfoChangeTracker.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        dataChangesTrackerModel.TrackclinicInfoChanges(body.clinic_id,{
            change_type:body.change_type,
            doctor_id:body.doctor_id,
            table_name:body.table_name,
            event_type:body.event_type
        })
        res.json(successResponse("success"));
    }
}
export default homeController;