import { serviceNotAcceptable, successResponse } from "../../services/response";

const enquiryModel = {
    getEnquiryList: async (params: {
        city: string,
        from_date?: string,
        to_date?: string,
        vertical?: string,
        status?: string
    }) => {
        let q = "select * from enquiry where city=?";
        let sqlParams: any[] = [params.city];
        if (params.vertical) {
            q += " and vertical=?";
            sqlParams.push(params.vertical);
        }
        if (params.status) {
            q += " and enquiry_status=?";
            sqlParams.push(params.status);
        }
        if (params.from_date && params.to_date) {
            q += " and date(create_time) between ? and ?";
            sqlParams.push(params.from_date, params.to_date);
        }
        q += ` order by id desc`;
        let rows = await DB.get_rows(q, sqlParams);
        return rows;
    },
    updateEnquiryStatus: async (data: { enquiry_id: number, status: string, emp_id: number, emp_name: string, comments: string }) => {
        try {
            let row = await DB.get_row<{ logs: string, enquiry_status: string }>("select logs,enquiry_status from enquiry where id=?", [data.enquiry_id]);
            if (!row) {
                throw new Error("Enquiry not found");
            }
            let logs = row.logs ? JSON.parse(row.logs) : [];
            if (data.status) {
                logs.push({
                    updated_by_emp_id: data.emp_id,
                    updated_by_emp_name: data.emp_name,
                    action: "Status changed",
                    action_time: new Date().toISOString(),
                    message: "Status changed from " + row.enquiry_status + " to " + data.status,
                    comments: data.comments
                });
                let q = "update enquiry set enquiry_status=?,logs=? where id=?";
                let sqlParams = [data.status, JSON.stringify(logs), data.enquiry_id];
                await DB.query(q, sqlParams);
            }else if(data.comments){
                logs.push({
                    updated_by_emp_id: data.emp_id,
                    updated_by_emp_name: data.emp_name,
                    action: "Comment added",
                    action_time: new Date().toISOString(),
                    message: "Comment added",
                    comments: data.comments
                });
                let q = "update enquiry set logs=? where id=?";
                let sqlParams = [JSON.stringify(logs), data.enquiry_id];
                await DB.query(q, sqlParams);
            }
            return successResponse(null, "enquiry status updated");
        } catch (err: any) {
            return serviceNotAcceptable(err.message)
        }
    }
}
export default enquiryModel;