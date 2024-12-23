require('dotenv').config(); 

const User = require('../models/userModel'); 
const bcrypt = require('bcrypt'); 
const { body, validationResult } = require('express-validator');
const { isMobilePhone } = require('validator'); 
const nodemailer = require('nodemailer'); 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

// Validation middleware for signup
const validateSignup = [
    body('name').notEmpty().withMessage('Full Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('mobile').custom(value => {
        if (!isMobilePhone(value, 'en-IN')) { // For Indian phone numbers
            throw new Error('Invalid phone number');
        }
        return true;
    }),
    body('password').isLength({ min: 6 })
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character')
        .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];



exports.getSignupPage = (req, res) => {
    const { name = '', email = '', mobile = '' } = req.body || {};
    const errors = req.flash('error') || [];
    console.log('Flash Errors:', errors); // Check flash messages
    res.render('user/signup', { name, email, mobile, errors });
};

const crypto = require('crypto');


// Utility function to generate a referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-character referral code
}

exports.postSignup = [
    // Validation middleware
    ...validateSignup,

    // Handle signup logic
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation Errors:', errors.array()); 
            req.flash('error', errors.array().map(err => err.msg)); 
            return res.redirect('/user/signup');
        }

        const { name, email, mobile, password, referralCode } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

        try {
            // Check if the user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                req.flash('error', ['Email already exists.']);
                return res.redirect('/user/signup'); // Redirect back to signup page
            }

            // Check if referral code is provided and validate it
            let referredBy = null;
            if (referralCode) {
                const referrer = await User.findOne({ referralCode });
                if (referrer) {
                    referredBy = referrer._id; // Assign referrer's ID to referredBy
                } else {
                    req.flash('error', ['Invalid referral code.']);
                    return res.redirect('/user/signup');
                }
            }

            // Send OTP to the user's email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}`, 
            };

            await transporter.sendMail(mailOptions); 

            // Store temporary user data in session, including referral info
            req.session.tempUser = { name, email, mobile, password, otp, referredBy };

            console.log('Generated OTP:', otp); 

            // Redirect to OTP verification page
            res.redirect('/user/verify-otp');
        } catch (error) {
            console.error('Error sending OTP:', error); 
            req.flash('error', ['Error sending OTP. Please try again.']);
            return res.redirect('/user/signup'); 
        }
    }
];


// Get Verify OTP Page
exports.getVerifyOtpPage = (req, res) => {
    const email = req.session.tempUser ? req.session.tempUser.email : null; 

    res.render('user/verify-otp', {
        email: email,
        mobile: req.session.tempUser ? req.session.tempUser.mobile : null, 
        error: req.flash('error'), 
    });
};
// POST Verify OTP
exports.postVerifyOtp = async (req, res) => {
    const { otp } = req.body;
    const { tempUser } = req.session; 

    if (!tempUser) {
        return res.redirect('/user/signup'); 
    }

    const { mobile, otp: storedOtp, referredBy } = tempUser; 

    // Verify the OTP by converting both to string and trimming
    if (!otp || !storedOtp) {
        return res.render('user/verify-otp', { error: 'OTP is required.', mobile });
    }

    try {
        if (otp.trim() === storedOtp.toString()) { // Compare entered OTP with stored OTP
            const { name, email, password } = tempUser;

            // Create the new user
            const newUser = new User({
                name,
                email,
                mobile,
                password, 
                referralCode: generateReferralCode(), // Generate a new referral code for the new user
                referredBy, // Store the referrer ID (if any)
            });

            // Save the new user to the database
            await newUser.save();

            // If the user was referred, give rewards to both the new user and the referrer
            if (referredBy) {
                // Add 100 to both the new user's and the referrer's wallet
                await User.updateOne({ _id: referredBy }, { $inc: { walletBalance: 100 } });
                await User.updateOne({ _id: newUser._id }, { $inc: { walletBalance: 100 } });
            }

            // Clear temporary user data from session
            delete req.session.tempUser;

            req.flash('success_msg', 'Signup successful! You can now log in.'); 
            res.redirect('/user/login'); 
        } else {
            req.flash('error', 'Invalid OTP. Please try again.');
            res.render('user/verify-otp', { mobile, error: req.flash('error') });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.render('user/verify-otp', { error: 'Error verifying OTP. Please try again.', mobile });
    }
};

exports.resendOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        console.error('Email is undefined');
        return res.status(400).json({ message: 'Email is required.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a new 6-digit OTP

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text:` Your new OTP code is: ${otp}`,
        };

        console.log('Mail Options:', mailOptions);
        await transporter.sendMail(mailOptions); // Send email

       
        req.session.tempUser.otp = otp; // Update OTP in session

        console.log('Resent OTP:', otp); // Debugging: Log the OTP sent

        return res.status(200).json({ message: 'OTP resent successfully.' });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ message: 'Error resending OTP. Please try again.' });
    }
};// GET Login Page
exports.getLoginPage = (req, res) => {
    const error = req.flash('error'); // Retrieve flash error messages
    res.render('user/login', { error });
};

// POST Login
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });

        // If user does not exist
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/user/login');
        }

        // Check if the user is blocked
        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked. Please contact support.');
            return res.redirect('/user/login');
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await user.comparePassword(password); // Assuming comparePassword is a method in your User model
        if (!isMatch) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/user/login');
        }

        // Store user information in the session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
        };

        // Log the user in using the provided session
        req.logIn(user, (err) => {
            if (err) {
                console.error('Error during login:', err);
                req.flash('error', 'Error logging in. Please try again.');
                return res.redirect('/user/login');
            }
            res.redirect('/home'); // Redirect to home page
        });
    } catch (error) {
        console.error('Error logging in:', error);
        req.flash('error', 'Server error. Please try again later.');
        res.redirect('/user/login');
    }
};
