const Coupon = require('../models/Coupen');
const Category = require('../models/Category');
const Cart = require('../models/Cart');

// Helper function to calculate the total amount of items in the cart
const calculateTotalAmount = (cartItems) => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
};



// Get Available Coupons Controller
exports.getAvailableCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({
            active: true,
            expiryDate: { $gte: new Date() },  // Ensure coupons haven't expired
        });

        const categories = await Category.find();
        const userId = req.user.id;
        const { cartItems, totalAmount } = await processCart(userId);

        if (cartItems.length === 0) {
            return res.render('user/cart', {
                cartItems,
                totalAmount,
                totalPriceAfterDiscount: 0,
                categories,
                errorMessage: 'Your cart is empty.',
                successMessage: null,
                couponApplied: null,
                availableCoupons: coupons,  // passing available coupons
            });
        }

        res.render('user/cart', {
            cartItems,
            totalAmount,
            totalPriceAfterDiscount: totalAmount,
            categories,
            errorMessage: null,
            successMessage: null,
            couponApplied: null,  // no coupon applied yet
            availableCoupons: coupons,  // passing available coupons
        });

    } catch (error) {
        console.error('Error fetching available coupons:', error);
        res.render('user/cart', {
            cartItems: [],
            totalAmount: 0,
            totalPriceAfterDiscount: 0,
            categories: [],
            errorMessage: 'Server error, please try again later.',
            successMessage: null,
            couponApplied: null,
            availableCoupons: [],  // pass empty list in case of error
        });
    }
};
const processCart = async (userId) => {
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
        return {
            cartItems: [],
            totalAmount: 0,
        };
    }

    const cartItems = cart.items.map((item) => {
        const { productId, quantity } = item;
        const price = productId.offerApplied ? productId.price : productId.originalPrice;

        return { 
            name: productId.name,
            productId: productId._id,
            quantity,
            price,
            originalPrice: productId.originalPrice,
            offerApplied: productId.offerApplied,
            totalItemAmount: price * quantity,
        };
    });

    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalItemAmount, 0);

    return {
        cartItems,
        totalAmount,
    };
};
const moment = require('moment');  // Use moment.js for date comparison, or use native Date if preferred
 // Use moment.js for date comparison
