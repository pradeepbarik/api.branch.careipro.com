import { Router } from 'express';
import { apiRateLimit, handelError } from '../middleware';
import smsCreditPackController from '../controller/sms-credit-pack';

//paid services Careipro sells to clinics (Service Settings menu in branch.careipro.com)
const serviceSettingsRoutes = Router();

serviceSettingsRoutes.get('/sms-packs/list', [apiRateLimit(20, 30)], handelError(smsCreditPackController.list));
serviceSettingsRoutes.post('/sms-packs/save', [apiRateLimit(20, 30)], handelError(smsCreditPackController.save));
serviceSettingsRoutes.post('/sms-packs/set-active', [apiRateLimit(20, 30)], handelError(smsCreditPackController.setActive));

export default serviceSettingsRoutes;
