// Import necessary models
const User = require('../models/userModel'); // Assuming the user model is in this location
const mongoose = require('mongoose');
const Product = require('../models/Product'); 
const WalletTransaction = require('../models/wallet'); // Assuming the path to the model

exports.addMoneyToWallet = async (req, res) => {
    try {
        const { email, amount, page = 1, limit = 5 } = req.body; // Default page to 1 and limit to 5
        if (email !== req.user.email) {
            return res.status(403).json({ error: "You cannot add money to another email use your email" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found." });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0." });
        }

        const roundedAmount = parseFloat(amount).toFixed(2);

        // Update the wallet balance
        user.walletBalance = parseFloat(user.walletBalance) + parseFloat(roundedAmount);
        await user.save();

        // Save transaction
        const transaction = new WalletTransaction({
            userId: user._id,
            amount: roundedAmount,
            transactionType: 'credit',
            description: `Added ${roundedAmount} INR to wallet`,
        });
        await transaction.save();

        // Fetch wallet history with pagination
        const totalTransactions = await WalletTransaction.countDocuments({ userId: user._id });
        const totalPages = Math.ceil(totalTransactions / limit);

        const walletHistory = await WalletTransaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit) // Skip the transactions for previous pages
            .limit(parseInt(limit)); // Limit the number of records per page

        res.json({
            walletBalance: parseFloat(user.walletBalance).toFixed(2),
            walletHistory,
            totalPages, // Send total pages count
            currentPage: parseInt(page), // Send current page
        });

    } catch (error) {
        console.error("Error adding money:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
// Adjust the path as necessary
const Category = require('../models/Category'); // Adjust the path for the Category model

exports.getWalletPage = async (req, res) => {
    try {
        // Pagination variables
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Number of transactions per page
        const skip = (page - 1) * limit;

        // Fetch wallet transactions for the logged-in user
        const walletHistory = await WalletTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 }) // Sort by most recent first
            .skip(skip)
            .limit(limit);

        // Total transaction count for pagination
        const totalTransactions = await WalletTransaction.countDocuments({ userId: req.user._id });
        const totalPages = Math.ceil(totalTransactions / limit);

        // Fetch categories
        const categories = await Category.find(); // Get all categories

        // Render the wallet.ejs view
        res.render('user/wallet', {
            walletHistory, // Pass wallet transaction history
            referralCode: req.user.referralCode, // Pass the user's referral code
            currentPage: page, // Pass current page for pagination
            totalPages, // Pass total pages for pagination
            categories, // Pass categories to the view
        });
    } catch (error) {
        console.error('Error fetching wallet details:', error);
        res.status(500).send('Server Error');
    }
};
