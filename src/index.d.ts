import 'express';
import { Files } from 'formidable';
import { ILoggedinEmpInfo, ITokenInfo } from './types';
interface ILocals {
  clientIp?:string;
  tokenInfo?: ITokenInfo;
  emp_info?: ILoggedinEmpInfo;
}
declare module 'express' {
  export interface Response {
    locals: ILocals;
  }
}