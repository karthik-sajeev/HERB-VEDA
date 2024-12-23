const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel'); // Adjust the path to your User model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

passport.serializeUser((user, done) => {
    done(null, user.id); // Save the user ID in the session
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            done(null, user); // Retrieve user from the database
        })
        .catch(err => done(err, null));
});

// Google strategy for authentication
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists in our db
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // User already exists
            done(null, user);
        } else {
            // If not, create a new user
            console.log("Creating user with data:", {
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            });

            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                mobile: "Not Provided", // Placeholder or leave it undefined
                password: "DEFAULT_PASSWORD", // Keep this if necessary
                isBlocked: false,
                googleId: profile.id,
                joinedOn: new Date(),
            });

            await user.save(); // Save the new user to the database
            done(null, user); // Pass the user to the next middleware
        }
    } catch (err) {
        console.error(err);
        done(err, null);
    }
}));


module.exports = passport;  