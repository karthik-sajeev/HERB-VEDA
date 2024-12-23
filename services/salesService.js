const mongoose = require('mongoose');
const Order = require('../models/Order'); // Adjust path as needed
const Product = require('../models/Product'); // Adjust path as needed
const Category = require('../models/Category'); // Adjust path as needed

// Function to get top selling products
async function getTopSellingProducts() {
    const topSellingProducts = await Order.aggregate([
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.product',
                totalSold: { $sum: '$items.quantity' },
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 4 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $project: {
                _id: 0,
                product: '$productDetails.name',
                totalSold: 1
            }
        }
    ]);
    return topSellingProducts;
}

// Function to get top selling categories
async function getTopSellingCategories() {
    const topSellingCategories = await Order.aggregate([
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.product',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $group: {
                _id: '$productDetails.category',
                totalSold: { $sum: '$items.quantity' }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 4},
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        { $unwind: '$categoryDetails' },
        {
            $project: {
                _id: 0,
                category: '$categoryDetails.name',
                totalSold: 1
            }
        }
    ]);
    return topSellingCategories;
}
// Function to get top selling brands with their names
async function getTopSellingBrands() {
    const topSellingBrands = await Order.aggregate([
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',               // Lookup products collection
                localField: 'items.product',     // Match with the 'product' field in items
                foreignField: '_id',             // Match with the '_id' field in the products collection
                as: 'productDetails'             // Name the array of product details
            }
        },
        { $unwind: '$productDetails' },        // Unwind the array of product details to work with individual products
        {
            $lookup: {
                from: 'brands',                // Lookup brands collection
                localField: 'productDetails.brand', // Match with the 'brand' field in productDetails
                foreignField: '_id',            // Match with the '_id' field in the brands collection
                as: 'brandDetails'             // Name the array of brand details
            }
        },
        { $unwind: '$brandDetails' },          // Unwind the array of brand details to work with individual brand
        {
            $group: {
                _id: '$productDetails.brand',   // Group by brand (productDetails.brand)
                totalSold: { $sum: '$items.quantity' }, // Sum up the quantity sold for each brand
                brandName: { $first: '$brandDetails.name' }  // Get the first brand name (since there's only one brand per product)
            }
        },
        { $sort: { totalSold: -1 } },           // Sort by total sold in descending order
        { $limit: 4 },                          // Limit to top 4 brands
        {
            $project: {
                _id: 0,                         // Exclude the _id field
                brand: '$brandName',            // Display the brand name
                totalSold: 1                   // Display the total sold quantity
            }
        }
    ]);
    
    return topSellingBrands;
}

module.exports = {
    getTopSellingProducts,
    getTopSellingCategories,
    getTopSellingBrands
};
