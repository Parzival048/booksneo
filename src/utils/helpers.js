/**
 * AI Tally Sync - Helper Utilities
 * Common utility functions for the application
 */

/**
 * Format currency in Indian Rupee format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '₹0.00';
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

/**
 * Format date to Indian format (DD/MM/YYYY)
 * @param {Date|string} date - Date to format
 * @param {string} fallback - Fallback string if date is invalid
 * @returns {string} Formatted date string
 */
export const formatDate = (date, fallback = '') => {
    if (!date) return fallback || '-';

    const d = new Date(date);

    // If date is invalid, try to return the original string
    if (isNaN(d.getTime())) {
        return String(date) || fallback || '-';
    }

    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Format date to ISO format for API
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
export const formatDateISO = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

/**
 * Parse date from various formats
 * @param {string} dateStr - Date string to parse
 * @param {string} format - Expected format hint
 * @returns {Date|null} Parsed date object
 */
export const parseDate = (dateStr, format = 'DD/MM/YYYY') => {
    if (!dateStr) return null;

    // Clean the date string
    const cleaned = String(dateStr).trim();
    if (!cleaned) return null;

    let day, month, year;

    // Try different formats
    // Format: DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(cleaned)) {
        const parts = cleaned.split(/[\/\-]/);
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
    }
    // Format: YYYY-MM-DD (ISO)
    else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(cleaned)) {
        const parts = cleaned.split(/[\/\-]/);
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
    }
    // Format: DD MMM YYYY (e.g., 15 Jan 2024)
    else if (/^\d{1,2}\s+\w{3}\s+\d{4}$/.test(cleaned)) {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d;
    }
    // Format: MMM DD, YYYY (e.g., Jan 15, 2024)
    else if (/^\w{3}\s+\d{1,2},?\s+\d{4}$/.test(cleaned)) {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d;
    }
    // Try native Date parsing as fallback
    else {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d;
        return null;
    }

    // Validate parsed values
    if (!day || !month || !year) return null;

    // Handle 2-digit year
    if (year < 100) {
        year = year > 50 ? 1900 + year : 2000 + year;
    }

    // Create date (month is 0-indexed)
    const result = new Date(year, month - 1, day);

    // Validate the date is real
    if (isNaN(result.getTime())) return null;

    return result;
};

/**
 * Parse currency string to number
 * @param {string} value - Currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remove currency symbols and commas
    const cleaned = String(value)
        .replace(/[₹$,\s]/g, '')
        .replace(/[()]/g, '-')
        .trim();

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
export const truncate = (text, length = 50) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
export const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100 * 10) / 10;
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
};

/**
 * Sort array by date
 * @param {Array} array - Array to sort
 * @param {string} dateKey - Key containing date
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortByDate = (array, dateKey = 'date', order = 'desc') => {
    return [...array].sort((a, b) => {
        const dateA = new Date(a[dateKey]);
        const dateB = new Date(b[dateKey]);
        return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
};

/**
 * Filter transactions by date range
 * @param {Array} transactions - Transactions to filter
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered transactions
 */
export const filterByDateRange = (transactions, startDate, endDate) => {
    if (!startDate && !endDate) return transactions;

    return transactions.filter(t => {
        const date = new Date(t.date);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
    });
};

/**
 * Calculate transaction totals
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Totals object with credit, debit, balance
 */
export const calculateTotals = (transactions) => {
    return transactions.reduce((acc, t) => {
        acc.credit += parseCurrency(t.credit) || 0;
        acc.debit += parseCurrency(t.debit) || 0;
        acc.count++;
        return acc;
    }, { credit: 0, debit: 0, count: 0 });
};

/**
 * Download data as file
 * @param {Object|Array} data - Data to download
 * @param {string} filename - File name
 * @param {string} type - File type (json, csv)
 */
export const downloadFile = (data, filename, type = 'json') => {
    let content, mimeType;

    if (type === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
    } else if (type === 'csv') {
        content = convertToCSV(data);
        mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Convert array to CSV string
 * @param {Array} array - Array of objects
 * @returns {string} CSV string
 */
export const convertToCSV = (array) => {
    if (!array || array.length === 0) return '';

    const headers = Object.keys(array[0]);
    const rows = array.map(obj =>
        headers.map(header => {
            const value = obj[header];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
};

/**
 * Get file extension
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Allowed extensions
 * @returns {boolean} Is valid
 */
export const validateFileType = (file, allowedTypes = ['.csv', '.xlsx', '.xls']) => {
    const ext = '.' + getFileExtension(file.name);
    return allowedTypes.includes(ext);
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Sleep/delay utility
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result of function
 */
export const retryWithBackoff = async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await sleep(delay * attempt);
            }
        }
    }

    throw lastError;
};
