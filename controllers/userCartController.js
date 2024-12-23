const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupen');
const Offer = require('../models/Offer');
const User = require('../models/userModel');
// Function to calculate the total cart amount
// Helper function to calculate total amount
const calculateTotalAmount = (cartItems) => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
};

// Helper function to fetch categories and available coupons
const fetchCategoriesAndCoupons = async () => {
    const categories = await Category.find();
    const availableCoupons = await Coupon.find({});
    return { categories, availableCoupons };
};

exports.postaddCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    try {
        const product = await Product.findById(productId); // Get product details
        if (!product) {
            const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
            return res.render('user/cart', {
                errorMessage: 'Product not found.',
                successMessage: null,
                cartItems: [],
                totalAmount: 0,
                categories,
                availableCoupons,
                finalAmount: 0,
                couponApplied: null,
                deliveryCharge: 0, // Ensure delivery charge is included
            });
        }

        const productPrice = product.price || 0; // Ensure price is always defined
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: 'active',
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
        });

        let discountedPrice = productPrice;

        // Apply offers
        activeOffers.forEach((offer) => {
            if (offer.type === 'product' && offer.product.toString() === product._id.toString()) {
                discountedPrice = productPrice * (1 - offer.discount / 100);
            } else if (offer.type === 'category' && offer.category.toString() === product.category.toString()) {
                discountedPrice = productPrice * (1 - offer.discount / 100);
            }
        });

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const existingProduct = cart.products.find((item) => item.productId.toString() === productId);

        if (existingProduct) {
            const newQuantity = existingProduct.quantity + Number(quantity);
            if (newQuantity > product.stock) {
                const cartItems = await Promise.all(
                    cart.products.map(async (item) => {
                        const productDetails = await Product.findById(item.productId);
                        return {
                            productId: productDetails._id,
                            name: productDetails.name,
                            price: productDetails.price,
                            quantity: item.quantity,
                            totalPrice: productDetails.price * item.quantity,
                        };
                    })
                );
                const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
                return res.render('user/cart', {
                    errorMessage: 'Requested quantity exceeds available stock.',
                    successMessage: null,
                    cartItems,
                    totalAmount: calculateTotalAmount(cartItems),
                    categories,
                    availableCoupons,
                    finalAmount: 0,
                    couponApplied: req.session.coupon || null,
                    deliveryCharge: 0,
                });
            }

            existingProduct.quantity = newQuantity;
            existingProduct.totalPrice = newQuantity * discountedPrice;
        } else {
            if (Number(quantity) > product.stock) {
                const cartItems = await Promise.all(
                    cart.products.map(async (item) => {
                        const productDetails = await Product.findById(item.productId);
                        return {
                            productId: productDetails._id,
                            name: productDetails.name,
                            price: productDetails.price,
                            quantity: item.quantity,
                            totalPrice: productDetails.price * item.quantity,
                        };
                    })
                );
                const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
                return res.render('user/cart', {
                    errorMessage: 'Requested quantity exceeds available stock.',
                    successMessage: null,
                    cartItems,
                    totalAmount: calculateTotalAmount(cartItems),
                    categories,
                    availableCoupons,
                    finalAmount: 0,
                    couponApplied: req.session.coupon || null,
                    deliveryCharge: 0,
                });
            }

            cart.products.push({
                productId,
                quantity: Number(quantity),
                price: discountedPrice,
                totalPrice: discountedPrice * Number(quantity),
            });
        }

        const cartItems = await Promise.all(
            cart.products.map(async (item) => {
                const productDetails = await Product.findById(item.productId);
                return {
                    productId: productDetails._id,
                    name: productDetails.name,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                };
            })
        );

        const totalAmount = calculateTotalAmount(cartItems);

        // Calculate the delivery charge based on totalAmount (before applying coupons)
        let deliveryCharge = 0;
        if (totalAmount < 40) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (totalAmount >= 40 && totalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        } // No delivery charge for orders over $100

        // Add delivery charge to totalAmount
        const totalAmountWithDelivery = totalAmount + deliveryCharge;

        let finalAmount = totalAmountWithDelivery; // Start with totalAmount + deliveryCharge

        // Apply the coupon if available
        if (req.session.coupon) {
            const coupon = await Coupon.findOne({ code: req.session.coupon.code });
            if (coupon) {
                const discount = coupon.discount || 0;
                const discountAmount = (totalAmount * discount) / 100;
                finalAmount = totalAmount - discountAmount + deliveryCharge; // Apply coupon discount and add delivery charge
            }
        }

        // Save the updated cart details
        cart.totalAmount = totalAmountWithDelivery; // Set totalAmount with delivery charge
        cart.discountedAmount = finalAmount; // Set discountedAmount (finalAmount)
        cart.deliveryCharge = deliveryCharge; // Save delivery charge in the cart
        await cart.save();

        const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
        res.redirect('/cart'); // Redirect to the updated cart page
    } catch (error) {
        console.error('Error adding to cart:', error);
        const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
        res.render('user/cart', {
            errorMessage: 'Server error. Please try again later.',
            successMessage: null,
            cartItems: [],
            totalAmount: 0,
            categories,
            availableCoupons,
            finalAmount: 0,
            couponApplied: null,
            deliveryCharge: 0, // Ensure delivery charge is sent even if an error occurs
        });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId }).populate('products.productId', 'name price category');
        const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
        const couponCode = req.session.couponCode;

        if (!cart || cart.products.length === 0) {
            return res.render('user/cart', {
                cartItems: [],
                totalAmount: 0,
                finalAmount: 0,
                categories,
                availableCoupons,
                errorMessage: null,
                successMessage: null,
                couponApplied: null,
                deliveryCharge: 0, // Delivery charge default
            });
        }

        const cartItems = await Promise.all(
            cart.products.map(async (item) => {
                const product = item.productId || { name: 'Unknown Product', price: 0, _id: null, category: null };
                const productPrice = product.price || 0;

                // Fetch applicable offers
                const productOffer = await Offer.findOne({
                    product: product._id,
                    type: 'product',
                    status: 'active',
                });
                const categoryOffer = await Offer.findOne({
                    category: product.category,
                    type: 'category',
                    status: 'active',
                });

                const productDiscount = productOffer ? productOffer.discount : 0;
                const categoryDiscount = categoryOffer ? categoryOffer.discount : 0;
                const applicableDiscount = Math.max(productDiscount, categoryDiscount);

                // Calculate discounted price
                const discountedPrice = productPrice * (1 - applicableDiscount / 100);
                const totalPrice = discountedPrice * item.quantity;

                return {
                    productId: product._id,
                    name: product.name,
                    originalPrice: productPrice,
                    discountedPrice,
                    quantity: item.quantity || 0,
                    totalPrice,
                };
            })
        );

        // Calculate total amount
        let totalAmount = calculateTotalAmount(cartItems);

        // Calculate delivery charge
        let deliveryCharge = 0;
        if (totalAmount < 40) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (totalAmount >= 40 && totalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Update totalAmount to include the delivery charge
        totalAmount += deliveryCharge;

        // Apply coupon discount if applicable
        let finalAmount = totalAmount; // Start with totalAmount including delivery charge
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon) {
                const discount = coupon.discount || 0;
                const discountAmount = ((totalAmount - deliveryCharge) * discount) / 100; // Exclude delivery charge from discount
                finalAmount = totalAmount - discountAmount;
            }
        }

        // Update totalAmount in the Cart model
        await Cart.updateOne({ userId }, { $set: { totalAmount } });

        res.render('user/cart', {
            cartItems,
            totalAmount, // Includes delivery charge
            finalAmount, // Includes coupon discount
            categories,
            availableCoupons,
            errorMessage: null,
            successMessage: null,
            couponApplied: couponCode ? { code: couponCode } : null,
            deliveryCharge, // Pass delivery charge to the view
        });
    } catch (error) {
        console.error('Error retrieving cart items:', error);
        const { categories, availableCoupons } = await fetchCategoriesAndCoupons();
        res.render('user/cart', {
            cartItems: [],
            totalAmount: 0,
            finalAmount: 0,
            categories,
            availableCoupons,
            errorMessage: 'Server Error',
            successMessage: null,
            couponApplied: null,
            deliveryCharge: 0, // Pass delivery charge as 0 in case of error
        });
    }
};

