import { successResponse, parameterMissingResponse } from '../../services/response';
import { TUpdateDoctorBasicInfoParams } from '../../types/clinic';
const doctorModel = {
    getDoctorBasicInfo: async (doctor_id: number, clinic_id: number) => {
        let row = await DB.get_row("select t1.*,ROUND(t2.service_charge) as service_charge,t2.site_service_charge from (select id as doctor_id,name,gender,experience,image,position,description,active,display_order_for_clinic,registration_no,category,qualification_disp,city,partner_type,business_type from doctor where id=? and clinic_id=?) as t1 join (select doctor_id,service_charge,site_service_charge from doctor_service_location where doctor_id=? and clinic_id=? limit 1) as t2 on t1.doctor_id=t2.doctor_id", [doctor_id, clinic_id, doctor_id, clinic_id]);
        return successResponse(row, "success");
    },
    updateDoctorBasicInfo: async (doctor_id: number, clinic_id: number, params: TUpdateDoctorBasicInfoParams) => {
        let q = "update doctor set ";
        let sqlParams = [];
        let updateFields = [];
        if (params.name) {
            updateFields.push("name=?");
            sqlParams.push(params.name);
        }
        if (params.partner_type) {
            updateFields.push("partner_type=?");
            sqlParams.push(params.partner_type);
        }
        if (params.gender) {
            updateFields.push("gender=?");
            sqlParams.push(params.gender);
        }
        if (params.experience) {
            updateFields.push("experience=?");
            sqlParams.push(params.experience);
        }
        if (params.position) {
            updateFields.push("position=?");
            sqlParams.push(params.position);
        }
        if (params.description) {
            updateFields.push("description=?");
            sqlParams.push(params.description);
        }
        if (params.display_order_for_clinic) {
            updateFields.push("display_order_for_clinic=?");
            sqlParams.push(params.display_order_for_clinic);
        }
        if (params.registration_no) {
            updateFields.push("registration_no=?");
            sqlParams.push(params.registration_no);
        }
        if (params.category) {
            updateFields.push("category=?");
            sqlParams.push(params.category);
        }
        if (params.qualification_disp) {
            updateFields.push("qualification_disp=?");
            sqlParams.push(params.qualification_disp);
        }
        if(params.active!==undefined){
            updateFields.push("active=?");
            sqlParams.push(params.active);
        }
        if (updateFields.length > 0) {
            q += updateFields.join(',') + " where id=? and clinic_id=?";
            sqlParams.push(doctor_id, clinic_id);
            await DB.query(q, sqlParams);
        }
        if (params.service_charge) {
            await DB.query("update doctor_service_location set service_charge=? where clinic_id=? and doctor_id=?", [params.service_charge, clinic_id, doctor_id]);
        }
        return successResponse(null, "Updated Successfully");
    },
    getDoctorSpecializations: async (doctor_id: number, clinic_id: number, group_category: string = "DOCTOR") => {
        //let doctor: any = await DB.get_row("select t1.*,t2.category as clinic_category from (select clinic_id,category,specialization from doctor where id=? and clinic_id=?) as t1 join (select id,category from clinics where id=?) as t2 on t1.clinic_id=t2.id", [doctor_id, clinic_id, clinic_id]);
        let params = [];
        let q = `select t1.id,t1.name,if(t2.name>'',t2.name,'') as parent_name,if(t3.specialist_id!='',1,0) as selected from 
        (select * from specialists where group_category=?) as t1  
        left join 
        (select * from specialists where parent_id=0 and group_category=?) as t2 on t1.parent_id=t2.id 
        left join (select specialist_id from service_location_specialization where doctor_id=?) as t3 on t1.id=t3.specialist_id`;

        params.push(group_category);
        params.push(group_category);
        params.push(doctor_id)
        // if (doctor.category && group_category=="DOCTOR") {
        //     q += ` where t2.name=?`;
        //     params.push(doctor.category);
        // }
        // if (!doctor.category && doctor.clinic_category && group_category=="DOCTOR") {
        //     let clinic_category = doctor.clinic_category.replace(",", "','")
        //     q += ` where t2.name in('${clinic_category}')`;
        // }
        let rows: any = await DB.get_rows(q, params);
        let result: any = {};
        for (let row of rows) {
            if (!result[row.parent_name]) {
                result[row.parent_name] = [];
            }
            result[row.parent_name].push({ id: row.id, name: row.name, selected: row.selected });
        }
        return successResponse(result);
    },
    updateDoctorSpecialization: async (doctor_id: number, clinic_id: number, service_loc_id: number, params: { selected: number[], removed: number[] }, city: string) => {
        if (params.selected.length >= 1) {
            let q = "insert into doctor_specialization (doctor_id,specialist,experience,spl_city) values (?,?,0,?)";
            let sqlparams = [doctor_id, params.selected[0], city];
            let q2 = "insert into service_location_specialization (service_location,doctor_id,specialist_id) values (?,?,?)";
            let sqlparams2 = [service_loc_id, doctor_id, params.selected[0]];
            let remainSelectedItems = params.selected.slice(1, params.selected.length);
            if (remainSelectedItems.length > 0) {
                for (let id of remainSelectedItems) {
                    q += ",(?,?,0,?)";
                    sqlparams.push(doctor_id, id, city);
                    q2 += ",(?,?,?)";
                    sqlparams2.push(service_loc_id, doctor_id, id);
                }
            }
            DB.query(q, sqlparams);
            DB.query(q2, sqlparams2);
        }
        if (params.removed.length > 0) {
            let removed_str = params.removed.join(",");
            let length = params.removed.length;
            let dq = `delete from doctor_specialization where doctor_id=? and specialist in (${removed_str}) limit ?`;
            await DB.query(dq, [doctor_id, length]);
            dq = `delete from service_location_specialization where service_location=? and doctor_id=? and specialist_id in (${removed_str}) limit ?`;
            await DB.query(dq, [service_loc_id, doctor_id, length])
        }
        return successResponse(null);
    },
    getDiseaseTreatmentList: async (doctor_id: number, clinic_id: number, service_loc_id: number = 0) => {
        let doctor: any = {};
        if (service_loc_id) {
            doctor = await DB.get_row("select t1.*,t2.category as clinic_category from (select id,clinic_id,category,specialization from doctor where id=? and clinic_id=?) as t1 join (select id,category from clinics where id=?) as t2 on t1.clinic_id=t2.id", [doctor_id, clinic_id, clinic_id]);
        } else {
            doctor = await DB.get_row("select t1.*,t2.category as clinic_category,t3.id as service_loc_id from (select id,clinic_id,category,specialization from doctor where id=? and clinic_id=?) as t1 join (select id,category from clinics where id=?) as t2 on t1.clinic_id=t2.id join (select id,doctor_id from doctor_service_location where doctor_id=? and clinic_id=? limit 1) as t3 on t1.id=t3.doctor_id", [doctor_id, clinic_id, clinic_id, doctor_id, clinic_id]);
        }
        let q = `select t1.*,t2.name as parent_name,if(t3.disease_id!="",1,0) as selected from (
            SELECT id,name,parent_id,treatment_in,display_order FROM disease_category where enable=1 and parent_id!=0 order by display_order
            ) as t1 join (
            select id,name,treatment_in from disease_category where parent_id=0
            ) as t2 on t1.parent_id=t2.id left join (select disease_id from service_location_disease_treatment where service_location_id=?) as t3 on t1.id=t3.disease_id`;
        let params = [];
        if (doctor.service_loc_id) {
            params.push(doctor.service_loc_id)
        } else {
            params.push(service_loc_id)
        }
        if (doctor.category) {
            q += ` where t1.treatment_in=?`;
            params.push(doctor.category);
        }
        if (!doctor.category && doctor.clinic_category) {
            let clinic_category = doctor.clinic_category.replace(",", "','")
            q += ` where t1.treatment_in in('${clinic_category}')`;
        }
        q += " order by t1.display_order";
        let rows: any = await DB.get_rows(q, params);
        let result: any = {};
        for (let row of rows) {
            if (!result[row.treatment_in]) {
                result[row.treatment_in] = {};
            }
            if (!result[row.treatment_in][row.parent_name]) {
                result[row.treatment_in][row.parent_name] = [];
            }
            result[row.treatment_in][row.parent_name].push({ id: row.id, name: row.name, selected: row.selected, parent_id: row.parent_id })
        }
        return successResponse(result);
    },
    updateDoctordiseaseTreatment: async (doctor_id: number, clinic_id: number, service_loc_id: number, params: { selected: number[], removed: number[] }, city: string) => {
        if (params.selected.length >= 1) {
            let q = "insert into service_location_disease_treatment (service_location_id,clinic_id,disease_id) values (?,?,?)";
            let sqlparams = [service_loc_id, clinic_id, params.selected[0]];
            let remainSelectedItems = params.selected.slice(1, params.selected.length);
            if (remainSelectedItems.length > 0) {
                for (let id of remainSelectedItems) {
                    q += ",(?,?,?)";
                    sqlparams.push(service_loc_id, clinic_id, id);
                }
            }
            await DB.query(q, sqlparams);
        }
        if (params.removed.length > 0) {
            let removed_str = params.removed.join(",");
            let dq = `delete from service_location_disease_treatment where clinic_id=? and service_location_id=? and disease_id in (${removed_str}) limit ?`;
            await DB.query(dq, [clinic_id, service_loc_id, params.removed.length]);
        }
        return successResponse(null);
    },
    getDoctorSeoDetails: async (doctor_id: number, clinic_id: number) => {
        let q = "select t1.seo_url,t2.page_title,t2.meta_key_words,t2.meta_description,t2.doctor_id as seo_id,t2.ldjson from (select id,seo_url from doctor where id=? and clinic_id=?) as t1 left join (select doctor_id,page_title,meta_key_words,meta_description,ldjson from doctor_seo_details where doctor_id=?) as t2 on t1.id=t2.doctor_id";
        let params = [doctor_id, clinic_id, doctor_id];
        let row = await DB.get_row(q, params);
        return successResponse(row);
    },
    updateDoctorSeoInfo: async (doctor_id: number, clinic_id: number, params: {
        seo_id: number,
        seo_url?: string,
        page_title?: string,
        meta_description?: string,
        ldjson?: any
    }) => {
        let doctor: any = await DB.get_row("select active,seo_url from doctor where id=? and clinic_id=?", [doctor_id, clinic_id]);
        if (params.seo_url && doctor.seo_url !== params.seo_url) {
            await DB.query("update doctor set seo_url=? where id=? and clinic_id=? limit 1", [params.seo_url, doctor_id, clinic_id]);
        }
        let q = "update doctor_seo_details set ";
        let sqlParams = [];
        if (!params.seo_id) {
            q = "insert into doctor_seo_details set doctor_id=?,";
            sqlParams.push(doctor_id)
        }
        let updateFields = [];
        if (params.page_title) {
            updateFields.push("page_title=?");
            sqlParams.push(params.page_title);
        }
        if (params.meta_description) {
            updateFields.push("meta_description=?");
            sqlParams.push(params.meta_description);
        }
        if (typeof params.ldjson !== "undefined") {
            updateFields.push("ldjson=?");
            if (params.ldjson === "") {
                sqlParams.push(params.ldjson);
            } else {
                sqlParams.push(JSON.stringify(params.ldjson));
            }
        }
        if (updateFields.length > 0) {
            if (params.seo_id) {
                q += updateFields.join(',') + " where doctor_id=?";
                sqlParams.push(doctor_id);
            } else {
                q += updateFields.join(',');
            }
            await DB.query(q, sqlParams);
        }
        return successResponse(null);
    },
    getAllDoctorsSettings: async (clinic_id: number) => {
        let q = `select t1.availability,t1.slno_type,t1.doctor_id,t2.* from (
            SELECT id,doctor_id,availability,slno_type FROM doctor_service_location where clinic_id=?
            ) as t1 left join (
            select id as service_loc_setting_id,service_location_id,payment_type,advance_booking_enable,rule,emergency_booking_close,booking_close_message,book_by,auto_fill,auto_fill_by,cash_recived_mode,show_group_name_while_booking,appointment_book_mode,allow_booking_request,slot_allocation_mode from doctor_servicelocation_setting where service_location_id in (select id from doctor_service_location where clinic_id=?)
            ) as t2 on t1.id=t2.service_location_id`;
        let sqlparams = [clinic_id, clinic_id];
        let rows = await DB.get_rows(q, sqlparams);
        return successResponse(rows);
    },
    getDoctorSettings: async (doctor_id: number, clinic_id: number, service_loc_id: number) => {
        let q = `select t1.availability,t1.slno_type,t1.site_service_charge,t2.* from (
            SELECT id,availability,slno_type,site_service_charge FROM doctor_service_location where id=? and doctor_id=? and clinic_id=?
            ) as t1 left join (
            select id as service_loc_setting_id,service_location_id,payment_type,advance_booking_enable,rule,emergency_booking_close,booking_close_message,book_by,auto_fill,auto_fill_by,cash_recived_mode,show_group_name_while_booking,appointment_book_mode,allow_booking_request,slot_allocation_mode,enable_enquiry,show_patients_feedback,consulting_timing_messages from doctor_servicelocation_setting where service_location_id=? and doctor_id=?
            ) as t2 on t1.id=t2.service_location_id`;
        let sqlparams = [service_loc_id, doctor_id, clinic_id, service_loc_id, doctor_id];
        let row: any = await DB.get_row(q, sqlparams);
        row.site_service_charge = parseInt(row.site_service_charge || "0");
        row.consulting_timing_messages = row.consulting_timing_messages ? JSON.parse(row.consulting_timing_messages) : []
        return successResponse(row);
    },
    getDoctorSlnoGroups: async (service_loc_id: number) => {
        let rows = await DB.get_rows("select * from slno_group where service_loc_id=? order by display_order", [service_loc_id]);
        return successResponse(rows, "success");
    },
    updateSlnoGroup: async (data: {
        id: number,
        group_name: string,
        service_loc_id: number,
        group_name_for_user: string,
        limit: number,
        booking_start: string,
        booking_complete_time: string,
        display_order: number,
        reserved: number,
        message: string,
        enable: number
    }) => {
        if (data.id) {
            await DB.query("update slno_group set group_name=?,group_name_for_user=?,`limit`=?,booking_start=?,booking_complete_time=?,display_order=?,reserved=?,message=?,enable=? where id=?", [data.group_name, data.group_name_for_user, data.limit, data.booking_start, data.booking_complete_time, data.display_order, data.reserved, data.message, data.enable, data.id], true);
            return successResponse({}, "Updated successfully")
        } else {
            await DB.query("insert into slno_group set service_loc_id=?,group_name=?,group_name_for_user=?,`limit`=?,booking_start=?,booking_complete_time=?,display_order=?,reserved=?,message=?,enable=?", [data.service_loc_id, data.group_name, data.group_name_for_user, data.limit, data.booking_start, data.booking_complete_time, data.display_order, data.reserved, data.message, data.enable], true);
            return successResponse({}, "Added successfully")
        }
    },
    deleteSlnoGroup: async (id: number, service_loc_id: number) => {
        await DB.query("delete from slno_group where id=? and service_loc_id=?", [id, service_loc_id], true);
        return successResponse({}, "Deleted successfully")
    },
    updateDoctorSettings: async (doctor_id: number, clinic_id: number, service_loc_id: number, params: {
        service_loc_setting_id: number,
        payment_type?: string,
        cash_recived_mode?: string,
        advance_booking_enable?: number,
        emergency_booking_close?: number,
        booking_close_message?: string,
        book_by?: string,
        appointment_book_mode?: string,
        allow_booking_request?: number,
        slot_allocation_mode?: string,
        slno_type?: string,
        enable_enquiry?: number,
        show_patients_feedback?: number
        site_service_charge?: number,
        show_group_name_while_booking?: number
    }) => {
        if (params.emergency_booking_close && !params.booking_close_message) {
            return parameterMissingResponse("Please provide emergency booking close reason");
        }
        let q = "update doctor_service_location set ";
        let sqlParams = [];
        let updateFields = [];
        if (params.slno_type) {
            updateFields.push("slno_type=?");
            sqlParams.push(params.slno_type);
        }
        if (typeof params.site_service_charge !== 'undefined') {
            updateFields.push("site_service_charge=?");
            sqlParams.push(params.site_service_charge);
        }
        if (updateFields.length > 0) {
            q += updateFields.join(',') + " where id=? and doctor_id=? and clinic_id=?";
            sqlParams.push(service_loc_id, doctor_id, clinic_id);
            console.log(DB.build_query(q, sqlParams));
            await DB.query(q, sqlParams);
        }
        q = "update doctor_servicelocation_setting set ";
        sqlParams = [];
        updateFields = [];
        if (!params.service_loc_setting_id) {
            q = "insert into doctor_servicelocation_setting set doctor_id=?,service_location_id=?";
            sqlParams.push(doctor_id, service_loc_id);
        }
        if (params.payment_type) {
            updateFields.push("payment_type=?");
            sqlParams.push(params.payment_type);
        }
        if (params.advance_booking_enable == 0 || params.advance_booking_enable == 1) {
            updateFields.push("advance_booking_enable=?");
            sqlParams.push(params.advance_booking_enable);
        }
        if (params.emergency_booking_close == 0 || params.emergency_booking_close == 1) {
            updateFields.push("emergency_booking_close=?");
            sqlParams.push(params.emergency_booking_close);
        }
        if (params.booking_close_message) {
            updateFields.push("booking_close_message=?");
            sqlParams.push(params.booking_close_message);
        }
        if (params.book_by) {
            updateFields.push("book_by=?");
            sqlParams.push(params.book_by);
        }
        if (params.cash_recived_mode) {
            updateFields.push("cash_recived_mode=?");
            sqlParams.push(params.cash_recived_mode);
        }
        if (params.appointment_book_mode) {
            updateFields.push("appointment_book_mode=?");
            sqlParams.push(params.appointment_book_mode);
        }
        if (params.allow_booking_request == 0 || params.allow_booking_request == 1) {
            updateFields.push("allow_booking_request=?");
            sqlParams.push(params.allow_booking_request);
        }
        if (params.slot_allocation_mode) {
            updateFields.push("slot_allocation_mode=?");
            sqlParams.push(params.slot_allocation_mode);
        }
        if (params.enable_enquiry == 0 || params.enable_enquiry == 1) {
            updateFields.push("enable_enquiry=?");
            sqlParams.push(params.enable_enquiry);
        }
        if (params.show_patients_feedback == 0 || params.show_patients_feedback == 1) {
            updateFields.push("show_patients_feedback=?");
            sqlParams.push(params.show_patients_feedback);
        }
        if (params.show_group_name_while_booking == 0 || params.show_group_name_while_booking == 1) {
            updateFields.push("show_group_name_while_booking=?");
            sqlParams.push(params.show_group_name_while_booking);
        }
        if (updateFields.length > 0) {
            if (params.service_loc_setting_id) {
                q += updateFields.join(',') + " where id=? and doctor_id=? and service_location_id=?";
                sqlParams.push(params.service_loc_setting_id, doctor_id, service_loc_id);
            } else {
                q += updateFields.join(',');
            }
            //console.log(DB.build_query(q,sqlParams));
            await DB.query(q, sqlParams);
        }
        return successResponse(null);
    },
    getconsultingTiming: async (doctor_id: number, clinic_id: number, service_loc_id: number) => {
        let weeklytimingRow: any = await DB.get_row("select id,availability,sunday,sunday_1st_session_start,sunday_1st_session_end,sunday_2nd_session_start,sunday_2nd_session_end,monday,monday_1st_session_start,monday_1st_session_end,monday_2nd_session_start,monday_2nd_session_end,tuesday,tuesday_1st_session_start,tuesday_1st_session_end,tuesday_2nd_session_start,tuesday_2nd_session_end,wednesday,wednesday_1st_session_start,wednesday_1st_session_end,wednesday_2nd_session_start,wednesday_2nd_session_end,thursday,thursday_1st_session_start,thursday_1st_session_end,thursday_2nd_session_start,thursday_2nd_session_end,friday,friday_1st_session_start,friday_1st_session_end,friday_2nd_session_start,friday_2nd_session_end,saturday,saturday_1st_session_start,saturday_1st_session_end,saturday_2nd_session_start,saturday_2nd_session_end,sunday_3rd_session_start,sunday_3rd_session_end,monday_3rd_session_start,monday_3rd_session_end,tuesday_3rd_session_start,tuesday_3rd_session_end,wednesday_3rd_session_start,wednesday_3rd_session_end,thursday_3rd_session_start,thursday_3rd_session_end,friday_3rd_session_start,friday_3rd_session_end,saturday_3rd_session_start,saturday_3rd_session_end from doctor_service_location where id=? and doctor_id=? and clinic_id=?", [service_loc_id, doctor_id, clinic_id]);
        const { id, availability, ...weeklytiming } = weeklytimingRow;
        let monthlyTimings = await DB.get_rows("select id,every_month,no_of_times,day_name,first_session_start_time,first_session_end_time,second_session_start_time,second_session_end_time from doctor_consulting_timing_monthly where doctor_id=? and service_loc_id=? and clinic_id=?", [doctor_id, service_loc_id, clinic_id]);
        return successResponse({
            service_loc_id: id,
            availability: availability,
            weeklytiming: weeklytiming,
            monthlytimings: monthlyTimings
        })
    },
    updateWeeklyConsultingTiming: async (doctor_id: number, clinic_id: number, service_loc_id: number, params: {
        availability?: string,
        sunday?: number | string,
        sunday_1st_session_start?: string,
        sunday_1st_session_end?: string,
        sunday_2nd_session_start?: string,
        sunday_2nd_session_end?: string,
        monday?: number | string,
        monday_1st_session_start?: string,
        monday_1st_session_end?: string,
        monday_2nd_session_start?: string,
        monday_2nd_session_end?: string,
        tuesday?: number | string,
        tuesday_1st_session_start?: string,
        tuesday_1st_session_end?: string,
        tuesday_2nd_session_start?: string,
        tuesday_2nd_session_end?: string,
        wednesday?: number | string,
        wednesday_1st_session_start?: string,
        wednesday_1st_session_end?: string,
        wednesday_2nd_session_start?: string,
        wednesday_2nd_session_end?: string,
        thursday?: number | string,
        thursday_1st_session_start?: string,
        thursday_1st_session_end?: string,
        thursday_2nd_session_start?: string,
        thursday_2nd_session_end?: string,
        friday?: number | string,
        friday_1st_session_start?: string,
        friday_1st_session_end?: string,
        friday_2nd_session_start?: string,
        friday_2nd_session_end?: string,
        saturday?: number | string,
        saturday_1st_session_start?: string,
        saturday_1st_session_end?: string,
        saturday_2nd_session_start?: string,
        saturday_2nd_session_end?: string,
        sunday_3rd_session_start?: string,
        sunday_3rd_session_end?: string,
        monday_3rd_session_start?: string,
        monday_3rd_session_end?: string,
        tuesday_3rd_session_start?: string,
        tuesday_3rd_session_end?: string,
        wednesday_3rd_session_start?: string,
        wednesday_3rd_session_end?: string,
        thursday_3rd_session_start?: string,
        thursday_3rd_session_end?: string,
        friday_3rd_session_start?: string,
        friday_3rd_session_end?: string,
        saturday_3rd_session_start?: string,
        saturday_3rd_session_end?: string,
    }) => {
        let q = "update doctor_service_location set ";
        let sqlParams = [];
        let updateFields = [];
        if (params.availability) {
            updateFields.push("availability=?");
            sqlParams.push(params.availability);
        }
        if (params.sunday == 0 || params.sunday == 1) {
            updateFields.push("sunday=?");
            sqlParams.push(params.sunday);
        }
        if (typeof params.sunday_1st_session_start === 'string') {
            updateFields.push("sunday_1st_session_start=?");
            sqlParams.push(params.sunday_1st_session_start);
        }
        if (typeof params.sunday_1st_session_end === 'string') {
            updateFields.push("sunday_1st_session_end=?");
            sqlParams.push(params.sunday_1st_session_end);
        }
        if (typeof params.sunday_2nd_session_start === 'string') {
            updateFields.push("sunday_2nd_session_start=?");
            sqlParams.push(params.sunday_2nd_session_start);
        }
        if (typeof params.sunday_2nd_session_end === 'string') {
            updateFields.push("sunday_2nd_session_end=?");
            sqlParams.push(params.sunday_2nd_session_end);
        }
        if (params.monday == 0 || params.monday == 1) {
            updateFields.push("monday=?");
            sqlParams.push(params.monday);
        }
        if (typeof params.monday_1st_session_start === 'string') {
            updateFields.push("monday_1st_session_start=?");
            sqlParams.push(params.monday_1st_session_start);
        }
        if (typeof params.monday_1st_session_end === 'string') {
            updateFields.push("monday_1st_session_end=?");
            sqlParams.push(params.monday_1st_session_end);
        }
        if (typeof params.monday_2nd_session_start === 'string') {
            updateFields.push("monday_2nd_session_start=?");
            sqlParams.push(params.monday_2nd_session_start);
        }
        if (typeof params.monday_2nd_session_end === 'string') {
            updateFields.push("monday_2nd_session_end=?");
            sqlParams.push(params.monday_2nd_session_end);
        }
        if (params.tuesday == 0 || params.tuesday == 1) {
            updateFields.push("tuesday=?");
            sqlParams.push(params.tuesday);
        }
        if (typeof params.tuesday_1st_session_start === 'string') {
            updateFields.push("tuesday_1st_session_start=?");
            sqlParams.push(params.tuesday_1st_session_start);
        }
        if (typeof params.tuesday_1st_session_end === 'string') {
            updateFields.push("tuesday_1st_session_end=?");
            sqlParams.push(params.tuesday_1st_session_end);
        }
        if (typeof params.tuesday_2nd_session_start === 'string') {
            updateFields.push("tuesday_2nd_session_start=?");
            sqlParams.push(params.tuesday_2nd_session_start);
        }
        if (typeof params.tuesday_2nd_session_end === 'string') {
            updateFields.push("tuesday_2nd_session_end=?");
            sqlParams.push(params.tuesday_2nd_session_end);
        }
        if (params.wednesday == 0 || params.wednesday == 1) {
            updateFields.push("wednesday=?");
            sqlParams.push(params.wednesday);
        }
        if (typeof params.wednesday_1st_session_start === 'string') {
            updateFields.push("wednesday_1st_session_start=?");
            sqlParams.push(params.wednesday_1st_session_start);
        }
        if (typeof params.wednesday_1st_session_end === 'string') {
            updateFields.push("wednesday_1st_session_end=?");
            sqlParams.push(params.wednesday_1st_session_end);
        }
        if (typeof params.wednesday_2nd_session_start === 'string') {
            updateFields.push("wednesday_2nd_session_start=?");
            sqlParams.push(params.wednesday_2nd_session_start);
        }
        if (typeof params.wednesday_2nd_session_end === 'string') {
            updateFields.push("wednesday_2nd_session_end=?");
            sqlParams.push(params.wednesday_2nd_session_end);
        }
        if (params.thursday == 0 || params.thursday == 1) {
            updateFields.push("thursday=?");
            sqlParams.push(params.thursday);
        }
        if (typeof params.thursday_1st_session_start === 'string') {
            updateFields.push("thursday_1st_session_start=?");
            sqlParams.push(params.thursday_1st_session_start);
        }
        if (typeof params.thursday_1st_session_end === 'string') {
            updateFields.push("thursday_1st_session_end=?");
            sqlParams.push(params.thursday_1st_session_end);
        }
        if (typeof params.thursday_2nd_session_start === 'string') {
            updateFields.push("thursday_2nd_session_start=?");
            sqlParams.push(params.thursday_2nd_session_start);
        }
        if (typeof params.thursday_2nd_session_end === 'string') {
            updateFields.push("thursday_2nd_session_end=?");
            sqlParams.push(params.thursday_2nd_session_end);
        }
        if (params.friday == 0 || params.friday == 1) {
            updateFields.push("friday=?");
            sqlParams.push(params.friday);
        }
        if (typeof params.friday_1st_session_start === 'string') {
            updateFields.push("friday_1st_session_start=?");
            sqlParams.push(params.friday_1st_session_start);
        }
        if (typeof params.friday_1st_session_end === 'string') {
            updateFields.push("friday_1st_session_end=?");
            sqlParams.push(params.friday_1st_session_end);
        }
        if (typeof params.friday_2nd_session_start === 'string') {
            updateFields.push("friday_2nd_session_start=?");
            sqlParams.push(params.friday_2nd_session_start);
        }
        if (typeof params.friday_2nd_session_end === 'string') {
            updateFields.push("friday_2nd_session_end=?");
            sqlParams.push(params.friday_2nd_session_end);
        }
        if (params.saturday == 0 || params.saturday == 1) {
            updateFields.push("saturday=?");
            sqlParams.push(params.saturday);
        }
        if (typeof params.saturday_1st_session_start === 'string') {
            updateFields.push("saturday_1st_session_start=?");
            sqlParams.push(params.saturday_1st_session_start);
        }
        if (typeof params.saturday_1st_session_end === 'string') {
            updateFields.push("saturday_1st_session_end=?");
            sqlParams.push(params.saturday_1st_session_end);
        }
        if (typeof params.saturday_2nd_session_start === 'string') {
            updateFields.push("saturday_2nd_session_start=?");
            sqlParams.push(params.saturday_2nd_session_start);
        }
        if (typeof params.saturday_2nd_session_end === 'string') {
            updateFields.push("saturday_2nd_session_end=?");
            sqlParams.push(params.saturday_2nd_session_end);
        }
        if (typeof params.saturday_3rd_session_start === 'string') {
            updateFields.push("saturday_3rd_session_start=?");
            sqlParams.push(params.saturday_3rd_session_start);
        }
        if (typeof params.saturday_3rd_session_end === 'string') {
            updateFields.push("saturday_3rd_session_end=?");
            sqlParams.push(params.saturday_3rd_session_end);
        }
        if (typeof params.sunday_3rd_session_start === 'string') {
            updateFields.push("sunday_3rd_session_start=?");
            sqlParams.push(params.sunday_3rd_session_start);
        }
        if (typeof params.sunday_3rd_session_end === 'string') {
            updateFields.push("sunday_3rd_session_end=?");
            sqlParams.push(params.sunday_3rd_session_end);
        }
        if (typeof params.monday_3rd_session_start === 'string') {
            updateFields.push("monday_3rd_session_start=?");
            sqlParams.push(params.monday_3rd_session_start);
        }
        if (typeof params.monday_3rd_session_end === 'string') {
            updateFields.push("monday_3rd_session_end=?");
            sqlParams.push(params.monday_3rd_session_end);
        }
        if (typeof params.tuesday_3rd_session_start === 'string') {
            updateFields.push("tuesday_3rd_session_start=?");
            sqlParams.push(params.tuesday_3rd_session_start);
        }
        if (typeof params.tuesday_3rd_session_end === 'string') {
            updateFields.push("tuesday_3rd_session_end=?");
            sqlParams.push(params.tuesday_3rd_session_end);
        }
        if (typeof params.wednesday_3rd_session_start === 'string') {
            updateFields.push("wednesday_3rd_session_start=?");
            sqlParams.push(params.wednesday_3rd_session_start);
        }
        if (typeof params.wednesday_3rd_session_end === 'string') {
            updateFields.push("wednesday_3rd_session_end=?");
            sqlParams.push(params.wednesday_3rd_session_end);
        }
        if (typeof params.thursday_3rd_session_start === 'string') {
            updateFields.push("thursday_3rd_session_start=?");
            sqlParams.push(params.thursday_3rd_session_start);
        }
        if (typeof params.thursday_3rd_session_end === 'string') {
            updateFields.push("thursday_3rd_session_end=?");
            sqlParams.push(params.thursday_3rd_session_end);
        }
        if (typeof params.friday_3rd_session_start === 'string') {
            updateFields.push("friday_3rd_session_start=?");
            sqlParams.push(params.friday_3rd_session_start);
        }
        if (typeof params.friday_3rd_session_end === 'string') {
            updateFields.push("friday_3rd_session_end=?");
            sqlParams.push(params.friday_3rd_session_end);
        }
        if (updateFields.length > 0) {
            q += updateFields.join(',') + " where id=? and doctor_id=? and clinic_id=?";
            sqlParams.push(service_loc_id, doctor_id, clinic_id);
            //console.log(DB.build_query(q,sqlParams));
            await DB.query(q, sqlParams);
        }
        return successResponse(null);
    },
    updateMonthlyConsultingTiming: async (doctor_id: number, clinic_id: number, service_loc_id: number, params: {
        id?: number,
        every_month?: string,
        no_of_times?: number,
        day_name?: string,
        first_session_start_time?: string,
        first_session_end_time?: string,
        second_session_start_time?: string,
        second_session_end_time?: string
    }) => {
        let q = "update doctor_consulting_timing_monthly set ";
        let sqlParams = [];
        let updateFields = [];
        if (params.id == 0) {
            q = "insert into doctor_consulting_timing_monthly set doctor_id=?,service_loc_id=?,clinic_id=?,";
            sqlParams.push(doctor_id, service_loc_id, clinic_id);
        }
        if (typeof params.every_month === 'string') {
            updateFields.push("every_month=?");
            sqlParams.push(params.every_month);
        }
        if (typeof params.no_of_times === 'number') {
            updateFields.push("no_of_times=?");
            sqlParams.push(params.no_of_times);
        }
        if (typeof params.day_name === 'string') {
            updateFields.push("day_name=?");
            sqlParams.push(params.day_name);
        }
        if (typeof params.first_session_start_time === 'string') {
            updateFields.push("first_session_start_time=?");
            sqlParams.push(params.first_session_start_time);
        }
        if (typeof params.first_session_end_time === 'string') {
            updateFields.push("first_session_end_time=?");
            sqlParams.push(params.first_session_end_time);
        }
        if (typeof params.second_session_start_time === 'string') {
            updateFields.push("second_session_start_time=?");
            sqlParams.push(params.second_session_start_time);
        }
        if (typeof params.second_session_end_time === 'string') {
            updateFields.push("second_session_end_time=?");
            sqlParams.push(params.second_session_end_time);
        }
        if (updateFields.length > 0) {
            if (params.id) {
                q += updateFields.join(',') + " where id=? and doctor_id=? and service_loc_id=? and clinic_id=?";
                sqlParams.push(params.id, doctor_id, service_loc_id, clinic_id);
            } else {
                q += updateFields.join(',');
            }
            DB.query(q, sqlParams);
        }
        return successResponse(null);
    },
    deleteMonthyConsultingTimeing: async (params: { id: number, doctor_id: number, clinic_id: number, service_loc_id: number }) => {
        await DB.query("delete from doctor_consulting_timing_monthly where id=? and doctor_id=? and service_loc_id=? and clinic_id=?", [params.id, params.doctor_id, params.service_loc_id, params.clinic_id]);
        return successResponse({}, "Deleted successfully");
    },
}
export default doctorModel;