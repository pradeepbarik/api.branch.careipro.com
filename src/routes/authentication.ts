import {Router} from 'express';
import authenticationController from '../controller/authentication';
import {loginRatelimit,handelError} from '../middleware';
const authenticationRoutes=Router();
authenticationRoutes.post('/login',[loginRatelimit],handelError(authenticationController.login));
export default authenticationRoutes;