//update
// const mongoose = require('mongoose');

// async function calculateDiscountedPrice(product) {
//     const currentDate = new Date();
//     const activeOffers = await Offer.find({
//         status: 'active',
//         startDate: { $lte: currentDate },
//         endDate: { $gte: currentDate },
//     }).exec();

//     let discountedPrice = product.price;

//     activeOffers.forEach((offer) => {
//         if (offer.type === 'product' && offer.product.toString() === product._id.toString()) {
//             discountedPrice = product.price * (1 - offer.discount / 100);
//         } else if (offer.type === 'category' && offer.category.toString() === product.category.toString()) {
//             discountedPrice = product.price * (1 - offer.discount / 100);
//         }
//     });

//     return discountedPrice;
// }
// async function applyCouponAndCalculate(cart, couponSession) {
//     const cartItems = await Promise.all(
//         cart.products.map(async (item) => {
//             const productDetails = await Product.findById(item.productId);
//             if (productDetails) {
//                 item.price = await calculateDiscountedPrice(productDetails);
//                 item.totalPrice = item.price * item.quantity;
//             }
//             return item;
//         })
//     );

//     // Calculate total cart amount
//     const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

//     let finalAmount = totalAmount;
//     let couponApplied = null;

//     if (couponSession) {
//         const coupon = await Coupon.findOne({ code: couponSession.code });
//         if (coupon) {
//             const discount = (totalAmount * coupon.discount) / 100;
//             finalAmount -= discount;
//             couponApplied = coupon;
//         }
//     }

