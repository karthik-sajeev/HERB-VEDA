const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');

// Routes
const adminRoutes = require('./routes/adminRoutes');
const AdminpasswordRoutes = require('./routes/AdminpasswordRoutes');
const admincategoryRoutes = require('./routes/admincategoryRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const userRoutes = require('./routes/userRoutes');
const userProductRoutes=require('./routes/userProductRoutes')
const userOrderRoutes = require('./routes/userOrderRoutes');
const userCart = require('./routes/userCart')
const usercheckoutRoutes = require('./routes/usercheckoutRoutes');
const adminOrderRoutes=require('./routes/adminOrderRoutes')
const admincoupenRoutes=require('./routes/admincoupenRoutes')
const  adminOfferRoutes=require('./routes/adminOfferRoutes')
const salesRoutes = require('./routes/salesRoutes');
const wishlistRoutes = require('./routes/userwishlist');
// const usercouponRoutes=require('./routes/usercouponRoutes.js')
const usercouponRoutes=require('./routes/usercouponRoutes')
const walletRoutes=require('./routes/walletRoutes')
const brandRoute = require('./routes/adminBrandRoutes');
const paymentRoutes = require("./routes/payment");
const adminsalesRoutes = require('./routes/adminsalesRoutes');
const Cart = require('./models/Cart'); 

const User = require('./models/userModel');

// Models
const Category = require('./models/Category');
const Product = require('./models/Product');

// Configuration
dotenv.config();
require('./config/passport-setup');

const app = express();

// Middleware to serve static files and uploaded files
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
    }),
    cookie: {
        secure: false, 
        httpOnly: true, 
        sameSite: 'strict', 
        maxAge: 1000 * 60 * 60 * 24 // 1 day, adjust as needed
    }
}));

// Flash setup for flash messages
app.use(flash());

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Middleware for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.successMessage = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.errorMessages = req.flash('error');
    res.locals.error = req.flash('error');
    res.locals.user = req.user; // Store user info for rendering in views
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
   
 
    next();
});

//Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, proceed
    }
    req.flash('error', 'You need to log in first.');
    res.redirect('/user/login'); // Redirect to login page
}



//Google authentication routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    (req, res) => {
        console.log('User logged in:', req.user);
        res.redirect('/home'); // Redirect to home
    }
);

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/user/login');
    });
});

// Database connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.use('/admin', adminRoutes);
app.use('/admin', AdminpasswordRoutes);
app.use('/admin', admincategoryRoutes);
app.use('/admin', adminOrderRoutes);
app.use('/admin/products', adminProductRoutes);
app.use('/admin/coupons', admincoupenRoutes);
app.use('/admin',adminOfferRoutes)
app.use('/user', userRoutes);
app.use('/user',userProductRoutes)
app.use('/api', userOrderRoutes);
app.use('/cart', userCart);
app.use('/checkout',usercheckoutRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/admin/sales', salesRoutes);
app.use('/cart',usercouponRoutes)
app.use("/payment", paymentRoutes);
app.use('/api/wallet', walletRoutes);
// User routes for coupon management
// app.use('/api/coupons', usercouponRoutes);
app.use('/admin', brandRoute);
app.use('/api/sales', adminsalesRoutes);


//Apply isAuthenticated middleware to the home route

app.get('/home', isAuthenticated, async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find();
        res.render('user/home', { user: req.user, categories, products });
    } catch (error) {
        console.error('Error fetching data:', error);
        req.flash('error', 'Failed to load data. Please try again.');
        res.redirect('/user/login');
    }
});
// Route to handle retrying payment for failed orders
app.get('/order/:orderId/retry', async (req, res) => {
    const { orderId } = req.params;
  
    // Find the order in the database
    const order = await Order.findById(orderId);
  
    if (!order || order.paymentStatus === 'Completed') {
      return res.redirect(`/order/${orderId}`); // Redirect to order page if order is completed
    }
  
    // Create a new order for retry (reuse the same order or create a new one)
    const options = {
      amount: order.amount,
      currency: order.currency,
      receipt: `order_rcptid_${orderId}`,
    };
  
    try {
      const razorpayOrder = await razorpay.orders.create(options);
  
      // Update Razorpay order ID in the database for retry
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
  
      // Redirect user to the payment page with the new order ID
      res.redirect(`/payment/checkout/${razorpayOrder.id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to retry payment");
    }
  });
  
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
