import moment, { get_current_datetime } from "../../services/datetime";
export interface IbookedAppointmentsParams {
    date?: string,
    fromdate: string,
    todate: string,
    clinic_id: number,
    doctor_id?: number
}
export const bookedAppointments = async (params: IbookedAppointmentsParams) => {
    try {
        if (moment(params.todate).diff(moment(params.fromdate), 'months') > 3) {
            return [];
        }
        let q = "select * from booking where clinic_id=?";
        const conditions: Array<string | number> = [params.clinic_id];
        if (params.doctor_id && params.doctor_id > 0) {
            q += " and doctor_id=?";
            conditions.push(params.doctor_id)
        }
        if (params.date) {
            q += " and date(booking_time)=?";
            conditions.push(params.date)
        }
        if (params.fromdate) {
            q += " and date(booking_time)>=?";
            conditions.push(params.fromdate)
        }
        if (params.todate) {
            q += " and date(booking_time)<=?";
            conditions.push(params.todate)
        }
        q = `select bookings.*,doctor.name as doctor_name,concat(users.firstname,' ',users.lastname) as booked_by_user_name from (${q}) as bookings join doctor on bookings.doctor_id=doctor.id join users on bookings.userid=users.id order by date(bookings.booking_time),bookings.doctor_id,bookings.display_order`;
        let rows = await DB.get_rows<{ booking_time: string }>(q, conditions);
        if (rows) {
            return rows;
        }
        return [];
    } catch (err: any) {
        return [];
    }
}
interface IFilter {
    name?: string;
    mobile?: string;
    location?: string;
    date?: string;
    fromdate?: string;
    todate?: string;
    consult_status?: Array<string | number>;
    service_location_ids?: Array<number>;
    page?: number;
    doctor_id?: number
}
export const getAppointmentsList = async (clinic_id: number, params: IFilter) => {
    try {
        let filter_text: string = "";
        let q = "select * from booking where clinic_id=?";
        const conditions: Array<string | number> = [clinic_id];
        if (params.mobile || params.name || params.location) {
            if (params.mobile) {
                q += " and patient_mobile=?";
                conditions.push(params.mobile);
            }
            if (params.name) {
                q += " and patient_name=?";
                conditions.push(params.name);
            }
            if (params.location) {
                q += " and patient_address=?";
                conditions.push(params.location);
            }
        } else {

        }
        if (params.date) {
            q += " and date(consult_date)=?";
            conditions.push(params.date);
        }
        if (params.fromdate && params.todate) {
            q += " and date(consult_date)>=? and date(consult_date)<=?";
            conditions.push(params.fromdate);
            conditions.push(params.todate);
        }
        if (params.fromdate && !params.todate) {
            q += " and date(consult_date)>=?";
            conditions.push(params.fromdate);
        }
        if (!params.fromdate && !params.todate && !params.mobile && !params.name && !params.location && !params.date) {
            q += " and date(consult_date)=?";
            let today = get_current_datetime(true);
            conditions.push(today);
            filter_text = "Today's Patients for consultation";
        }
        if (params.consult_status && params.consult_status.length > 0) {
            let status_str = params.consult_status.join("','");
            q += " and `status` in ('" + status_str + "')";
        }
        if (params.service_location_ids && params.service_location_ids?.length > 0) {
            let doctor_id_str = params.service_location_ids.join(",")
            q += " and `servicelocation_id` in (" + doctor_id_str + ")";
        }
        if (params.doctor_id) {
            q += " and doctor_id=?";
            conditions.push(params.doctor_id);
        }
        q += " and is_auto_filled!=1";
        q = `select bookings.*,round(bookings.patient_paid_amount) as patient_paid_amount,doctor.name as doctor_name,concat(users.firstname,' ',users.lastname) as booked_by_user_name,users.mobile as booked_by_user_mobile from (${q}) as bookings join doctor on bookings.doctor_id=doctor.id join users on bookings.userid=users.id order by date(bookings.consult_date),bookings.doctor_id,bookings.display_order`;
        let rows: any = await DB.get_rows(q, conditions);
        return { appointments: rows, filter_text: filter_text };
    } catch (err: any) {
        return { appointments: [], filter_text: "" };
    }
}