import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import { responseTime,xApiKeyValidation,shouldCompress } from './middleware';
import routes from './routes';
import authenticationRoutes from './routes/authentication';
import clinicRoutes from './routes/clinic';
const APP: Application = express();
APP.use(compression({ filter: shouldCompress,level:1 }))
APP.use(express.json());
APP.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001'],
    optionsSuccessStatus: 200
}))
APP.use(responseTime);
APP.use('/open-api',routes);
APP.use('/authentication', authenticationRoutes);
APP.use('/clinic',[xApiKeyValidation],clinicRoutes);
export default APP;
