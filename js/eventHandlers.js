/**
 * Event Handlers Module - Simplified Version
 * ===========================================
 * 
 * Contains essential user interaction event handlers
 */

import { saveProgress } from './storage.js';

/**
 * Handles step completion toggle
 * @param {string|number} stepNumber - Identifier of the step to toggle
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 */
export function handleStepToggle(stepNumber, dataWithComputedValues, onUpdate) {
    dataWithComputedValues.forEach(group => {
        const step = group.steps.find(s => s.step_number === stepNumber);
        if (step) {
            step.completed = !step.completed;
        }
    });
    
    saveProgress(dataWithComputedValues);
    onUpdate();
}

/**
 * Handles group collapse/expand toggle
 * @param {string} groupTitle - Title of the group to toggle
 * @param {Object} groupCollapseState - State object tracking collapsed groups
 * @param {Function} onUpdate - Callback function after update
 */
export function handleGroupToggle(groupTitle, groupCollapseState, onUpdate) {
    groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
    
    // Save collapse state to localStorage
    try {
        localStorage.setItem('groupCollapseState', JSON.stringify(groupCollapseState));
    } catch (error) {
        console.warn('Failed to save group collapse state:', error);
    }
    
    onUpdate();
}

/**
 * Handles theme toggle
 * @param {Function} applyTheme - Theme application function
 */
export function handleThemeToggle(applyTheme) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * Loads group collapse state from localStorage
 * @returns {Object} Object with group titles as keys and collapse state as values
 */
export function loadGroupCollapseState() {
    try {
        const saved = localStorage.getItem('groupCollapseState');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to load group collapse state:', error);
        return {};
    }
}