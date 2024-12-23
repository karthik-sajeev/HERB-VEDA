// utils/couponValidation.js
const Coupon = require('../models/Coupen'); // Import the Coupon model

const validateCoupon = async (couponCode) => {
    const coupon = await Coupon.findOne({ code: couponCode, active: true });

    if (!coupon) {
        return { isValid: false, message: 'Invalid or inactive coupon' };
    }

    const currentDate = new Date();
    if (coupon.expiryDate < currentDate) {
        return { isValid: false, message: 'Coupon has expired' };
    }

    return { isValid: true, discount: coupon.discount };
};

module.exports = validateCoupon;
