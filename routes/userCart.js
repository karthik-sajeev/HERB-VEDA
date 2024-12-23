const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const userCartController=require('../controllers/userCartController')

// Get the cart page

router.get('/',isAuthenticated,userCartController.getCart)
router.post('/add',isAuthenticated,userCartController.postaddCart)
router.post('/update',isAuthenticated,userCartController.postupdateCart)
router.post('/remove', isAuthenticated,userCartController.postremoveCart)
router.post('/proceed-to-checkout', isAuthenticated, userCartController.proceedToCheckout);


module.exports = router;


