const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const passwordController = require('../controllers/AdminpasswordController'); 
const isAuthenticated = require('../middleware/authMiddleware'); 

const Order = require('../models/Order');

//login routes
router.get('/login', adminController.getLoginPage);
router.post('/login', adminController.postLogin);

//password routes
router.get('/forgot-password', passwordController.getForgotPasswordPage); 
router.post('/forgot-password', passwordController.postForgotPassword); 
router.get('/reset-password/:token', passwordController.getResetPasswordPage); 
router.post('/reset-password/:token', passwordController.postResetPassword); 


// User Management Routes
router.get('/users',isAuthenticated, adminController.listUsers);
router.post('/users/block/:id', isAuthenticated,adminController.blockUser);
router.post('/users/unblock/:id', isAuthenticated,adminController.unblockUser);


router.get('/dashboard', isAuthenticated,adminController.getdashboard)
router.get('/logout',isAuthenticated,adminController.getlogout)

// Sales data API
router.get('/sales-data', async (req, res) => {
    try {
        const { filter } = req.query; // Get the filter (daily or monthly) from the query
        let aggregationPipeline;

        if (filter === 'daily') {
            // Daily aggregation
            aggregationPipeline = [

                {
                    $group: {
                        _id: {
                            day: { $dayOfMonth: "$orderDate" },
                            month: { $month: "$orderDate" },
                            year: { $year: "$orderDate" }
                        },
                        totalSales: {
                            $sum: "$finalAmount" // Sum of finalAmount (after discount)
                        }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } } // Sort by date
            ];
        } else if (filter === 'monthly') {
            // Monthly aggregation
            aggregationPipeline = [
                
                {
                    $group: {
                        _id: {
                            month: { $month: "$orderDate" },
                            year: { $year: "$orderDate" }
                        },
                        totalSales: {
                            $sum: "$finalAmount" // Sum of finalAmount (after discount)
                        }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } } // Sort by year and month
            ];
        } else {
            return res.status(400).json({ success: false, message: "Invalid filter provided" });
        }

        // Execute the aggregation
        const salesData = await Order.aggregate(aggregationPipeline);

        res.status(200).json({ success: true, data: salesData });
    } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
module.exports = router;