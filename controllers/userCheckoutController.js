// In controllers/checkoutController.js
const User = require('../models/userModel'); // Assuming User model holds address info
const Order = require('../models/Order'); // Assuming an Order model
const Cart = require('../models/Cart');
const Category=require('../models/Category')
// Updated getCheckout function
// Updated getCheckout function
exports.getCheckout = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from session or authentication

        // Fetch the user and populate addresses
        const user = await User.findById(userId).populate('addresses');
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Retrieve the user's cart and populate product details
        const cart = await Cart.findOne({ user: userId }).populate('products.productId');

        // If cart is not found, pass an empty array for cart items
        const cartItems = cart ? cart.products.map(item => ({
            productId: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
            totalPrice: item.productId.price * item.quantity,
        })) : [];

        // Calculate total amount only if there are cart items
        const totalAmount = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

        // Initialize discount and discount message
        let discount = 0;
        let discountMessage = null;

        // If a coupon is applied, validate the coupon and apply the discount
        const couponCode = req.query.couponCode;  // Assuming couponCode is passed in the query
        if (couponCode) {
            // Simulating coupon validation logic
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon) {
                discount = coupon.discount;
                discountMessage = `Coupon applied: ${couponCode} - ${discount}% off!`;
            } else {
                discountMessage = 'Invalid coupon code';
            }
        }

        // Calculate the discount amount
        const discountAmount = (totalAmount * discount) / 100;

        // Calculate final amount after discount
        const finalAmount = totalAmount - discountAmount;

        // Check if totalAmount or discountedAmount were passed as query parameters (e.g., after adding an address)
        const queryTotalAmount = req.query.totalAmount ? parseFloat(req.query.totalAmount) : totalAmount;
        const queryDiscountedAmount = req.query.discountedAmount ? parseFloat(req.query.discountedAmount) : finalAmount;

        // Fetch categories
        const categories = await Category.find();

        // Render checkout page with addresses, cart items, total amount, discount, and categories
        res.render('user/checkout', {
            addresses: user.addresses,
            cartItems,
            totalAmount: queryTotalAmount,  // Use totalAmount from query if present
            finalAmount: queryDiscountedAmount,  // Use finalAmount from query if present
            discountAmount,  // Send the discount applied
            discountMessage, // Send the discount message
            categories,
            discount, // Pass discount variable to template
            discountedAmount: queryDiscountedAmount, // Add this to pass discountedAmount
        });

    } catch (error) {
        console.error("Error loading checkout page:", error);
        res.status(500).send("Error loading checkout page");
    }
};
const WalletTransaction = require('../models/wallet');
exports.postPlaceOrder = async (req, res) => {
    let { addressId, paymentMethod, totalAmount, discountedAmount } = req.body;

    console.log('Request Body:', req.body);

    try {
        const userId = req.user._id;

        // Convert totalAmount and discountedAmount to numbers
        totalAmount = parseFloat(totalAmount);
        discountedAmount = discountedAmount ? parseFloat(discountedAmount) : 0;

        // Find user and check addresses
        const user = await User.findById(userId).select('addresses walletBalance');
        if (!user || !user.addresses || user.addresses.length === 0) {
            req.flash('error', 'No addresses found. Please add an address to your account.');
            return res.redirect('/checkout');
        }

        const selectedAddress = user.addresses.id(addressId);
        if (!selectedAddress) {
            req.flash('error', 'Address not found. Please select a valid address.');
            return res.redirect('/checkout');
        }

        // Retrieve the cart for the user
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart || cart.products.length === 0) {
            req.flash('error', 'Your cart is empty. Please add products to your cart.');
            return res.redirect('/checkout');
        }

        // Calculate total amount and prepare order items, including product name
        const orderItems = cart.products.map(item => ({
            product: item.productId._id,
            name: item.productId.name,  // Add the product name here
            quantity: item.quantity,
            price: item.productId.price
        }));

      // Discount logic
      let discountAmount = 0; // Default discount amount is 0
      let discountPercentage = 0;

      const couponCode = req.query.couponCode;
      if (couponCode) {
          const coupon = await Coupon.findOne({ code: couponCode });
          if (coupon) {
              discountPercentage = coupon.discount;  // Percentage discount
              discountAmount = (totalAmount * discountPercentage) / 100;
              console.log('Coupon Applied:', coupon);
          } else {
              console.log('Invalid Coupon Code');
          }
      }

      // Calculate final amount considering discount
      const finalAmount = discountedAmount > 0 ? discountedAmount : totalAmount - discountAmount;

      // Add delivery charge to the final amount
      let deliveryCharge = 0;
      if (totalAmount < 50) {
          deliveryCharge = 10; // Fixed charge for orders under $50
      } else if (totalAmount >= 50 && totalAmount < 100) {
          deliveryCharge = 5; // Reduced delivery charge for orders between $50-$100
      }

      // Add delivery charge to the total amount and final amount
      const totalAmountWithDelivery = totalAmount ;
      const finalAmountWithDelivery = finalAmount 

           // Wallet Payment Logic
           if (paymentMethod === "Wallet") {
            const finalAmount = discountedAmount > 0 ? parseFloat(discountedAmount) : parseFloat(totalAmount);
            
            // Check if the wallet balance is sufficient
            if (user.walletBalance < finalAmount) {
                req.flash('error', 'Insufficient wallet balance. Please choose another payment method.');
                return res.redirect('/checkout');
            }
                   // Wallet Payment Logic
     

                   const formattedAmount = finalAmountWithDelivery.toFixed(2);

                   const walletTransaction = new WalletTransaction({
                       userId: user._id,
                       amount: finalAmountWithDelivery,
                       transactionType: 'debit',
                       description: `Paid ${formattedAmount} INR for order ${userId}`,
                   });
                   
            await walletTransaction.save();
        
            // Deduct the final amount from the wallet balance
            user.walletBalance -= finalAmount;
            await user.save();
        }
      // Create and save the order
      const order = new Order({
          user: userId,
          items: orderItems,
          totalAmount: totalAmountWithDelivery.toFixed(2), // Total amount includes delivery charge
          finalAmount: finalAmountWithDelivery.toFixed(2), // Final amount includes delivery charge
          paymentMethod,
          address: {
              name: selectedAddress.name,
              street: selectedAddress.street,
              city: selectedAddress.city,
              postalCode: selectedAddress.pincode,
              country: selectedAddress.country
          },
          couponCode,  // Save the coupon code used for the order
          discount: discountAmount.toFixed(2),  // Discount amount in the order
          discountPercentage, // Discount percentage in the order
          deliveryCharge: deliveryCharge.toFixed(2), // Delivery charge in the order
      });

      // Save the order
      await order.save();

      // Optionally, clear the cart after placing the order
      await Cart.deleteOne({ userId });

      const categories = await Category.find({});  // Retrieve categories

      // Render the order confirmation page with all the required data
      res.render('user/order-confirmation', { 
          order, 
          totalAmount: totalAmountWithDelivery.toFixed(2),  // Pass the total amount with delivery charge
          discountedAmount: discountedAmount.toFixed(2),  // Pass the discounted amount
          discountAmount: discountAmount.toFixed(2), // Pass the discount amount
          finalAmount: finalAmountWithDelivery.toFixed(2),  // Pass the final amount
          deliveryCharge: deliveryCharge.toFixed(2), // Pass the delivery charge
          paymentMethod,  // Pass paymentMethod to EJS template
          categories 
      });
  } catch (error) {
      console.error('Error placing order:', error);
      return res.status(500).json({ error: 'Internal server error.' });
  }
};

//Route to add a new address
// Route to add a new address
exports.postAddaddress = async (req, res) => {
    const { name, street, city, state, pincode, country, totalAmount, discountedAmount } = req.body;

    try {
        const user = await User.findById(req.user._id);
        user.addresses.push({ name, street, city, state, pincode, country });
        await user.save();
    
        req.flash('success', 'Address added successfully!');
        // Redirect to checkout with totalAmount and discountedAmount as query parameters
        return res.redirect(`/checkout?totalAmount=${totalAmount}&discountedAmount=${discountedAmount}`);
    } catch (error) {
        console.error('Error adding address:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Checkout page route
exports.getpostCheckout= async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('addresses');
        const cart = await Cart.findOne({ userId: req.user._id }).populate('products.productId');
        
        res.render('checkout', { addresses: user.addresses, cart: cart.products });
    } catch (error) {
        console.error('Error loading checkout page:', error);
        res.status(500).json({ error: 'Failed to load checkout page' });
    }
};
