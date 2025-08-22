/**
 * Storage Management Module
 * =========================
 * 
 * Handles all localStorage operations and data persistence
 */

import { validateDataStructure } from './utils.js';

/**
 * Saves progress data to localStorage with error handling
 * @param {Array<Object>} dataToSave - Checklist data to save
 */
export function saveProgress(dataToSave) {
    try {
        // Validate data before saving
        if (!validateDataStructure(dataToSave)) {
            console.error('Invalid data structure, skipping save');
            return;
        }
        
        const serializedData = JSON.stringify(dataToSave);
        localStorage.setItem('checklistProgress', serializedData);
    } catch (error) {
        console.error('Failed to save progress to localStorage:', error);
        // Could implement fallback storage or user notification here
    }
}

/**
 * Loads saved progress from localStorage
 * @returns {Array<Object>|null} Saved progress data or null if not found
 */
export function loadProgress() {
    try {
        const savedData = localStorage.getItem('checklistProgress');
        if (!savedData) return null;
        
        const parsedData = JSON.parse(savedData);
        return validateDataStructure(parsedData) ? parsedData : null;
    } catch (error) {
        console.error('Failed to load progress from localStorage:', error);
        localStorage.removeItem('checklistProgress');
        return null;
    }
}

/**
 * Saves individual note to localStorage immediately
 * @param {string|number} stepNumber - Step identifier
 * @param {string} noteValue - Note content to save
 * @param {Array<Object>} dataWithComputedValues - Current data state
 */
export function saveNoteToStorage(stepNumber, noteValue, dataWithComputedValues) {
    // Find and update the step in memory
    dataWithComputedValues.forEach(group => {
        const step = group.steps.find(s => s.step_number === stepNumber);
        if (step) {
            step.notes = noteValue;
        }
    });
    
    // Save to localStorage
    saveProgress(dataWithComputedValues);
}

/**
 * Saves theme preference to localStorage
 * @param {'light'|'dark'} theme - Theme to save
 */
export function saveTheme(theme) {
    try {
        localStorage.setItem('checklistTheme', theme);
    } catch (error) {
        console.error('Failed to save theme preference:', error);
    }
}

/**
 * Loads theme preference from localStorage
 * @returns {'light'|'dark'|null} Saved theme or null if not found
 */
export function loadTheme() {
    try {
        return localStorage.getItem('checklistTheme');
    } catch (error) {
        console.error('Failed to load theme preference:', error);
        return null;
    }
}

/**
 * Saves filter state to localStorage
 * @param {'all'|'incomplete'|'completed'} filter - Filter to save
 */
export function saveFilter(filter) {
    try {
        localStorage.setItem('checklistFilter', filter);
    } catch (error) {
        console.error('Failed to save filter state:', error);
    }
}

/**
 * Loads filter state from localStorage
 * @returns {'all'|'incomplete'|'completed'|null} Saved filter or null if not found
 */
export function loadFilter() {
    try {
        return localStorage.getItem('checklistFilter');
    } catch (error) {
        console.error('Failed to load filter state:', error);
        return null;
    }
}

/**
 * Saves group collapse state to localStorage
 * @param {Object<string, boolean>} groupCollapseState - Collapse state object
 */
export function saveGroupState(groupCollapseState) {
    try {
        localStorage.setItem('checklistGroupState', JSON.stringify(groupCollapseState));
    } catch (error) {
        console.error('Failed to save group state:', error);
    }
}

/**
 * Loads group collapse state from localStorage
 * @returns {Object<string, boolean>} Saved group state or empty object
 */
export function loadGroupState() {
    try {
        const savedState = localStorage.getItem('checklistGroupState');
        return savedState ? JSON.parse(savedState) : {};
    } catch (error) {
        console.error('Failed to load group state:', error);
        localStorage.removeItem('checklistGroupState');
        return {};
    }
}

/**
 * Clears all application data from localStorage
 */
export function clearAllData() {
    try {
        localStorage.removeItem('checklistProgress');
        localStorage.removeItem('checklistGroupState');
        localStorage.removeItem('checklistFilter');
        // Note: We don't clear theme as user might want to keep that preference
    } catch (error) {
        console.error('Failed to clear localStorage data:', error);
    }
}