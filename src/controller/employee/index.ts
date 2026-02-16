import { Request, Response } from "express";
import Joi from "joi";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { serviceNotAcceptable, successResponse, unauthorizedResponse } from "../../services/response";
import { get_current_datetime } from "../../services/datetime";
import { md5 } from "../../services/encryption";
import getEmployeesModel from "../../management-mongo-schema/employee";
import { FormdataRequest } from '../../types';
import { uploadFileToServer } from "../../services/file-upload";
import { getCityCacheDir } from "../../services/cache-file";
import { user_profile_pic_path,employee_document_path } from "../../constants";
import { Types } from "mongoose";
const reqestParsms = {
    employeeList: Joi.object({
        branch_id: Joi.number().optional().allow(""),
        dept_code: Joi.string().valid('', 'SALES', 'MKT', 'OPS', 'HR', 'TECH').optional().allow(""),
        status: Joi.string().valid('', 'active', 'in_active').optional().allow("")
    }),
    addEmployee: Joi.object({
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        email_id: Joi.string().email().required(),
        mobile_no: Joi.string().required(),
        department_code: Joi.string().required(),
        designation: Joi.string().required(),
        state: Joi.string().required(),
        city: Joi.string().required(),
        location: Joi.string().required(),
        gender: Joi.string().valid('male', 'female').required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        reporter_emp_id: Joi.number().required(),
        join_date: Joi.string().allow('')
    }),
    uploadEmployeeDocument: Joi.object({
        document_name: Joi.string().required(),
        emp_code: Joi.string().required(),
        document_type: Joi.string().required(),
    })
}
const employeeController = {
    employeeList: async (req: Request, res: Response) => {
        const { error, value } = reqestParsms.employeeList.validate(req.query);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        const { query } = req;
        const { emp_info } = res.locals
        if (!emp_info) {
            res.json(serviceNotAcceptable("Employee information not found"));
            return;
        }
        // Mock employee data
        let q = "select employee.id, employee.emp_code, concat(first_name, ' ', last_name) as name, email_id as email, mobile_no as mobile, department_id, designation, status, photo,department.name as department,department.department_code from employee join department on employee.department_id=department.id where employee.branch_id=?";
        let params = [];
        if (query.branch_id) {
            params.push(<string>query.branch_id);
        } else {
            params.push(emp_info?.branch_id)
        }
        if (query.dept_code) {
            q += " and department.department_code=?";
            params.push(<string>query.dept_code);
        }
        if (query.status) {
            q += " and employee.status=?";
            params.push(<string>query.status);
        }
        let employees = await DB.get_rows(q, params, true);
        res.json({ success: true, data: employees });
    },
    addEmployee: async (req: Request, res: Response) => {
        const { error, value } = reqestParsms.addEmployee.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { body } = req;
        let employee = await DB.get_row("select id from employee where mobile_no=?", [body.mobile_no]);
        if (employee) {
            serviceNotAcceptable("Employee with this mobile number already exists", res);
            return;
        }
        let department = await DB.get_row<{ id: number, name: string, department_code: string }>("select * from department where department_code=?", [body.department_code]);
        if (!department) {
            serviceNotAcceptable("Department not found", res);
            return;
        }
        let now = get_current_datetime();
        let join_date = body.join_date ? body.join_date : now;
        let insertRes: any = await DB.query("insert into employee set first_name=?, last_name=?, email_id=?, mobile_no=?,emp_code='', department_id=?, branch_id=?, password=?, username=?, status=?, reporting_emp_id=?, designation=?,gender=?", [body.first_name, body.last_name, body.email_id, body.mobile_no, department.id, tokenInfo.bid, md5(body.password), body.username, 'in_active', body.reporter_emp_id, body.designation, body.gender], true);
        if (insertRes.affectedRows > 0) {
            let reportingEmployeeDetail: any = {};
            if (body.reporter_emp_id) {
                reportingEmployeeDetail = await DB.get_row("select emp_code, first_name,last_name, mobile_no, email_id from employee where id=?", [body.reporter_emp_id]);
            }
            let emp_code = department.department_code + String(insertRes.insertId).padStart(6, '0');
            const EmployeesModel = getEmployeesModel();
            EmployeesModel.create({
                emp_id: insertRes.insertId, emp_code: emp_code, branch_id: tokenInfo.bid, department_code: department.department_code, name: body.first_name + " " + body.last_name, reporting_employee: { emp_id: body.reporter_emp_id, emp_code: reportingEmployeeDetail.emp_code, name: reportingEmployeeDetail.first_name + " " + reportingEmployeeDetail.last_name, mobile_no: reportingEmployeeDetail.mobile_no, email_id: reportingEmployeeDetail.email_id }, permanent_address: { state: body.state, city: body.city, address: body.location }, documents: [], profile_change_log: [{
                    time: new Date(now), changed_by: { emp_id: emp_info.id, emp_code: emp_info.emp_code, name: emp_info.first_name }, message: `Employee created with name ${body.first_name} ${body.last_name}(${emp_code})`
                }]
            });
            DB.query("update employee set emp_code=? where id=?", [emp_code, insertRes.insertId]);
            DB.query("insert into employee_detail set emp_id=?,register_date=?", [insertRes.insertId, join_date]);
            DB.get_row("select id from users where mobile=?", [body.mobile_no]).then((user: any) => {
                if (!user) {
                    DB.query("insert into users set firstname=?,lastname=?,mobile=?,email=?,city=?,state=?,location=?,gender=?,user_type=?,emp_id=?", [body.first_name, body.last_name, body.mobile_no, body.email_id, body.city, body.state, body.location, body.gender, 'user', insertRes.insertId]).then((userRes: any) => {
                        DB.query("insert into user_detail set user_id=?,signup_date=?", [userRes.insertId, now]);
                    });
                }
            });
            res.json(successResponse({ emp_id: insertRes.insertId }, "Employee added successfully"));
        } else {
            serviceNotAcceptable("Failed to add employee", res);
        }
    },
    employeeDetail: async (req: Request, res: Response) => {
        let emp_code = <string>req.query.emp_code;
        if (!emp_code) {
            serviceNotAcceptable("Employee code is required", res);
            return;
        }
        let EmployeeDetail = getEmployeesModel();
        const employeeDoc = await EmployeeDetail.findOne({ emp_code: emp_code })
        let employee = await DB.get_row<{ id: number }>("select employee.id, employee.emp_code, first_name, last_name, email_id as email, mobile_no as mobile, department_id, designation,gender, status, photo,department.name as department,department.department_code,employee_detail.register_date as join_date,branch.name as branch_name,branch.state as branch_state,branch.district as branch_district,branch.location as branch_location from employee join department on employee.department_id=department.id join branch on employee.branch_id=branch.id left join employee_detail on employee.id=employee_detail.emp_id where employee.emp_code=?", [emp_code], true);
        if (employee) {
            let reportees = await DB.get_rows("select emp_code, concat(first_name, ' ', last_name) as name,status,designation from employee where reporting_emp_id=?", [employee.id]);
            res.json(successResponse({ ...employee, reportees: reportees, permanent_address: employeeDoc?.permanent_address, reporting_employee: employeeDoc?.reporting_employee, documents: employeeDoc?.documents }, "Employee details fetched successfully"));
        } else {
            serviceNotAcceptable("Employee not found", res);
        }
    },
    changeReportingEmployee: async (req: Request, res: Response) => {
        let emp_code = <string>req.body.emp_code;
        let new_reporter_emp_id = <number>req.body.new_reporter_emp_id;
        if (!emp_code || !new_reporter_emp_id) {
            serviceNotAcceptable("Employee code and new reporter employee id are required", res);
            return;
        }
        const { emp_info, tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let employee = await DB.get_row<{ id: number, first_name: string, last_name: string, emp_code: string, mobile_no: string, email_id: string }>("select id,emp_code, first_name,last_name, mobile_no, email_id from employee where emp_code=?", [emp_code]);
        const reporter_detail = await DB.get_row<{ emp_code: string, first_name: string, last_name: string, mobile_no: string, email_id: string }>("select emp_code, first_name,last_name, mobile_no, email_id from employee where id=?", [new_reporter_emp_id])

        if (!employee || !reporter_detail) {
            serviceNotAcceptable("Employee not found", res);
            return;
        }
        let now = get_current_datetime();
        await DB.query("update employee set reporting_emp_id=? where id=?", [new_reporter_emp_id, employee.id]);
        const EmployeesModel = getEmployeesModel();
        await EmployeesModel.updateOne({ emp_code: emp_code }, {
            $set: {
                reporting_employee: {
                    emp_id: new_reporter_emp_id,
                    emp_code: reporter_detail.emp_code,
                    name: `${reporter_detail.first_name} ${reporter_detail.last_name}`,
                    mobile_no: reporter_detail.mobile_no,
                    email_id: reporter_detail.email_id,
                }
            }, $push: { profile_change_log: { time: new Date(now), changed_by: { emp_id: emp_info.id, emp_code: emp_info.emp_code, name: `${emp_info.first_name}` }, message: `Reporting employee changed to ${reporter_detail.first_name} ${reporter_detail.last_name}` } }
        });
        res.json(successResponse({}, "Reporting employee changed successfully"));
    },

    activateEmployee: async (req: Request, res: Response) => {
        let emp_code = req.body.emp_code;
        if (!emp_code) {
            serviceNotAcceptable("Employee code is required", res);
            return;
        }
        const { emp_info, tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let now = get_current_datetime();
        await DB.query("update employee set status='active' where emp_code=?", [emp_code]);
        const EmployeesModel = getEmployeesModel();
        await EmployeesModel.updateOne({ emp_code: emp_code }, { $push: { profile_change_log: { time: new Date(now), changed_by: { emp_id: emp_info.id, emp_code: emp_info.emp_code, name: `${emp_info.first_name}` }, message: `Profile activated` } } });
        res.json(successResponse({}, "Profile activated successfully"));
    },
    deActiveEmployee: async (req: Request, res: Response) => {
        let emp_code = req.body.emp_code;
        if (!emp_code) {
            serviceNotAcceptable("Employee code is required", res);
            return;
        }
        const { emp_info, tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        let now = get_current_datetime();
        await DB.query("update employee set status='in_active' where emp_code=?", [emp_code]);
        const EmployeesModel = getEmployeesModel();
        await EmployeesModel.updateOne({ emp_code: emp_code }, { $push: { profile_change_log: { time: new Date(now), changed_by: { emp_id: emp_info.id, emp_code: emp_info.emp_code, name: `${emp_info.first_name}` }, message: `Profile deactivated` } } });
        res.json(successResponse({}, "Profile deactivated successfully"));
    },
    uploadProfilePicture: async (req: FormdataRequest, res: Response) => {
        const { body, files } = req;
        let emp_code = body.emp_code;
        if (!emp_code) {
            serviceNotAcceptable("Employee code is required", res);
            return;
        }
        const { emp_info, tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        if (!files || !files.profile_picture) {
            serviceNotAcceptable("Profile picture is required", res);
            return;
        }
        const profilePicture = Array.isArray(files.profile_picture) ? files.profile_picture[0] : files.profile_picture;
        let oldPath = profilePicture.filepath;
        let file_name = `${emp_code}.${profilePicture.mimetype?.split('/')[1]}`;
        let newPath = user_profile_pic_path + file_name;
        uploadFileToServer(oldPath, newPath);
        let employee = await DB.get_row<{ id: number }>("select id from employee where emp_code=?", [emp_code]);
        if (employee) {
            DB.query("update employee set photo=? where emp_code=?", [file_name, emp_code]);
            DB.query("update users set image=? where emp_id=?", [file_name, employee?.id]);
        }
        res.json(successResponse({ profile_pic: file_name }, "Profile picture uploaded successfully"));
    },
    uploadEmployeeDocument: async (req: FormdataRequest, res: Response) => {
        // Similar implementation as uploadProfilePicture but saving in documents array in employee document in MongoDB
        const { body, files } = req;
        const { error, value } = reqestParsms.uploadEmployeeDocument.validate(body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        const { emp_info, tokenInfo } = res.locals;
        if (!emp_info || !tokenInfo) {
            unauthorizedResponse("permission denied! Please login to access", res);
        }
        if (!files || !files.document) {
            serviceNotAcceptable("Document file is required", res);
            return;
        }
        let now = get_current_datetime();
        const documentFile = Array.isArray(files.document) ? files.document[0] : files.document;
        let oldPath = documentFile.filepath;
        let file_name = `${body.emp_code}-${body.document_name.replace(/\s+/g, '-')}.${documentFile.mimetype?.split('/')[1]}`;
        let cacheDir =  employee_document_path+"/" + body.emp_code;
        if(!existsSync(cacheDir)){
            mkdirSync(cacheDir, { recursive: true });
        }
        let newPath = cacheDir + "/" + file_name;
        uploadFileToServer(oldPath, newPath);
        const EmployeeDetail = getEmployeesModel();
        await EmployeeDetail.updateOne({ emp_code: body.emp_code }, { $push: { documents: { name: body.document_name, type: body.document_type, file_name: file_name, uploaded_at: new Date(now),status: 'pending' } } });
        res.json(successResponse({ file_name: file_name }, "Document uploaded successfully"));
    },
    deleteDocument: async (req: Request, res: Response) => {
        let emp_code = req.body.emp_code as string;
        let document_id = req.body.document_id as string;
        let document_filename = req.body.document_filename as string;
        if (!emp_code || !document_id || !document_filename) {
            serviceNotAcceptable("Employee code, document id, and document filename are required", res);
            return;
        }
        const { emp_info, tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const EmployeeDetail = getEmployeesModel();
        await EmployeeDetail.updateOne({ emp_code: emp_code }, { $pull: { documents: { _id: new Types.ObjectId(document_id) } } });
        const filePath = `${employee_document_path}/${emp_code}/${document_filename}`;
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
        res.json(successResponse({}, "Document deleted successfully")); 
    },
    deleteEmployee: async (req: Request, res: Response) => {
        let emp_id = <string>req.query.emp_id;
        if (!emp_id) {
            serviceNotAcceptable("Employee id is required", res);
            return;
        }
        await DB.query("delete from employee where id=?", [emp_id]);
        await DB.query("delete from employee_detail where emp_id=?", [emp_id]);
        const userdetail = await DB.get_row<{ id: number }>("select id from users where emp_id=?", [emp_id]);
        if (userdetail) {
            await DB.query("delete from user_detail where user_id=?", [userdetail.id]);
        }
        await DB.query("delete from users where emp_id=?", [emp_id]);
        const EmployeesModel = getEmployeesModel();
        await EmployeesModel.deleteOne({ emp_id: emp_id });
        res.json(successResponse({}, "Employee deleted successfully"));
    },
}
export default employeeController;