const express = require('express');
const router = express.Router();
const AdminpasswordController = require('../controllers/AdminpasswordController');


router.get('/forgot-password', AdminpasswordController.getForgotPasswordPage);
router.post('/forgot-password', AdminpasswordController.postForgotPassword);
router.get('/reset-password/:token', AdminpasswordController.getResetPasswordPage);
router.post('/reset-password/:token', AdminpasswordController.postResetPassword);

module.exports = router;