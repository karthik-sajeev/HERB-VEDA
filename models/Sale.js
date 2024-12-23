// models/Sale.js
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    productId: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    customerId: { type: String, required: true },
    status: { type: String, enum: ['completed', 'pending', 'canceled'], default: 'completed' }
});

module.exports = mongoose.model('Sale', saleSchema);
