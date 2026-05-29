import { Schema,model } from "mongoose";
import {COLL_SEARCH_TEXTS} from './collections';
const searchTextsSchema=new Schema({
    text:{type:String,index:true},
    ln:{type:String,index:true},//en,hi
    type:String,//specialists,disease
    location:String,
    icon:String,
    rating:Number,
    vertical:{type:String,index:true},
    resolver_url:{url:String,target:String},
    resolver:Schema.Types.Mixed,
    click_count:Number,
})
export const searchTextsModel=model(COLL_SEARCH_TEXTS,searchTextsSchema);