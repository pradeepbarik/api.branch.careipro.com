import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import locationController from '../controller/location';
const settingsRoutes=Router();
//get-missed-village-list - customer app location selection when customer didn't find his village and added by him manually
settingsRoutes.get('/get-missed-village-list',[apiRateLimit(1,3)],handelError(locationController.getMissedareaList));
export default settingsRoutes;