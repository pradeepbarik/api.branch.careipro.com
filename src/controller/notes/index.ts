import { Request, Response } from "express";
const notesController={
    create:(req:Request,res:Response)=>{
        const body = req.body;
        console.log("Note Create Body:",body);
        res.send({message:"Note created successfully dggfgd"});
    }
}
export default notesController;