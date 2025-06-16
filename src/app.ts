import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import { responseTime,xApiKeyValidation,requestOriginValidation,shouldCompress } from './middleware';
import routes from './routes';
import authenticationRoutes from './routes/authentication';
import clinicRoutes from './routes/clinic';
import ratingRoutes from './routes/rating';
import settingsRoutes from './routes/settings';
import cacheRoutes from './routes/cache';
import enquiryRoutes from './routes/enquiry';
import commonapiRoutes from './routes/common-apis'
const APP: Application = express();
APP.set('trust proxy', 1);
APP.use(compression({ filter: shouldCompress,level:1 }))
APP.use(express.json());
//APP.use(requestOriginValidation);
APP.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001','https://branch.careipro.com'],
    optionsSuccessStatus: 200
}))
APP.use(responseTime);
APP.use('/open-api',routes);
APP.use('/authentication', authenticationRoutes);
APP.use('/clinic',[xApiKeyValidation],clinicRoutes);
APP.use('/rating-and-review',[xApiKeyValidation],ratingRoutes);
APP.use('/settings',[xApiKeyValidation],settingsRoutes);
APP.use('/cache',[xApiKeyValidation],cacheRoutes);
APP.use('/enquiry',[xApiKeyValidation],enquiryRoutes);
APP.use('/commonapi',[xApiKeyValidation],commonapiRoutes)
export default APP;