exports.applyCoupon = async (req, res) => {
    const userId = req.user.id; // Ensure the logged-in user's ID is passed
    const { couponCode } = req.body;

    try {
        // Fetch the coupon details
        const coupon = await Coupon.findOne({ code: couponCode });
        const categories = await Category.find(); // Fetch categories for rendering
        const availableCoupons = await Coupon.find({ active: true }); // Fetch active coupons

        // Get the cart details and populate product info
        const cart = await Cart.findOne({ userId }).populate('products.productId'); // Populate product details

        // If cart is empty
        if (!cart || cart.products.length === 0) {
            return res.render('user/cart', {
                cartItems: [],
                totalAmount: 0,
                finalAmount: 0, // No discount applied
                categories,
                availableCoupons,
                errorMessage: 'Your cart is empty.',
                successMessage: null,
                couponApplied: null,
                discountAmount: 0, // Ensure discountAmount is passed
                deliveryCharge: 0, // Pass delivery charge
            });
        }

        const { products, totalAmount } = cart;

        // If coupon is invalid
        if (!coupon) {
            // Calculate delivery charge
            let deliveryCharge = 0;
            if (totalAmount < 40) {
                deliveryCharge = 10; // Fixed charge for orders under $50
            } else if (totalAmount >= 40 && totalAmount < 100) {
                deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
            }

            return res.render('user/cart', {
                cartItems: products,
                totalAmount,
                finalAmount: totalAmount, // No discount applied
                categories,
                availableCoupons,
                errorMessage: 'Invalid coupon code.',
                successMessage: null,
                couponApplied: null,
                discountAmount: 0, // No discount
                deliveryCharge, // Delivery charge
            });
        }

        // Check if the coupon has expired
        const currentDate = moment().startOf('day'); // Get today's date with time reset to 00:00:00
        const expiryDate = moment(coupon.expiryDate).startOf('day'); // Reset the time part of the expiry date

        if (expiryDate.isBefore(currentDate)) {
            // Calculate delivery charge
            let deliveryCharge = 0;
            if (totalAmount < 40) {
                deliveryCharge = 10; // Fixed charge for orders under $50
            } else if (totalAmount >= 40 && totalAmount < 100) {
                deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
            }

            return res.render('user/cart', {
                cartItems: products,
                totalAmount,
                finalAmount: totalAmount, // No discount applied
                categories,
                availableCoupons,
                errorMessage: 'This coupon has expired.',
                successMessage: null,
                couponApplied: null,
                discountAmount: 0, // No discount
                deliveryCharge, // Delivery charge
            });
        }

        // If total amount is less than the coupon's minimum purchase requirement
        if (coupon.minPurchaseAmount && totalAmount < coupon.minPurchaseAmount) {
            // Calculate delivery charge
            let deliveryCharge = 0;
            if (totalAmount < 40) {
                deliveryCharge = 10; // Fixed charge for orders under $50
            } else if (totalAmount >= 40 && totalAmount < 100) {
                deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
            }

            return res.render('user/cart', {
                cartItems: products,
                totalAmount,
                finalAmount: totalAmount, // No discount applied
                categories,
                availableCoupons,
                errorMessage: `Coupon requires a minimum purchase of ${coupon.minPurchaseAmount}.`,
                successMessage: null,
                couponApplied: null,
                discountAmount: 0, // No discount
                deliveryCharge, // Delivery charge
            });
        }

        // Calculate discount if the coupon is valid
        let discountAmount = 0;
        if (coupon.discount) {
            discountAmount = parseFloat((totalAmount * coupon.discount) / 100).toFixed(2); // Calculate the discount amount
        }

        // Calculate final amount after applying discount
        let finalAmount = parseFloat((totalAmount - discountAmount).toFixed(2)); // Total after discount

        // Delivery charge calculation
        let deliveryCharge = 0;
        if (finalAmount < 40) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (finalAmount >= 40 && finalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Add delivery charge to the final amount


        // Update the cart with discount and delivery charge details
        cart.discountedAmount = finalAmount;
        cart.deliveryCharge = deliveryCharge;
        cart.couponApplied = { code: couponCode, discount: coupon.discount };
        await cart.save();

        // Render the updated cart
        res.render('user/cart', {
            cartItems: products,
            totalAmount, // Original total amount
            finalAmount, // Total after discount and delivery charge
            deliveryCharge, // Delivery charge applied
            categories,
            availableCoupons,
            errorMessage: null,
            successMessage: 'Coupon applied successfully!',
            couponApplied: { code: couponCode, discount: coupon.discount },
            discountAmount, // Pass discountAmount to the view
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.render('user/cart', {
            cartItems: [],
            totalAmount: 0,
            finalAmount: 0, // No amount due to error
            categories: [],
            availableCoupons: [],
            errorMessage: 'Server error, please try again later.',
            successMessage: null,
            couponApplied: null,
            discountAmount: 0, // Ensure discountAmount is passed
            deliveryCharge: 0, // Ensure delivery charge is passed
        });
    }
};

exports.removeCoupon = async (req, res) => {
    const userId = req.user.id;

    try {
        // Fetch categories and available coupons
        const categories = await Category.find();
        const availableCoupons = await Coupon.find({ active: true });

        // Find the user's cart and populate productId inside the products array
        const cart = await Cart.findOne({ userId }).populate('products.productId');

        if (!cart || cart.products.length === 0) {
            return res.render('user/cart', {
                cartItems: [],
                totalAmount: 0,
                finalAmount: 0,
                categories,
                availableCoupons,
                errorMessage: 'Your cart is empty.',
                successMessage: null,
                couponApplied: null,
            });
        }

        // Remove the coupon and reset the discountedAmount
        cart.couponApplied = null;
        cart.discountedAmount = cart.totalAmount; // Reset to the totalAmount without discounts

        // Calculate totalAmount (sum of individual product totals in the cart)
        const totalAmount = cart.products.reduce((sum, item) => sum + item.totalPrice, 0);

        // Calculate the delivery charge based on totalAmount (before coupon)
        let deliveryCharge = 0;
        if (totalAmount < 40) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (totalAmount >= 40 && totalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Calculate finalAmount (totalAmount + deliveryCharge)
        const finalAmount = totalAmount + deliveryCharge;

        // Save the updated cart
        cart.totalAmount = totalAmount;
        cart.discountedAmount = finalAmount;
        await cart.save();

        // Redirect to the cart page after coupon removal
        return res.redirect('/cart');
    } catch (error) {
        console.error('Error removing coupon:', error);

        res.render('user/cart', {
            cartItems: [],
            totalAmount: 0,
            finalAmount: 0,
            categories: [],
            availableCoupons: [],
            errorMessage: 'Server error, please try again later.',
            successMessage: null,
            couponApplied: null,
        });
    }
};
