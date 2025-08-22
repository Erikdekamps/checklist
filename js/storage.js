/**
 * Storage Management Module
 * =========================
 * 
 * Handles all localStorage operations and data persistence
 */

/**
 * Saves progress data to localStorage with error handling
 * @param {Array<Object>} dataToSave - Checklist data to save
 */
export function saveProgress(dataToSave) {
    try {
        const dataToStore = JSON.stringify(dataToSave);
        localStorage.setItem('checklistProgress', dataToStore);
    } catch (error) {
        console.error('Failed to save progress to localStorage:', error);
    }
}

/**
 * Loads saved progress from localStorage
 * @returns {Array<Object>|null} Saved progress data or null if not found
 */
export function loadProgress() {
    try {
        const saved = localStorage.getItem('checklistProgress');
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error('Failed to load progress from localStorage:', error);
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
    try {
        // Update the note in the data structure
        dataWithComputedValues.forEach(group => {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
            }
        });
        
        // Save the updated data
        saveProgress(dataWithComputedValues);
    } catch (error) {
        console.error('Failed to save note:', error);
    }
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
 * Clears all checklist data from localStorage
 */
export function clearAllData() {
    try {
        localStorage.removeItem('checklistProgress');
        localStorage.removeItem('checklistTheme');
        localStorage.removeItem('checklistFilter');
    } catch (error) {
        console.error('Failed to clear localStorage data:', error);
    }
}