import { Request, Response, NextFunction } from 'express';
import moment from 'moment';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { rateLimitErrorResponse, unauthorizedResponse, internalServerError } from '../services/response';
import { decrypt } from '../services/encryption';
import { get_current_datetime } from '../services/datetime';
import {ILoggedinEmpInfo} from '../types';
export const responseTime = (req: Request, res: Response, next: NextFunction) => {
    let start = Date.now();
    res.on('finish', () => {
        let duration = Date.now() - start;
        // console.log("duration",duration);
    })
    next();
}
export const loginRatelimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: rateLimitErrorResponse(),
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: async () => {
        // block the profile
    }
})
export const apiRateLimit = (count: number, timeInterval: number) => {
    return rateLimit({
        windowMs: timeInterval * 1000, // 1 minute
        max: count,
        message: rateLimitErrorResponse(),
        standardHeaders: true,
        legacyHeaders: false,
        onLimitReached: async () => {
            // block the profile
        }
    })
}
export const xApiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ip, headers } = req;
        let token = headers['x-api-key'];
        if (token) {
            let decodeddata = decrypt(typeof token === 'string' ? token : token[0]);
            if (decodeddata) {
                let tokenData = JSON.parse(decodeddata);
                if (tokenData.log_ip !== ip) {
                    unauthorizedResponse("invalid api key (ip mismatched)", res);
                    return;
                }
                if (moment(tokenData.et).diff(moment(get_current_datetime())) < 0) {
                    unauthorizedResponse("Login session expired! Please login again", res);
                    return;
                }
                res.locals.tokenInfo = tokenData;
                next();
            } else {
                unauthorizedResponse("invalid api key", res);
            }
        } else {
            unauthorizedResponse("api key is missing", res);
        }
    } catch (err) {
        internalServerError("internal server error", res);
    }
}

export const employeeValidation = (level: number=0) => {// level 0 = just employee or not,1= active or not
    return async (req: Request, res: Response, next: NextFunction) => {
        const { tokenInfo } = res.locals;
        try{
            let employee:any = await DB.get_row("select id,first_name,last_name,emp_code,branch_id,department_id,status from employee where id=? and emp_code=? and branch_id=? and department_id=?", [tokenInfo.eid,tokenInfo.ec,tokenInfo.bid,tokenInfo.did]);
            const empinfo:ILoggedinEmpInfo={
                id:employee.id,
                first_name:employee.first_name,
                emp_code:employee.emp_code,
                branch_id:employee.branch_id,
                department_id:employee.department_id
            };
            if(employee){
                if(level===1){
                    if(employee.status==='active'){
                        res.locals.emp_info=empinfo;
                        next()
                    }else{
                        unauthorizedResponse("Loggedin employee status is in-active", res);
                    }
                }else{
                    res.locals.emp_info=empinfo;
                    next()
                }
            }else{
                unauthorizedResponse("invalid employee info", res);
            }
        }catch(err){
            internalServerError("internal server error", res);
        }
    }
}
export const shouldCompress = (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
    }
    // fallback to standard filter function
    return compression.filter(req, res)
}
export const handelError = (cb: (req: Request, res: Response, next: NextFunction) => void) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await cb(req, res, next);
        } catch (err: any) {
            internalServerError(`Internal server error (${err.message})`, res);
        }
    }
}