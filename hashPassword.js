const bcrypt = require('bcryptjs');

const password = 'your_password'; // The password you want to hash
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) throw err;
    console.log(hash); // Copy this hash and use it in your database
});
