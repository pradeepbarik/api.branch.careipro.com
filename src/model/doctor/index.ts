import { get_current_datetime } from "../../services/datetime";
import { ILoggedinEmpInfo } from "../../types"

const doctorModel = {
    addNewDoctor: async (params: {
        business_type: string,
        partner_type: string,
        clinic_id: number,
        doctor_name: string,
        contact_no: string,
        position: string,
        qualification: string,
        reg_no?: string,
        years_of_experience?: number,
        gender: string,
        consultation_fee?: number,
        medicine_category?: string,
        about_doctor?: string,
        other_information:string,
        profile_pic?: any,
        state: string,
        state_code: string,
        dist: string,
        dist_code: string,
        market: string,
        area_name: string,
        location: string,
        latitude?: string,
        longitude?: string,
        seo_url: string,
        clinic_name: string,
        branch_city: string,
        branch_id: number
    }, emp_info: ILoggedinEmpInfo) => {
        try {
            if (params.clinic_id > 0) {
                let clinicInfo = await DB.get_row<{name:string,location:string,market_name:string,state:string,city:string}>("select name,location,city,locality,location_lat,location_lng,state,market_name,partner_type,business_type from clinics where id=? and city=?", [params.clinic_id, params.branch_city]);
                if (!clinicInfo) {
                    throw new Error("invalid clinic id");
                }
                params.clinic_name = clinicInfo.name;
                params.location = clinicInfo.location;
                params.market = clinicInfo.market_name;
                params.state = clinicInfo.state;
                params.dist= clinicInfo.city;
            }
            let doctor: any = await DB.get_row("select count(1) as cnt from doctor where city=? and seo_url=?", [params.dist, params.seo_url]);
            if (doctor.cnt >= 1) {
                throw new Error("page url is not available! Please choose some othe name");
            }
            let now = get_current_datetime();
            let q = "insert into doctor set name=?,gender=?,experience=?,position=?,clinic_id=?,branch_id=?,seo_url=?,active=-5,registration_no=?,entry_time=?,city=?,qualification_disp=?,business_type=?,market_name=?,partner_type=?"
            let insert_res: any = await DB.query(q, [params.doctor_name, params.gender, params.years_of_experience || 0, params.position, params.clinic_id, params.branch_id, params.seo_url, params.reg_no || "000000", now, params.dist, params.qualification, params.business_type, params.market, params.partner_type]);
            if (!insert_res) {
                throw new Error('Something went wrong ! Please contact with support team');
            }
            const doctor_id = insert_res.insertId;
            DB.query("insert into doctor_detail set doctor_id=?,register_time=?,register_by='employee',register_by_id=?,other_information=?", [doctor_id, now, emp_info.id, params.other_information||""]);
            insert_res = await DB.query("insert into doctor_service_location set doctor_id=?,clinic=?,clinic_id=?,city=?,place=?,location=?,contact_no=?,location_lat=?,location_lng=?,service_charge=?,active=-5", [
                doctor_id, params.clinic_name || "", params.clinic_id, params.dist, params.area_name, params.location, params.contact_no, params.latitude, params.longitude, params.consultation_fee||0
            ]);
            if (insert_res.affectedRows === 1) {
                const dslid = insert_res.insertId;
                DB.query("insert into doctor_servicelocation_setting (doctor_id,service_location_id,payment_type) values (?,?,?)", [
                    doctor_id, dslid, 'at_clinic'
                ]);
            }
            return {
                error: 0,
                data: { doctor_id: doctor_id },
                message: 'Doctor added successfully'
            }
        } catch (e: any) {
            return {
                error: 1,
                data: null,
                message: e.message || 'Something went wrong! Please contact with support team'
            }
        }
    }
}
export default doctorModel;