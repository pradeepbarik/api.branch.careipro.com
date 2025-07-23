import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import enquiryController from '../controller/enquiry';
const routes=Router();
routes.get('/get-enquiry-list',[apiRateLimit(30,30)],handelError(enquiryController.enquiryList));
export default routes;