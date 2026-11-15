import e, { Router } from "express";
import {apiRateLimit,handelError,parseFormData,employeeValidation} from '../middleware';
const employeeRouter=Router();
import employeeController from "../controller/employee";
//level 0 so an in-active employee still gets an answer (level 1 would reject them before the handler)
employeeRouter.get("/session-status",[apiRateLimit(5,10),employeeValidation(0)],handelError(employeeController.sessionStatus));
employeeRouter.get("/employee-list",[apiRateLimit(5,10),employeeValidation(1)],handelError(employeeController.employeeList));
employeeRouter.post("/add-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.addEmployee));
employeeRouter.get("/employee-detail",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.employeeDetail));
employeeRouter.post("/change-reporter",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.changeReportingEmployee));
employeeRouter.post("/set-branch-manager",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.setBranchManager));
employeeRouter.get("/delete-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deleteEmployee));
employeeRouter.post("/activate-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.activateEmployee));
employeeRouter.post("/deactivate-employee",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deActiveEmployee));
employeeRouter.post("/reset-password",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.resetPassword));
employeeRouter.post("/upload-profile-picture",[apiRateLimit(1,5),employeeValidation(1),parseFormData],handelError(employeeController.uploadProfilePicture));
employeeRouter.post("/upload-employee-document",[apiRateLimit(1,5),employeeValidation(1),parseFormData],handelError(employeeController.uploadEmployeeDocument));
employeeRouter.post("/delete-employee-document",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.deleteDocument));
employeeRouter.get("/department-list",[apiRateLimit(5,10),employeeValidation(1)],handelError(employeeController.departmentList));
employeeRouter.post("/update-department",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.updateDepartment));
employeeRouter.post("/update-sales-role",[apiRateLimit(1,5),employeeValidation(1)],handelError(employeeController.updateSalesRole));

export default employeeRouter;