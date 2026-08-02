import { serviceNotAcceptable, successResponse } from "../../services/response";
import dynamicPageModel, {dFormSubmissionsModel} from "../../mongo-schema/coll_pages";
import patientEnquiresModel from "../../mongo-schema/coll_patient_enquires";
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
    },
    getPrimeEnquiriesList: async (params: { status?: string }) => {
        try {
            let query: any = {};
            if (params.status) {
                query.status = params.status;
            }
            const enquiries = await patientEnquiresModel.find(query)
                .sort({ create_time: -1 })
                .lean();
            return successResponse(enquiries, "Prime enquiries fetched successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    updatePrimeEnquiry: async (params: { id: string, resolution_note: string, responded_by_emp_id: number }) => {
        try {
            let doc = await patientEnquiresModel.findById(params.id);
            if (!doc) {
                return serviceNotAcceptable("Enquiry not found");
            }
            if (doc.status !== "open") {
                return serviceNotAcceptable("Only an open enquiry can be responded to");
            }
            // Staff can respond, but only the patient can move this to "resolved".
            doc.resolution_note = params.resolution_note;
            doc.responded_by_emp_id = params.responded_by_emp_id;
            doc.responded_at = new Date();
            await doc.save();
            return successResponse(null, "Response saved");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    cancelPrimeEnquiry: async (params: { id: string }) => {
        try {
            let doc = await patientEnquiresModel.findById(params.id);
            if (!doc) {
                return serviceNotAcceptable("Enquiry not found");
            }
            if (doc.status !== "open") {
                return serviceNotAcceptable("Only an open enquiry can be cancelled");
            }
            doc.status = "cancelled";
            doc.cancelled_by = "staff";
            doc.cancelled_at = new Date();
            await doc.save();
            return successResponse(null, "Enquiry cancelled");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    getPrimeEnquiryWatchers: async () => {
        let rows = await DB.get_rows<{ id: number, city: string | null, value: string }>("select id, city, value from config where `key`=? order by city", ["prime_enquiry_watcher_email"]);
        return successResponse(rows, "Watcher emails fetched successfully");
    },
    addPrimeEnquiryWatcher: async (params: { city: string | null, email: string }) => {
        let insertRes: any = await DB.query("insert into config set city=?,`key`=?,value=?", [params.city, "prime_enquiry_watcher_email", params.email]);
        if (insertRes.affectedRows >= 1) {
            return successResponse({ id: insertRes.insertId }, "Watcher email added successfully");
        }
        return serviceNotAcceptable("Failed to add watcher email");
    },
    deletePrimeEnquiryWatcher: async (id: number) => {
        let deleteRes: any = await DB.query("delete from config where id=? and `key`=?", [id, "prime_enquiry_watcher_email"]);
        if (deleteRes.affectedRows >= 1) {
            return successResponse(null, "Watcher email removed successfully");
        }
        return serviceNotAcceptable("Watcher email not found");
    }
}
export default enquiryModel;