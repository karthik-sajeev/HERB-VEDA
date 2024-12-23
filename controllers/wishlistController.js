const User = require('../models/userModel');
const Category=require('../models/Category')
const Product = require('../models/Product'); // Assuming you have a Product model
// Function to add a product to the wishlist
exports.addToWishlist = async (req, res) => {
    try {
      const { productId } = req.body;
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
   
      const user = await User.findById(req.user._id);
      if (user.wishlist.includes(productId)) {
        return res.status(400).json({ success: false, message: 'Product is already in your wishlist' });
      }
  
      user.wishlist.push(productId);
      await user.save();
  
      return res.status(200).json({ success: true, message: 'Product added to wishlist' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  
  // Remove product from wishlist
  exports.removeFromWishlist = async (req, res) => {
    const userId = req.user._id;
    const productId = req.params.productId;
  
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: { wishlist: productId }
      });
      return res.json({ success: true, message: 'Product removed from wishlist' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };
// Fetch wishlist for user
exports.getWishlist = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).populate('wishlist');
    
    // Fetch categories here if they are needed
    const categories = await Category.find(); // Replace `Category` with your actual model for categories
    
    // Pass both wishlist and categories to the view
    res.render('user/wishlist', { wishlist: user.wishlist, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
