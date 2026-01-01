/**
 * AI Tally Sync - Logger Utility
 * Centralized logging with timestamps
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Set minimum log level (can be configured via env)
const MIN_LOG_LEVEL = LOG_LEVELS.DEBUG;

/**
 * Get current timestamp
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
    return new Date().toISOString();
};

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {Object} Formatted log object
 */
const formatLog = (level, message, data = null) => {
    return {
        timestamp: getTimestamp(),
        level,
        message,
        ...(data && { data })
    };
};

/**
 * Logger object with different log levels
 */
const logger = {
    /**
     * Debug level log
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    debug: (message, data = null) => {
        if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
            const log = formatLog('DEBUG', message, data);
            console.log('%c[DEBUG]', 'color: #6366f1', log.timestamp, message, data || '');
        }
    },

    /**
     * Info level log
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    info: (message, data = null) => {
        if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
            const log = formatLog('INFO', message, data);
            console.info('%c[INFO]', 'color: #10b981', log.timestamp, message, data || '');
        }
    },

    /**
     * Warning level log
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    warn: (message, data = null) => {
        if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
            const log = formatLog('WARN', message, data);
            console.warn('%c[WARN]', 'color: #f59e0b', log.timestamp, message, data || '');
        }
    },

    /**
     * Error level log
     * @param {string} message - Log message
     * @param {Object|Error} error - Error object or additional data
     */
    error: (message, error = null) => {
        if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
            const errorData = error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : error;
            const log = formatLog('ERROR', message, errorData);
            console.error('%c[ERROR]', 'color: #ef4444', log.timestamp, message, errorData || '');
        }
    },

    /**
     * Log API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} requestData - Request body (sanitized)
     */
    apiRequest: (endpoint, method, requestData = null) => {
        logger.debug(`API Request: ${method} ${endpoint}`, {
            method,
            endpoint,
            // Don't log sensitive data
            body: requestData ? '[BODY_HIDDEN]' : null
        });
    },

    /**
     * Log API response
     * @param {string} endpoint - API endpoint
     * @param {number} status - HTTP status code
     * @param {number} duration - Request duration in ms
     */
    apiResponse: (endpoint, status, duration) => {
        const level = status >= 400 ? 'error' : 'info';
        logger[level](`API Response: ${endpoint}`, {
            status,
            duration: `${duration}ms`
        });
    },

    /**
     * Log user action
     * @param {string} action - Action name
     * @param {Object} details - Action details
     */
    userAction: (action, details = null) => {
        logger.info(`User Action: ${action}`, details);
    },

    /**
     * Log file operation
     * @param {string} operation - Operation type (upload, parse, export)
     * @param {string} filename - File name
     * @param {Object} details - Additional details
     */
    fileOperation: (operation, filename, details = null) => {
        logger.info(`File ${operation}: ${filename}`, details);
    },

    /**
     * Log Tally operation
     * @param {string} operation - Operation type
     * @param {Object} details - Operation details
     */
    tallyOperation: (operation, details = null) => {
        logger.info(`Tally ${operation}`, details);
    }
};

export default logger;
