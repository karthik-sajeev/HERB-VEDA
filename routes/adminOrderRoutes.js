const express = require('express');
const router = express.Router();
const adminorderController=require('../controllers/adminorderController')
const isAuthenticated=require('../middleware/authMiddleware')



router.get('/orders', isAuthenticated,adminorderController.getOrder)
router.get('/orders/:orderId', isAuthenticated,adminorderController.getorderDetail)
router.post('/orders/:orderId/status',isAuthenticated,adminorderController.postorderStatus)
router.post('/orders/:id/cancel', isAuthenticated,adminorderController.postcancelOrder)
// Route for returning a product
router.post('/orders/:id/return', adminorderController.postreturnOrder);
module.exports = router;