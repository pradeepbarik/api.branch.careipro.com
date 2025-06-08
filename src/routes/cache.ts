import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import cacheController from '../controller/cache-controller';
const cacheRoutes=Router();
cacheRoutes.get("/clear-cache",[apiRateLimit(1,10)],cacheController.clearCache);
cacheRoutes.get("/init-clinic-cache-directory",[apiRateLimit(1,10)],cacheController.initClinicCacheDirectory);
export default cacheRoutes;