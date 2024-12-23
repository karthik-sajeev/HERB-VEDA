const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Admin = require('../models/adminModel'); 
require('dotenv').config();

//ADMIN PASSWORD CONTROLLER


exports.getForgotPasswordPage = (req, res) => {
    console.log('Forgot Password route accessed');
    const errorMessage = req.flash('error') || null; 
    const successMessage = req.flash('success') || null; 
    res.render('admin/forgot-password', {
        errorMessage,
        successMessage
    });
};

// Forgot Password POST route
exports.postForgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const adminUser = await Admin.findOne({ email });
        if (!adminUser) {
            req.flash('error', 'No account with that email found.');
            return res.redirect('/admin/forgot-password');
        }

       
        const token = crypto.randomBytes(20).toString('hex'); 
        adminUser.resetPasswordToken = token;
        adminUser.resetPasswordExpires = Date.now() + 3600000; 

        await adminUser.save();

        // Create a Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Construct the reset link
        const resetLink = `http://${req.headers.host}/admin/reset-password/${token}`;

        const mailOptions = {
            to: adminUser.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            text: `Hello,\n\nYou are receiving this email because a password reset request was made for your account.\nPlease click the following link or paste it into your browser to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email, and your password will remain unchanged.\nThank you.\n`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        req.flash('success', 'A password reset link has been sent to your email.');
        return res.redirect('/admin/forgot-password');
    } catch (error) {
        console.error('Error occurred while sending reset email:', error);
        req.flash('error', 'Error occurred while sending reset email. Please try again later.');
        return res.redirect('/admin/forgot-password');
    }
};

// Reset Password GET route (token-based)
exports.getResetPasswordPage = async (req, res) => {
    try {
        const adminUser = await Admin.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!adminUser) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/admin/forgot-password');
        }

      
        res.render('admin/reset-password', {
            token: req.params.token,
            email: adminUser.email,
            errorMessage: req.flash('error'), 
            successMessage: req.flash('success') 
        });
    } catch (error) {
        console.error('Error occurred during token validation:', error);
        req.flash('error', 'Error occurred during token validation. Please try again later.');
        return res.redirect('/admin/forgot-password');
    }
};


// Reset Password POST route
exports.postResetPassword = async (req, res) => {
    const { password, email } = req.body; 
    const { token } = req.params; 

    // Password criteria
    const passwordCriteria = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // Check if the new password is valid
    if (!passwordCriteria.test(password)) {
        return res.render('admin/reset-password', {
            token: token, 
            email: email, 
            errorMessage: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            successMessage: null // Set this as null
        });
    }

    try {
        const adminUser = await Admin.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!adminUser) {
            return res.render('admin/reset-password', {
                token: token, 
                email: email, 
                errorMessage: 'Password reset token is invalid or has expired.',
                successMessage: null 
            });
        }

        // Hash the new password and save it
        const hashedPassword = await bcrypt.hash(password, 10);
        adminUser.password = hashedPassword;
        adminUser.resetPasswordToken = undefined; 
        adminUser.resetPasswordExpires = undefined;

        await adminUser.save();
        
       
        
        return res.redirect('/admin/login'); 
        req.flash('success', 'Your password has been updated successfully. You can now log in.');
    } catch (error) {
        console.error('Error occurred while resetting password:', error);
        res.render('admin/reset-password', {
            token: token, 
            email: email, 
            errorMessage: 'Error occurred while resetting password. Please try again.',
            successMessage: null 
        });
    }
};
// passwordController.js
exports.getLoginPage = (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }

    res.set('Cache-Control', 'no-store');
    res.render('admin/login', { error: req.flash('error') });
};
// passwordController.js
exports.postLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
       
        const admin = await Admin.findOne({ username });

        if (!admin || !(await admin.comparePassword(password))) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        // Set session data
        req.session.isAdmin = true;
        req.session.adminId = admin._id; 

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/admin/login');
    }
};
// passwordController.js
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error logging out:', err);
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/admin/login');
    });
};
