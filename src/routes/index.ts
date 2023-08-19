import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import homeController from '../controller';
const routes=Router();
routes.get('/get-branches',[apiRateLimit(1,5)],handelError(homeController.branches));
export default routes;
