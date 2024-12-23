const express = require('express');
const router = express.Router();
const userCheckoutController= require('../controllers/userCheckoutController');
const { isAuthenticated } = require('../middleware/auth');



//user checkout routes
router.get('/',isAuthenticated,userCheckoutController.getCheckout)
router.post('/place-order',isAuthenticated,userCheckoutController.postPlaceOrder)
router.post('/add-address',isAuthenticated,userCheckoutController.postAddaddress)
router.get('/checkout', isAuthenticated,userCheckoutController.getpostCheckout)

module.exports = router;
