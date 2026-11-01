import { Router } from 'express';
import { apiRateLimit, handelError } from '../middleware';
import walletInvoiceController from '../controller/wallet-invoice';

const walletInvoiceRoutes = Router();

walletInvoiceRoutes.post('/raise', [apiRateLimit(10, 30)], handelError(walletInvoiceController.raise));
walletInvoiceRoutes.get('/list', [apiRateLimit(10, 20)], handelError(walletInvoiceController.list));

export default walletInvoiceRoutes;
