import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import routineTasksController from "../controllers/routine-tasks";

const routineTasksRouter = Router();

routineTasksRouter.get("/list", [apiRateLimit(10, 10)], handelError(routineTasksController.list));
routineTasksRouter.post("/create", [apiRateLimit(5, 10)], handelError(routineTasksController.create));
routineTasksRouter.post("/update", [apiRateLimit(5, 10)], handelError(routineTasksController.update));
routineTasksRouter.post("/delete", [apiRateLimit(2, 5)], handelError(routineTasksController.delete));

export default routineTasksRouter;
