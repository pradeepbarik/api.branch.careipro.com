import { Router } from "express";
import {apiRateLimit,handelError,parseFormData,employeeValidation} from '../middleware';
import notesController from "../controller/notes";
const notesRouter=Router();
notesRouter.post("/create",[apiRateLimit(1,2)],notesController.create);
export default notesRouter;