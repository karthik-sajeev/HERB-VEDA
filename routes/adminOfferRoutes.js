const express = require('express');
const router = express.Router();
const adminofferController = require('../controllers/adminofferController');

// List all offers
router.get('/offers', adminofferController.getOffers);

// Show form for creating a new offer
router.get('/offers/create', adminofferController.createOfferForm);

// Show form for editing an existing offer
router.get('/offers/edit/:id', adminofferController.editOfferForm);

// Create a new offer
router.post('/offers/create', adminofferController.createOffer);

// Update an existing offer
router.post('/offers/update', adminofferController.updateOffer);

// Delete an offer
router.post('/offers/delete/:id', adminofferController.deleteOffer);
router.post('/offers/toggle-status/:id', adminofferController.toggleStatus);
module.exports = router;
