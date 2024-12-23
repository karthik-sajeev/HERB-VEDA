// middleware/authMiddleware.js
// authMiddleware.js
const isAuthenticated = (req, res, next) => {
    if (req.session.adminUser) {
        return next(); // User is authenticated, proceed to the next middleware/route handler
    }
    req.session.errorMessage = 'Please log in to access this page.';
    res.redirect('/admin/login'); // Redirect to login if not authenticated
};
module.exports = isAuthenticated;