import 'express';
import {ILoggedinEmpInfo} from './types';
interface ILocals {
    tokenInfo?: any;
    emp_info?:ILoggedinEmpInfo;
  }
  
  declare module 'express' {
    export interface Response  {
        locals: ILocals;
    }
  }