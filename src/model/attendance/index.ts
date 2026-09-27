import getEmployeeAttendanceModel from '../../management-mongo-schema/employee-attendance';
import getEmployeeDutySettingsModel from '../../management-mongo-schema/employee-duty-settings';
import { successResponse, serviceNotAcceptable, Iresponse } from '../../services/response';
import { get_current_datetime, moment } from '../../services/datetime';
import { cancelApprovedLeaveDay } from '../leave';

//used when neither the employee nor the branch has configured its own duty rules
export const DEFAULT_DUTY_SETTINGS = {
    working_start_time: '10:00',
    working_end_time: '19:00',
    daily_working_hours: 8,
    full_day_min_hours: 6,
};
export type TDutySettings = typeof DEFAULT_DUTY_SETTINGS;

export type TMarkedByInfo = { emp_id: number, emp_code: string, name: string };

/**
 * Resolves the duty rules for one employee, employee document first, then the branch default
 * document at emp_id 0, then the built in defaults. Every field falls back on its own so a branch
 * can override a single rule without repeating the rest.
 */
export const getEmployeeDutySettings = async (branch_id: number, emp_id: number): Promise<TDutySettings> => {
    const DutySettingsModel = getEmployeeDutySettingsModel();
    const documents = await DutySettingsModel
        .find({ branch_id: branch_id, emp_id: { $in: [emp_id, 0] } })
        .lean()
        .exec();
    const empSettings: any = documents.find((doc: any) => doc.emp_id === emp_id) || {};
    const branchSettings: any = documents.find((doc: any) => doc.emp_id === 0) || {};
    const resolved: any = { ...DEFAULT_DUTY_SETTINGS };
    (Object.keys(DEFAULT_DUTY_SETTINGS) as Array<keyof TDutySettings>).forEach((key) => {
        if (empSettings[key] !== undefined && empSettings[key] !== null && empSettings[key] !== '') {
            resolved[key] = empSettings[key];
        } else if (branchSettings[key] !== undefined && branchSettings[key] !== null && branchSettings[key] !== '') {
            resolved[key] = branchSettings[key];
        }
    });
    return resolved;
}

