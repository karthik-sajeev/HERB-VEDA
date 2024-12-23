const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who gave the review
    rating: { type: Number, required: true }, // Rating from 1 to 5
    comment: { type: String }, // Optional comment
    date: { type: Date, default: Date.now } // Date of the review
});


const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    stock: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [String],
    ratings: { type: Number, default: 0 },
    reviews: [reviewSchema],
    deleted: { type: Boolean, default: false },
    finalPrice: { type: Number },
    createdAt: { type: Date, default: Date.now },
    isFeatured: { type: Boolean, default: false },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },  // Reference to the Brand model
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }]
});
  


// Method to calculate final price after discount
productSchema.methods.calculateFinalPrice = function() {
    const discountAmount = (this.price * this.discount) / 100;
    this.finalPrice = this.price - discountAmount;
    return this.finalPrice;
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
// module.exports = mongoose.model('Review', reviewSchema);