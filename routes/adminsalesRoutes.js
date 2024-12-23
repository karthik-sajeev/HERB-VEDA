const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController'); // Import the controller

const Order = require('../models/Order'); 


// Define a route to get the top-selling products, categories, and brands
router.get('/top-selling', salesController.getTopSellingData);
// Route to generate the ledger book in PDF format
const { jsPDF } = require("jspdf");
require("jspdf-autotable"); // Ensure the plugin is installed and required

// Route to generate the ledger book in PDF format
router.get('/admin/generate-ledger-pdf', async (req, res) => {
    try {
        // Fetch data (you can adjust the query as needed)
        const orders = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.name',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$productDetails.price'] } }
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        // Initialize jsPDF instance
        const doc = new jsPDF();

        // Add title and date
        doc.setFontSize(16);
        doc.text('Ledger Book - Sales Report', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

        // Prepare table data
        const tableHeaders = [['Product', 'Total Sold', 'Total Revenue (INR)']];
        const tableData = orders.map(order => [
            order._id, // Product name
            order.totalSold, // Total sold
            order.totalRevenue.toFixed(2), // Total revenue
        ]);

        // Use autoTable for creating a better-looking table
        doc.autoTable({
            head: tableHeaders,
            body: tableData,
            startY: 40, // Start position for the table
            theme: 'grid', // Table style
            headStyles: {
                fillColor: [22, 160, 133], // Header background color (RGB)
                textColor: [255, 255, 255], // Header text color
                fontStyle: 'bold',
            },
            bodyStyles: {
                fillColor: [245, 245, 245], // Row background color for zebra striping
            },
            alternateRowStyles: {
                fillColor: [255, 255, 255], // Alternate row background color
            },
            margin: { top: 40 },
        });

        // Send the PDF as a response with correct headers
        const pdfOutput = doc.output('arraybuffer'); // Use arraybuffer format to send the PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=ledger-book.pdf');
        res.send(Buffer.from(pdfOutput));
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

module.exports = router;
