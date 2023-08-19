import { Request,Response } from "express";
import { successResponse } from "../services/response";
const homeController={
    branches:async (req:Request,res:Response)=>{
        let rows = await DB.get_rows('select * from branch', []);
        res.json(successResponse(rows,"success"));
    }
}
export default homeController;