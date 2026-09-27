import { Request, Response } from 'express';
import Joi, { ValidationResult } from 'joi';
import { parameterMissingResponse, unauthorizedResponse } from '../../services/response';
import {
    startDuty, endDuty, myAttendance, employeeAttendance, branchDayAttendance, adminMarkAttendance,
    saveEmployeeDutySettings, listDutySettings, getEmployeeDutySettings, TMarkedByInfo
} from '../../model/attendance';
import { applyLeave, myLeaves, leaveRequests, reviewLeave } from '../../model/leave';
import { get_current_datetime, moment } from '../../services/datetime';
import { ILoggedinEmpInfo } from '../../types';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const reqSchema = {
    markDuty: Joi.object({
        //recorded for the record, an employee is never blocked on where they marked from
        lat: Joi.number().allow(null, ''),
        lng: Joi.number().allow(null, ''),
        accuracy: Joi.number().allow(null, '')
    }),
    dateRange: Joi.object({
        date_from: Joi.string().allow('', null),
        date_to: Joi.string().allow('', null)
    }),
    employeeAttendance: Joi.object({
        emp_id: Joi.number().required(),
        date_from: Joi.string().allow('', null),
        date_to: Joi.string().allow('', null)
    }),
    branchDay: Joi.object({
        date: Joi.string().regex(datePattern).allow('', null),
        department_id: Joi.number().allow(null, '')
    }),
    adminMarkAttendance: Joi.object({
        emp_id: Joi.number().required(),
        date: Joi.string().regex(datePattern).required(),
        //a day can be worked in parts, one entry per start-end pair
        sessions: Joi.array().min(1).max(10).items(Joi.object({
            start_time: Joi.string().regex(timePattern).required(),
            end_time: Joi.string().regex(timePattern).required()
        })).required(),
        admin_remark: Joi.string().allow('', null)
    }),
    saveDutySettings: Joi.object({
        //0 saves the branch wide default used by every employee without their own settings
        emp_id: Joi.number().required(),
        working_start_time: Joi.string().regex(timePattern).allow('', null),
        working_end_time: Joi.string().regex(timePattern).allow('', null),
        daily_working_hours: Joi.number().min(1).max(24).allow(null),
        full_day_min_hours: Joi.number().min(1).max(24).allow(null)
    }),
    applyLeave: Joi.object({
        from_date: Joi.string().regex(datePattern).required(),
        to_date: Joi.string().regex(datePattern).required(),
        reason: Joi.string().required()
    }),
    leaveRequests: Joi.object({
        status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').allow('', null),
        department_id: Joi.number().allow(null, '')
    }),
    reviewLeave: Joi.object({
        leave_id: Joi.string().required(),
        action: Joi.string().valid('approve', 'reject').required(),
        //how many days of the leave are paid, the rest of the leave becomes loss of pay
        paid_days: Joi.number().min(0).allow(null),
        admin_remark: Joi.string().allow('', null)
    })
}

/**
 * Every route of this module runs behind employeeValidation, which has already answered the request
 * with an unauthorized response when there is no active employee behind the token. This only narrows
 * the optional emp_info of res.locals for the handlers below.
 */
const employeeOf = (res: Response) => res.locals.emp_info as ILoggedinEmpInfo;

/**
 * The branch manager is the admin of this module, they approve leave, set the duty rules and read
 * the attendance of everyone in their branch. Read from the employee row on every request rather
 * than from the token, so a change of manager takes effect without waiting for a fresh login.
 */
const isBranchManager = async (emp_info: ILoggedinEmpInfo) => {
    const employee: any = await DB.get_row(
        "select is_branch_manager from employee where id=? and branch_id=?",
        [emp_info.id, emp_info.branch_id]
    );
    return employee?.is_branch_manager === 1;
}

//the name kept on a record so it still reads correctly after the manager changes
const actorInfo = (emp_info: ILoggedinEmpInfo): TMarkedByInfo => ({
    emp_id: emp_info.id,
    emp_code: emp_info.emp_code,
    name: emp_info.first_name
});

//the month of date_to when no range is given, so a page can load without passing one
const resolveRange = (query: any) => {
    const date_to = <string>query.date_to || get_current_datetime(true);
    const date_from = <string>query.date_from || moment(date_to).startOf('month').format('YYYY-MM-DD');
    return { date_from, date_to };
}

