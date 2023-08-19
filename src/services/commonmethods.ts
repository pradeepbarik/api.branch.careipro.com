import { Request } from 'express';
type get_formdata_return_type={
    fields:any;
    files:any;
}
export const get_formdata = (req: Request):Promise<get_formdata_return_type> => {
    return new Promise((resolve, reject) => {
        const formidable = require('formidable');
        let form = new formidable.IncomingForm();
        form.parse(req, async (err: unknown, fields: unknown, files: unknown) => {
            resolve({ fields, files });
        });
    });
}
