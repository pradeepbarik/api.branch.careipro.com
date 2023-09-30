import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import locationController from '../controller/location';
const settingsRoutes=Router();
//get-missed-village-list - customer app location selection when customer didn't find his village and added by him manually
settingsRoutes.get('/get-missed-village-list',[apiRateLimit(1,3)],handelError(locationController.getMissedareaList));
settingsRoutes.post('/add-missed-village',[apiRateLimit(1,3)],handelError(locationController.addMissedArea));
settingsRoutes.post('/reject-add-area-request',[apiRateLimit(1,3)],handelError(locationController.rejectAddAreaRequest));
settingsRoutes.get('/get-clinic-available-areas',[apiRateLimit(10,60)],handelError(locationController.getClinicAvailableAreas));
settingsRoutes.post('/add-clinic-available-market',[apiRateLimit(1,5)],handelError(locationController.addClinicAvailableMarket));
export default settingsRoutes;