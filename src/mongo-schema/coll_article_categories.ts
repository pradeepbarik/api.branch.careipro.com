import { Schema, model } from "mongoose";
import { COLL_ARTICLE_CATEGORIES } from './collections';
const articleCategorySchema = new Schema({
    category: { type: String, index: true },
    lang_text:{}//{en:"Fever",od:"ଜ୍ୱର"},
}, { strict: false })
export const articleCategoryModel = model(COLL_ARTICLE_CATEGORIES, articleCategorySchema);