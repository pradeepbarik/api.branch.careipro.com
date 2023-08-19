import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, internalServerError } from '../../services/response';
import { login } from '../../model/authentication';
const requestParams = {
    login: Joi.object({
        username: Joi.string().required().min(5).max(15),
        password: Joi.string().required().min(5).max(15),
        branch_id: Joi.number().required().min(1).max(3)
    })
}
const authenticationController = {
    login: async (req: Request, res: Response) => {
        const { body, ip } = req;
        const validation: ValidationResult = requestParams.login.validate(body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        let result = await login({ user_name: body.username, password: body.password, branch_id: body.branch_id, IP: ip });
        res.status(result.code).json(result);
    }
}
export default authenticationController;