const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['product', 'category', 'referral'], // Type of offer
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  discount: {
    type: Number, // Discount percentage or flat value
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive', // To manage active/inactive offers
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // If type is 'product', link to Product model
    required: function() { return this.type === 'product'; }, // Only required if type is 'product'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // If type is 'category', link to Category model
    required: function() { return this.type === 'category'; }, // Only required if type is 'category'
  },
  referralCode: {
    type: String, // If type is 'referral', a referral code
    required: function() { return this.type === 'referral'; }, // Only required if type is 'referral'
  },
});

// Create model based on schema
module.exports = mongoose.model('Offer', offerSchema);
