import { Response } from 'express';
export interface Iresponse<T> {
    code: number;
    message: string;
    data: T;
}
const responseCode = {
    SUCCESS: 200,
    INTERNAL_SERVER_ERROR: 500,
    NOT_ACCEPTABLE:406,
    PARAMETER_MISSING: 201,
    RATELIMIT_ERROR: 429,
    UNAUTHORIZED_ERROR: 401
}
export const successResponse = <T>(data: T, message: string = "success"): Iresponse<T> => {
    return {
        code: responseCode.SUCCESS,
        message: message,
        data: data
    }
}
export const unauthorizedResponse = (message: string = "unauthorized", res: Response | null = null): Iresponse<null> => {
    let response={
        code: responseCode.UNAUTHORIZED_ERROR,
        message: message,
        data: null
    };
    if (res !== null) {
        res.status(responseCode.UNAUTHORIZED_ERROR).json(response)
        return response;
    }
    return response;
}
export const rateLimitErrorResponse = (message: string = "Too many request attempt", res: Response | null = null): Iresponse<null> => {
    let response={
        code: responseCode.RATELIMIT_ERROR,
        message: message,
        data: null
    };
    if (res !== null) {
        res.status(responseCode.RATELIMIT_ERROR).json(response)
        return response;
    }
    return response;
}
export const parameterMissingResponse = (message: string = "Parameter missing", res: Response | null = null): Iresponse<null> => {
    let response={
        code: responseCode.PARAMETER_MISSING,
        message: message,
        data: null
    };
    if (res !== null) {
        res.status(responseCode.PARAMETER_MISSING).json(response)
        return response;
    }
    return response
}
export const internalServerError = (message: string = "Internal server error", res: Response | null = null): Iresponse<null> => {
    let response={
        code: responseCode.INTERNAL_SERVER_ERROR,
        message: message,
        data: null
    };
    if (res !== null) {
        res.status(responseCode.INTERNAL_SERVER_ERROR).json(response)
        return response;
    }
    return response
}
export const serviceNotAcceptable=(message: string = "Process could not be completed", res: Response | null = null):Iresponse<null>=>{
    let response={
        code: responseCode.NOT_ACCEPTABLE,
        message: message,
        data: null
    };
    if (res !== null) {
        res.status(responseCode.NOT_ACCEPTABLE).json(response)
        return response;
    }
    return response
}