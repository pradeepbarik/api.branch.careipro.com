import { Schema,model } from "mongoose";
import { COLL_CATEGORY_REPORTS } from "./collections";
const categoryReportSchema = new Schema({
    cat_id: {type:Number,index:true},
    city: {type:String,index:true},
    name: String,
    avg_rating: Number,
    total_rating: Number,
    one_star: Number,
    two_star: Number,
    three_star: Number,
    four_star: Number,
    five_star: Number,
});
export const categoryReportMongoModel = model(COLL_CATEGORY_REPORTS, categoryReportSchema);
