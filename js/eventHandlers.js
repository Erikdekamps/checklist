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
 * Handles toggle all groups (smart toggle based on current state)
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} groupCollapseState - State object tracking collapsed groups
 * @param {Function} onUpdate - Callback function after update
 * @returns {string} The action performed ('expand' or 'collapse')
 */
export function handleToggleAll(dataWithComputedValues, groupCollapseState, onUpdate) {
    // Count collapsed groups
    const totalGroups = dataWithComputedValues.length;
    const collapsedGroups = dataWithComputedValues.filter(group => 
        groupCollapseState[group.group_title]
    ).length;
    
    // If more than half are collapsed, expand all; otherwise collapse all
    const shouldExpand = collapsedGroups > totalGroups / 2;
    
    dataWithComputedValues.forEach(group => {
        groupCollapseState[group.group_title] = !shouldExpand;
    });
    
    try {
        localStorage.setItem('groupCollapseState', JSON.stringify(groupCollapseState));
    } catch (error) {
        console.warn('Failed to save group collapse state:', error);
    }
    
    onUpdate();
    return shouldExpand ? 'expand' : 'collapse';
}

/**
 * Handles filter change
 * @param {string} filterType - 'all', 'todo', or 'completed'
 * @param {Object} state - Application state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleFilterChange(filterType, state, onUpdate) {
    state.currentFilter = filterType;
    
    // Save filter state to localStorage
    try {
        localStorage.setItem('checklistFilter', filterType);
    } catch (error) {
        console.warn('Failed to save filter state:', error);
    }
    
    onUpdate();
}

/**
 * Handles search input
 * @param {string} searchTerm - Search term to filter by
 * @param {Object} state - Application state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSearch(searchTerm, state, onUpdate) {
    state.searchTerm = searchTerm.toLowerCase().trim();
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
 * Updates the toggle button state and text
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} groupCollapseState - State object tracking collapsed groups
 */
export function updateToggleButtonState(dataWithComputedValues, groupCollapseState) {
    const toggleBtn = document.getElementById('toggle-all-btn');
    const buttonText = toggleBtn?.querySelector('.button-text');
    
    if (!toggleBtn || !buttonText) return;
    
    // Count collapsed groups
    const totalGroups = dataWithComputedValues.length;
    const collapsedGroups = dataWithComputedValues.filter(group => 
        groupCollapseState[group.group_title]
    ).length;
    
    // If more than half are collapsed, show "Expand All"
    const shouldShowExpand = collapsedGroups > totalGroups / 2;
    
    if (shouldShowExpand) {
        toggleBtn.setAttribute('data-state', 'expand');
        buttonText.textContent = 'Expand All';
    } else {
        toggleBtn.setAttribute('data-state', 'collapse');
        buttonText.textContent = 'Collapse All';
    }
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

/**
 * Loads filter state from localStorage
 * @returns {string} Filter state ('all', 'todo', or 'completed')
 */
export function loadFilterState() {
    try {
        return localStorage.getItem('checklistFilter') || 'all';
    } catch (error) {
        console.warn('Failed to load filter state:', error);
        return 'all';
    }
}