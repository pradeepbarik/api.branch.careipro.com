import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import dashboardController from "../controllers/dashboard";

const dashboardRouter = Router();

dashboardRouter.get("/summary", [apiRateLimit(10, 10)], handelError(dashboardController.summary));

export default dashboardRouter;
