const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/authMiddleware'); 
const adminProductController=require('../controllers/adminProductController')



router.get('/',isAuthenticated,adminProductController.getProducts)
router.post('/delete/:id',isAuthenticated,adminProductController.postDeleteProduct)
router.get('/add',isAuthenticated,adminProductController.getAddProduct)
router.post('/add',isAuthenticated,adminProductController.postAddProduct)
router.get('/edit/:id',isAuthenticated,adminProductController.getEditProduct)
router.post('/edit/:id',isAuthenticated,adminProductController.postEditProduct)









module.exports = router;
