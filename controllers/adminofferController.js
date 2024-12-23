const Offer = require('../models/Offer');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Get all offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().populate('product category'); // Populate product and category for detailed data
    res.render('admin/offers', { offers ,activePage:'offers'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Show form to create a new offer
exports.createOfferForm = async (req, res) => {
  try {
    const products = await Product.find(); // Get all products for type 'product' offers
    const categories = await Category.find(); // Get all categories for type 'category' offers
    res.render('admin/createEditOffer', { offer: null, products, categories,activePage:'offers' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Show form to edit an existing offer
exports.editOfferForm = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('product category');
    if (!offer) {
      return res.status(404).send('Offer not found');
    }

    const products = await Product.find(); // Get all products
    const categories = await Category.find(); // Get all categories
    res.render('admin/createEditOffer', { offer, products, categories,activePage:'offers' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Create a new offer
exports.createOffer = async (req, res) => {
  try {
    const { type, title, discount, startDate, endDate, product, category, referralCode } = req.body;

    // Validate required fields based on type
    if (type === 'product' && !product) {
      return res.status(400).send('Product is required for product type offer');
    }
    if (type === 'category' && !category) {
      return res.status(400).send('Category is required for category type offer');
    }
    if (type === 'referral' && !referralCode) {
      return res.status(400).send('Referral code is required for referral type offer');
    }

    const newOffer = new Offer({
      type,
      title,
      discount,
      startDate,
      endDate,
      product: type === 'product' ? product : undefined,
      category: type === 'category' ? category : undefined,
      referralCode: type === 'referral' ? referralCode : undefined,
    });

    await newOffer.save();
    res.redirect('/admin/offers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Update an existing offer
exports.updateOffer = async (req, res) => {
  try {
    const { id, type, title, discount, startDate, endDate, product, category, referralCode } = req.body;

    // Validate required fields based on type
    if (type === 'product' && !product) {
      return res.status(400).send('Product is required for product type offer');
    }
    if (type === 'category' && !category) {
      return res.status(400).send('Category is required for category type offer');
    }
    if (type === 'referral' && !referralCode) {
      return res.status(400).send('Referral code is required for referral type offer');
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        type,
        title,
        discount,
        startDate,
        endDate,
        product: type === 'product' ? product : undefined,
        category: type === 'category' ? category : undefined,
        referralCode: type === 'referral' ? referralCode : undefined,
      },
      { new: true }
    );

    res.redirect('/admin/offers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Delete an offer
exports.deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.redirect('/admin/offers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Function to toggle the status of an offer
exports.toggleStatus = async (req, res) => {
  try {
    const offerId = req.params.id;
    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).send('Offer not found');
    }

    // Toggle the status between 'active' and 'inactive'
    offer.status = offer.status === 'active' ? 'inactive' : 'active';
    await offer.save();

    // Redirect back to the offer list page
    res.redirect('/admin/offers');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};