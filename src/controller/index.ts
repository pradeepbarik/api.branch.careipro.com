import { Request, Response } from "express";
import Joi,{ValidationResult} from 'joi';
import { successResponse,parameterMissingResponse } from "../services/response";
const requestParams = {
    getDistricts:Joi.object({
        state:Joi.string().allow(''),
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
    }
}
export default homeController;