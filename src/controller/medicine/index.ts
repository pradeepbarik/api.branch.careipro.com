import { Request, Response } from "express";
import Joi from "joi";
import { parameterMissingResponse, serviceNotAcceptable, successResponse, unauthorizedResponse } from "../../services/response";
import medicineModel from "../../mongo-schema/coll_medicines";
import { get } from "mongoose";
import { get_current_datetime } from "../../services/datetime";
const requestParams = {
    getmedicinelist: Joi.object({
        medical_type: Joi.string().allow(""),
        cat_id: Joi.number().allow(0),
    }),
    addNewMedicine: Joi.object({
        medical_type: Joi.string().allow(""),
        name: Joi.string().required(),
        generic_name: Joi.string().allow(""),
        brand_name: Joi.string().allow(""),
        manufacturer: Joi.string().allow(""),
        composition: Joi.string().allow(""),
        dosage_form: Joi.string().allow(""),
        strength: Joi.string().allow(""),
        mrp: Joi.number().allow(0),
        description: Joi.string().allow(""),
        is_prescription_required: Joi.boolean().default(false),
    })
}
const medicineController = {
    getmedicinelist: async (req: Request, res: Response) => {
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { error, value } = requestParams.getmedicinelist.validate(req.query);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        let filter: any = {};
        if (value.medical_type) {
            filter.medical_type = value.medical_type;
        }
        if (value.cat_id) {
            filter.cat_ids = value.cat_id;
        }
        const medicineList = await medicineModel.find(filter).sort({ entry_date: -1 }).select("-__v -seo_data -uses_for -precautions -side_effects -related_products -similar_products -description").lean();
        res.json(successResponse(medicineList, "Medicine list fetched successfully"));
    },
    searchMedicines: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            parameterMissingResponse("Search query is required", res);
            return;
        }
        const searchRegex = new RegExp(q, 'i');
        const medicineList = await medicineModel.find({
            $or: [
                { name: searchRegex },
                { generic_name: searchRegex },
                { brand_name: searchRegex },
                { manufacturer: searchRegex },
            ]
        }).sort({ entry_date: -1 }).select("-__v -seo_data -uses_for -precautions -side_effects -related_products -similar_products -description").lean();
        res.json(successResponse(medicineList, "Medicine search results fetched successfully"));
    },
    addnewmedicine: async (req: Request, res: Response) => {
        const { error, value } = requestParams.addNewMedicine.validate(req.body);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        console.log("Adding new medicine with data:", value);
        let now = get_current_datetime();
        // get count of medicines to generate seo_id
        const medicineCount = await medicineModel.countDocuments();
        let seoid = medicineCount + 1;
        let newMedicine = new medicineModel({
            seo_id: seoid,
            medical_type: value.medical_type || "GENERAL",
            name: value.name,
            generic_name: value.generic_name,
            brand_name: value.brand_name,
            composition: value.composition,
            dosage_form: value.dosage_form,
            strength: value.strength,
            manufacturer: value.manufacturer,
            mrp: value.mrp,
            description: [
                {
                    heading: "Description",
                    message: value.description || '',
                    icon: ""
                }
            ],
            is_prescription_required: value.is_prescription_required,
            entry_date: new Date(now),
            storage_conditions: value.storage_conditions || '',
            cat_ids: [],
            uses_for: [],
            precautions: [],
            side_effects: [],
            seo_data: {
                url: `${value.name.toLowerCase().replace(/\s+/g, '-')}`,
                title: "",
                description: "",
                keywords: []
            }
        });
        await newMedicine.save();
        res.json(successResponse(null, "New medicine added successfully"));
    },
