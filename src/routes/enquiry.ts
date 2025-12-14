import {Router} from 'express';
import {apiRateLimit,handelError,employeeValidation} from '../middleware';
import enquiryController from '../controller/enquiry';
const routes=Router();
routes.get('/get-enquiry-list',[apiRateLimit(30,30)],handelError(enquiryController.enquiryList));
routes.post('/update-enquiry-status',[apiRateLimit(1,2),employeeValidation(1)],handelError(enquiryController.updateEnquiryStatus));
export default routes;