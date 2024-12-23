const express = require('express');
const router = express.Router();
const Brand = require('../models/brand'); // Assuming your schema is in `models/brand`

// Fetch and display all brands
router.get('/brands', async (req, res) => {
  try {
    const brands = await Brand.find();
    res.render('admin/brands', { brands ,activePage:'brands'}); // Render "views/admin/brands.ejs"
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Render Add Brand Page
router.get('/brands/add', (req, res) => {
  res.render('admin/add-brand',{activePage:'brands'}); // Render "views/admin/add-brand.ejs"
});

// Add a new brand
router.post('/brands', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || !description) {
      return res.status(400).render('admin/add-brand', {
        error: 'Name and description are required',
      });
    }

    // Create and save the new brand
    const newBrand = new Brand({ name, description });
    await newBrand.save();

    res.redirect('/admin/brands'); // Redirect to brand list after adding
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Render Edit Brand Page
router.get('/brands/edit/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).send('Brand not found');
    }

    res.render('admin/edit-brand', { brand ,activePage:'brands'}); // Render "views/admin/edit-brand.ejs"
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Edit a brand
router.post('/brands/edit/:id', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || !description) {
      const brand = await Brand.findById(req.params.id); // Fetch brand for repopulation
      return res.status(400).render('admin/edit-brand', {
        brand,
        error: 'Name and description are required',
      });
    }

    // Update the brand
    await Brand.findByIdAndUpdate(req.params.id, { name, description });

    res.redirect('/admin/brands'); // Redirect to brand list after editing
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete a brand
router.post('/brands/delete/:id', async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.redirect('/admin/brands'); // Redirect to brand list after deletion
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
