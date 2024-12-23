const express = require('express');
const router = express.Router();
const admincouponController = require('../controllers/admincoupenController');

// Routes for managing coupons
router.post('/create', admincouponController.createCoupon);
router.get('/', admincouponController.getCoupons);
router.get('/update/:id', admincouponController.editCoupon);
router.post('/update/:id', admincouponController.updateCoupon);
router.delete('/delete/:id',admincouponController.deleteCoupon);

router.get('/create', admincouponController.showCreateCouponForm);

module.exports = router;
