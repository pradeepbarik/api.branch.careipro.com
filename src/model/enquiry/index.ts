const enquiryModel = {
    getEnquiryList:async (params:{
        city: string,
        from_date?: string,
        to_date?: string,
        vertical?: string,
        status?: string
    })=>{
        let q="select * from enquiry where city=?";
        let sqlParams:any[]=[params.city];
        if(params.vertical){
            q+=" and vertical=?";
            sqlParams.push(params.vertical);
        }
        if(params.status){
            q+=" and enquiry_status=?";
            sqlParams.push(params.status);
        }else{
             q+=" and enquiry_status=?";
            sqlParams.push('open');
        }
        if(params.from_date && params.to_date){
            q+=" and create_time between ? and ?";
            sqlParams.push(params.from_date,params.to_date);
        }
       let rows = await DB.get_rows(q,sqlParams);
       return rows;
    }
}
export default enquiryModel;