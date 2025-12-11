// Excel generation functions

export function generateExcel(data) {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const colWidths = [
        { wch: 10 }, // Symbol
        { wch: 30 }, // Company Name
        { wch: 40 }, // Instrument ID
        { wch: 12 }, // Buy Ratings
        { wch: 12 }, // Hold Ratings
        { wch: 12 }, // Sell Ratings
        { wch: 12 }, // Total Ratings
        { wch: 15 }, // Buy Ratings %
        { wch: 15 }, // Fair Value
        { wch: 10 }, // Currency
        { wch: 12 }, // Star Rating
        { wch: 15 }, // Economic Moat
        { wch: 15 }, // Uncertainty
        { wch: 15 }, // Stewardship
        { wch: 50 }, // Report Title
        { wch: 20 }, // Report Published
        { wch: 20 }, // Report Updated
        { wch: 80 }, // Buy Rating Reasons
        { wch: 80 }, // Sell Rating Reasons
        { wch: 15 }, // Quote Ask Price
        { wch: 12 }, // Quote Ask Size
        { wch: 24 }, // Quote Ask Time
        { wch: 15 }, // Quote Bid Price
        { wch: 12 }, // Quote Bid Size
        { wch: 24 }, // Quote Bid Time
        { wch: 15 }, // Quote Last Trade Price
        { wch: 20 }, // Potential Profit/Loss %
        { wch: 24 }, // Quote Last Trade Time
        { wch: 15 }, // Quote Extended Hours Price
        { wch: 15 }, // Quote Non Regular Price
        { wch: 24 }, // Quote Non Regular Time
        { wch: 15 }, // Quote Previous Close
        { wch: 20 }, // Quote Adjusted Previous Close
        { wch: 15 }, // Quote Previous Close Date
        { wch: 15 }, // Quote Trading Halted
        { wch: 15 }, // Quote Has Traded
        { wch: 24 }, // Quote Last Trade Price Source
        { wch: 30 }, // Quote Non Regular Price Source
        { wch: 24 }, // Quote Updated At
        { wch: 40 }, // Quote Instrument URL
        { wch: 12 }, // Quote State
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Ratings');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Create blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `robinhood_stock_ratings_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

