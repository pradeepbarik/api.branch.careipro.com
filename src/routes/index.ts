import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import homeController from '../controller';
const routes=Router();
routes.get('/get-branches',[apiRateLimit(1,5)],handelError(homeController.branches));
routes.get('/get-state-list',[apiRateLimit(10,30)],handelError(homeController.getStateList));
routes.get('/get-districts-list',[apiRateLimit(10,30)],handelError(homeController.getDistricts));
export default routes;
