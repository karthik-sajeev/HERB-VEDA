const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/userModel'); 
require('dotenv').config();

// Change Password Route
exports.postChangePassword= async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; 

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the current password is correct
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        // Update the password
        user.password = newPassword; 
        await user.save();

        return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Failed to change password.' });
    }
};





let otps = {}; 

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

// Forgot password page
exports.getForgotPassword= (req, res) => {
    res.render('user/forgot-password');
};
// Send OTP Route
exports.postSentOtp= async (req, res) => {
    const { email } = req.body;

    // Check if the email exists in the database
    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(404).send('User not found');
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = { otp, expires: Date.now() + 300000 }; // Set OTP to expire in 5 minutes

    // Send OTP email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS,  
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        req.session.email = email; 
        res.redirect('/user/otp-verification');
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).send('Error sending OTP');
    }
};

// OTP Verification Route
exports.postOtpVerfication= (req, res) => {
    const { otp } = req.body;
    const email = req.session.email; 

    if (otps[email] && otps[email].otp === otp && Date.now() < otps[email].expires) {
       
        res.redirect('/user/reset-password'); 
    } else {
        
        res.status(400).send('Invalid or expired OTP');
    }
};


// OTP verification page
exports.getOtpVerification= (req, res) => {
    res.render('user/otp-verification'); 
};


// Reset password page
exports.getResetPassword= (req, res) => {
    res.render('user/reset-password'); 
};
// Reset Password Route
exports.postResetPassword= async (req, res) => {
    const { newPassword } = req.body; 
    const email = req.session.email; 

    if (!email) {
        return res.status(400).send('User not found'); 
    }

    try {
        const user = await User.findOne({ email: email }); 
        if (!user) {
            return res.status(404).send('User not found'); 
        }

        user.password = newPassword; 
        await user.save(); 

        req.flash('success', 'Password reset successfully. Please log in.'); 
        res.redirect('/user/login'); 
    } catch (error) {
        console.error('Error resetting password:', error); 
        res.status(500).send('Error resetting password'); 
    }
};

// Route for updating the password
exports.postUpdatePassword= async (req, res) => {
    const newPassword = req.body['new-password'];
    const email = req.session.email;

    
    const hashedPassword = await bcrypt.hash(newPassword, 10); 

    await User.findOneAndUpdate({ email }, { password: hashedPassword }); 

    // Clear session variables
    delete req.session.otp;
    delete req.session.email;

    res.redirect('/user/login'); 
};


