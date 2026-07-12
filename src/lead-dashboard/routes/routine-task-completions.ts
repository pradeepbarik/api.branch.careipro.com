import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import routineTaskCompletionsController from "../controllers/routine-task-completions";

const routineTaskCompletionsRouter = Router();

routineTaskCompletionsRouter.post("/set-status", [apiRateLimit(15, 10)], handelError(routineTaskCompletionsController.setStatus));
routineTaskCompletionsRouter.post("/set-note", [apiRateLimit(15, 10)], handelError(routineTaskCompletionsController.setNote));
routineTaskCompletionsRouter.post("/rate", [apiRateLimit(15, 10)], handelError(routineTaskCompletionsController.rate));
routineTaskCompletionsRouter.get("/list", [apiRateLimit(10, 10)], handelError(routineTaskCompletionsController.list));

export default routineTaskCompletionsRouter;
