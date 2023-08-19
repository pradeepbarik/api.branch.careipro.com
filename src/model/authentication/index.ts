import { encrypt, decrypt } from '../../services/encryption';
import { moment, formatDateTime } from '../../services/datetime';
import { successResponse, unauthorizedResponse, Iresponse } from '../../services/response';
export interface ILoginParams {
    user_name: string;
    password: string;
    branch_id: number;
    IP: string;
}
type LoginResponse = {
    token: string,
    emp_id: number,
    emp_code: string,
    first_name: string,
    last_name: string,
    photo: string,
    mob_no: number,
    email_id: string,
    status: string,
    branch_id: number,
    branch_name: string,
    branch_dist: string,
    branch_state: string,
    branch_location: string,
    dept_id: number,
    dept_name: string,
    dept_code: string

}
export const login = async (params: ILoginParams): Promise<Iresponse<LoginResponse | null>> => {
    let employee: any = await DB.get_row(`select employee.*,branch.name as branch_name,branch.district as branch_dist,branch.state as branch_state,branch.location as branch_location,dept.name as dept_name,dept.department_code as dept_code from (
        select id as emp_id,first_name,last_name,emp_code,branch_id,department_id as dept_id,photo,mobile_no as mob_no,email_id,status from employee where username=? and password=md5(?) and branch_id=?
        ) as employee join branch on employee.branch_id=branch.id join department as dept on employee.dept_id=dept.id`, [params.user_name, params.password, params.branch_id]);
    if (employee) {
        let token = encrypt(JSON.stringify({
            log_ip: params.IP,
            eid: employee.emp_id,
            ec: employee.emp_code,
            es: employee.status,
            bid: employee.branch_id,
            did: employee.dept_id,
            dc: employee.dept_code,
            mob: employee.mob_no,
            bs: employee.branch_state,
            bd: employee.branch_dist,
            gt: formatDateTime(moment()),
        }))
        let result: LoginResponse = {
            token: token,
            emp_id: employee.emp_id,
            emp_code: employee.emp_code,
            first_name: employee.first_name,
            last_name: employee.last_name,
            photo: employee.photo,
            mob_no: employee.mob_no,
            email_id: employee.email_id,
            status: employee.status,
            branch_id: employee.branch_id,
            branch_name: employee.branch_name,
            branch_dist: employee.branch_dist,
            branch_state: employee.branch_state,
            branch_location: employee.branch_location,
            dept_id: employee.dept_id,
            dept_name: employee.dept_name,
            dept_code: employee.dept_code
        };
        return successResponse(result)
    } else {
        return unauthorizedResponse("Invalid login credentials");
    }
}
