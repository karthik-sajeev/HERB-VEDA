const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
// Define the address schema
// Define the address schema
const addressSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Name of the address
    street: { type: String, required: true }, // Street of the address
    city: { type: String, required: true }, // City of the address
    state: { type: String, required: true }, // State of the address
    pincode: { type: String, required: true }, // Pincode of the address
    country:{type:String,required:true},
});

// Define the user schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    joinedOn: { type: Date, default: Date.now },
    isBlocked: { type: Boolean, default: false },
    addresses: { type: [addressSchema], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Include addresses field
    walletBalance: { type: Number, default: 0 } ,
    referralCode: { type: String, unique: true },
    referredBy: { type: String, default: null },
    
});
// Pre-save hook to hash the password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); // Only hash the password if it has been modified
    this.password = await bcrypt.hash(this.password, 10); // Hash the password
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Export the User model
module.exports = mongoose.model('User', userSchema);
