const Coupon = require('../models/Coupen');



// Get all coupons
// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        // Populate the applicableProducts field with product data (e.g., name)
        const coupons = await Coupon.find().populate('applicableProducts', 'name'); // 'name' will only fetch the product name

        res.render('admin/couponList', { coupons, activePage: 'coupons' });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching coupons', error: err.message });
    }
};

exports.showCreateCouponForm = (req, res) => {
    res.render('admin/createCoupon',{activePage:'coupons'});  
};

exports.createCoupon = async (req, res) => {
    try {
        const { code, discount, expiryDate, applicableProducts } = req.body;
        const newCoupon = new Coupon({
            code,
            discount,
            expiryDate,
            applicableProducts
        });
        await newCoupon.save();
        
        req.flash('success', 'Coupon created successfully');
        res.redirect('/admin/coupons');
    } catch (err) {
        req.flash('error', 'Error creating coupon: ' + err.message);
        res.redirect('/admin/coupons');
    }
};


// Controller method to display the coupon edit page
exports.editCoupon = async (req, res) => {
    const couponId = req.params.id;

    try {
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            req.flash('error', 'Coupon not found');
            return res.redirect('/admin/coupons');
        }

        res.render('admin/editCoupon', { coupon, activePage: 'coupons' });
    } catch (err) {
        req.flash('error', 'Error fetching coupon');
        return res.redirect('/admin/coupons');
    }
};

exports.updateCoupon = async (req, res) => {
    const couponId = req.params.id;
    const { code, discount, expiryDate } = req.body;

    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { code, discount, expiryDate },
            { new: true, runValidators: true }
        );

        if (!updatedCoupon) {
            req.flash('error', 'Coupon not found');
            return res.redirect('/admin/coupons');
        }

        req.flash('success', 'Coupon updated successfully');
        res.redirect('/admin/coupons');
    } catch (err) {
        req.flash('error', 'Error updating coupon: ' + err.message);
        return res.redirect('/admin/coupons');
    }
};// Controller method to delete the coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        console.log('Deleting coupon with ID:', couponId);

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        console.log('Coupon deleted:', deletedCoupon);
        return res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
};
