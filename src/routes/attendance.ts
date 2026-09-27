import { Router } from 'express';
import { apiRateLimit, handelError, employeeValidation } from '../middleware';
import attendanceController from '../controller/attendance';
const attendanceRoutes = Router();
//every route needs an active employee, level 1 rejects an in-active one
attendanceRoutes.post('/start-duty', [apiRateLimit(5, 5), employeeValidation(1)], handelError(attendanceController.startDuty));
attendanceRoutes.post('/end-duty', [apiRateLimit(5, 5), employeeValidation(1)], handelError(attendanceController.endDuty));
attendanceRoutes.get('/my-attendance', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.myAttendance));
attendanceRoutes.get('/my-duty-settings', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.myDutySettings));
attendanceRoutes.get('/my-access', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.myAttendanceAccess));
attendanceRoutes.post('/apply-leave', [apiRateLimit(5, 10), employeeValidation(1)], handelError(attendanceController.applyLeave));
attendanceRoutes.get('/my-leaves', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.myLeaves));
//branch manager only, the controller checks is_branch_manager on the employee row
attendanceRoutes.get('/branch-day', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.branchDay));
attendanceRoutes.get('/employee-attendance', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.employeeAttendance));
attendanceRoutes.post('/admin-mark-attendance', [apiRateLimit(10, 10), employeeValidation(1)], handelError(attendanceController.adminMarkAttendance));
attendanceRoutes.get('/duty-settings', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.dutySettings));
attendanceRoutes.post('/save-duty-settings', [apiRateLimit(10, 10), employeeValidation(1)], handelError(attendanceController.saveDutySettings));
attendanceRoutes.get('/leave-requests', [apiRateLimit(20, 30), employeeValidation(1)], handelError(attendanceController.leaveRequests));
attendanceRoutes.post('/review-leave', [apiRateLimit(10, 10), employeeValidation(1)], handelError(attendanceController.reviewLeave));
export default attendanceRoutes;
