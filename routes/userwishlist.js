const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth'); // Middleware to check if user is authenticated

// Route to display the user's wishlist
router.get('/', isAuthenticated, wishlistController.getWishlist); 

// Route to add a product to the wishlist
router.post('/add', isAuthenticated, wishlistController.addToWishlist);

// Route to remove a product from the wishlist
router.post('/remove/:productId', isAuthenticated, wishlistController.removeFromWishlist);

module.exports = router;
