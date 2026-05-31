import {Router} from 'express';
import {apiRateLimit,handelError} from '../middleware';
import searchKeywordsController from '../controller/search-keywords';
const searchKeywordRoutes=Router();
searchKeywordRoutes.post('/add-new-search-text',[apiRateLimit(100,1)],handelError(searchKeywordsController.addnewSearchText));
searchKeywordRoutes.put('/update',[apiRateLimit(5,10)],handelError(searchKeywordsController.update));
searchKeywordRoutes.get('/search',[apiRateLimit(20,10)],handelError(searchKeywordsController.search));
searchKeywordRoutes.delete('/delete/:id',[apiRateLimit(20,1)],handelError(searchKeywordsController.delete));
export default searchKeywordRoutes;