import { Schema,model } from "mongoose";
import { COLL_CATEGORY_DETAILS } from "./collections";
const categoryDetailsSchema=new Schema({
    cat_id:{type:Number,required:true,index:true,unique:true},
    faqs:[
        {
            question:{type:String,required:true},
            answer:{type:String,required:true},
            state:{type:String,required:false},
            city:{type:String,required:false}
        }
    ]
});
export const categoryDetailsModel=model(COLL_CATEGORY_DETAILS,categoryDetailsSchema);
