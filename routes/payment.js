const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/create-order", paymentController.createOrder);
router.post("/verify-payment", paymentController.verifyPayment);
router.get("/checkout", (req, res) => {
    res.render("user/payment", { razorpayKeyId: process.env.RAZORPAY_KEY_ID });
  });
  
module.exports = router;
