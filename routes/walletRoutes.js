const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController'); // Update with the correct path
const User=require('../models/userModel')

// Route to add money to the wallet
router.post('/add-money', walletController.addMoneyToWallet);
router.get('/', walletController.getWalletPage);
 // 

module.exports = router;