export const saveEmployeeDutySettings = async (params: { branch_id: number, emp_id: number, updated_by: TMarkedByInfo, settings: Partial<TDutySettings> }): Promise<Iresponse<any>> => {
    const DutySettingsModel = getEmployeeDutySettingsModel();
    const document = await DutySettingsModel.findOneAndUpdate(
        { branch_id: params.branch_id, emp_id: params.emp_id },
        { $set: { ...params.settings, updated_by: params.updated_by, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
        { upsert: true, new: true }
    ).exec();
    return successResponse(document, "Duty settings saved successfully");
}

export const listDutySettings = async (branch_id: number): Promise<Iresponse<any>> => {
    const DutySettingsModel = getEmployeeDutySettingsModel();
    const rows = await DutySettingsModel.find({ branch_id: branch_id }).lean().exec();
    return successResponse({ defaults: DEFAULT_DUTY_SETTINGS, settings: rows });
}

type TMarkDutyParams = {
    branch_id: number,
    emp_id: number,
    emp_code: string,
    department_id?: number,
    lat?: number,
    lng?: number,
    accuracy?: number
}

//a running session is the last log that has no end time yet
const runningLog = (attendance: any) => (attendance?.duty_hour_logs || []).find((log: any) => !log.end_time) || null;
//total minutes of every completed session of the day
const totalWorkedMinutes = (attendance: any) => (attendance?.duty_hour_logs || [])
    .reduce((total: number, log: any) => total + (log.duration || 0), 0);

//the marked location is recorded for the record, an employee is never blocked on where they are
const markedLocation = (params: TMarkDutyParams) => {
    if (typeof params.lat !== 'number' || typeof params.lng !== 'number') {
        return undefined;
    }
    return { lat: params.lat, lng: params.lng, accuracy: params.accuracy };
}

export const startDuty = async (params: TMarkDutyParams): Promise<Iresponse<any>> => {
    const AttendanceModel = getEmployeeAttendanceModel();
    const date = get_current_datetime(true);
    let attendance: any = await AttendanceModel.findOne({ branch_id: params.branch_id, emp_id: params.emp_id, date: date }).exec();
    //an employee works the day in parts, so a new session can be started as long as none is running
    if (runningLog(attendance)) {
        return serviceNotAcceptable("Duty is already started, please end the running duty first");
    }
    const now = get_current_datetime();
    const location = markedLocation(params);
    if (!attendance) {
        attendance = new AttendanceModel({
            branch_id: params.branch_id,
            emp_id: params.emp_id,
            emp_code: params.emp_code,
            department_id: params.department_id,
            date: date,
            check_in_time: now,
            check_in_location: location,
            source: 'self'
        });
    }
    //check_in_time and check_in_location stay on the first session of the day
    if (!attendance.check_in_time) {
        attendance.check_in_time = now;
        attendance.check_in_location = location;
    }
    attendance.duty_hour_logs.push({ start_time: now });
    //a running session means the employee is on duty again, the previous check out no longer stands
    attendance.check_out_time = undefined;
    attendance.status = 'working';
    attendance.updated_at = new Date();
    await attendance.save();
    return successResponse(attendance, "Duty started successfully");
}

export const endDuty = async (params: TMarkDutyParams): Promise<Iresponse<any>> => {
    const AttendanceModel = getEmployeeAttendanceModel();
    const date = get_current_datetime(true);
    const attendance: any = await AttendanceModel.findOne({ branch_id: params.branch_id, emp_id: params.emp_id, date: date }).exec();
    const openLog = runningLog(attendance);
    if (!openLog) {
        return serviceNotAcceptable("Duty is not started, please start the duty first");
    }
    const dutySettings = await getEmployeeDutySettings(params.branch_id, params.emp_id);
    const now = get_current_datetime();
    openLog.end_time = now;
    //duration of one session in minutes
    openLog.duration = moment(now).diff(moment(openLog.start_time), 'minutes');
    attendance.check_out_time = now;
    attendance.check_out_location = markedLocation(params);
    //the day can be worked in parts, so the status comes from the total of every session
    const workedHours = totalWorkedMinutes(attendance) / 60;
    attendance.status = workedHours >= dutySettings.full_day_min_hours ? 'full_day' : 'half_day';
    attendance.updated_at = new Date();
    await attendance.save();
    return successResponse(attendance, "Duty ended successfully");
}

const minutesOfDay = (dateTime: string) => {
    const time = moment(dateTime);
    return time.hours() * 60 + time.minutes();
}
const configuredMinutes = (hhmm: string) => {
    const [hours, minutes] = (hhmm || '').split(':').map((value) => parseInt(value));
    return isNaN(hours) ? 0 : hours * 60 + (minutes || 0);
}
/**
 * Adds the late start and early leave of a day against the configured shift. Computed on read
 * so a change in the shift timing reflects on the earlier days too, a day is only counted late
 * once the duty has started and early only once the duty has ended.
 */
const withShiftDeviation = (attendance: any, settings: TDutySettings) => {
    const shiftStart = configuredMinutes(settings.working_start_time);
    const shiftEnd = configuredMinutes(settings.working_end_time);
    const dutyRunning = !!runningLog(attendance);
    const late_by_minutes = attendance.check_in_time && shiftStart
        ? Math.max(0, minutesOfDay(attendance.check_in_time) - shiftStart)
        : 0;
    const early_exit_by_minutes = (attendance.check_out_time && !dutyRunning && shiftEnd)
        ? Math.max(0, shiftEnd - minutesOfDay(attendance.check_out_time))
        : 0;
    return { ...attendance, late_by_minutes, early_exit_by_minutes };
}

const emptySummary = () => ({
    worked_minutes: 0, full_days: 0, half_days: 0, leaves: 0, open_days: 0,
    late_days: 0, late_minutes: 0, early_exit_days: 0, early_exit_minutes: 0
});

const summarise = (attendances: any[]) => attendances.reduce((totals: any, attendance: any) => {
    totals.worked_minutes += totalWorkedMinutes(attendance);
    if (attendance.status === 'full_day') totals.full_days += 1;
    if (attendance.status === 'half_day') totals.half_days += 1;
    if (attendance.status === 'paid_leave' || attendance.status === 'lop') totals.leaves += 1;
    if (attendance.status === 'working') totals.open_days += 1;
    //days the employee started after the shift start or left before the shift end
    if (attendance.late_by_minutes > 0) {
        totals.late_days += 1;
        totals.late_minutes += attendance.late_by_minutes;
    }
    if (attendance.early_exit_by_minutes > 0) {
        totals.early_exit_days += 1;
        totals.early_exit_minutes += attendance.early_exit_by_minutes;
    }
    return totals;
}, emptySummary());

const attendancesOf = async (params: { branch_id: number, emp_id: number, date_from: string, date_to: string }) => {
    const AttendanceModel = getEmployeeAttendanceModel();
    const [rows, duty_settings] = await Promise.all([
        AttendanceModel
            .find({ branch_id: params.branch_id, emp_id: params.emp_id, date: { $gte: params.date_from, $lte: params.date_to } })
            .sort({ date: -1 })
            .lean()
            .exec(),
        getEmployeeDutySettings(params.branch_id, params.emp_id)
    ]);
    return { attendances: rows.map((attendance: any) => withShiftDeviation(attendance, duty_settings)), duty_settings };
}

export const myAttendance = async (params: { branch_id: number, emp_id: number, date_from: string, date_to: string }): Promise<Iresponse<any>> => {
    const { attendances, duty_settings } = await attendancesOf(params);
    return successResponse({ attendances, duty_settings, summary: summarise(attendances) });
}

/**
 * Attendance of one employee for the branch manager, along with the totals needed to verify the
 * working hours, and the duty rules that were applied to that employee.
 */
export const employeeAttendance = async (params: { branch_id: number, emp_id: number, date_from: string, date_to: string }): Promise<Iresponse<any>> => {
    const { attendances, duty_settings } = await attendancesOf(params);
    return successResponse({ attendances, duty_settings, summary: summarise(attendances) });
}

/**
 * One day of the whole branch, what the manager opens to see who is on duty today. Employees with
 * no attendance record for the day are listed too, so an absence is as visible as a marked duty.
 */
export const branchDayAttendance = async (params: { branch_id: number, date: string, department_id?: number }): Promise<Iresponse<any>> => {
    const AttendanceModel = getEmployeeAttendanceModel();
    let query = "select employee.id as emp_id,employee.emp_code,concat(first_name,' ',last_name) as name,employee.department_id,department.name as department from employee join department on employee.department_id=department.id where employee.branch_id=? and employee.status='active'";
    const queryParams: Array<string | number> = [params.branch_id];
    if (params.department_id) {
        query += " and employee.department_id=?";
        queryParams.push(params.department_id);
    }
    const [employees, rows] = await Promise.all([
        DB.get_rows(`${query} order by name`, queryParams),
        AttendanceModel.find({ branch_id: params.branch_id, date: params.date }).lean().exec()
    ]);
    const attendanceByEmployee: Record<string, any> = {};
    rows.forEach((attendance: any) => {
        attendanceByEmployee[String(attendance.emp_id)] = attendance;
    });
    const employeeDays = employees.map((employee: any) => {
        const attendance = attendanceByEmployee[String(employee.emp_id)] || null;
        return {
            ...employee,
            //null status means nothing was marked for the day at all
            status: attendance?.status || null,
            check_in_time: attendance?.check_in_time || null,
            check_out_time: attendance?.check_out_time || null,
            worked_minutes: totalWorkedMinutes(attendance),
            on_duty: !!runningLog(attendance),
            leave_reason: attendance?.leave_reason || null
        };
    });
    return successResponse({
        date: params.date,
        employees: employeeDays,
        summary: {
            total: employeeDays.length,
            on_duty: employeeDays.filter((day: any) => day.on_duty).length,
            worked: employeeDays.filter((day: any) => day.status === 'full_day' || day.status === 'half_day').length,
            on_leave: employeeDays.filter((day: any) => day.status === 'paid_leave' || day.status === 'lop').length,
            not_marked: employeeDays.filter((day: any) => day.status === null).length
        }
    });
}

type TAdminMarkAttendanceParams = {
    branch_id: number,
    emp_id: number,
    emp_code: string,
    department_id?: number,
    marked_by: TMarkedByInfo,
    date: string,
    sessions: { start_time: string, end_time: string }[],
    admin_remark?: string
}

/**
 * The branch manager writes the duty hours of one employee for one day. Needed when an employee
 * worked but could not mark it themselves, and when an employee turned up on a day that was already
 * granted as leave, in which case that one day is taken back from the leave request.
 */
export const adminMarkAttendance = async (params: TAdminMarkAttendanceParams): Promise<Iresponse<any>> => {
    if (moment(params.date).isAfter(moment(get_current_datetime(true)), 'day')) {
        return serviceNotAcceptable("Duty hours can not be marked for a future date");
    }
    const logs: { start_time: string, end_time: string, duration: number }[] = [];
    let previousEnd = -1;
    for (const session of params.sessions) {
        const start = configuredMinutes(session.start_time);
        const end = configuredMinutes(session.end_time);
        if (end <= start) {
            return serviceNotAcceptable(`End time ${session.end_time} has to be after the start time ${session.start_time}`);
        }
        //the sessions of a day are added up, overlapping ones would report hours that were never worked
        if (start < previousEnd) {
            return serviceNotAcceptable("Duty sessions of a day can not overlap, please enter them in order");
        }
        previousEnd = end;
        logs.push({
            start_time: `${params.date} ${session.start_time}:00`,
            end_time: `${params.date} ${session.end_time}:00`,
            duration: end - start
        });
    }
    if (!logs.length) {
        return serviceNotAcceptable("Please enter at least one duty session");
    }
    const AttendanceModel = getEmployeeAttendanceModel();
    const existing: any = await AttendanceModel
        .findOne({ branch_id: params.branch_id, emp_id: params.emp_id, date: params.date })
        .lean()
        .exec();
    //a running session is time the employee is still putting in, overwriting it would throw that away
    if (runningLog(existing)) {
        return serviceNotAcceptable("This employee has a duty running on this date, it has to be ended before the hours can be corrected");
    }
    const previousStatus = existing?.status;
    const dutySettings = await getEmployeeDutySettings(params.branch_id, params.emp_id);
    const workedMinutes = logs.reduce((total, log) => total + log.duration, 0);
    const attendance = await AttendanceModel.findOneAndUpdate(
        { branch_id: params.branch_id, emp_id: params.emp_id, date: params.date },
        {
            $set: {
                emp_code: params.emp_code,
                department_id: params.department_id,
                duty_hour_logs: logs,
                check_in_time: logs[0].start_time,
                check_out_time: logs[logs.length - 1].end_time,
                //same rule as an employee ending their own duty, the total of the day decides the status
                status: workedMinutes / 60 >= dutySettings.full_day_min_hours ? 'full_day' : 'half_day',
                source: 'admin',
                marked_by: params.marked_by,
                admin_remark: params.admin_remark || '',
                updated_at: new Date()
            },
            //the day is worked now, whatever leave reason it carried no longer describes it
            $unset: { leave_reason: '' },
            $setOnInsert: { created_at: new Date() }
        },
        { upsert: true, new: true }
    ).exec();
    let leave_cancelled = false;
    if (previousStatus === 'paid_leave' || previousStatus === 'lop') {
        const request = await cancelApprovedLeaveDay({
            branch_id: params.branch_id,
            emp_id: params.emp_id,
            date: params.date,
            was_paid: previousStatus === 'paid_leave'
        });
        leave_cancelled = !!request;
    }
    return successResponse(
        { attendance, leave_cancelled },
        leave_cancelled ? "Duty hours saved, the leave of this day has been cancelled" : "Duty hours saved successfully"
    );
}
