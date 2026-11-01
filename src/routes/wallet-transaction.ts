import { Router } from 'express';
import { apiRateLimit, handelError } from '../middleware';
import walletTransactionController from '../controller/wallet-transaction';

const walletTransactionRoutes = Router();

walletTransactionRoutes.get('/balance', [apiRateLimit(10, 20)], handelError(walletTransactionController.balance));
walletTransactionRoutes.get('/history', [apiRateLimit(10, 20)], handelError(walletTransactionController.history));

export default walletTransactionRoutes;
