import {internalServerError, successResponse} from '../../services/response';
type updatePopularClinicParamTypes={
    city:string,
    id:number,
    clinic_id:number,
    banner?:string,
    banner_message:string,
    display_order:number,
    active:number,
    action:string,//active.deactive
}
const popularClinicModel={
    getClinicList:async (branch_id:number,city:string)=>{
        let rows = await DB.get_rows("select t1.*,t2.name as clinic_name,t2.city as clinic_city,t2.locality as clinic_locality from (select id,clinic_id,banner,banner_message,city,display_order,display_location,active from popular_clinics where city=? order by display_order) as t1 join (select id,name,city,locality from clinics where branch_id=?) as t2 on t1.clinic_id=t2.id order by t1.display_order",[city,branch_id]);
        return successResponse(rows);
    },
    updatePopularClinic:async(params:updatePopularClinicParamTypes)=>{
        try{
            if(params.action){
                if(params.action==='delete'){
                    let updateRes:any = await DB.query("delete from popular_clinics where id=? and clinic_id=? limit 1",[params.id,params.clinic_id]);
                    if(updateRes.affectedRows>=1){
                        return successResponse(null,"Removed successfully");
                    }else{
                        return internalServerError("Something went wrong");
                    }
                }
                let active=params.action==='active'?1:0;
                await DB.query("update  popular_clinics set active=? where id=? and clinic_id=? limit 1",[active,params.id,params.clinic_id]);
                return successResponse(null,params.action==='active'?"Activate successfully":"De-activate successfully");
            }
            if(!params.id && params.banner){
                let q="insert into popular_clinics set clinic_id=?,banner=?,banner_message=?,city=?,display_order=?,display_location=?";
                let sqlparams=[params.clinic_id,params.banner,params.banner_message,params.city,params.display_order,JSON.stringify(['home'])];
                let updateRes:any = await DB.query(q,sqlparams);
                if(updateRes.affectedRows>=1){
                    return successResponse(null,"saved successfully");
                }else{
                    return internalServerError("something went wrong");
                }
            }else{
                let q="update popular_clinics set banner_message=?,display_order=?,active=?";
                let sqlParams=[params.banner_message,params.display_order,params.active];
                if(params.banner){
                    q+=",banner=?";
                    sqlParams.push(params.banner);
                }
                q+=" where id=? and clinic_id=? limit 1";
                sqlParams.push(params.id,params.clinic_id);
                let updateRes:any = await DB.query(q,sqlParams);
                if(updateRes.affectedRows>=1){
                    return successResponse("updated successfully");
                }else{
                    return internalServerError("Something went wrong");
                }
            }
        }catch(err:any){
            return internalServerError(err.message);
        }
    }
}
export default popularClinicModel;