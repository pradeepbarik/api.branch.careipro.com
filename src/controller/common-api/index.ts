import { query, Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { unauthorizedResponse, parameterMissingResponse, successResponse } from '../../services/response';
import axios from 'axios';
import { decrypt, encrypt } from '../../services/encryption';
import coll_pg_orders_model from '../../mongo-schema/pg/coll_pg_orders';
const requestParams = {
    searchOtp: Joi.object({
        mobile: Joi.number().required()
    })
}
const commonapiController = {
    searchOtp: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { query }: { query: any } = req;
        const validation: ValidationResult = requestParams.searchOtp.validate(query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let rows = await DB.get_rows("select * from otp where mobile_no=? order create_time desc", [query.mobile]);
        res.json(successResponse(rows, "success"))
    },
    sendAboutCareiproSmsToUsers: async (req: Request, res: Response) => {
        let from = req.query.from;
        let to = req.query.to;
        let users: any = await DB.get_rows("select firstname,mobile from users where id>=? and id<=? and user_type='user'", [<string>from, <string>to]);
        users.forEach((u: any) => {
            axios.post("http://139.59.87.157/webservice/v1/patient-app/send-sms", {
                sms_template_id: "1207175223783922585",
                "city": "Bhadrak",
                data: [{ name: u.firstname, mobile: u.mobile }]
            })
        })
        res.json(successResponse(users, "success"))
    },
    generateBusinessPublicKey: async (req: Request, res: Response) => {
        const validation: ValidationResult = Joi.object({
            business_id: Joi.string().required(),
            clinic_id: Joi.number().required(),
            state: Joi.string().required(),
            city: Joi.string().required(),
        }).validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { query }: { query: any } = req;
        const publicKey = encrypt(`${query.clinic_id}|${query.business_id}|${query.state}|${query.city}`);
        console.log("decoded public key", decrypt(publicKey));
        res.json(successResponse({ publicKey }, "success"))
    },
    test: async (req: Request, res: Response) => {
        let docs = await coll_pg_orders_model.find();
        for (let doc of docs) {
            doc.branch_id = 1;
            if (doc.patient_info) {
                doc.clinic_id = doc.patient_info.clinic_id;
                doc.doctor_id = doc.patient_info.doctor_id;
            }
            await doc.save();
        }
        res.json(successResponse("test success", "success"))
    }
}
export default commonapiController