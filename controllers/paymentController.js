const Razorpay = require("razorpay");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Load from .env
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Load from .env
});

// Create order
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const options = {
      amount, // Amount in paise
      currency,
      receipt: "order_rcptid_11",
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create Razorpay order");
  }
};

// Verify payment
exports.verifyPayment = (req, res) => {
  const crypto = require("crypto");

  const { order_id, payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(order_id + "|" + payment_id);

  const generated_signature = hmac.digest("hex");

  if (generated_signature === razorpay_signature) {
    res.status(200).json({ success: true, message: "Payment verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid payment signature" });
  }
};
