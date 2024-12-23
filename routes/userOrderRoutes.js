const express = require('express');
const router = express.Router();
const  { isAuthenticated } =require('../middleware/auth')
const  userOrderController= require('../controllers/userOrderController');

//user order routes
// router.post('/orders',isAuthenticated,userOrderController.postcreateOrder)
router.get('/users/:id/orders',isAuthenticated,userOrderController.getuserOrder)
router.get('/user-orders',isAuthenticated,userOrderController.getshowUserOrder) 
router.post('/cancelOrder',isAuthenticated,userOrderController.postCancelOrder)
router.get('/orders/:id',isAuthenticated,userOrderController.getOrderDetails)
router.post('/orders/:id/return', userOrderController.postReturnOrder);
router.post('/cancel-product', userOrderController.postCancelProduct); 
router.get('/order/invoice/:orderId', userOrderController.generateInvoice);

module.exports = router;
