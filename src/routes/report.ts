import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import AppointmentController from '../controller/appointment';
const reportRouter = Router();
reportRouter.get('/todays-booked-appointment-doctors', [apiRateLimit(10, 30)], handelError(AppointmentController.getTodaysAppointmentBookedDoctors));
reportRouter.get('/patients-doctor-list', [apiRateLimit(10, 30)], handelError(AppointmentController.getTodaysPatientsDoctorList));

export default reportRouter;