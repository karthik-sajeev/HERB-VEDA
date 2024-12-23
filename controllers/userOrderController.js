
const User = require('../models/userModel');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Coupon=require('../models/Coupen')
const Offer = require('../models/Offer');
const { jsPDF } = require('jspdf');
require('jspdf-autotable'); // Import the autoTable plugin
const Order = require('../models/Order');

exports.generateInvoice = async (req, res) => {
    const orderId = req.params.orderId;

    try {
        const order = await Order.findById(orderId)
            .populate('items.product')
            .exec();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18).setFont('Helvetica', 'bold').text('Herba-Veda', 105, 20, { align: 'center' });
        doc.setFontSize(12).setFont('Helvetica', 'normal');
        doc.text(`Invoice for Order #${orderId}`, 105, 30, { align: 'center' });
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

        // Order Information
        doc.setFontSize(14).setFont('Helvetica', 'bold').text('Order Information:', 20, 50);
        doc.setFontSize(12).setFont('Helvetica', 'normal');
        doc.text(`Order ID: ${orderId}`, 20, 60);
        doc.text(`Order Date: ${order.orderDate.toLocaleDateString()}`, 20, 70);
        doc.text(`Status: ${order.status}`, 20, 80);
        doc.text(`Payment Method: ${order.paymentMethod}`, 20, 90);

        // Shipping Address
        doc.setFontSize(14).setFont('Helvetica', 'bold').text('Shipping Address:', 20, 100);
        doc.setFontSize(12).setFont('Helvetica', 'normal');
        doc.text(`Name: ${order.address.name}`, 20, 110);
        doc.text(`Street: ${order.address.street}`, 20, 120);
        doc.text(`City: ${order.address.city}`, 20, 130);
        doc.text(`Postal Code: ${order.address.postalCode}`, 20, 140);
        doc.text(`Country: ${order.address.country}`, 20, 150);

        // Order Items
        doc.setFontSize(14).setFont('Helvetica', 'bold').text('Order Items:', 20, 160);

        // Prepare data for the table
        const tableData = [];
        let totalPrice = 0;

        for (const item of order.items) {
            let offerDiscount = 0;

            if (item.product) {
                const offer = await Offer.findOne({
                    $or: [
                        { type: 'product', product: item.product._id },
                        { type: 'category', category: item.product.category },
                    ],
                    status: 'active',
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() },
                }).exec();

                if (offer) {
                    offerDiscount = offer.discount;
                }
            }

            const price = item.product.price || 0;
            const discountedPrice = (price - (price * offerDiscount) / 100).toFixed(2);
            const itemTotalPrice = (discountedPrice * item.quantity).toFixed(2);
            totalPrice += parseFloat(itemTotalPrice);

            tableData.push([
                item.product.name,
                item.quantity.toString(),
                ` ${price}`,
                `${offerDiscount}%`,
                ` ${discountedPrice}`,
                ` ${itemTotalPrice}`,
            ]);
        }

        // Generate the table with autoTable
        doc.autoTable({
            startY: 170, // Starting Y position
            head: [['Product Name', 'Qty', 'Price(INR)', 'Discount (%)', 'DiscountPrice(INR)', 'TotalPrice(INR)']],
            body: tableData,
            styles: { fontSize: 12 },
            columnStyles: {
                0: { halign: 'left' }, // Align product name to the left
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
            },
        });

        // Summary Section
        const summaryStartY = doc.lastAutoTable.finalY + 10; // Position after the table
        doc.setFontSize(14).setFont('Helvetica', 'bold').text('Summary:', 20, summaryStartY);

        const deliveryCharge = (order.totalAmount - totalPrice).toFixed(2);
        const couponDiscount = (order.totalAmount - order.finalAmount).toFixed(2);

        doc.setFontSize(12).setFont('Helvetica', 'normal');
        doc.text(`Delivery Charge: INR ${deliveryCharge}`, 20, summaryStartY + 10);
        doc.text(`Total Amount: INR ${order.totalAmount.toFixed(2)}`, 20, summaryStartY + 20);
        doc.text(`Coupon Discount: INR ${couponDiscount}`, 20, summaryStartY + 30);
        doc.text(`Final Amount: INR ${order.finalAmount.toFixed(2)}`, 20, summaryStartY + 40);

        // Footer
        const footerY = summaryStartY + 60;
        doc.setFontSize(10).setFont('Helvetica', 'italic').text('Thank you for shopping with Herba-Veda!', 105, footerY, { align: 'center' });

        // Send the PDF as a response
        const pdfOutput = doc.output('arraybuffer'); // Generate PDF as ArrayBuffer
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
        res.send(Buffer.from(pdfOutput));
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.getuserOrder = async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId).populate('orders');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user with orders:', error);
        res.status(500).json({ message: 'Error fetching user with orders', error: error.message });
    }
};
exports.getshowUserOrder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5; 
        const skip = (page - 1) * limit; 

        const orders = await Order.find({ user: req.user._id })
            .populate('items.product')
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments({ user: req.user._id });
        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch categories
        const categories = await Category.find();

        // Modify orders to include the correct amount (finalAmount)
        const modifiedOrders = orders.map(order => {
            return {
                ...order.toObject(),
                amountToDisplay: order.finalAmount || order.totalAmount // Use finalAmount if available
            };
        });

        // Calculate pagination range (5 pages visible at a time)
        const startPage = Math.floor((page - 1) / 5) * 5 + 1;
        const endPage = Math.min(startPage + 4, totalPages);

        res.render('user/userOrders', {
            orders: modifiedOrders, // Pass modified orders with the correct amount
            categories,
            currentPage: page,
            totalPages,
            startPage,
            endPage,
        });
    } catch (error) {
        console.error('Error fetching orders or categories:', error);
        res.status(500).send('Internal Server Error');
    }
};


