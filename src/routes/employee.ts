import e, { Router } from "express";
import {apiRateLimit,handelError,parseFormData,employeeValidation} from '../middleware';
const employeeRouter=Router();
import employeeController from "../controller/employee";
employeeRouter.get("/employee-list",[apiRateLimit(5,10),employeeValidation(1)],handelError(employeeController.employeeList));
employeeRouter.post("/add-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.addEmployee));
employeeRouter.get("/employee-detail",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.employeeDetail));
employeeRouter.post("/change-reporter",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.changeReportingEmployee));
employeeRouter.get("/delete-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deleteEmployee));
employeeRouter.post("/activate-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.activateEmployee));
employeeRouter.post("/deactivate-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deActiveEmployee));
employeeRouter.post("/upload-profile-picture",[apiRateLimit(1,5),employeeValidation(1),parseFormData],handelError(employeeController.uploadProfilePicture));
employeeRouter.post("/upload-employee-document",[apiRateLimit(1,5),employeeValidation(1),parseFormData],handelError(employeeController.uploadEmployeeDocument));
employeeRouter.post("/delete-employee-document",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deleteDocument));

export default employeeRouter;