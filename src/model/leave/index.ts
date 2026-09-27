import getEmployeeLeaveRequestModel from '../../management-mongo-schema/employee-leave-requests';
import getEmployeeAttendanceModel from '../../management-mongo-schema/employee-attendance';
import { successResponse, serviceNotAcceptable, Iresponse } from '../../services/response';
import { moment } from '../../services/datetime';
import { TMarkedByInfo } from '../attendance';

const datesBetween = (from_date: string, to_date: string) => {
    const dates: string[] = [];
    const last = moment(to_date);
    let current = moment(from_date);
    while (current.isSameOrBefore(last, 'day')) {
        dates.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
    }
    return dates;
}

//kept only when the whole leave went one way, a split leave is read from paid_days and lop_days
const resolvedLeaveType = (paid_days: number, lop_days: number) => {
    return lop_days === 0 ? 'paid_leave' : paid_days === 0 ? 'lop' : undefined;
}

type TApplyLeaveParams = {
    branch_id: number,
    emp_id: number,
    emp_code: string,
    emp_name: string,
    department_id?: number,
    from_date: string,
    to_date: string,
    reason: string
}

export const applyLeave = async (params: TApplyLeaveParams): Promise<Iresponse<any>> => {
    if (moment(params.to_date).isBefore(moment(params.from_date), 'day')) {
        return serviceNotAcceptable("To date can not be before from date");
    }
    const LeaveRequestModel = getEmployeeLeaveRequestModel();
    const dates = datesBetween(params.from_date, params.to_date);
    //an employee should not have two live requests on the same days
    const overlapping = await LeaveRequestModel.findOne({
        branch_id: params.branch_id,
        emp_id: params.emp_id,
        status: { $in: ['pending', 'approved'] },
        from_date: { $lte: params.to_date },
        to_date: { $gte: params.from_date }
    }).lean().exec();
    if (overlapping) {
        return serviceNotAcceptable("A leave request already exists for these dates");
    }
    const request = await LeaveRequestModel.create({
        branch_id: params.branch_id,
        emp_id: params.emp_id,
        emp_code: params.emp_code,
        emp_name: params.emp_name,
        department_id: params.department_id,
        from_date: params.from_date,
        to_date: params.to_date,
        days: dates.length,
        reason: params.reason,
        status: 'pending'
    });
    return successResponse(request, "Leave request submitted successfully");
}

export const myLeaves = async (params: { branch_id: number, emp_id: number }): Promise<Iresponse<any>> => {
    const LeaveRequestModel = getEmployeeLeaveRequestModel();
    const rows = await LeaveRequestModel
        .find({ branch_id: params.branch_id, emp_id: params.emp_id })
        .sort({ from_date: -1 })
        .lean()
        .exec();
    return successResponse(rows);
}

export const leaveRequests = async (params: { branch_id: number, status?: string, department_id?: number }): Promise<Iresponse<any>> => {
    const LeaveRequestModel = getEmployeeLeaveRequestModel();
    const filter: any = { branch_id: params.branch_id };
    if (params.status) {
        filter.status = params.status;
    }
    if (params.department_id) {
        filter.department_id = params.department_id;
    }
    const rows = await LeaveRequestModel.find(filter).sort({ status: 1, from_date: -1 }).lean().exec();
    return successResponse(rows);
}

/**
 * Approving writes one attendance record per leave day so the monthly counts pick it up.
 * A day the employee actually worked is left untouched, its worked hours must not be replaced by
 * a leave, and the manager is told how many such days were skipped.
 */
