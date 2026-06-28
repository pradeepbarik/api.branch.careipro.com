import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import targetsController from "../controllers/targets";

const targetsRouter = Router();

targetsRouter.get("/list", [apiRateLimit(10, 10)], handelError(targetsController.getTargets));
targetsRouter.post("/set", [apiRateLimit(5, 10)], handelError(targetsController.setTarget));
targetsRouter.get("/achievements/list", [apiRateLimit(10, 10)], handelError(targetsController.getAchievements));
targetsRouter.post("/achievements/set", [apiRateLimit(5, 10)], handelError(targetsController.setAchievement));

export default targetsRouter;
