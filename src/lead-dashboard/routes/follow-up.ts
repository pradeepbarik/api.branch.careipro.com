import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import followUpController from "../controllers/follow-up";

const followUpRouter = Router();

followUpRouter.post("/log", [apiRateLimit(5, 10)], handelError(followUpController.log));
followUpRouter.post("/rate", [apiRateLimit(10, 10)], handelError(followUpController.rate));
followUpRouter.get("/history", [apiRateLimit(10, 10)], handelError(followUpController.history));
followUpRouter.get("/reminders", [apiRateLimit(10, 10)], handelError(followUpController.todayAndOverdue));

export default followUpRouter;
