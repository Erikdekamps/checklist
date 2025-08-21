/**
 * Event Handlers Module
 * =====================
 * 
 * Contains all user interaction event handlers
 */

import { saveProgress, saveGroupState, saveNoteToStorage, clearAllData, saveFilter } from './storage.js';

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
 * Handles individual group expand/collapse toggle
 * @param {string} groupTitle - Title of the group to toggle
 * @param {HTMLElement} groupElement - DOM element of the group
 * @param {Object<string, boolean>} groupCollapseState - Collapse state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleGroupToggle(groupTitle, groupElement, groupCollapseState, onUpdate) {
    // Toggle state
    groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
    
    // Apply visual state immediately for responsive feedback
    groupElement.classList.toggle('is-collapsed', groupCollapseState[groupTitle]);
    
    // Save state to localStorage
    saveGroupState(groupCollapseState);
    
    // Update collapse button state
    onUpdate();
}

/**
 * Handles expand/collapse all groups functionality
 * @param {Object<string, boolean>} groupCollapseState - Collapse state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleToggleExpand(groupCollapseState, onUpdate) {
    const groupTitles = Object.keys(groupCollapseState);
    if (groupTitles.length === 0) return;
    
    const allCollapsed = groupTitles.every(title => groupCollapseState[title] === true);
    
    // Toggle all groups to opposite state
    groupTitles.forEach(groupTitle => {
        groupCollapseState[groupTitle] = !allCollapsed;
    });
    
    // Save state and re-render
    saveGroupState(groupCollapseState);
    onUpdate();
}

/**
 * Handles focus on incomplete groups functionality
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object<string, boolean>} groupCollapseState - Collapse state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleFocusIncomplete(dataWithComputedValues, groupCollapseState, onUpdate) {
    dataWithComputedValues.forEach(group => {
        const hasIncompleteSteps = group.steps.some(step => !step.completed);
        // Expand groups with incomplete steps, collapse groups with all completed steps
        groupCollapseState[group.group_title] = !hasIncompleteSteps;
    });
    
    saveGroupState(groupCollapseState);
    onUpdate();
}

/**
 * Handles complete progress reset
 * @param {Function} onReset - Callback function to reinitialize app
 */
export function handleResetProgress(onReset) {
    const isConfirmed = window.confirm(
        "Are you sure you want to reset all progress?\n\n" +
        "This will:\n" +
        "• Uncheck all completed steps\n" +
        "• Delete all notes\n" +
        "• Reset all preferences\n\n" +
        "This action cannot be undone."
    );
    
    if (!isConfirmed) return;

    try {
        // Clear all localStorage data
        clearAllData();
        
        // Reinitialize application
        onReset();
    } catch (error) {
        console.error('Error during reset:', error);
        alert('Error resetting progress. Please refresh the page.');
    }
}

/**
 * Handles clearing the search input
 * @param {HTMLInputElement} searchInput - Search input element
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSearchClear(searchInput, onUpdate) {
    if (!searchInput) return;
    
    searchInput.value = '';
    onUpdate();
    searchInput.focus();
}

/**
 * Handles entering note editing mode
 * @param {HTMLElement} stepElement - Step DOM element
 */
export function handleNoteEdit(stepElement) {
    stepElement.classList.add('is-editing-note');
    const textarea = stepElement.querySelector('.step-notes');
    if (textarea) {
        textarea.focus();
        // Position cursor at end of text
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

/**
 * Handles note blur event (when user finishes editing)
 * @param {HTMLElement} stepElement - Step DOM element
 * @param {string} stepNumber - Step identifier
 * @param {string} noteValue - New note value
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 */
export function handleNoteBlur(stepElement, stepNumber, noteValue, dataWithComputedValues, onUpdate) {
    // Update the data
    dataWithComputedValues.forEach(group => {
        const step = group.steps.find(s => s.step_number === stepNumber);
        if (step) {
            step.notes = noteValue;
        }
    });
    
    // Save to storage
    saveProgress(dataWithComputedValues);
    
    // Re-render to show/hide note display
    onUpdate();
}

/**
 * Handles filter change
 * @param {string} newFilter - New filter value
 * @param {Function} onUpdate - Callback function after update
 * @returns {string} The new filter value
 */
export function handleFilterChange(newFilter, onUpdate) {
    saveFilter(newFilter);
    onUpdate();
    return newFilter;
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