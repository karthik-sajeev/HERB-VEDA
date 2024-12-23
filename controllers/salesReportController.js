
const ExcelJS = require('exceljs');
const Order = require('../models/Order'); // Ensure correct path to Order model
exports.getSalesReport = async (req, res) => {
    try {
        const { start, end, status = 'All', download, page = 1, limit = 10 } = req.query;

        if (!start || !end) {
            return renderError(res, 'Start date and end date are required.', start, end, status, page);
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        if (isNaN(startDate) || isNaN(endDate)) {
            return renderError(res, 'Invalid date format. Please provide valid dates.', start, end, status, page);
        }

        const validStatuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
        const statusFilter = status !== 'All' && validStatuses.includes(status) ? { status } : {};

        const totalRecords = await Order.countDocuments({
            orderDate: { $gte: startDate, $lte: endDate },
            ...statusFilter,
        });

        const orders = await Order.find({
            orderDate: { $gte: startDate, $lte: endDate },
            ...statusFilter,
        })
            .populate('items.product')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ orderDate: -1 });

        if (!orders.length) {
            return renderError(res, 'No sales data found for the selected filters.', start, end, status, page);
        }

        const report = prepareReportData(orders);
        const totalPages = Math.ceil(totalRecords / limit);

        // Pagination logic: Calculate the range of pages to display (5 pages at a time)
        const startPage = Math.floor((page - 1) / 5) * 5 + 1;
        const endPage = Math.min(startPage + 4, totalPages);

        if (download === 'pdf') {
            return generatePDF(res, report);
        } else if (download === 'excel') {
            return generateExcel(res, report);
        }

        res.render('admin/report', {
            report,
            start,
            end,
            status,
            page: parseInt(page),
            totalPages,
            startPage,
            endPage,
            activePage: 'salesReport',
        });
    } catch (error) {
        console.error('Error generating report:', error);
        renderError(res, 'An unexpected error occurred while generating the report.', start, end, status, page);
    }
};

function renderError(res, error, start, end, status, page) {
    res.render('admin/report', {
        error,
        report: null,
        start,
        end,
        status,
        page: parseInt(page),
        totalPages: 1,
        startPage: 1,
        endPage: 1,
        activePage: 'salesReport',
    });
}

function prepareReportData(orders) {
    const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalQuantity = orders.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
    );

    const items = orders.flatMap(order => {
        const orderDiscount = order.totalAmount - order.finalAmount; // Total discount for this order
        const totalItemsPrice = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0); // Total price of items in this order

        return order.items.map(item => {
            const itemTotalPrice = order.totalAmount; // Item's total price before discount
            const itemDiscount = orderDiscount// Proportional discount for this item
            const itemFinalAmount = order.finalAmount; // Final amount after discount

            return {
                orderId: order._id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.price,
                totalAmount: itemTotalPrice,
                discount: itemDiscount,
                finalAmount: itemFinalAmount, // Ensures the calculation happens
                status: order.status,
                date: order.orderDate
                    ? new Date(order.orderDate).toLocaleDateString('en-GB')
                    : 'N/A', // Format date as day/month/year
            };
        });
    });

    const overallDiscount = orders.reduce((sum, order) => sum + (order.totalAmount - order.finalAmount), 0);

    return { totalSales, totalQuantity, items, overallDiscount };
}

const { jsPDF } = require("jspdf");
require("jspdf-autotable"); // Ensure you have installed jspdf-autotable via npm

function generatePDF(res, report) {
    // Create a new jsPDF instance
    const doc = new jsPDF();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Sales Report", 105, 20, { align: "center" });

    // Summary Section
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Total Sales: INR ${report.totalSales.toFixed(2)}`, 14, 30);
    doc.text(`Total Quantity: ${report.totalQuantity}`, 14, 38);
    doc.text(`Overall Discount: INR ${report.overallDiscount.toFixed(2)}`, 14, 46);

    // Prepare table data
    const tableHeaders = [
        [
            "Order ID",
            "Product Name",
            "Qty",
            "Total Amt (INR)",
            "Discount (INR)",
            "Final Amt (INR)",
            "Status",
            "Order Date",
        ],
    ];
    const tableData = report.items.map((item) => [
        item.orderId,
        item.productName,
        item.quantity,
        item.totalAmount.toFixed(2),
        item.discount.toFixed(2),
        item.finalAmount.toFixed(2),
        item.status,
        item.date,
    ]);

    // AutoTable Configuration
    doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 60,
        theme: "grid", // You can use 'striped', 'grid', or 'plain' for different table styles
        headStyles: {
            fillColor: [22, 160, 133], // Header background color (RGB)
            textColor: [255, 255, 255], // Header text color
            fontStyle: "bold",
        },
        bodyStyles: {
            fillColor: [245, 245, 245], // Row background color for zebra striping
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255], // Alternate row background color
        },
        margin: { top: 60 },
    });

    // Set headers and send the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.pdf"');
    const pdfData = doc.output("arraybuffer"); // Convert to buffer
    res.send(Buffer.from(pdfData)); // Send the PDF as a response
}
async function generateExcel(res, report) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Define columns with headers and keys for all necessary fields
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Product Name', key: 'productName', width: 30 },
        { header: 'Quantity', key: 'quantity', width: 15 },
        
        { header: 'Total Amount (INR)', key: 'totalAmount', width: 20 },
        { header: 'Discount (INR)', key: 'discount', width: 15 },
        { header: 'Final Amount (INR)', key: 'finalAmount', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Order Date', key: 'date', width: 20 },
    ];

    // Add rows with all fields for each item in the report
    report.items.forEach(item => {
        worksheet.addRow({
            orderId: item.orderId,
            productName: item.productName,
            quantity: item.quantity,
         
            totalAmount: item.totalAmount.toFixed(2),
            discount: item.discount.toFixed(2),
            finalAmount: item.finalAmount.toFixed(2),
            status: item.status,
            date: item.date,
        });
    });

    // Add a blank row for spacing
    worksheet.addRow({});

    // Add summary rows for total sales, quantity, and overall discount
    worksheet.addRow({
        orderId: 'Summary',
        productName: '',
        quantity: `Total Quantity: ${report.totalQuantity}`,
        
        totalAmount: `Total Sales: INR ${report.totalSales.toFixed(2)}`,
        discount: `Overall Discount: INR ${report.overallDiscount.toFixed(2)}`,
        finalAmount: '',
        status: '',
        date: '',
    });

    // Format header row
    worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    // Set headers for response and write the workbook to response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
}
