const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const UserproductController = require('../controllers/UserproductController');



// User product routes
router.get('/products',isAuthenticated, UserproductController.getProducts);
router.get('/product/:id',isAuthenticated, UserproductController.getProductdetail);
router.post('/product/:id/review',isAuthenticated, UserproductController.postReviewProduct);


module.exports = router;