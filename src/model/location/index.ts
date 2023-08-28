import {internalServerError,successResponse} from '../../services/response';
export const getMissingVillageList = async ({state='',district}: {
    state: ''|string,
    district:string
}) => {
    try {
        let q = "SELECT state,district,sub_district,village,if(district=?,0,1) as prority_dist FROM `tbl_villages_not_listed`";
        let sqlparams=[];
        sqlparams.push(district);
        if(state!==''){
            q+=" where state=?";
            sqlparams.push(state);
        }
        q+="order by prority_dist,district";
        let rows = await DB.get_rows(q, sqlparams);
        return successResponse(rows,"success")
    }catch(err:any){
        return internalServerError(err.message)
    }
}
