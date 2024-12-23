const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const ProfileController = require('../controllers/userProfileController');
const UserpasswordController = require('../controllers/UserpasswordController');
const passport = require('passport');
const { isAuthenticated } = require('../middleware/auth');
require('dotenv').config();


// User signup routes
router.get('/signup', userController.getSignupPage);
router.post('/signup', userController.postSignup);

// OTP verification routes
router.get('/verify-otp', userController.getVerifyOtpPage);
router.post('/verify-otp', userController.postVerifyOtp);
router.post('/resend-otp', userController.resendOtp);

// User login routes
router.get('/login', userController.getLoginPage);
router.post('/login', userController.postLogin);

// User profile routes
router.get('/profile', isAuthenticated, ProfileController.getProfile);
router.post('/profile/:id/edit', isAuthenticated, ProfileController.postEditProfile);
router.post('/profile/address/:id/edit', isAuthenticated, ProfileController.postEditAddress);
router.get('/profile/address-list', isAuthenticated, ProfileController.getListAddress);
router.post('/profile/address/:id/delete', isAuthenticated, ProfileController.postDeleteAddress);
router.post('/profile/address/add', isAuthenticated, ProfileController.postAddAddress);

// User password routes
router.get('/forgot-password', UserpasswordController.getForgotPassword);
router.post('/change-password', UserpasswordController.postChangePassword);
router.post('/send-otp', UserpasswordController.postSentOtp);
router.get('/otp-verification', UserpasswordController.getOtpVerification);
router.post('/otp-verification', UserpasswordController.postOtpVerfication);
router.get('/reset-password', UserpasswordController.getResetPassword);
router.post('/reset-password', UserpasswordController.postResetPassword);
router.post('/update-password', UserpasswordController.postUpdatePassword);


// Google Auth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/user/login' }), (req, res) => {
    res.redirect('/home');
});





module.exports = router;
