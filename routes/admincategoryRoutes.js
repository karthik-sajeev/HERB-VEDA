const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/authMiddleware'); 
const admincategoryController=require('../controllers/admincategoryController')


router.get('/categories', isAuthenticated,admincategoryController.getCategories);
router.get('/categories/add',isAuthenticated,admincategoryController.getAddCategoryForm);
// router.post('/categories/add', isAuthenticated,admincategoryController.addCategory);
router.post('/categories/add', isAuthenticated,admincategoryController.postAddCategory);
router.get('/categories/edit/:id', isAuthenticated,admincategoryController.getEditCategoryForm);
router.post('/categories/edit/:id', isAuthenticated,admincategoryController.postEditCategory);
router.post('/categories/delete/:id', isAuthenticated,admincategoryController.deleteCategory);


module.exports = router