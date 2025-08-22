/**
 * Theme Management Module
 * =======================
 * 
 * Handles theme switching and initialization
 */

import { saveTheme, loadTheme } from './storage.js';

/**
 * Applies theme to the application
 * @param {'light'|'dark'} theme - Theme to apply
 */
export function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    saveTheme(theme);
}

/**
 * Initializes theme from localStorage and system preferences
 */
export function initializeTheme() {
    const savedTheme = loadTheme();
    const userPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (userPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

/**
 * Sets up system theme change listener
 * @param {Function} callback - Callback when system theme changes
 */
export function setupSystemThemeListener(callback) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', callback);
    } else {
        // Fallback for older browsers
        mediaQuery.addListener(callback);
    }
}