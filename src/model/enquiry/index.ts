import { serviceNotAcceptable, successResponse } from "../../services/response";
import dynamicPageModel, {dFormSubmissionsModel} from "../../mongo-schema/coll_pages";
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
    },
    getDynamicFormSubmissionsList: async (params: {
        state: string,
        city: string,
        from_date?: string,
        to_date?: string,
        page_id?: number,
        section_name?: string,
    }) => {
        try {
            let query: any = {};
            
            if (params.state) {
                query.state = params.state;
            }
            if (params.city) {
                query.city = params.city;
            }
            if (params.page_id) {
                query.page_id = params.page_id;
            }
            if (params.section_name) {
                query.section_name = params.section_name;
            }
            const submissions = await dFormSubmissionsModel.find(query)
                .sort({ submit_time: -1 })
                .lean();
            return successResponse(submissions, "Dynamic form submissions fetched successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    getPagesList: async (params: {
        state?: string,
        city?: string,
        vertical?: string,
    }) => {
        try {
            let query: any = {};
            
            if (params.state) {
                query.state = params.state;
            }
            if (params.city) {
                query.city = params.city;
            }
            if (params.vertical) {
                query.vertical = params.vertical;
            }
            
            const pages = await dynamicPageModel.find(query)
                .select('pageId pageType state city vertical seo_url heading subHeading seoDt')
                .lean();
            
            return successResponse(pages, "Pages fetched successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    }
}
export default enquiryModel;