import { Router } from "express";
const adsRoutes = Router();
import { apiRateLimit, handelError, parseFormData } from "../middleware";
import adsController from "../controller/ads";

adsRoutes.post("/create-campaign", [apiRateLimit(20, 60)], handelError(adsController.createCampaign));
adsRoutes.get("/get-campaigns", [apiRateLimit(30, 60)], handelError(adsController.getCampaigns));
adsRoutes.get("/get-campaign/:campaignId", [apiRateLimit(30, 60)], handelError(adsController.getCampaignDetail));
adsRoutes.get("/get-ads/:campaignId", [apiRateLimit(30, 60)], handelError(adsController.getAdsByCampaign));
adsRoutes.post("/create-ad", [apiRateLimit(20, 60), parseFormData], handelError(adsController.createAd));
adsRoutes.put("/update-ad/:adId", [apiRateLimit(20, 60), parseFormData], handelError(adsController.updateAd));

export default adsRoutes;