import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import dailyActivityController from "../controllers/daily-activity";

const dailyActivityRouter = Router();

dailyActivityRouter.post("/log", [apiRateLimit(5, 10)], handelError(dailyActivityController.log));
dailyActivityRouter.get("/list", [apiRateLimit(10, 10)], handelError(dailyActivityController.list));

export default dailyActivityRouter;
