import {Router} from 'express';
import {apiRateLimit,handelError,parseFormData,employeeValidation} from '../middleware';
import locationController from '../controller/location';
import popularDoctorController from '../controller/popular-doctor';
import popularClinicController from '../controller/clinic/popular-clinic';
import categoriesController from '../controller/categories';
import settingsController from '../controller/settings';
const settingsRoutes=Router();
//get-missed-village-list - customer app location selection when customer didn't find his village and added by him manually
settingsRoutes.get('/get-missed-village-list',[apiRateLimit(1,3)],handelError(locationController.getMissedareaList));
settingsRoutes.post('/add-missed-village',[apiRateLimit(1,3)],handelError(locationController.addMissedArea));
settingsRoutes.post('/reject-add-area-request',[apiRateLimit(1,3)],handelError(locationController.rejectAddAreaRequest));
settingsRoutes.get('/get-clinic-available-areas',[apiRateLimit(10,60)],handelError(locationController.getClinicAvailableAreas));
settingsRoutes.post('/add-clinic-available-market',[apiRateLimit(1,5)],handelError(locationController.addClinicAvailableMarket));
settingsRoutes.post('/update-clinic-available-market',[apiRateLimit(3,20),employeeValidation(1)],handelError(locationController.updateClinicAvailableMarket));
settingsRoutes.get('/popular-doctors',[apiRateLimit(1,3)],handelError(popularDoctorController.getDoctorsList));
settingsRoutes.post('/update-popular-doctor',[apiRateLimit(10,60)],handelError(popularDoctorController.updatePopularDoctor));
settingsRoutes.get('/popular-clinics',[apiRateLimit(15,60)],handelError(popularClinicController.getClinicList));
settingsRoutes.post('/update-popular-clinic',[apiRateLimit(5,60),parseFormData],handelError(popularClinicController.updatePopularClinic));
settingsRoutes.post('/set-nearby-city',[apiRateLimit(5,10)],handelError(locationController.setNearByCity));
settingsRoutes.get('/get-nearby-cities',[apiRateLimit(10,30)],handelError(locationController.getNearByCities));
settingsRoutes.post('/update-nearby-city',[apiRateLimit(1,10)],handelError(locationController.updateNearbyCity));
settingsRoutes.post('/update-city',[apiRateLimit(60,60),parseFormData],handelError(locationController.updateCity));
settingsRoutes.get('/categories',[apiRateLimit(5,20)],handelError(categoriesController.getSpecialists));
settingsRoutes.post('/categories',[apiRateLimit(3,20),parseFormData],handelError(categoriesController.addNewSpecialist));
settingsRoutes.get("/page-settings",[apiRateLimit(4,20)],handelError(settingsController.getPageSettings));
settingsRoutes.post("/page-settings",[apiRateLimit(1,5),employeeValidation(1)],handelError(settingsController.savePageSettings));
export default settingsRoutes;