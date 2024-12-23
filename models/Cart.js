const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, 
  products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 // Ensure quantity is at least 1
      },
      price: { 
        type: Number, 
        required: true // Store the product's price
      },
      totalPrice: { 
        type: Number, 
        required: true // Derived value: price * quantity
      }
    },
  ],
  totalAmount: { 
    type: Number, 
    default: 0, // This will store the total price before discounts
  },
  discountedAmount: { 
    type: Number, 
    default: 0, // This will store the total price after applying discounts
  },

  couponApplied: { 
    code: { type: String }, // Coupon code applied
    discount: { type: Number, default: 0 } // Percentage discount (e.g., 10 for 10%)
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Use 'carts' as the collection name
const Cart = mongoose.model('Cart', cartSchema, 'carts');

module.exports = Cart;
