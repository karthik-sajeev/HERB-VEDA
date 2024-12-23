const User = require("../models/userModel");
const Order = require('../models/Order');
const Category = require('../models/Category'); 

const WalletTransaction = require('../models/wallet'); // Assuming the path to the WalletTransaction model
exports.getProfile = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const walletHistory = await WalletTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalTransactions = await WalletTransaction.countDocuments({ userId: req.user._id });
        const totalPages = Math.ceil(totalTransactions / limit);

        const categories = await Category.find();

        res.render('user/profile', {
            user: req.user,
            walletHistory,
            categories,
            referralCode: req.user.referralCode,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Server Error');
    }
};


exports.postEditProfile= async (req, res) => {
        const userId = req.params.id;
        const { name, email, mobile } = req.body;
    
        try {
            await User.findByIdAndUpdate(userId, { name, email, mobile });
            res.status(200).send('Profile updated successfully');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating profile');
        }
    };

 exports.getListAddress= async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('addresses');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user.addresses); 
        } catch (error) {
            console.error('Error fetching addresses:', error);
            res.status(500).json({ message: 'Failed to fetch addresses' });
        }
 };

exports.postEditAddress= async (req, res) => {
        const { name, street, city, state, pincode, country } = req.body; 
        try {
            await User.updateOne(
                { 'addresses._id': req.params.id },
                {
                    $set: {
                        'addresses.$.name': name,
                        'addresses.$.street': street,
                        'addresses.$.city': city,
                        'addresses.$.state': state,
                        'addresses.$.pincode': pincode,
                        'addresses.$.country': country, 
                    },
                }
            );
            res.status(200).json({ message: 'Address updated successfully' });
        } catch (error) {
            console.error('Error updating address:', error);
            res.status(500).json({ message: 'Error updating address. Please try again.' });
        }
    };
    



exports.postDeleteAddress= async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { addresses: { _id: req.params.id } },
        });
        res.redirect('/user/profile'); 
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Server error');
    }
};


exports.postAddAddress= async (req, res) => {
    const { userId, name, street, city, state, pincode, country } = req.body; 
    try {
        await User.findByIdAndUpdate(userId, {
            $push: {
                addresses: { name, street, city, state, pincode, country } 
            }
        });
        res.status(200).json({ message: 'Address added successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add address.' });
    }
};
