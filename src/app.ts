import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import { responseTime, xApiKeyValidation, requestOriginValidation, shouldCompress } from './middleware';
import routes from './routes';
import authenticationRoutes from './routes/authentication';
import clinicRoutes from './routes/clinic';
import ratingRoutes from './routes/rating';
import settingsRoutes from './routes/settings';
import cacheRoutes from './routes/cache';
import enquiryRoutes from './routes/enquiry';
import commonapiRoutes from './routes/common-apis'
import reportRouter from './routes/report';
import tasksRouter from './routes/tasks';
import notesRouter from './routes/notes';
import employeeRouter from './routes/employee';
import AppointmentsRouter from './routes/appointments';
import medicineRoutes from './routes/medicine';
import smsTransactionRoutes from './routes/sms-transaction';
import onlineTransactionRoutes from './routes/online-transaction';
import searchKeywordRoutes from './routes/search-keyword';
import adsRoutes from './routes/ads';
import leadDashboardRouter from './lead-dashboard/routes/index';
const APP: Application = express();
APP.set('trust proxy', 1);
APP.use(compression({ filter: shouldCompress, level: 1 }))
APP.use(express.json());
//APP.use(requestOriginValidation);
APP.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'https://branch.careipro.com'],
    optionsSuccessStatus: 200
}))
APP.use(responseTime);
APP.use('/open-api', routes);
APP.use('/authentication', authenticationRoutes);
APP.use('/clinic', [xApiKeyValidation], clinicRoutes);
APP.use('/rating-and-review', [xApiKeyValidation], ratingRoutes);
APP.use('/settings', [xApiKeyValidation], settingsRoutes);
APP.use('/cache', [xApiKeyValidation], cacheRoutes);
APP.use('/enquiry', [xApiKeyValidation], enquiryRoutes);
APP.use('/commonapi', [xApiKeyValidation], commonapiRoutes)
APP.use('/report', [xApiKeyValidation], reportRouter);
APP.use("/tasks",[xApiKeyValidation],tasksRouter);
APP.use("/notes",notesRouter);
APP.use("/employee",[xApiKeyValidation],employeeRouter);
APP.use("/appointments",[xApiKeyValidation],AppointmentsRouter);
APP.use("/medicine",[xApiKeyValidation],medicineRoutes);
APP.use("/sms-transaction",[xApiKeyValidation],smsTransactionRoutes);
APP.use("/online-transaction",[xApiKeyValidation],onlineTransactionRoutes);
APP.use("/search-keyword",[xApiKeyValidation],searchKeywordRoutes);
APP.use("/ads",[xApiKeyValidation],adsRoutes);
APP.use("/lead-dashboard",[xApiKeyValidation],leadDashboardRouter);
export default APP;
