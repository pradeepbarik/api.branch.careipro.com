import { Request, Response } from "express";
import fs from "fs";
import { FormdataRequest } from "../../types";
import Joi from "joi";
import { internalServerError, parameterMissingResponse, successResponse, unauthorizedResponse } from "../../services/response";
import { campaignsModel } from "../../mongo-schema/advatisement/coll_campaigns";
import { adsModel } from "../../mongo-schema/advatisement/coll_ads";
import { get_current_datetime } from "../../services/datetime";
import path from "path";
import { cleanString } from "../../helper";
import { ad_path } from "../../constants";
import { uploadFileToServer } from "../../services/file-upload";

const requestParams = {
    createCampaign: Joi.object({
        campaignName: Joi.string().required(),
        advertiserBusinessType: Joi.string().valid('CLINIC', 'DOCTOR', 'CARETAKER', 'MEDICINESTORE', 'PHYSIOTHERAPY', 'CAREIPRO').required(),
        advertiserId: Joi.number().optional().allow(null), // Optional for service promotions
        salesEmpId: Joi.number().required(),
        campaignType: Joi.string().valid('banner', 'video', 'carousel', 'story').required(),
        pricingModel: Joi.string().valid('cpc', 'cpm', 'cpa', 'fixed').optional(), // Optional for service promotions
        bidAmount: Joi.number().min(0).optional(), // Optional for service promotions
        budget: Joi.object({
            total: Joi.number().min(0).default(0),
            daily: Joi.number().min(0).default(0),
        }),
        startTime: Joi.string().required(),
        endTime: Joi.string().required(),
        targetImpression: Joi.number().min(0).default(0),
        targetClick: Joi.number().min(0).default(0),
        isServicePromotion: Joi.boolean().default(false),
        status: Joi.string().valid('active', 'paused', 'draft', 'completed').default('active'),
    }),
    createAd: Joi.object({
        campaignId: Joi.string().required(),
        media_type: Joi.string().valid('image', 'video').required(),
        link: Joi.string().optional(),
        alt: Joi.string().allow('').default(''),
        asp_ratio: Joi.string().required(),
        status: Joi.string().valid('active', 'paused', 'draft').default('active'),
        start_time: Joi.string().required(),
        end_time: Joi.string().required(),
        target_impression: Joi.number().min(0).default(0),
        target_click: Joi.number().min(0).default(0),
        page_types: Joi.array().items(Joi.string().valid('all', 'home', 'doctor_list', 'doctor_detail', 'clinic_list', 'clinic_detail')).default(['all']),
        banner_categories: Joi.array().items(Joi.number()).default([]),
        target_cities: Joi.array().items(Joi.string()).default([]),
        banner_link: Joi.string().uri().required(),
        cta_button_text: Joi.string().allow('').default(''),
        cta_button_url: Joi.string().uri().allow('').default(''),
    }),
};

