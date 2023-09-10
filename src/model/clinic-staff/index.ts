import { successResponse, serviceNotAcceptable, internalServerError } from '../../services/response';
import { get_current_datetime } from '../../services/datetime';
type staffListParams = {
    branch_id: number,
    clinic_id: number
}
export const staffList = async (params: staffListParams) => {
    let rows = await DB.get_rows(`select t1.*,t2.clinic_name from (
        select clinic_id,mobile,name,join_date,status,role,token,email,user_id,clinic_staff_type from clinic_staffs where clinic_id=?
        ) as t1 join (
        select id,name as clinic_name from clinics where id=? and branch_id=?
        ) as t2 on t1.clinic_id=t2.id order by FIELD(t1.clinic_staff_type,'registered','non_registered')`, [params.clinic_id, params.clinic_id, params.branch_id]);
    return successResponse(rows);
}
type TAddClinicStaffParam = {
    clinic_id: number,
    mobile_no: number,
    email: string,
    name: string,
    status: 'active' | 'in_active',
    password: string,
    role: 'admin' | 'staff',
    clinic_staff_type:'registered'|'non_registered'
}
export const addClinicStaff = async (params: TAddClinicStaffParam) => {
    let now = get_current_datetime();
    if(params.clinic_staff_type==='non_registered'){
        let insertRes:any = await DB.query("INSERT IGNORE INTO clinic_staffs set clinic_id=?,mobile=?,name=?,join_date=?,clinic_staff_type=?",[params.clinic_id,params.mobile_no,params.name,now,params.clinic_staff_type]);
        if(insertRes.affectedRows>=1){
            return successResponse(null,"Clinic staff registered successfully");
        }else{
            return serviceNotAcceptable("Mobile no already exist");
        }
    }
    let clinic_staff = await DB.get_row("select status from clinic_staffs where mobile=? and status='active'", [params.mobile_no]);
    if (clinic_staff) {
        return serviceNotAcceptable("mobile no already registered with a clinic");
    }
    try{
        let user: any = await DB.get_row("select id,user_type,is_clinic_owner,clinic_id from users where mobile=? limit 1", [params.mobile_no]);
        let userid = '';
        let is_clinic_owner = params.role === 'admin' ? 1 : 0;
        if (!user) {
            let insertRes: any = await DB.query("insert into users set firstname=?,lastname='',mobile=?,user_type=?,is_clinic_owner=?,clinic_id=?", [params.name, params.mobile_no, 'clinic_staff', is_clinic_owner, params.clinic_id]);
            userid = insertRes.insertId;
            DB.query("insert into user_detail set user_id=?,signup_date=?",[userid,now]);
        } else {
            userid = user.id;
            await DB.query("update users set user_type=?,is_clinic_owner=?,clinic_id=? where id=?", ['clinic_staff', is_clinic_owner, params.clinic_id,userid]);
        }
        await DB.query("insert into clinic_staffs set clinic_id=?,mobile=?,name=?,join_date=?,status=?,password=md5(?),role=?,user_id=?,clinic_staff_type=?", [params.clinic_id, params.mobile_no, params.name,now,params.status,params.password,params.role,userid,params.clinic_staff_type]);
        return successResponse(null,"Clinic staff registered successfully")
    }catch(err:any){
        return internalServerError(err.message);
    }
}