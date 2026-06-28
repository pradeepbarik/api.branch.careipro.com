import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import leadsController from "../controllers/leads";

const leadsRouter = Router();

leadsRouter.get("/list", [apiRateLimit(10, 10)], handelError(leadsController.list));
leadsRouter.get("/detail", [apiRateLimit(10, 10)], handelError(leadsController.detail));
leadsRouter.post("/create", [apiRateLimit(5, 10)], handelError(leadsController.create));
leadsRouter.post("/update", [apiRateLimit(5, 10)], handelError(leadsController.update));
leadsRouter.post("/change-status", [apiRateLimit(10, 10)], handelError(leadsController.changeStatus));
leadsRouter.post("/assign", [apiRateLimit(5, 10)], handelError(leadsController.assign));
leadsRouter.get("/assignment-log", [apiRateLimit(10, 10)], handelError(leadsController.assignmentLog));
leadsRouter.post("/delete", [apiRateLimit(2, 5)], handelError(leadsController.delete));

export default leadsRouter;