const adsController = {
    createCampaign: async (req: Request, res: Response) => {
        try {
            const { body }: { body: any } = req;
            const { tokenInfo } = res.locals;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            // Validate request body
            const validation = requestParams.createCampaign.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }

            // For advertiser campaigns, pricing model and bid amount are required
            if (!body.isServicePromotion) {
                if (!body.pricingModel) {
                    parameterMissingResponse("Pricing model is required for advertiser campaigns", res);
                    return;
                }
                if (!body.bidAmount || body.bidAmount <= 0) {
                    parameterMissingResponse("Valid bid amount is required for advertiser campaigns", res);
                    return;
                }
            }

            // Validate date range
            const startDate = new Date(body.startTime);
            const endDate = new Date(body.endTime);
            if (startDate >= endDate) {
                parameterMissingResponse("End date must be after start date", res);
                return;
            }

            // Get advertiser name based on business type
            let advertiserName = "";
            let branchCity = tokenInfo.bd || ""; // branch district/city from token

            if (body.isServicePromotion) {
                // For service promotions, no advertiser needed
                advertiserName = 'Careipro - ' + tokenInfo.bd;
            } else if (body.advertiserBusinessType === 'CLINIC') {
                const clinic: any = await DB.get_row(
                    "SELECT name, city FROM clinics WHERE id = ? AND branch_id = ?",
                    [body.advertiserId, tokenInfo.bid]
                );
                if (!clinic) {
                    parameterMissingResponse("Clinic not found or doesn't belong to your branch", res);
                    return;
                }
                advertiserName = clinic.name;
                branchCity = clinic.city || branchCity;
            } else if (body.advertiserBusinessType === 'DOCTOR') {
                const doctor: any = await DB.get_row(
                    "SELECT name FROM doctor WHERE id = ? AND branch_id = ?",
                    [body.advertiserId, tokenInfo.bid]
                );
                if (!doctor) {
                    parameterMissingResponse("Doctor not found or doesn't belong to your branch", res);
                    return;
                }
                advertiserName = doctor.name;
            } else {
                // For other types, just use the ID for now
                advertiserName = `${body.advertiserBusinessType}-${body.advertiserId}`;
            }

            // Get current IST datetime as Date object
            const now = new Date(get_current_datetime());

            // Create campaign document
            const campaign = await campaignsModel.create({
                branch_city: branchCity,
                sales_emp_id: body.salesEmpId,
                advertiserId: body.isServicePromotion ? null : body.advertiserId,
                advertiserName: advertiserName,
                advertiserBusinessType: body.advertiserBusinessType,
                campaignName: body.campaignName,
                campaignType: body.campaignType,
                status: body.status || 'active',
                budget: body.budget || { total: 0, daily: 0 },
                pricingModel: body.pricingModel || null,
                bidAmount: body.bidAmount || null,
                isServicePromotion: body.isServicePromotion || false,
                startTime: startDate,
                endTime: endDate,
                targetImpression: body.targetImpression || 0,
                targetClick: body.targetClick || 0,
                createdAt: now,
                ads: [],
            });

            res.json(successResponse({
                campaign_id: campaign._id,
                campaignName: campaign.campaignName,
                status: campaign.status,
            }, "Campaign created successfully"));

        } catch (err) {
            console.error("Create campaign error:", err);
            internalServerError("Something went wrong", res);
        }
    },
    updateAd: async (req: Request, res: Response) => {
        try {
            const { body }: { body: any } = req;
            const { tokenInfo } = res.locals;
            const { adId } = req.params;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            if (!adId) {
                parameterMissingResponse("Ad ID is required", res);
                return;
            }

            // Parse JSON strings from FormData
            if (typeof body.page_types === 'string') {
                body.page_types = JSON.parse(body.page_types);
            }
            if (typeof body.banner_categories === 'string') {
                body.banner_categories = JSON.parse(body.banner_categories);
            }
            if (typeof body.target_cities === 'string') {
                body.target_cities = JSON.parse(body.target_cities);
            }

            // Validate request body
            const validation = requestParams.createAd.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }

            // Validate date range
            const startDate = new Date(body.start_time);
            const endDate = new Date(body.end_time);
            if (startDate >= endDate) {
                parameterMissingResponse("End date must be after start date", res);
                return;
            }

            // Find the ad
            const existingAd = await adsModel.findById(adId);
            if (!existingAd) {
                parameterMissingResponse("Ad not found", res);
                return;
            }

            // Update ad document
            const updatedAd = await adsModel.findByIdAndUpdate(
                adId,
                {
                    media_type: body.media_type,
                    link: body.link,
                    alt: body.alt,
                    asp_ratio: body.asp_ratio,
                    status: body.status,
                    page_types: body.page_types,
                    banner_categories: body.banner_categories,
                    target_cities: body.target_cities,
                    banner_link: body.banner_link,
                    cta_button_text: body.cta_button_text || '',
                    cta_button_url: body.cta_button_url || '',
                    start_time: startDate,
                    end_time: endDate,
                    target_impression: body.target_impression || 0,
                    target_click: body.target_click || 0,
                },
                { new: true }
            );

            res.json(successResponse({
                ad_id: updatedAd?._id,
                status: updatedAd?.status,
            }, "Ad updated successfully"));

        } catch (err) {
            console.error("Update ad error:", err);
            internalServerError("Something went wrong", res);
        }
    }, 
    getCampaigns: async (req: Request, res: Response) => {
        try {
            const { tokenInfo } = res.locals;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            const rows = await campaignsModel.find({ branch_city: tokenInfo.bd }).lean();
            res.json(successResponse(rows));
        } catch (err) {
            internalServerError("Something went wrong", res);
        }
    },
    getCampaignDetail: async (req: Request, res: Response) => {
        try {
            const { tokenInfo } = res.locals;
            const { campaignId } = req.params;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            if (!campaignId) {
                parameterMissingResponse("Campaign ID is required", res);
                return;
            }

            const campaign = await campaignsModel.findById(campaignId).lean();

            if (!campaign) {
                parameterMissingResponse("Campaign not found", res);
                return;
            }

            // Verify campaign belongs to same branch
            if (campaign.branch_city !== tokenInfo.bd) {
                unauthorizedResponse("You don't have permission to access this campaign", res);
                return;
            }

            res.json(successResponse(campaign));
        } catch (err) {
            console.error("Get campaign detail error:", err);
            internalServerError("Something went wrong", res);
        }
    },
    getAdsByCampaign: async (req: Request, res: Response) => {
        try {
            const { tokenInfo } = res.locals;
            const { campaignId } = req.params;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            if (!campaignId) {
                parameterMissingResponse("Campaign ID is required", res);
                return;
            }

            // Find all ads for this campaign
            const ads = await adsModel.find({ campaignId }).lean();

            res.json(successResponse(ads));
        } catch (err) {
            console.error("Get ads by campaign error:", err);
            internalServerError("Something went wrong", res);
        }
    },
    createAd: async (req: FormdataRequest, res: Response) => {
        try {
            const { body, files }: { body: any, files?: any } = req;
            const { tokenInfo } = res.locals;

            if (typeof tokenInfo === 'undefined') {
                unauthorizedResponse("Permission denied! Please login to access", res);
                return;
            }

            // Parse JSON strings from FormData
            if (typeof body.page_types === 'string') {
                body.page_types = JSON.parse(body.page_types);
            }
            if (typeof body.banner_categories === 'string') {
                body.banner_categories = JSON.parse(body.banner_categories);
            }
            if (typeof body.target_cities === 'string') {
                body.target_cities = JSON.parse(body.target_cities);
            }

            // Validate request body
            const validation = requestParams.createAd.validate(body);
            if (validation.error) {
                parameterMissingResponse(validation.error.details[0].message, res);
                return;
            }
            // Validate date range
            const startDate = new Date(body.start_time);
            const endDate = new Date(body.end_time);
            if (startDate >= endDate) {
                parameterMissingResponse("End date must be after start date", res);
                return;
            }

            // Find the campaign and verify it exists
            const campaign = await campaignsModel.findById(body.campaignId);
            if (!campaign) {
                parameterMissingResponse("Campaign not found", res);
                return;
            }
            if (files && files.media_file) {
                let banner_name = "";
                let branch_ad_path = path.join(ad_path, campaign.branch_city.replace(/\s+/g, '-').toLowerCase(),cleanString(campaign.advertiserName.replace(/\s+/g, '-').toLowerCase()));
                branch_ad_path && !fs.existsSync(branch_ad_path) && fs.mkdirSync(branch_ad_path, { recursive: true });
                banner_name = cleanString(`${campaign.campaignName} ad${Date.now()}`) + path.extname(files.media_file.originalFilename);
                uploadFileToServer(files.media_file.filepath, path.join(branch_ad_path, banner_name));
                body.link=campaign.branch_city.replace(/\s+/g, '-').toLowerCase() +"/"+ cleanString(campaign.advertiserName.replace(/\s+/g, '-').toLowerCase()) + "/" + banner_name;
            }

            // Get current IST datetime as Date object
            const now = new Date(get_current_datetime());

            // Create ad document
            const ad = await adsModel.create({
                branch_city: campaign.branch_city,
                campaignId: body.campaignId,
                advatiserName: campaign.advertiserName,
                isServicePromotion: campaign.isServicePromotion || false,
                bidAmount: campaign.bidAmount || 1,
                pricingModel: campaign.pricingModel,
                campaign_name: campaign.campaignName,
                media_type: body.media_type,
                link: body.link,
                alt: body.alt,
                asp_ratio: body.asp_ratio,
                status: body.status || 'active',
                page_types: body.page_types || ['all'],
                banner_categories: body.banner_categories || [],
                target_cities: body.target_cities || [],
                banner_link: body.banner_link,
                cta_button_text: body.cta_button_text || '',
                cta_button_url: body.cta_button_url || '',
                start_time: startDate,
                end_time: endDate,
                target_impression: body.target_impression || 0,
                target_click: body.target_click || 0,
                impression: 0,
                click: 0,
                conversion: 0,
                created_at: now,
            });

            // Update campaign's ads array
            await campaignsModel.findByIdAndUpdate(
                body.campaignId,
                { $push: { ads: ad._id } }
            );

            res.json(successResponse({
                ad_id: ad._id,
                campaign_name: campaign.campaignName,
                status: ad.status,
            }, "Ad created successfully"));

        } catch (err) {
            console.error("Create ad error:", err);
            internalServerError("Something went wrong", res);
        }
    }
}
export default adsController;