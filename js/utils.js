/**
 * Utility Functions Module
 * ========================
 * 
 * Common utility functions used throughout the application
 */

/**
 * Formats time in minutes to human-readable format
 * @param {number} totalMinutes - Total minutes to format
 * @returns {string} Formatted time string (e.g., "2h 30m" or "45m")
 */
export function formatTime(totalMinutes) {
    if (totalMinutes < 0) return "0m";
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let timeString = "";
    
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours === 0) timeString += `${minutes}m`;
    
    return timeString.trim();
}

/**
 * Formats currency amount using locale-specific formatting
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Parses currency string to numeric value
 * @param {string} moneyString - Currency string to parse (e.g., "$123.45")
 * @returns {number} Numeric value
 */
export function parseCurrency(moneyString) {
    if (!moneyString) return 0;
    return parseFloat(moneyString.replace(/[$,]/g, '')) || 0;
}

/**
 * Validates data structure to ensure it meets expected format
 * @param {any} data - Data to validate
 * @returns {boolean} True if data is valid
 */
export function validateDataStructure(data) {
    if (!Array.isArray(data)) return false;
    
    return data.every(group => 
        group &&
        typeof group.group_title === 'string' &&
        Array.isArray(group.steps) &&
        group.steps.every(step => 
            step &&
            typeof step.step_number !== 'undefined' &&
            typeof step.step_title === 'string' &&
            typeof step.step_instruction === 'string' &&
            Array.isArray(step.items)
        )
    );
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}