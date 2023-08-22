import {Router} from 'express';
import {apiRateLimit,handelError,employeeValidation} from '../middleware';
import ratingAndReviewController from '../controller/rating-and-review';
const ratingRoutes=Router();
ratingRoutes.get('/appointment-rating-and-reviews',[apiRateLimit(10,30)],handelError(ratingAndReviewController.getAppointmentRatingandReviews))
export default ratingRoutes;