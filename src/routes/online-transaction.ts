import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import onlineTransactionController from '../controller/online-transaction';
const onlineTransactionRoutes=Router();
onlineTransactionRoutes.get('/history',[apiRateLimit(10,20)],handelError(onlineTransactionController.history));
onlineTransactionRoutes.get('/count-day-wise-of-month',[apiRateLimit(10,20)],handelError(onlineTransactionController.countDayWiseOfMonth));
export default onlineTransactionRoutes;