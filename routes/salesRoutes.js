const express = require('express');
const router = express.Router();
const salesReportController = require('../controllers/salesReportController');

// Route to generate sales report
router.get('/report', salesReportController.getSalesReport);

// Route to download the sales report as CSV
router.get('/report', salesReportController.getSalesReport);

module.exports = router;
