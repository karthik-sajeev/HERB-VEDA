const salesService = require('../services/salesService'); // Import the service

async function getTopSellingData(req, res) {
    try {
        const topSellingProducts = await salesService.getTopSellingProducts();
        const topSellingCategories = await salesService.getTopSellingCategories();
        const topSellingBrands = await salesService.getTopSellingBrands();

        // Render the page and pass the data to the EJS template
        res.render('admin/topSelling', {
            topSellingProducts,
            topSellingCategories,
            topSellingBrands
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Server error' });
    }
}

module.exports = { getTopSellingData };