getMedicineDetail: async (req: Request, res: Response) => {
        const { error, value } = Joi.object({
            id: Joi.string().required()
        }).validate(req.query);
        if (error) {
            parameterMissingResponse(error.details[0].message, res);
            return;
        }
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const medicineDetail = await medicineModel.findOne({ _id: value.id }).lean();
        if (medicineDetail) {
            res.json(successResponse(medicineDetail, "Medicine detail fetched successfully"));
        } else {
            res.json(successResponse(null, "Medicine not found"));
        }
    },
    updateMedicine: async (req: Request, res: Response) => {
        const { tokenInfo, emp_info } = res.locals;
        if (typeof tokenInfo === 'undefined' || typeof emp_info === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return
        }
        const {tab,_id,...rest}=req.body;
        const medicine = await medicineModel.findOne({_id}).exec();
        if(!medicine){
            parameterMissingResponse("Medicine not found with given id", res);
            return;
        }
        if(tab==="basic"){
            const { error, value } = Joi.object({
                medical_type: Joi.string().allow(""),
                name: Joi.string().required(),
                generic_name: Joi.string().allow(""),
                brand_name: Joi.string().allow(""),
                manufacturer: Joi.string().allow(""),
                composition: Joi.string().allow(""),
                dosage_form: Joi.string().allow(""),
                strength: Joi.string().allow(""),
                mrp: Joi.number().allow(0),
                is_prescription_required: Joi.boolean().default(false),
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            if(value.medical_type) medicine.medical_type=value.medical_type;
            if(value.name) medicine.name=value.name;
            if(value.generic_name) medicine.generic_name=value.generic_name;
            if(value.brand_name) medicine.brand_name=value.brand_name;
            if(value.manufacturer) medicine.manufacturer=value.manufacturer;
            if(value.composition) medicine.composition=value.composition;
            if(value.dosage_form) medicine.dosage_form=value.dosage_form;
            if(value.strength) medicine.strength=value.strength;
            if(value.mrp) medicine.mrp=value.mrp;
            medicine.is_prescription_required=value.is_prescription_required;
            await medicine.save();
            res.json(successResponse(null, "Medicine basic info updated successfully"));
        }else if(tab==="description"){
            const { error, value } = Joi.object({
                description: Joi.array().items(
                    Joi.object({
                        heading: Joi.string().allow(""),
                        message: Joi.string().allow(""),
                        icon: Joi.string().allow("")
                    })
                )
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.description=value.description;
            await medicine.save();
            res.json(successResponse(null, "Medicine description updated successfully"));
        }else if(tab==="uses"){
            const { error, value } = Joi.object({
                uses_for: Joi.array().items(
                    Joi.object({
                        heading: Joi.string().allow(""),
                        message: Joi.string().allow(""),
                        icon: Joi.string().allow("")
                    })
                )
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.uses_for=value.uses_for;
            await medicine.save();
            res.json(successResponse(null, "Medicine uses updated successfully"));
        }else if(tab==="precautions"){
            const { error, value } = Joi.object({
                precautions: Joi.array().items(
                    Joi.object({
                        heading: Joi.string().allow(""),
                        message: Joi.string().allow(""),
                        icon: Joi.string().allow("")
                    })
                )
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.precautions=value.precautions;
            await medicine.save();
            res.json(successResponse(null, "Medicine warnings/precautions updated successfully"));
        }else if(tab==="storage"){
            const { error, value } = Joi.object({
                storage_conditions: Joi.string().allow("")
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.storage_conditions=value.storage_conditions;
            await medicine.save();
            res.json(successResponse(null, "Medicine storage conditions updated successfully"));
        }else if(tab==="side_effects"){
            const { error, value } = Joi.object({
                side_effects: Joi.array().items(
                    Joi.object({
                        heading: Joi.string().allow(""),
                        message: Joi.string().allow(""),
                        icon: Joi.string().allow("")
                    })
                )
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.side_effects=value.side_effects;
            await medicine.save();
            res.json(successResponse(null, "Medicine side effects updated successfully"));
        }else if(tab==="related_products"){
            const { error, value } = Joi.object({
                related_products: Joi.array().items(Joi.string())
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.related_products=value.related_products;
            await medicine.save();
            res.json(successResponse(null, "Medicine related products updated successfully"));
        }else if(tab==="similar_products"){
            const { error, value } = Joi.object({
                similar_products: Joi.array().items(Joi.string())
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.similar_products=value.similar_products;
            await medicine.save();
            res.json(successResponse(null, "Medicine similar products updated successfully"));
        }else if(tab==="seo_data"){
            const { error, value } = Joi.object({
                seo_data: Joi.object({
                    url: Joi.string().allow(""),
                    title: Joi.string().allow(""),
                    description: Joi.string().allow(""),
                    keywords: Joi.array().items(Joi.string())
                })
            }).validate(rest);
            if (error) {
                parameterMissingResponse(error.details[0].message, res);
                return;
            }
            medicine.seo_data=value.seo_data;
            await medicine.save();
            res.json(successResponse(null, "Medicine SEO data updated successfully"));
        }else{
          serviceNotAcceptable("invalid tab value", res);
        }
    }
}
export default medicineController;