const WalletTransaction = require('../models/wallet');  // Import the WalletTransaction model

exports.postCancelOrder = async (req, res) => {
    const { orderId } = req.body;

    // Validate order ID
    if (!orderId || orderId === 'null' || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID.' });
    }

    try {
        // Fetch the order
        const order = await Order.findById(orderId).populate('user');  // Populate the user info

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Check if the order can be cancelled based on its current status
        const validStatuses = ['Pending', 'Shipped']; // Add other statuses if needed
        if (!validStatuses.includes(order.status)) {
            return res.status(400).json({ error: `Cannot cancel an order with status ${order.status}.` });
        }

        // Get the user associated with the order
        const user = order.user;

        // Credit the wallet if the order is canceled
        const refundAmount = order.finalAmount;  // Adjust as necessary if you need to refund part of the amount
        user.walletBalance += refundAmount;  // Add the refund to the user's wallet

        // Save the updated user (wallet balance)
        await user.save();

        // Create a wallet transaction entry for the refund
        const walletTransaction = new WalletTransaction({
            userId: user._id,
            amount: refundAmount,
            transactionType: 'credit',  // Since it's a refund, it's a credit to the wallet
            description: `Refund for canceled order ${orderId}`,
        });
        await walletTransaction.save();  // Save the wallet transaction

        // Set the order status to 'Cancelled'
        order.status = 'Cancelled';
        await order.save();  // Save the updated order

        // Respond with success
        res.status(200).json({
            message: 'Order cancelled successfully.',
            walletBalance: user.walletBalance,  // Optionally send the updated wallet balance
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'An error occurred while cancelling the order.' });
    }
};

