const Order = require('../models/Order'); 
const Product = require('../models/Product'); 

// Fetch orders for the admin page with pagination
exports.getOrder = async (req, res) => {
    const page = parseInt(req.query.page) || 1;  
    const limit = 10; // Set limit of 10 items per page
    const skip = (page - 1) * limit;  
  
    try {
        // Fetch the orders, populate user details, and sort by createdAt
        const orders = await Order.find()
            .populate('user')  // Populate user details
            .sort({ createdAt: -1 })  // Sort by creation date, descending
            .skip(skip)  // Skip the previous pages
            .limit(limit);  // Limit the number of items per page
  
        const totalOrders = await Order.countDocuments();  // Total number of orders
        const totalPages = Math.ceil(totalOrders / limit);  // Calculate total pages
  
        // Calculate the range of pages (show 5 pages at a time)
        const startPage = Math.floor((page - 1) / 5) * 5 + 1;
        const endPage = Math.min(startPage + 4, totalPages);
  
        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            startPage,
            endPage,
            itemsPerPage: limit,  // Pass limit as itemsPerPage
            activePage: 'orders'  // This could be used for navigation highlights
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server Error');
    }
  };
  

// Fetch order details for the admin
exports.getorderDetail = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('user') 
            .populate('items.product'); 
  
        console.log('Fetched Order:', order); 
  
        if (!order) {
            return res.status(404).send('Order not found');
        }
  
        res.render('admin/orderDetails', { 
            order,
            activePage: 'orders'
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server Error');
    }
};

// Handle order status update
exports.postorderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
        res.redirect(`/admin/orders/${order._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Handle order cancellation (with stock update)
exports.postcancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Check if order can be cancelled
        if (order.status === 'Pending' || order.status === 'Shipped') {
            // Update the order status to 'Cancelled'
            order.status = 'Cancelled';
            
            // Update stock levels for products in the order
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity; // Restore stock if the order is cancelled
                    await product.save();
                }
            }
        
            // Save the updated order
            await order.save();
            res.redirect('/admin/orders'); 
        } else {
            return res.status(400).send('Cancellation not allowed for this order status');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Server error');
    }
};

// Handle product return (with stock update)
exports.postreturnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { itemsToReturn } = req.body; // Items the user wants to return

        // Fetch the order
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Ensure the order is in a state where return is allowed
        if (order.status === 'Delivered') {
            // Process the return
            for (const returnItem of itemsToReturn) {
                const orderItem = order.items.find(item => item.product.toString() === returnItem.productId);
                if (orderItem) {
                    const product = await Product.findById(orderItem.product);

                    if (product) {
                        // Update stock levels
                        product.stock += returnItem.quantity; // Restore stock
                        await product.save();

                        // Update the order item
                        orderItem.returnedQuantity = (orderItem.returnedQuantity || 0) + returnItem.quantity;
                    }
                }
            }

            // Save updated order status
            order.status = 'Returned';
            await order.save();

            res.redirect('/admin/orders'); // Redirect to the orders page
        } else {
            return res.status(400).send('Return not allowed for this order status');
        }
    } catch (error) {
        console.error('Error processing return:', error);
        res.status(500).send('Server Error');
    }
};