export const attendanceController = {
    startDuty: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const validation: ValidationResult = reqSchema.markDuty.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const result = await startDuty({
            branch_id: emp_info.branch_id,
            emp_id: emp_info.id,
            emp_code: emp_info.emp_code,
            department_id: emp_info.department_id,
            lat: req.body.lat,
            lng: req.body.lng,
            accuracy: req.body.accuracy
        });
        res.status(result.code).json(result);
    },
    endDuty: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const validation: ValidationResult = reqSchema.markDuty.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const result = await endDuty({
            branch_id: emp_info.branch_id,
            emp_id: emp_info.id,
            emp_code: emp_info.emp_code,
            department_id: emp_info.department_id,
            lat: req.body.lat,
            lng: req.body.lng,
            accuracy: req.body.accuracy
        });
        res.status(result.code).json(result);
    },
    myAttendance: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const validation: ValidationResult = reqSchema.dateRange.validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { date_from, date_to } = resolveRange(req.query);
        const result = await myAttendance({ branch_id: emp_info.branch_id, emp_id: emp_info.id, date_from, date_to });
        res.status(result.code).json(result);
    },
    //the resolved rules of the logged in employee, used to show the shift on the attendance page
    myDutySettings: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const settings = await getEmployeeDutySettings(emp_info.branch_id, emp_info.id);
        res.json({ code: 200, message: "success", data: settings });
    },
    //the manager verifies the working hours of one employee, everyone else reads only their own
    employeeAttendance: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can view attendance of an employee", res);
            return;
        }
        const validation: ValidationResult = reqSchema.employeeAttendance.validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { date_from, date_to } = resolveRange(req.query);
        const result = await employeeAttendance({
            branch_id: emp_info.branch_id,
            emp_id: parseInt(<string>req.query.emp_id),
            date_from,
            date_to
        });
        res.status(result.code).json(result);
    },
    //one day of the whole branch, who is on duty, who is on leave and who has marked nothing
    branchDay: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can view the attendance of the branch", res);
            return;
        }
        const validation: ValidationResult = reqSchema.branchDay.validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const result = await branchDayAttendance({
            branch_id: emp_info.branch_id,
            date: <string>req.query.date || get_current_datetime(true),
            department_id: req.query.department_id ? parseInt(<string>req.query.department_id) : undefined
        });
        res.status(result.code).json(result);
    },
    //the manager logs the hours an employee could not mark, or takes back a day granted as leave
    adminMarkAttendance: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can mark attendance of an employee", res);
            return;
        }
        const validation: ValidationResult = reqSchema.adminMarkAttendance.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        //the employee must be of the manager's own branch
        const employee: any = await DB.get_row(
            "select id,emp_code,department_id from employee where id=? and branch_id=?",
            [req.body.emp_id, emp_info.branch_id]
        );
        if (!employee) {
            unauthorizedResponse("this employee is not under your branch", res);
            return;
        }
        const result = await adminMarkAttendance({
            branch_id: emp_info.branch_id,
            emp_id: employee.id,
            emp_code: employee.emp_code,
            department_id: employee.department_id,
            marked_by: actorInfo(emp_info),
            date: req.body.date,
            sessions: req.body.sessions,
            admin_remark: req.body.admin_remark
        });
        res.status(result.code).json(result);
    },
    //duty rules are a branch policy, only the manager can read or change them
    dutySettings: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can manage duty settings", res);
            return;
        }
        const result = await listDutySettings(emp_info.branch_id);
        res.status(result.code).json(result);
    },
    saveDutySettings: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can manage duty settings", res);
            return;
        }
        const validation: ValidationResult = reqSchema.saveDutySettings.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const { emp_id, ...settings } = req.body;
        //emp_id 0 is the branch default, any other has to be an employee of this branch
        if (emp_id !== 0) {
            const employee: any = await DB.get_row("select id from employee where id=? and branch_id=?", [emp_id, emp_info.branch_id]);
            if (!employee) {
                unauthorizedResponse("this employee is not under your branch", res);
                return;
            }
        }
        const result = await saveEmployeeDutySettings({
            branch_id: emp_info.branch_id,
            emp_id: emp_id,
            updated_by: actorInfo(emp_info),
            settings
        });
        res.status(result.code).json(result);
    },
    applyLeave: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const validation: ValidationResult = reqSchema.applyLeave.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        //the full name is stored on the request so the manager inbox reads without a join
        const employee: any = await DB.get_row(
            "select concat(first_name,' ',last_name) as name from employee where id=? and branch_id=?",
            [emp_info.id, emp_info.branch_id]
        );
        const result = await applyLeave({
            branch_id: emp_info.branch_id,
            emp_id: emp_info.id,
            emp_code: emp_info.emp_code,
            emp_name: employee?.name || emp_info.first_name,
            department_id: emp_info.department_id,
            from_date: req.body.from_date,
            to_date: req.body.to_date,
            reason: req.body.reason
        });
        res.status(result.code).json(result);
    },
    myLeaves: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const result = await myLeaves({ branch_id: emp_info.branch_id, emp_id: emp_info.id });
        res.status(result.code).json(result);
    },
    //the manager inbox, an employee can not review their own leave
    leaveRequests: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can view leave requests", res);
            return;
        }
        const validation: ValidationResult = reqSchema.leaveRequests.validate(req.query);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const result = await leaveRequests({
            branch_id: emp_info.branch_id,
            status: <string>req.query.status,
            department_id: req.query.department_id ? parseInt(<string>req.query.department_id) : undefined
        });
        res.status(result.code).json(result);
    },
    reviewLeave: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        if (!await isBranchManager(emp_info)) {
            unauthorizedResponse("only the branch manager can approve or reject a leave", res);
            return;
        }
        const validation: ValidationResult = reqSchema.reviewLeave.validate(req.body);
        if (validation.error) {
            parameterMissingResponse(validation.error.details[0].message, res);
            return;
        }
        const result = await reviewLeave({
            branch_id: emp_info.branch_id,
            leave_id: req.body.leave_id,
            reviewed_by: actorInfo(emp_info),
            action: req.body.action,
            paid_days: req.body.paid_days,
            admin_remark: req.body.admin_remark
        });
        res.status(result.code).json(result);
    },
    //tells the app whether to show the manager screens, and the shift of the logged in employee
    myAttendanceAccess: async (req: Request, res: Response) => {
        const emp_info = employeeOf(res);
        const [is_branch_manager, duty_settings] = await Promise.all([
            isBranchManager(emp_info),
            getEmployeeDutySettings(emp_info.branch_id, emp_info.id)
        ]);
        res.json({ code: 200, message: "success", data: { is_branch_manager, duty_settings } });
    }
}
export default attendanceController;
