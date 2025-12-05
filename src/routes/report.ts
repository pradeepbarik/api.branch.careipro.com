import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import AppointmentController from '../controller/appointment';
import pageVisiterController from '../controller/page-visiter';
import reportController from '../controller/report';
const reportRouter = Router();
reportRouter.get("/business-listing-summary",[apiRateLimit(10,10)],handelError(reportController.businessListingSummary));
reportRouter.get('/todays-booked-appointment-doctors', [apiRateLimit(10, 30)], handelError(AppointmentController.getTodaysAppointmentBookedDoctors));
reportRouter.get('/patients-doctor-list', [apiRateLimit(10, 30)], handelError(AppointmentController.getTodaysPatientsDoctorList));
reportRouter.get("/site-visiters",[apiRateLimit(10,10)],handelError(pageVisiterController.getPageVisiters));

export default reportRouter;