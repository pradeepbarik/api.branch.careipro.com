import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import commonapiController from '../controller/common-api';
const routes=Router();
routes.get("/search-otp",[apiRateLimit(1,2)],handelError(commonapiController.searchOtp))
export default routes;