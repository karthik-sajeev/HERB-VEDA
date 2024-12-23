const express = require('express');
const router = express.Router();
const usercouponController = require('../controllers/usercouponController');



// Apply coupon
// Route to get available coupons
router.get('/available-coupons', usercouponController.getAvailableCoupons);

router.post('/apply-coupon', usercouponController.applyCoupon);
router.post('/remove-coupon', usercouponController.removeCoupon);
module.exports = router;
