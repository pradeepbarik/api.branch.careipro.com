import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import homeController from '../controller';
import appointmentController from '../controller/appointment';
const routes=Router();
routes.get('/get-branches',[apiRateLimit(1,5)],handelError(homeController.branches));
routes.get('/get-state-list',[apiRateLimit(10,30)],handelError(homeController.getStateList));
routes.get('/get-districts-list',[apiRateLimit(10,30)],handelError(homeController.getDistricts));
routes.post('/update-clinic-info-change-tracker',handelError(homeController.updateClinicInfoChangeTracker));
routes.get('/create-booking-case',[apiRateLimit(1,1)],handelError(appointmentController.createBookingCase));
routes.get("/appointment-mysql-to-mongo",appointmentController.moveMysqlToMongo)
export default routes;
