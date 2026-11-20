import { Router } from 'express';
import { apiRateLimit, handelError } from '../middleware';
import smsTemplateController from '../controller/sms-template';
import smsTemplateLibraryController from '../controller/sms-template-library';

const smsTemplateRoutes = Router();

smsTemplateRoutes.get('/list', [apiRateLimit(20, 30)], handelError(smsTemplateController.list));
smsTemplateRoutes.post('/mark-submitted', [apiRateLimit(20, 30)], handelError(smsTemplateController.markSubmitted));
smsTemplateRoutes.post('/update-dlt-details', [apiRateLimit(20, 30)], handelError(smsTemplateController.updateDltDetails));
smsTemplateRoutes.post('/mark-approved', [apiRateLimit(20, 30)], handelError(smsTemplateController.markApproved));
smsTemplateRoutes.post('/mark-rejected', [apiRateLimit(20, 30)], handelError(smsTemplateController.markRejected));
//pre-approved templates every clinic can add without applying
smsTemplateRoutes.get('/library/list', [apiRateLimit(20, 30)], handelError(smsTemplateLibraryController.list));
smsTemplateRoutes.post('/library/save', [apiRateLimit(20, 30)], handelError(smsTemplateLibraryController.save));
smsTemplateRoutes.post('/library/set-active', [apiRateLimit(20, 30)], handelError(smsTemplateLibraryController.setActive));

export default smsTemplateRoutes;
