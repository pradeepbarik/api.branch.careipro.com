import { serviceNotAcceptable, successResponse } from "../../services/response";
import dynamicPageModel from "../../mongo-schema/coll_pages";
import { Types } from "mongoose";
import { articleCategoryModel } from "../../mongo-schema/coll_article_categories";

const dynamicPageSettingsModel = {
    getPagesList: async (params: {
        state?: string,
        city?: string,
        page_type?: string,
        vertical?: string,
        globalPages?: boolean,
        lang?: string,
        category?: string,
    }) => {
        try {
            let query: any = {};
            if (params.state && !params.globalPages) {
                query.state = params.state.toLowerCase();
            }
            if (params.city && !params.globalPages) {
                query.city = params.city.toLowerCase();
            }
            if (params.page_type) {
                query.pageType = params.page_type;
            }
            if (params.vertical) {
                query.vertical = params.vertical;
            }
            if (params.globalPages) {
                query["pageAccess.global"] = true;
            }
            if (params.lang) {
                query.lang = params.lang;
            }
            if (params.category) {
                query.category = params.category;
            }
            const pages = await dynamicPageModel.find(query)
                .lean();

            return successResponse(pages, "Pages fetched successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    createDynamicPage: async (params: {
        page_name: string,
        state: string,
        city: string,
        heading: string,
        subHeading: string,
        pageType: string,
        vertical: string,
        seo_url: string,
        seoDt: { pageTitle: string, pageDescription: string },
        pageAccess: { global: boolean, cities: string[] },
        category?: string,
        lang?: string,
    }) => {
        try {
            //pageId= last page id+=1
            let lastPage = await dynamicPageModel.findOne({}).sort({ pageId: -1 }).select("pageId").lean();
            const { page_name, state, city, heading, subHeading, pageType, vertical, seo_url, seoDt, pageAccess } = params;
            const newPage = new dynamicPageModel({
                pageId: lastPage && lastPage.pageId ? lastPage.pageId + 1 : 1, // Increment the last pageId or start from 1
                pageType,
                state: state.toLowerCase(),
                city: city.toLowerCase(),
                vertical,
                category: params.category || "",
                lang: params.lang || "",
                seo_url,
                seoDt,
                heading,
                subHeading,
                pageAccess,
                coverPhoto: { mobile: "", desktop: "" },
                banners: [],
                sections: []

            });
            await newPage.save();
            return successResponse(null, "Dynamic page created successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    updatePageSettings: async (params: {
        _id: number,
        branch_state: string,
        branch_city: string,
        updateData: any
    }) => {
        try {
            const { _id, branch_state, branch_city, updateData } = params;
            if (!_id) {
                return serviceNotAcceptable("Page ID is required");
            }

            // Validate branch ownership - check if the page belongs to this branch
            const page = await dynamicPageModel.findOne({ _id: new Types.ObjectId(_id) }).select("state city").lean();

            if (!page) {
                return serviceNotAcceptable("Page not found");
            }

            if (page.pageAccess?.global === false && (page.state?.toLowerCase() !== branch_state.toLowerCase() || page.city?.toLowerCase() !== branch_city.toLowerCase())) {
                return serviceNotAcceptable("You are not authorized to update this page");
            }

            let updateFields: any = {};
            if (updateData.pageType !== undefined) {
                updateFields.pageType = updateData.pageType;
            }
            if (updateData.vertical !== undefined) {
                updateFields.vertical = updateData.vertical;
            }
            if (updateData.seo_url !== undefined) {
                updateFields.seo_url = updateData.seo_url;
            }
            if (updateData.seoDt !== undefined) {
                updateFields.seoDt = updateData.seoDt;
            }
            if (updateData.logo !== undefined) {
                updateFields.logo = updateData.logo;
            }
            if (updateData.banners !== undefined) {
                updateFields.banners = updateData.banners;
            }
            if (updateData.heading !== undefined) {
                updateFields.heading = updateData.heading;
            }
            if (updateData.subHeading !== undefined) {
                updateFields.subHeading = updateData.subHeading;
            }
            if (updateData.pageAccess !== undefined) {
                updateFields.pageAccess = updateData.pageAccess;
            }
            if (updateData.category !== undefined) {
                updateFields.category = updateData.category;
            }
            if (updateData.lang !== undefined) {
                updateFields.lang = updateData.lang;
            }

            // Handle section update - update specific section by section_name or add new section
            if (updateData.section && updateData.section.section_name) {
                const sectionName = updateData.section.section_name;

                // Check if section exists
                const existingSection = await dynamicPageModel.findOne({
                    _id: new Types.ObjectId(_id),
                    "sections.section_name": sectionName
                }).lean();

                if (existingSection) {
                    // Section exists - update it
                    const sectionUpdateFields: any = {};
                    if (updateData.section.campaign !== undefined) {
                        sectionUpdateFields["sections.$.campaign"] = updateData.section.campaign;
                    }
                    if (updateData.section.heading !== undefined) {
                        sectionUpdateFields["sections.$.heading"] = updateData.section.heading;
                    }
                    if (updateData.section.subHeading !== undefined) {
                        sectionUpdateFields["sections.$.subHeading"] = updateData.section.subHeading;
                    }
                    if (updateData.section.sectionType !== undefined) {
                        sectionUpdateFields["sections.$.sectionType"] = updateData.section.sectionType;
                    }
                    if (updateData.section.content !== undefined) {
                        sectionUpdateFields["sections.$.content"] = updateData.section.content;
                    }
                    if (updateData.section.inputFields !== undefined) {
                        // Parse inputFields if it's a string (JSON stringified)
                        let inputFieldsArray = updateData.section.inputFields;
                        if (typeof inputFieldsArray === 'string') {
                            try {
                                inputFieldsArray = JSON.parse(inputFieldsArray);
                            } catch (e) {
                                console.error("Failed to parse inputFields string:", e);
                                inputFieldsArray = [];
                            }
                        }
                        // Map inputFields to ensure proper structure for MongoDB
                        const sanitizedInputFields = Array.isArray(inputFieldsArray) ? inputFieldsArray.map((field: any) => ({
                            key: String(field.key || ""),
                            label: String(field.label || ""),
                            placeHolder: String(field.placeHolder || ""),
                            required: Boolean(field.required),
                            element: String(field.element || ""),
                            type: String(field.type || ""),
                            options: Array.isArray(field.options) ? field.options.map((opt: any) => ({
                                label: String(opt.label || ""),
                                value: opt.value
                            })) : []
                        })) : [];
                        sectionUpdateFields["sections.$.inputFields"] = sanitizedInputFields;
                    }
                    if (updateData.section.button !== undefined) {
                        sectionUpdateFields["sections.$.button"] = updateData.section.button;
                    }

                    if (Object.keys(sectionUpdateFields).length > 0) {
                        // Use native MongoDB driver to bypass Mongoose casting issues with nested arrays
                        await dynamicPageModel.collection.updateOne(
                            { _id: new Types.ObjectId(_id), "sections.section_name": sectionName },
                            { $set: { ...sectionUpdateFields } }
                        );
                        return successResponse(null, "Section updated successfully");
                    }
                } else {
                    // Section doesn't exist - add new section
                    let inputFieldsArray = updateData.section.inputFields || [];
                    if (typeof inputFieldsArray === 'string') {
                        try {
                            inputFieldsArray = JSON.parse(inputFieldsArray);
                        } catch (e) {
                            inputFieldsArray = [];
                        }
                    }
                    const sanitizedInputFields = Array.isArray(inputFieldsArray) ? inputFieldsArray.map((field: any) => ({
                        key: String(field.key || ""),
                        label: String(field.label || ""),
                        placeHolder: String(field.placeHolder || ""),
                        required: Boolean(field.required),
                        element: String(field.element || ""),
                        type: String(field.type || ""),
                        options: Array.isArray(field.options) ? field.options.map((opt: any) => ({
                            label: String(opt.label || ""),
                            value: opt.value
                        })) : []
                    })) : [];

                    const newSection = {
                        section_name: sectionName,
                        campaign: updateData.section.campaign || "",
                        heading: updateData.section.heading || "",
                        subHeading: updateData.section.subHeading || "",
                        sectionType: updateData.section.sectionType || "",
                        content: updateData.section.content || "",
                        inputFields: sanitizedInputFields,
                        button: updateData.section.button || { label: "", style: {}, icon: "", apiCall: "" }
                    };

                    await dynamicPageModel.collection.updateOne(
                        { _id: new Types.ObjectId(_id) },
                        { $push: { sections: newSection } }
                    );
                    return successResponse(null, "Section added successfully");
                }
            }

            if (Object.keys(updateFields).length === 0) {
                return serviceNotAcceptable("No valid fields to update");
            }
            console.log("Update fields for page settings:", updateFields);
            await dynamicPageModel.updateOne({ _id: new Types.ObjectId(_id) }, { $set: updateFields });
            return successResponse(null, "Page settings updated successfully");
        } catch (err: any) {
            console.error("Error updating page settings:", err);
            return serviceNotAcceptable(err.message);
        }
    },
    createArticleCategory: async (category: string) => {
        try {
            const existingCategory = await articleCategoryModel.findOne({ category: category.toLowerCase() }).lean();
            if (existingCategory) {
                return serviceNotAcceptable("Category already exists");
            }
            const newCategory = new articleCategoryModel({ category: category.toLowerCase() });
            await newCategory.save();
            return successResponse(null, "Article category created successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    getArticleCategories: async () => {
        try {
            const categories = await articleCategoryModel.find({}).lean();
            return successResponse(categories, "Article categories fetched successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        }
    },
    addPageImage: async (params: {
        page_id: number,
        image: string,
        altText: string,
        aspectRatio: string
    }) => {
        try {
            await dynamicPageModel.updateOne(
                { _id: new Types.ObjectId(params.page_id) },
                { $push: { images: { image: params.image, altText: params.altText, aspectRatio: params.aspectRatio } } }
            )
            return successResponse({image: params.image}, "Image added to page successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        };
    },
    deletePageImage: async (params: {
        page_id: number,
        image: string,
    }) => {
        try {
            await dynamicPageModel.updateOne(
                { _id: new Types.ObjectId(params.page_id) },
                { $pull: { images: { image: params.image } } }
            )
            return successResponse({image: params.image}, "Image deleted from page successfully");
        } catch (err: any) {
            return serviceNotAcceptable(err.message);
        };
    }

}
export default dynamicPageSettingsModel;