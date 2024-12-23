const express = require('express');
const Category = require('../models/Category'); 
const Product = require('../models/Product');
const multer = require('multer');
const Brand = require('../models/brand');  // Adjust the path if needed

const router = express.Router();
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); 
    }
});
const upload = multer({ storage: storage });

const validateProduct = [
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('category').notEmpty().withMessage('Category is required'),
];


router.use('/uploads', express.static('uploads'));

exports.getProducts = async (req, res) => {
    console.log('Fetching products...');

    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit; 

    try {
        // Fetch only non-deleted products and paginate
        const totalProducts = await Product.countDocuments({ deleted: false });
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find({ deleted: false })
            .populate('category') 
            .skip(skip) 
            .limit(limit); 

        console.log('Products fetched:', products); 

        // Render the products with pagination data
        res.render('admin/products', {
            products,
            currentPage: page,
            totalPages,
            activePage: 'products' 
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('admin/products', {
            products: [],
            error: 'Error fetching products',
            currentPage: 1,
            totalPages: 1,
            activePage: 'products'  
        });
    }
};

// Handle soft deleting a product
exports.postDeleteProduct= async (req, res) => {
    try {
        console.log(`Deleting product with ID: ${req.params.id}`); 
        await Product.findByIdAndUpdate(req.params.id, { deleted: true }); 
        res.redirect('/admin/products?success=Product deleted successfully'); 
    } catch (error) {
        console.error('Error deleting product:', error);
        res.redirect('/admin/products?error=Error deleting product');
    }
};
// Get form to add a product
exports.getAddProduct = async (req, res) => {
    try {
        const categories = await Category.find();
        const brands = await Brand.find(); // Fetch the brands from the database
        
        res.render('admin/addProduct', { 
            categories, 
            brands,  // Pass brands to the view
            error: null,
            activePage: 'products'  
        });
    } catch (error) {
        console.error('Error fetching categories or brands:', error);
        
        const categories = await Category.find();
        res.render('admin/addProduct', { 
            categories: [], 
            brands: [],  // Ensure brands is passed as an empty array if there is an error
            error: 'Error fetching categories or brands',
            activePage: 'products'  
        });
    }
};
// Add product route
exports.postAddProduct = [
    upload.array('images', 3),  
    validateProduct,           
    async (req, res) => {       
        const errors = validationResult(req);
        const categories = await Category.find();
        const brands = await Brand.find(); // Fetch the brands again for the form

        // Check if validation errors are present
        if (!errors.isEmpty()) {
            return res.render('admin/addProduct', { categories, brands, error: errors.array() });
        }

        const { name, description, price, stock, category, brand } = req.body;

        // Check if at least 3 images were uploaded
        if (!req.files || req.files.length < 3) {
            return res.render('admin/addProduct', { categories, brands, error: 'Please upload at least 3 images.' });
        }

        try {
            // Process and resize images
            const images = await Promise.all(req.files.map(async (file) => {
                const outputPath = `uploads/resized-${file.filename}`;
                await sharp(file.path)
                    .resize(300, 300)
                    .toFile(outputPath);
                return outputPath; 
            }));

            // Create a new product instance including the brand
            const newProduct = new Product({
                name,
                description,
                price,
                stock,
                category,
                brand,  // Include the brand in the product data
                images: images.map(image => image.split('/').pop()) // Save only the filenames
            });
            
            await newProduct.save();
            res.redirect('/admin/products?success=Product added successfully');
        } catch (error) {
            console.error(error);
            res.render('admin/addProduct', { categories, brands, error: 'Error adding product. Please try again.' });
        }
    }
];
// Get form to edit a product
exports.getEditProduct = async (req, res) => {
    try {
        // Fetch product with category and brand information
        const product = await Product.findById(req.params.id).populate('category').populate('brand');
        
        // Fetch categories and brands
        const categories = await Category.find();
        const brands = await Brand.find();

        // Check if product is found
        if (!product) {
            return res.status(404).render('admin/editProduct', {
                product: null, 
                categories,
                brands,  // Ensure brands are passed if you're using them
                error: 'Product not found',
                activePage: 'products' 
            });
        }

        // Render the edit page with fetched product, categories, and brands
        res.render('admin/editProduct', {
            product,
            categories,
            brands,  // Pass brands to the template
            error: null,
            activePage: 'products' 
        });
    } catch (error) {
        console.error('Error fetching product or related data:', error);
        
        // Fetch categories and brands even if there's an error with the product
        const categories = await Category.find();
        const brands = await Brand.find();

        // Render the edit page with error message
        res.render('admin/editProduct', {
            product: null,  // No product since fetch failed
            categories,
            brands,  // Pass brands in case of error
            error: 'Error fetching product or related data',
            activePage: 'products' 
        });
    }
};
// Update product route
exports.postEditProduct = [
    upload.array('images', 10), 
    async (req, res) => {
        try {
            const productId = req.params.id;

            // Get the updated data
            const updatedProductData = {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                stock: req.body.stock,
                category: req.body.category,
                brand: req.body.brand // Include the brand in the update
            };

            // If images are uploaded, process and store them
            if (req.files && req.files.length >= 3) {
                updatedProductData.images = req.files.map(file => file.filename);
            } else if (req.files && req.files.length > 0 && req.files.length < 3) {
                return res.status(400).send('Please upload at least 3 images.');
            }

            // Find the product by ID and update it
            const updatedProduct = await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

            if (!updatedProduct) {
                return res.status(404).send('Product not found');
            }

            res.redirect('/admin/products');
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).send('Server Error');
        }
    }
];
