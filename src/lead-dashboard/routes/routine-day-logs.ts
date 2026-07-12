import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import routineDayLogsController from "../controllers/routine-day-logs";

const routineDayLogsRouter = Router();

routineDayLogsRouter.post("/save", [apiRateLimit(10, 10)], handelError(routineDayLogsController.save));
routineDayLogsRouter.get("/list", [apiRateLimit(10, 10)], handelError(routineDayLogsController.list));

export default routineDayLogsRouter;
