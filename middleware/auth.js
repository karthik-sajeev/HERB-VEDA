//middleware/auth.js
const isAuthenticated = (req, res, next) => {
    console.log('Session info:', req.session); // Log session information
    if (req.session.passport && req.session.passport.user) { // Check if user ID exists in the session
        return next(); // User is authenticated
    } else {
        req.flash('error', 'You need to log in to view this page.');
        return res.redirect('/user/login'); // Redirect to login if not authenticated
    }
};

module.exports = { isAuthenticated };
