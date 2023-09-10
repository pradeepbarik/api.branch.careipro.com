import { successResponse, internalServerError } from '../../services/response';
export const getApointmentRatingAndReviews = async (params: {
    branch_id: number,
    from_date?: string,
    to_date?: string,
    clinic_id?:number,
    doctor_id?:number,
    user_id?:number
    status?:'unverified'|'verified'|'approved'|'unapproved',
}) => {
    try {
        let bookingReviewSql=`SELECT id,booking_id,user_id,doctor_id,service_loc_id,rating,visited_for,experience,ques_ans,review_date,status FROM booking_review where `;
        let bookingReviewSqlParams:Array<string|number>=[];
        let conditions=[];
        if(params.user_id){
            conditions.push(`user_id=?`); 
            bookingReviewSqlParams.push(params.user_id);
        }
        if(params.from_date){
            conditions.push(`date(review_date)>=?`);
            bookingReviewSqlParams.push(params.from_date);
        }
        if(params.to_date){
            conditions.push(`date(review_date)<=?`);
            bookingReviewSqlParams.push(params.to_date);
        }
        if(params.doctor_id){
            conditions.push(`doctor_id=?`);
            bookingReviewSqlParams.push(params.doctor_id);
        }
        if(params.clinic_id){
            conditions.push(`service_loc_id in (select id from doctor_service_location where clinic_id=?)`);
            bookingReviewSqlParams.push(params.clinic_id)
        }
        if(params.status){
            conditions.push(`status=?`);
            bookingReviewSqlParams.push(params.status)
        }
        bookingReviewSql+=conditions.join(' and ');
        let sql = `select br.*,doc.name as doctor_name,doc.position as doctor_position,doc.image as doctor_logo,clinics.* from (${bookingReviewSql}) as br JOIN (select id as doc_id,clinic_id,name,position,image from doctor where branch_id=?) as doc on br.doctor_id=doc.doc_id left join (select id as clinic_id,name as clinic_name from clinics where branch_id=?) as clinics on doc.clinic_id=clinics.clinic_id order by br.review_date desc`;
        let sqlParams=[...bookingReviewSqlParams, params.branch_id, params.branch_id];
        let rows = await DB.get_rows(sql, sqlParams);
        return successResponse(rows,"success");
    } catch (err:any) {
        return internalServerError(err.message)
    }
}
type TverifiedReviewParams={
    id:number
}
export const verifiedReview =async (params:TverifiedReviewParams) => {
    let updateRes:any = await DB.query("update booking_review set status='verified' where id=?",[params.id]);
    if(updateRes.affectedRows>=1){
        return successResponse(null,"verified successfully")
    }else{
        return internalServerError("something went wrong")
    }
}
export const rejectReview=async (params:TverifiedReviewParams)=>{
    let updateRes:any = await DB.query("update booking_review set status='rejected' where id=?",[params.id]);
    if(updateRes.affectedRows>=1){
        return successResponse(null,"Rejected successfully")
    }else{
        return internalServerError("something went wrong")
    }
}
export const deleteReview =async (params:TverifiedReviewParams) => {
    let updateRes:any = await DB.query("delete from booking_review where id=? limit 1",[params.id]);
    if(updateRes.affectedRows>=1){
        return successResponse(null,"Deleted successfully")
    }else{
        return internalServerError("something went wrong")
    }
}