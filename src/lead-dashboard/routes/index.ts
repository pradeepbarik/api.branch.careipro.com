import { Router } from "express";
import leadsRouter from "./leads";
import followUpRouter from "./follow-up";
import salesRepsRouter from "./sales-reps";
import dailyActivityRouter from "./daily-activity";
import targetsRouter from "./targets";
import projectsRouter from "./projects";
import incentiveSlabsRouter from "./incentive-slabs";
import dashboardRouter from "./dashboard";

const leadDashboardRouter = Router();

leadDashboardRouter.use("/leads", leadsRouter);
leadDashboardRouter.use("/follow-up", followUpRouter);
leadDashboardRouter.use("/sales-reps", salesRepsRouter);
leadDashboardRouter.use("/daily-activity", dailyActivityRouter);
leadDashboardRouter.use("/targets", targetsRouter);
leadDashboardRouter.use("/projects", projectsRouter);
leadDashboardRouter.use("/incentive-slabs", incentiveSlabsRouter);
leadDashboardRouter.use("/dashboard", dashboardRouter);

export default leadDashboardRouter;
