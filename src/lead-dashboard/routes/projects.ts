import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import projectsController from "../controllers/projects";

const projectsRouter = Router();

projectsRouter.get("/list", [apiRateLimit(10, 10)], handelError(projectsController.listProjects));
projectsRouter.post("/create", [apiRateLimit(2, 5)], handelError(projectsController.createProject));
projectsRouter.post("/update", [apiRateLimit(5, 10)], handelError(projectsController.updateProject));
projectsRouter.get("/modules/list", [apiRateLimit(10, 10)], handelError(projectsController.listModules));
projectsRouter.post("/modules/create", [apiRateLimit(2, 5)], handelError(projectsController.createModule));
projectsRouter.post("/modules/update", [apiRateLimit(5, 10)], handelError(projectsController.updateModule));

export default projectsRouter;
