const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // Reference to Product
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Price at the time of order
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number, // Discount as a percentage (e.g., 10 for 10%)
      default: 0, // Default to no discount
    },
    finalAmount: {
      type: Number, // Final amount after discount
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
   
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash on Delivery', 'Credit Card', 'Debit Card', 'Razorpay', 'Wallet'], // Ensure these values match
      required: true,
    },
    // razorpayOrderId: String,
    // razorpayPaymentId: String,
    // razorpaySignature: String,
    address: {
      name: String,
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    returnedQuantity: { type: Number, default: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
