import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import smsTransactionsController from '../controller/sms-transaction';
const smsTransactionRoutes=Router();
smsTransactionRoutes.get('/sms-history',[apiRateLimit(10,20)],handelError(smsTransactionsController.getSmsHistory));
smsTransactionRoutes.get('/sms-count-day-wise-of-month',[apiRateLimit(10,20)],handelError(smsTransactionsController.smsCountDayWiseOfMonth));
export default smsTransactionRoutes;