import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import { responseTime,xApiKeyValidation,shouldCompress } from './middleware';
import routes from './routes';
import authenticationRoutes from './routes/authentication';
import clinicRoutes from './routes/clinic';
import ratingRoutes from './routes/rating';
const APP: Application = express();
APP.use(compression({ filter: shouldCompress,level:1 }))
APP.use(express.json());
APP.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001','https://branch.careipro.com'],
    optionsSuccessStatus: 200
}))
APP.use(responseTime);
APP.use('/open-api',routes);
APP.use('/authentication', authenticationRoutes);
APP.use('/clinic',[xApiKeyValidation],clinicRoutes);
APP.use('/rating-and-review',[xApiKeyValidation],ratingRoutes);
export default APP;