export const reviewLeave = async (params: { branch_id: number, leave_id: string, reviewed_by: TMarkedByInfo, action: 'approve' | 'reject', paid_days?: number, admin_remark?: string }): Promise<Iresponse<any>> => {
    const LeaveRequestModel = getEmployeeLeaveRequestModel();
    const AttendanceModel = getEmployeeAttendanceModel();
    const request: any = await LeaveRequestModel.findOne({ _id: params.leave_id, branch_id: params.branch_id }).exec();
    if (!request) {
        return serviceNotAcceptable("Leave request not found");
    }
    if (request.status !== 'pending') {
        return serviceNotAcceptable(`This leave request is already ${request.status}`);
    }
    if (params.action === 'reject') {
        request.status = 'rejected';
        request.admin_remark = params.admin_remark || '';
        request.reviewed_by = params.reviewed_by;
        request.reviewed_at = new Date();
        request.updated_at = new Date();
        await request.save();
        return successResponse({ request, marked_days: 0, skipped_days: 0 }, "Leave request rejected");
    }
    const paidDays = typeof params.paid_days === 'number' ? params.paid_days : 0;
    if (paidDays < 0 || paidDays > request.days) {
        return serviceNotAcceptable(`Paid days must be between 0 and ${request.days}`);
    }
    //the first paid days of the range are paid, whatever is left of the leave is loss of pay
    let paidRemaining = paidDays;
    let marked_days = 0;
    let skipped_days = 0;
    let markedPaid = 0;
    let markedLop = 0;
    for (const date of datesBetween(request.from_date, request.to_date)) {
        const attendance: any = await AttendanceModel.findOne({ branch_id: params.branch_id, emp_id: request.emp_id, date: date }).lean().exec();
        //a day the employee actually worked keeps its hours and does not consume a paid day
        if (attendance && (attendance.duty_hour_logs || []).length > 0) {
            skipped_days += 1;
            continue;
        }
        const dayType = paidRemaining > 0 ? 'paid_leave' : 'lop';
        if (paidRemaining > 0) {
            paidRemaining -= 1;
            markedPaid += 1;
        } else {
            markedLop += 1;
        }
        await AttendanceModel.findOneAndUpdate(
            { branch_id: params.branch_id, emp_id: request.emp_id, date: date },
            {
                $set: {
                    emp_code: request.emp_code,
                    department_id: request.department_id,
                    status: dayType,
                    leave_reason: request.reason,
                    source: 'admin',
                    marked_by: params.reviewed_by,
                    updated_at: new Date()
                },
                $setOnInsert: { created_at: new Date() }
            },
            { upsert: true }
        ).exec();
        marked_days += 1;
    }
    request.status = 'approved';
    request.paid_days = markedPaid;
    request.lop_days = markedLop;
    request.leave_type = resolvedLeaveType(markedPaid, markedLop);
    request.admin_remark = params.admin_remark || '';
    request.reviewed_by = params.reviewed_by;
    request.reviewed_at = new Date();
    request.updated_at = new Date();
    await request.save();
    return successResponse({ request, marked_days, skipped_days }, "Leave request approved");
}

/**
 * Takes one day back from an approved leave, used when the employee turned up on a day that was
 * already granted as leave. Only the request is corrected here, the attendance of that day is
 * rewritten by the caller, so the worked hours and the leave counts never disagree.
 * Returns null when no approved leave covers the day, a leave day a manager wrote by hand has no
 * request behind it and there is nothing to correct.
 */
export const cancelApprovedLeaveDay = async (params: { branch_id: number, emp_id: number, date: string, was_paid: boolean }) => {
    const LeaveRequestModel = getEmployeeLeaveRequestModel();
    const request: any = await LeaveRequestModel.findOne({
        branch_id: params.branch_id,
        emp_id: params.emp_id,
        status: 'approved',
        from_date: { $lte: params.date },
        to_date: { $gte: params.date }
    }).exec();
    if (!request) {
        return null;
    }
    if ((request.cancelled_dates || []).includes(params.date)) {
        return request;
    }
    request.cancelled_dates = [...(request.cancelled_dates || []), params.date].sort();
    if (params.was_paid) {
        request.paid_days = Math.max(0, (request.paid_days || 0) - 1);
    } else {
        request.lop_days = Math.max(0, (request.lop_days || 0) - 1);
    }
    request.leave_type = resolvedLeaveType(request.paid_days, request.lop_days);
    //nothing of the leave stands any more once every granted day has been taken back
    if (request.paid_days === 0 && request.lop_days === 0) {
        request.status = 'cancelled';
        request.leave_type = undefined;
    }
    request.updated_at = new Date();
    await request.save();
    return request;
}