exports.postCancelProduct = async (req, res) => {
    const { orderId, productId } = req.body; // Get orderId and productId from the request body

    // Validate order ID and product ID
    if (!orderId || !productId || !mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid order ID or product ID.' });
    }

    try {
        // Fetch the order and populate product details
        const order = await Order.findById(orderId).populate('items.product');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Check if the user requesting the cancellation is the same as the one who placed the order
        if (order.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to cancel this product.' });
        }

        // Find the product in the order's items
        const productIndex = order.items.findIndex(item => item.product._id.toString() === productId);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found in this order.' });
        }

        // Get the product item to be canceled
        const productItem = order.items[productIndex];
        const productName = productItem.product.name;  // Get the name of the product

        // Refund the user for the canceled product
        const refundAmount = productItem.price * productItem.quantity;

        // Update the user's wallet balance
        const user = await User.findById(order.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        user.walletBalance += refundAmount;
        await user.save();

        // Create a wallet transaction entry for the refund
        const walletTransaction = new WalletTransaction({
            userId: user._id,
            amount: refundAmount,
            transactionType: 'credit',  // Since it's a refund, it's a credit to the wallet
            description: `Refund for canceled product "${productName}" in order number ${orderId}`,  // Using product name and order number
        });
        await walletTransaction.save();  // Save the wallet transaction

        // Remove the product from the items array
        order.items.splice(productIndex, 1);

        // Recalculate the total amount of the order (without the canceled product)
        const updatedTotalAmount = order.items.reduce((total, item) => total + item.price * item.quantity, 0);

        // Fetch active offers (coupons) for the remaining products
        const offers = await Offer.find({ product: { $in: order.items.map(item => item.product._id) } });
        const discountMap = offers.reduce((map, offer) => {
            map[offer.product.toString()] = offer.discount || 0; // Store discount percentage
            return map;
        }, {});

        // Calculate the total coupon discount applied to the order
        const totalDiscountAmount = offers.reduce((total, offer) => {
            const productInOrder = order.items.find(item => item.product._id.toString() === offer.product.toString());
            if (productInOrder) {
                const productDiscount = productInOrder.price * productInOrder.quantity * (offer.discount / 100);
                return total + productDiscount;
            }
            return total;
        }, 0);

        // Calculate the adjusted discount for each product
        const adjustedDiscountMap = order.items.reduce((map, item) => {
            const originalDiscount = discountMap[item.product._id.toString()] || 0;
            const proportionateDiscount = (item.price * item.quantity / updatedTotalAmount) * totalDiscountAmount;
            map[item.product._id.toString()] = proportionateDiscount;
            return map;
        }, {});

        // Recalculate the final amount after applying the adjusted discounts
        const updatedFinalAmount = order.items.reduce((total, item) => {
            const adjustedDiscount = adjustedDiscountMap[item.product._id.toString()] || 0;
            const discountedPrice = item.price * item.quantity - adjustedDiscount;
            return total + discountedPrice;
        }, 0);

        // Calculate the delivery charge based on the updated total amount
        let deliveryCharge = 0;
        if (updatedTotalAmount < 50) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (updatedTotalAmount >= 50 && updatedTotalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Add the delivery charge to the final amount
        const finalAmountWithDelivery = updatedFinalAmount + deliveryCharge;

        // Update the order with recalculated amounts
        order.totalAmount = updatedTotalAmount;
        order.finalAmount = finalAmountWithDelivery; // Add delivery charge to final amount

        // If there are no more products in the order, you might want to mark the order as canceled or handle it differently
        if (order.items.length === 0) {
            order.status = 'Cancelled';
        }

        // Save the updated order
        await order.save();

        // Respond with success
        res.status(200).json({
            message: 'Product canceled successfully.',
            walletBalance: user.walletBalance,
            totalAmount: order.totalAmount, // Return the updated total amount
            finalAmount: order.finalAmount, // Return the updated final amount (with delivery charge)
        });
    } catch (error) {
        console.error('Error canceling product:', error);
        res.status(500).json({ error: 'An error occurred while canceling the product.' });
    }
};

 // Import your Offer model
 exports.getOrderDetails = async (req, res) => {
    const orderId = req.params.id;

    try {
        // Find the order by its ID and populate the `product` field inside `items`
        const order = await Order.findById(orderId)
            .populate('items.product') // Populate the product details inside the items array
            .exec();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Fetch categories (if needed for rendering)
        const categories = await Category.find();

        // Fetch product and category offers
        const productIds = order.items.map(item => item.product._id);
        const categoryIds = order.items.map(item => item.product.category); // Assuming product has a `category` field

        // Fetch offers for the products in the order
        const productOffers = await Offer.find({
            product: { $in: productIds },
            status: 'active' // Ensure the offer is active
        });

        // Fetch offers for the categories of the products in the order
        const categoryOffers = await Offer.find({
            category: { $in: categoryIds },
            status: 'active' // Ensure the offer is active
        });

        // Create a map for quick lookup of product and category discounts
        const productDiscountMap = productOffers.reduce((map, offer) => {
            map[offer.product.toString()] = offer.discount || 0; // Store product discount
            return map;
        }, {});

        const categoryDiscountMap = categoryOffers.reduce((map, offer) => {
            map[offer.category.toString()] = offer.discount || 0; // Store category discount
            return map;
        }, {});

        // Initialize total amount and calculate discounts
        let updatedTotalAmount = 0;
        const itemsWithPricing = order.items.map(item => {
            const productId = item.product._id.toString();
            const categoryId = item.product.category.toString();

            // Get the discounts for the product and category
            const productDiscount = productDiscountMap[productId] || 0;
            const categoryDiscount = categoryDiscountMap[categoryId] || 0;

            // Apply the higher discount between product and category
            const discountPercentage = Math.max(productDiscount, categoryDiscount);
            const discountedPrice = item.price * (1 - discountPercentage / 100); // Calculate discounted price
            const totalPrice = discountedPrice * item.quantity; // Calculate total price for the item

            // Accumulate the total amount
            updatedTotalAmount += totalPrice;

            return {
                product: item.product, // Include product details in the response
                quantity: item.quantity,
                price: item.price,
                discount: discountPercentage, // Highest applicable discount
                discountedPrice: discountedPrice.toFixed(2), // Discounted price (formatted)
                totalPrice: totalPrice.toFixed(2), // Total price after discount
                productOffer: productOffers.find(offer => offer.product.toString() === productId) || null,
                categoryOffer: categoryOffers.find(offer => offer.category.toString() === categoryId) || null
            };
        });

        // Add delivery charge to the total amount
        let deliveryCharge = 0;
        if (updatedTotalAmount < 50) {
            deliveryCharge = 10; // Fixed charge for orders under $50
        } else if (updatedTotalAmount >= 50 && updatedTotalAmount < 100) {
            deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
        }

        // Calculate the total amount by adding the delivery charge
        const totalAmountWithDelivery = updatedTotalAmount + deliveryCharge;

        // Save the updated amounts in the database
        order.totalAmount = totalAmountWithDelivery.toFixed(2); // Total amount after adding delivery charge
        order.deliveryCharge = deliveryCharge.toFixed(2); // Save the delivery charge in the order
        await order.save();

        // Render the page with updated order data
        res.render('user/orderDetail', {
            order: {
                ...order.toObject(),
                amountToDisplay: order.finalAmount || order.totalAmount, // Display the correct amount
                items: itemsWithPricing,
                deliveryCharge // Pass items with updated pricing
            },
            categories, // Pass categories if needed for rendering
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.postReturnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.status !== 'Delivered') {
            return res.status(400).send('Return is allowed only for delivered orders.');
        }

        // Update the order status to 'Returned'
        order.status = 'Returned';
        await order.save();

        // Logic to refund the user or update wallet (if applicable) can be added here

        res.redirect('/api/user-orders'); // Redirect to the orders page
    } catch (error) {
        console.error('Error processing return:', error);
        res.status(500).send('Server Error');
    }
};


