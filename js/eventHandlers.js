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
 * Handles theme toggle
 * @param {Function} applyTheme - Theme application function
 */
export function handleThemeToggle(applyTheme) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'light' : 'dark';
    applyTheme(newTheme);
}