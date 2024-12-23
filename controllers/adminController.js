const Admin = require('../models/adminModel'); 
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');


exports.getLoginPage = (req, res) => {

    const errorMessage = req.session.errorMessage || null; 
    req.session.errorMessage = null; 

    res.render('admin/login', { errorMessage }); 
};

// Post login
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ email });
        if (!adminUser) {
            req.session.errorMessage = 'Invalid email or password.';                                    
            return res.redirect('/admin/login'); 
        }

        // Check password
        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            req.session.errorMessage = 'Invalid email or password.'; 
            return res.redirect('/admin/login');
        }

        req.session.adminUser = adminUser;
        res.redirect('/admin/dashboard'); 
    } catch (error) {
        console.error('Error occurred during login:', error);
        req.session.errorMessage = 'Error occurred during login. Please try again.'; 
        res.redirect('/admin/login'); 
    }
};
const salesService = require('../services/salesService'); // Ensure this path is correct

exports.getdashboard = async (req, res) => {
    try {
        // Fetch the top selling products, categories, and brands
        const topSellingProducts = await salesService.getTopSellingProducts();
        const topSellingCategories = await salesService.getTopSellingCategories();
        const topSellingBrands = await salesService.getTopSellingBrands();

        // Render the dashboard with the fetched data
        res.render('admin/dashboard', {
            topSellingProducts,
            topSellingCategories,
            topSellingBrands
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getlogout= (req, res) => {
req.session.destroy(err => {
    if (err) {
        console.error(err);
        return res.status(500).send('Could not log out.');
    }
    res.redirect('/admin/login');
});
};






exports.listUsers = async (req, res) => {
  try {
   
    const searchQuery = req.query.search || '';
    const sortField = req.query.sort || 'name'; 
    const sortOrder = req.query.order === 'desc' ? -1 : 1; 

    // Get the current page (default to 1 if not provided)
    const page = parseInt(req.query.page) || 1;
    const pageSize = 5;  
    const skip = (page - 1) * pageSize; 

    // Build the filter for searching
    let filter = {};
    if (searchQuery) {
      filter = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } }
        ]
      };
    }

    
    const totalUsers = await User.countDocuments(filter); 
    const totalPages = Math.ceil(totalUsers / pageSize);  

    const users = await User.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)  
      .limit(pageSize)  
      .select('name mobile email joinedOn isBlocked');  

   
    res.render('admin/users', {
      users,
      searchQuery,
      sortField,
      sortOrder: req.query.order || 'asc',  
      page,  
      totalPages, 
      activePage: 'users'
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};


// Block a user
exports.blockUser = async (req, res) => {
  const userId = req.params.id;
  try {
    await User.findByIdAndUpdate(userId, { isBlocked: true });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/users');
  }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
  const userId = req.params.id;
  try {
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/users');
  }
}; 