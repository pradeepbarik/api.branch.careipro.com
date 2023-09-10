import {Router} from 'express';
import {apiRateLimit,handelError,employeeValidation} from '../middleware';
import ratingAndReviewController from '../controller/rating-and-review';
const ratingRoutes=Router();
ratingRoutes.get('/appointment-rating-and-reviews',[apiRateLimit(10,30)],handelError(ratingAndReviewController.getAppointmentRatingandReviews));
ratingRoutes.post('/verified-review',[apiRateLimit(40,60),employeeValidation(1)],handelError(ratingAndReviewController.verifiedReview));
ratingRoutes.post('/reject-review',[apiRateLimit(40,60),employeeValidation(1)],handelError(ratingAndReviewController.rejectReview));
ratingRoutes.post('/delete-review',[apiRateLimit(20,60),employeeValidation(1)],handelError(ratingAndReviewController.rejectReview));
export default ratingRoutes;