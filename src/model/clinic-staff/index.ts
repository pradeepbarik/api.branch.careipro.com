import { successResponse, serviceNotAcceptable, internalServerError } from '../../services/response';
import { get_current_datetime } from '../../services/datetime';
import { md5 } from '../../services/encryption';
type staffListParams = {
    branch_id: number,
    clinic_id: number
}
export const staffList = async (params: staffListParams) => {
    let rows = await DB.get_rows(`select t1.*,t2.clinic_name, t3.assigned_doctors from (
        select clinic_id,mobile,name,join_date,status,role,token,email,user_id,clinic_staff_type,display_role from clinic_staffs where clinic_id=?
        ) as t1 left join (select user_id,group_concat(doctor_id) as assigned_doctors from clinic_staff_service_locations where clinic_id=? group by user_id) as t3 on t1.user_id = t3.user_id join (
        select id,name as clinic_name from clinics where id=? and branch_id=?
        ) as t2 on t1.clinic_id=t2.id order by FIELD(t1.clinic_staff_type,'registered','non_registered')`, [params.clinic_id, params.clinic_id, params.clinic_id, params.branch_id]);
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
    display_role: string,
    clinic_staff_type:'registered'|'non_registered',
    assigned_doctors?: number[],
    user_id?: number | null
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
    
    // Update mode - when user_id is provided
    if (params.user_id) {
        try {
            let is_clinic_owner = params.role === 'admin' ? 1 : 0;
            
            // Update clinic staff record
            let updateQuery = "UPDATE clinic_staffs SET name=?, email=?, status=?, role=?,display_role=? ";
            let updateParams: any[] = [params.name, params.email, params.status, params.role, params.display_role];
            
            if (params.password) {
                updateQuery += ", password=? ";
                updateParams.push(md5(params.password));
            }
            
            updateQuery += "WHERE user_id=? AND clinic_id=?";
            updateParams.push(params.user_id, params.clinic_id);
            
            await DB.query(updateQuery, updateParams);
            
            // Update users table
            await DB.query("UPDATE users SET firstname=?, is_clinic_owner=? WHERE id=?", 
                [params.name, is_clinic_owner, params.user_id]);
            
            // Handle assigned doctors
            if (params.assigned_doctors) {
                // Delete existing assignments
                await DB.query("DELETE FROM clinic_staff_service_locations WHERE user_id=? and clinic_id=?", [params.user_id, params.clinic_id]);
                
                // Insert new assignments
                if (params.assigned_doctors.length > 0) {
                    params.assigned_doctors.forEach((doctor_id)=>{
                        DB.query("INSERT INTO clinic_staff_service_locations (user_id, service_location_id,doctor_id,clinic_id) VALUES (?, (select id from doctor_service_location where doctor_id=? and clinic_id=?), ?, ?)", [<number>params.user_id, doctor_id, params.clinic_id, doctor_id, params.clinic_id]);
                    })
                }
            }
            
            return successResponse(null, "Clinic staff updated successfully");
        } catch(err: any) {
            return internalServerError(err.message);
        }
    }
    
    // Add mode - create new staff
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
        await DB.query("insert into clinic_staffs set clinic_id=?,mobile=?,name=?,join_date=?,status=?,password=?,role=?,user_id=?,clinic_staff_type=?", [params.clinic_id, params.mobile_no, params.name,now,params.status,md5(params.password),params.role,userid,params.clinic_staff_type]);
        
        // Handle assigned doctors for new staff
        if (params.assigned_doctors && params.assigned_doctors.length > 0) {
            params.assigned_doctors.forEach((doctor_id)=>{
                DB.query("INSERT INTO clinic_staff_service_locations (user_id, service_location_id,doctor_id,clinic_id) VALUES (?, (select id from doctor_service_location where doctor_id=? and clinic_id=?), ?, ?)", [userid, doctor_id, params.clinic_id, doctor_id, params.clinic_id]);
            })
        }
        return successResponse(null,"Clinic staff registered successfully")
    }catch(err:any){
        return internalServerError(err.message);
    }
}