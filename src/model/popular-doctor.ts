import { successResponse } from "../services/response";

const popularDoctorModel={
    updatePopularDoctor:async (params:{
        branch_id:number,
        service_location_id:number,
        doctor_id:number,
        clinic_id:number,
        start_date:string,
        end_date:string,
        active:number,
        city:string,
        display_order:number
    })=>{
        
        if(params.service_location_id){
            let q="update popular_service_location set start_date=?,end_date=?,active=?,display_order=? where service_location_id=? and doctor_id=? and clinic_id=? and branch_id=?";
            let sqlParams=[params.start_date,params.end_date,params.active,params.display_order,params.service_location_id,params.doctor_id,params.clinic_id,params.branch_id];
            await DB.query(q,sqlParams);
        }else{
            let serviceLocation:any = await DB.get_row("select id from doctor_service_location where clinic_id=? and doctor_id=?",[params.clinic_id,params.doctor_id]);
            let q="insert into popular_service_location set service_location_id=?,doctor_id=?,clinic_id=?,start_date=?,end_date=?,active=?,branch_id=?,city=?,display_order=?";
            let sqlParams=[serviceLocation.id,params.doctor_id,params.clinic_id,params.start_date,params.end_date,params.active,params.branch_id,params.city,params.display_order];
            await DB.query(q,sqlParams);
        }
        return successResponse(null,"updated successfully");
    }
}
export default popularDoctorModel;