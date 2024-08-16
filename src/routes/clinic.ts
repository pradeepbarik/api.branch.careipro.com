import {Router} from 'express';
import {apiRateLimit,handelError,employeeValidation,checkUnderBranch} from '../middleware';
import clinicController from '../controller/clinic';
const clinicRoutes=Router();
clinicRoutes.get('/login-token',[apiRateLimit(2,20),employeeValidation(1),checkUnderBranch],handelError(clinicController.getLoginToken));
clinicRoutes.get('/seo-url-availability-check',[apiRateLimit(5,20)],handelError(clinicController.checkClinicSeourlAvailability));
clinicRoutes.get('/mobile-unique-check',[apiRateLimit(5,20)],handelError(clinicController.checkClinicMobileUnique));
clinicRoutes.get('/username-unique-check',[apiRateLimit(5,20)],handelError(clinicController.checkClinicloginUserNameUnique));
clinicRoutes.post('/add-new-clinic',[apiRateLimit(1,4),employeeValidation(1)],handelError(clinicController.addNewClinic));
clinicRoutes.get('/clinic-list',[apiRateLimit(1,4)],handelError(clinicController.getClinicList));
clinicRoutes.get('/clinic-detail',[apiRateLimit(10,20)],handelError(clinicController.getClinicDetail));
clinicRoutes.post('/clinic-detail',[apiRateLimit(1,5),employeeValidation(1),checkUnderBranch],handelError(clinicController.saveClinicDetail));
clinicRoutes.get('/get-doctors-list',[apiRateLimit(1,4)],handelError(clinicController.getDoctorsList));
clinicRoutes.get('/get-doctors-for-drop-down',[apiRateLimit(30,60)],handelError(clinicController.getDoctorsForDropDown));
clinicRoutes.get('/doctor-complete-details',[apiRateLimit(1,3)],handelError(clinicController.doctorCompleteDetails));
clinicRoutes.post('/approve-doctor',[apiRateLimit(1,3),employeeValidation(1)],handelError(clinicController.approveDoctor));
clinicRoutes.post('/change-doctor-active-status',[apiRateLimit(1,3),employeeValidation(1)],handelError(clinicController.changeDoctorActiveStatus));
clinicRoutes.get('/clinic-banners',[apiRateLimit(1,3)],handelError(clinicController.clinicBanners));
clinicRoutes.get('/clinic-specialization',[apiRateLimit(1,3)],handelError(clinicController.clinicSpecializations));
clinicRoutes.post('/clinic-specialization',[apiRateLimit(1,3),employeeValidation(1),checkUnderBranch],handelError(clinicController.updateClinicSpecialization));
clinicRoutes.get('/get-clinic-staffs',[apiRateLimit(1,3)],handelError(clinicController.getClinicStaffs));
clinicRoutes.post('/add-clinic-staff',[apiRateLimit(1,10)],handelError(clinicController.addClinicStaff));
export default clinicRoutes;
