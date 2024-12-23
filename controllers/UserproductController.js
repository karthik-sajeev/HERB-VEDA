const Product=require('../models/Product');
const Category = require('../models/Category'); 
const User = require('../models/userModel');
const Offer = require('../models/Offer')

exports.getProducts = async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch categories
    const selectedCategory = req.query.category || '';
    const searchQuery = req.query.search || '';
    const sortBy = req.query.sortBy || '';
    const currentPage = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const itemsPerPage = 6; // Define how many items per page
    let products;

    let query = {};

    if (selectedCategory) {
      query.category = selectedCategory; // Filter by category
    }

    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' }; // Filter by search query
    }

    // Fetch products based on query and apply sorting
    products = await Product.find(query)
      .skip((currentPage - 1) * itemsPerPage) // Skip products based on current page
      .limit(itemsPerPage) // Limit the number of products per page
      .exec();

    // Apply sorting based on the sortBy parameter
    if (sortBy === 'priceLow') {
      products = products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceHigh') {
      products = products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'ratings') {
      products = products.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    } else if (sortBy === 'newArrivals') {
      products = products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'alphabeticalAZ') {
      products = products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'alphabeticalZA') {
      products = products.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Fetch active offers within the valid date range
    const currentDate = new Date();
    const activeOffers = await Offer.find({
      status: 'active',
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    }).exec();

    // Apply relevant offers to products
    products = products.map(product => {
      let productOffer = null;

      // Find applicable offer for the product
      activeOffers.forEach(offer => {
        if (offer.type === 'product' && offer.product.toString() === product._id.toString()) {
          productOffer = offer;
        } else if (offer.type === 'category' && offer.category.toString() === product.category.toString()) {
          productOffer = offer;
        }
      });

      // Apply the offer to the product if any
      if (productOffer) {
        const discountAmount = (product.price * productOffer.discount) / 100;
        product.discountedPrice = product.price - discountAmount;
        product.discount = productOffer.discount;
      }

      return product;
    });

    // Count total products for pagination
    const totalProducts = await Product.countDocuments(query).exec();
    const totalPages = Math.ceil(totalProducts / itemsPerPage); // Calculate total pages

    // Render the products page with applied offers and pagination data
    res.render('user/product-list', {
      categories: categories,
      products: products,
      sortBy: sortBy,
      selectedCategory: selectedCategory,
      searchQuery: searchQuery,
      currentPage: currentPage,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};

  exports.getProductdetail = async (req, res) => {
    try {
        const categories = await Category.find(); // Fetch categories
        const product = await Product.findById(req.params.id).populate('reviews.user', 'name'); 

        if (!product) {
            return res.status(404).send("Product not found");
        }

        // Fetch active offers for the product
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: 'active',
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
        }).exec();

        let productOffer = null;

        // Check if the product has any applicable offers
        activeOffers.forEach(offer => {
            if (offer.type === 'product' && offer.product.toString() === product._id.toString()) {
                productOffer = offer;
            } else if (offer.type === 'category' && offer.category.toString() === product.category.toString()) {
                productOffer = offer;
            }
        });

        // Calculate the offer price if applicable
        let discountedPrice = null;
        if (productOffer) {
            const discountAmount = (product.price * productOffer.discount) / 100;
            discountedPrice = product.price - discountAmount;
        }

        // Fetch related products from the same category
        const relatedProducts = await Product.find({ category: product.category }).limit(3);

        // Render the product detail page with offer price
        res.render('user/product-detail', {
            categories: categories,          
            product: product,                
            relatedProducts: relatedProducts,
            discountedPrice: discountedPrice, // Pass the discounted price
            productOffer: productOffer, // Pass the offer details
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Server Error");
    }
};


// Review submission route
exports.postReviewProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { comment, rating } = req.body;

    
        const parsedRating = Number(rating);
        console.log('Raw rating received:', rating);
        console.log('Parsed rating:', parsedRating);

        // Validate the parsed rating and comment
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: "Invalid rating value. Must be a number between 1 and 5." });
        }
        if (typeof comment !== 'string' || comment.trim() === '') {
            return res.status(400).json({ message: "Comment must be a valid non-empty string." });
        }

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

       
        const newReview = {
            user: req.user._id, 
            rating: parsedRating,
            comment: comment
        };

        
        if (!Array.isArray(product.reviews)) {
            product.reviews = [];
        }
        product.reviews.push(newReview);

        // Calculate the new average rating
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.ratings = totalRating / product.reviews.length;

     
        if (isNaN(product.ratings)) {
            product.ratings = 0; 
        }

       
        await product.save();

        res.json({
            message: "Review submitted successfully",
            product
        });
    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({ message: "Error submitting review", error: error.message });
    }
};