//     cart.products = cartItems; // Ensure updated products are saved back to the cart
//     return { totalAmount, finalAmount, couponApplied };
// }
// async function renderCartPage(res, errorMessage, cart = null, totalAmount = 0, finalAmount = 0, couponApplied = null) {
//     const { categories, availableCoupons } = await fetchCategoriesAndCoupons();

//     const cartItems = cart
//         ? await Promise.all(
//               cart.products.map(async (item) => {
//                   const productDetails = await Product.findById(item.productId);
//                   return {
//                       productId: productDetails?._id,
//                       name: productDetails?.name,
//                       price: item.price,
//                       quantity: item.quantity,
//                       totalPrice: item.totalPrice,
//                   };
//               })
//           )
//         : [];

//     console.log('Rendering cart with:', {
//         totalAmount,
//         finalAmount,
//         couponApplied,
//         cartItems,
//     });

//     res.render('user/cart', {
//         errorMessage,
//         successMessage: errorMessage ? null : 'Cart updated successfully.',
//         cartItems,
//         totalAmount,
//         finalAmount,
//         couponApplied,
//         categories,
//         availableCoupons,
//     });
// }

// Post Update Cart Controller
exports.postupdateCart = async (req, res) => {
    const { productId, quantity, couponCode } = req.body;
    const userId = req.user.id;

    try {
        // Fetch the product details
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/cart');
        }

        // Fetch the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            req.flash('error_msg', 'Cart not found.');
            return res.redirect('/cart');
        }

        // Find active product and category offers
        const productOffer = await Offer.findOne({
            product: productId,
            type: 'product', // Check only product offers
            status: 'active',
        });

        const categoryOffer = await Offer.findOne({
            category: product.category, // Use the product's category
            type: 'category', // Check only category offers
            status: 'active',
        });

        // Calculate the applicable discount
        const productDiscount = productOffer ? productOffer.discount : 0;
        const categoryDiscount = categoryOffer ? categoryOffer.discount : 0;
        const applicableDiscount = Math.max(productDiscount, categoryDiscount);

        // Calculate the discounted price
        const discountedPrice = product.price * (1 - applicableDiscount / 100);

        // Update the product quantity and price in the cart
        const existingProduct = cart.products.find(item => item.productId.toString() === productId);
        if (existingProduct) {
            const updatedQuantity = Number(quantity);

            // Check if the quantity exceeds available stock
            if (updatedQuantity > product.stock) {
                req.flash('error_msg', `Cannot update quantity to ${updatedQuantity}. Only ${product.stock} available.`);
                return res.redirect('/cart');
            }

            // Update the quantity and total price for the product
            existingProduct.quantity = updatedQuantity;
            existingProduct.totalPrice = updatedQuantity * discountedPrice; // Use the discounted price
        }

        // Recalculate the total amount for the cart
        cart.totalAmount = cart.products.reduce((sum, item) => sum + item.totalPrice, 0);

        // Apply coupon discount if provided
        if (couponCode) {
            const validCoupon = await Coupon.findOne({ code: couponCode, isActive: true });

            if (validCoupon) {
                const couponDiscountPercentage = validCoupon.discountPercentage || 0;

                // Calculate the cart total after applying the coupon discount
                cart.discountedAmount = cart.totalAmount * (1 - couponDiscountPercentage / 100);
                cart.couponCode = couponCode; // Save the applied coupon code
            } else {
                req.flash('error_msg', 'Invalid or expired coupon.');
                cart.discountedAmount = cart.totalAmount; // Reset discount
            }
        } else {
            cart.discountedAmount = cart.totalAmount; // No coupon applied
            cart.couponCode = null; // Reset coupon code
        }

        // Calculate the delivery charge
        // Calculate the delivery charge based on the totalAmount
        let deliveryCharge = 0;
        if (cart.totalAmount < 40) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (cart.totalAmount >= 40 && cart.totalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Update the discountedAmount with the delivery charge
        cart.discountedAmount += deliveryCharge;

        // Save the updated cart
        await cart.save();
// Send a success response with updated cart details
return res.json({
    success_msg: 'Cart updated successfully.',
    updatedCart: cart,
});

       
    } catch (error) {
        console.error('Error updating cart:', error);
        req.flash('error_msg', 'An error occurred while updating the cart.');
        res.redirect('/cart');
    }
};
// Remove from Cart Controller
exports.postremoveCart = async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;  // Ensure you have the user ID from the session

    try {
        const cart = await Cart.findOne({ userId });

        if (cart) {
            // Remove the product from the cart
            cart.products = cart.products.filter(item => item.productId.toString() !== productId);
            await cart.save();
        }

        res.redirect('/cart'); // Redirect back to the cart page
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).send('Internal server error');
    }
};exports.proceedToCheckout = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null; // Ensure user is authenticated
        if (!userId) {
            return res.redirect('/login'); // Redirect to login if user is not logged in
        }

        // Fetch the user's cart with populated product details
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart || cart.products.length === 0) {
            const categories = await Category.find();
            return res.render('user/cart', {
                cartItems: [],
                totalAmount: 0,
                discountedAmount: 0,
                finalAmount: 0,
                discount: 0,
                deliveryCharge: 0,
                categories,
                errorMessage: "Please add items to the cart before proceeding to checkout.",
                successMessage: null,
            });
        }

        // Use data from the cart model
        const totalAmount = cart.totalAmount; // Pre-calculated total in the cart model
        let discountedAmount = totalAmount; // Default to totalAmount if no discount applied
        const couponApplied = cart.couponApplied || null; // Check if a coupon is applied
        let discount = 0; // Default discount value
        let discountAmount = 0; // Default discountAmount

        // Calculate the discounted amount if coupon is applied
        if (couponApplied) {
            const discountPercentage = couponApplied.discount || 0; // Get discount percentage from coupon
            discountAmount = totalAmount * (discountPercentage / 100); // Calculate discount amount
            discountedAmount = totalAmount - discountAmount; // Apply the discount
            discount = discountPercentage; // Store the discount percentage for display
        }

        // Calculate the delivery charge based on the total amount (before discount)
        let deliveryCharge = 0;
        const amountBeforeDeliveryCharge = totalAmount + deliveryCharge; // This will include the delivery charge in the calculation
        if (totalAmount < 50) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (totalAmount >= 50 && totalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Add the delivery charge to the total amount (after discount)
        let finalAmount = (totalAmount - discountAmount)
      
        // Fetch categories and user addresses
        const categories = await Category.find();
        const user = await User.findById(userId).select('addresses walletBalance'); // Include walletBalance
        const addresses = user ? user.addresses : []; // Access the user's addresses
        const walletBalance = user ? user.walletBalance : 0; // Access the user's wallet balance, default to 0 if undefined

        // Render the checkout page with all the required data
        res.render('user/checkout', {
            cartItems: cart.products, // Items in the cart
            totalAmount, // Total amount before discount
            discountedAmount, // Amount after discount
            finalAmount, // Final amount after adding delivery charge
            categories, // Categories for navigation
            discount, // Discount percentage
            couponCode: couponApplied ? couponApplied.code : null, // Applied coupon code
            couponApplied, // Applied coupon details
            discountAmount, // Discount amount applied
            deliveryCharge, // Delivery charge
            totalFinalAmount: finalAmount, // Final amount including delivery charge
            addresses, // User's addresses
            walletBalance, // User's wallet balance
            errorMessage: null,
            successMessage: couponApplied
                ? `Coupon "${couponApplied.code}" applied successfully!`
                : 'Proceeding to checkout successfully.',
        });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).send('Server Error');
    }
};
