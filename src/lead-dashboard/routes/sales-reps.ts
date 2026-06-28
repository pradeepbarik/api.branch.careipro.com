import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import salesRepsController from "../controllers/sales-reps";

const salesRepsRouter = Router();

salesRepsRouter.get("/list", [apiRateLimit(10, 10)], handelError(salesRepsController.list));
salesRepsRouter.post("/create", [apiRateLimit(2, 5)], handelError(salesRepsController.create));
salesRepsRouter.post("/update", [apiRateLimit(5, 10)], handelError(salesRepsController.update));
salesRepsRouter.post("/toggle-status", [apiRateLimit(2, 5)], handelError(salesRepsController.toggleStatus));

export default salesRepsRouter;
