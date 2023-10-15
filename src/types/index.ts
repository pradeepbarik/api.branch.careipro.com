import {Request} from 'express';
import {Files} from 'formidable';
export interface FormdataRequest extends Request{
    files?:any;
}
export interface ILoggedinEmpInfo{
    id:number,
    first_name:string,
    emp_code:string,
    branch_id:number,
    department_id:number
}
export interface ITokenInfo{
    log_ip: string,
    eid: number,
    ec: string,
    es: string,
    bid: number,
    did: number,
    dc: string,
    mob: number,
    bs: string,
    bd: string,
    gt: string
}