import { Router } from "express";
import { apiRateLimit, handelError } from "../../middleware";
import incentiveSlabsController from "../controllers/incentive-slabs";

const incentiveSlabsRouter = Router();

incentiveSlabsRouter.get("/list", [apiRateLimit(10, 10)], handelError(incentiveSlabsController.getSlabs));
incentiveSlabsRouter.post("/set", [apiRateLimit(2, 5)], handelError(incentiveSlabsController.setSlabs));

export default incentiveSlabsRouter;
