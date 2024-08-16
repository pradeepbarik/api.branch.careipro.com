import { Request, Response } from 'express';
import path from 'path';
import { FormdataRequest } from '../../types';
import Joi, { ValidationResult } from 'joi';
import {city_icon_path} from '../../constants';
import {uploadFileToServer,deleteFile} from '../../services/file-upload';
import { parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse,internalServerError } from '../../services/response';
import locationModel, { getMissingVillageList, getClinicAvailableAreas, addClinicAvailableMarket } from '../../model/location';

const requestParams = {
    getMissedareaList: Joi.object({
        state: Joi.string().allow(''),
        district: Joi.string().allow('')
    }),
    addMissedArea: Joi.object({
        state: Joi.string().required(),
        district: Joi.string().required(),
        sub_district: Joi.string().required(),
        village: Joi.string().required()
    }),
    getClinicAvailableAreas: Joi.object({
        state: Joi.string().required(),
        district: Joi.string().required()
    }),
    addClinicAvailableArea: Joi.object({
        state: Joi.string().required(),
        dist_name: Joi.string().required(),
        market_name: Joi.string().required()
    }),
    setNearByCity: Joi.object({
        state: Joi.string().required(),
        district: Joi.string().required(),
        nearbyState: Joi.string().required(),
        nearbyCity: Joi.string().required()
    }),
    getNearByCities:Joi.object({
        state: Joi.string().required(),
        city: Joi.string().required()
    }),
    updateNearbyCity:Joi.object({
        action:Joi.valid("delete","move_up","move_down"),
        state:Joi.string().required(),
        city:Joi.string().required(),
        nearbyState:Joi.string().required(),
        nearbyCity:Joi.string().required()
    }),
    updateCity:Joi.object({
        field:Joi.valid("name_ln","icon",'service_available','short_code'),
        value:Joi.string(),
        id:Joi.number().required()
    })
}
export const locationController = {
    getMissedareaList: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getMissedareaList.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await getMissingVillageList({
            district: query.district ? query.district : tokenInfo.bd,
            state: query.state
        });
        res.status(response.code).json(response);
    },
    addMissedArea: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addMissedArea.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await locationModel.addMissedArea({
            state: body.state,
            district: body.district,
            sub_district: body.sub_district,
            village: body.village
        })
        res.status(response.code).json(response);
    },
    rejectAddAreaRequest: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addMissedArea.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        if (tokenInfo.bd.toLowerCase() !== body.district) {
            unauthorizedResponse("permission denied! you can't remove other branch data",res);
            return
        }
        let response = await locationModel.rejectAddareaRequest({
            state: body.state,
            district: body.district,
            sub_district: body.sub_district,
            village: body.village
        })
        res.status(response.code).json(response);
    },
    getClinicAvailableAreas: async (req: Request, res: Response) => {
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getClinicAvailableAreas.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await getClinicAvailableAreas(query.state, query.district);
        res.status(response.code).json(response);
    },
    addClinicAvailableMarket: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.addClinicAvailableArea.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await addClinicAvailableMarket({
            state: body.state,
            dist_name: body.dist_name,
            area_name: body.market_name
        });
        res.status(response.code).json(response);
    },
    setNearByCity: async (req: Request, res: Response) => {
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.setNearByCity.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await locationModel.setNearByCity({ state: body.state, city: body.district, nearByState: body.nearbyState, nearByCity: body.nearbyCity });
        res.status(response.code).json(response);
    },
    getNearByCities:async (req:Request,res:Response)=>{
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.getNearByCities.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await locationModel.getNearByCities({state:query.state,city:query.city});
        res.status(response.code).json(response);
    },
    updateNearbyCity:async (req:Request,res:Response)=>{
        const { body }: { body: any } = req;
        const validation: ValidationResult = requestParams.updateNearbyCity.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let response = await locationModel.updateNearbyCity({state:body.state,city:body.city,nearbyState:body.nearbyState,nearbyCity:body.nearbyCity,action:body.action});
        res.status(response.code).json(response);
    },
    updateCity:async (req:FormdataRequest,res:Response)=>{
        const { body,files }= req;
        const validation: ValidationResult = requestParams.updateCity.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access",res);
            return
        }
        let city = await DB.get_row<{id:number,name:string,city_icon:string,short_code:string|null}>('select id,name,city_icon,short_code from tbl_districts where id=?',[body.id]);
        if(city===null){
            serviceNotAcceptable("invalid city id",res)
            return;
        }
        if(body.field==='name_ln'){
           await DB.query("update tbl_districts set name_ln=? where id=? limit 1",[body.value,city.id]);
        }else if(body.field==="service_available"){
            await DB.query("update tbl_districts set is_serviceable=? where id=? limit 1",[body.value,city.id]);
        }else if(body.field==="icon"){
            if (files && files.images) {
                let oldPath = files.images.filepath;
                let image_name = `${city.name.replace(' ','-')}${path.extname(files.images.originalFilename)}`;
                let new_path = `${city_icon_path}${image_name}`;
                try{
                    await uploadFileToServer(oldPath,new_path);
                    await DB.query("update tbl_districts set city_icon=? where id=?",[image_name,city.id]);
                    if(city.city_icon){
                        deleteFile(`${city_icon_path}${city.city_icon}`);
                    }
                }catch(err:any){
                    internalServerError(err.message, res);
                    return
                }
            }
        }else if(body.field==="short_code"){
            if(city.short_code && false){
                serviceNotAcceptable("Already short code exist",res);
                return;
            }
            await DB.query("update tbl_districts set short_code=? where id=?",[body.value.toUpperCase(),city.id]);
        }
        res.json(successResponse("updated successfully"))
    }
}
export default locationController;