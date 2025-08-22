/* filepath: /workspaces/checklist/js/eventHandlers.js */
/**
 * Event Handlers Module - Enhanced with Sub-Steps
 * ================================================
 * 
 * Contains event handlers for steps, sub-steps, and UI interactions
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
            
            // If step is being completed, mark all sub-steps as completed
            if (step.completed && step.sub_steps) {
                step.sub_steps.forEach(subStep => {
                    subStep.completed = true;
                });
            }
            // If step is being uncompleted, mark all sub-steps as uncompleted
            else if (!step.completed && step.sub_steps) {
                step.sub_steps.forEach(subStep => {
                    subStep.completed = false;
                });
            }
        }
    });
    
    saveProgress(dataWithComputedValues);
    onUpdate();
}

/**
 * Handles sub-step completion toggle
 * @param {string} subStepId - Identifier of the sub-step to toggle
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSubStepToggle(subStepId, dataWithComputedValues, onUpdate) {
    dataWithComputedValues.forEach(group => {
        group.steps.forEach(step => {
            if (step.sub_steps) {
                const subStep = step.sub_steps.find(sub => sub.sub_step_id === subStepId);
                if (subStep) {
                    subStep.completed = !subStep.completed;
                    
                    // Auto-complete parent step if all sub-steps are completed
                    const allSubStepsCompleted = step.sub_steps.every(sub => sub.completed);
                    if (allSubStepsCompleted && !step.completed) {
                        step.completed = true;
                    }
                    // Auto-uncomplete parent step if any sub-step is uncompleted
                    else if (!subStep.completed && step.completed) {
                        step.completed = false;
                    }
                }
            }
        });
    });
    
    saveProgress(dataWithComputedValues);
    onUpdate();
}

/**
 * Handles sub-steps container toggle
 * @param {string} stepNumber - Parent step number
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSubStepsToggle(stepNumber, onUpdate) {
    const subStepsContainer = document.querySelector(`.sub-steps-container[data-step="${stepNumber}"]`);
    if (subStepsContainer) {
        const isCurrentlyCollapsed = subStepsContainer.classList.contains('collapsed');
        
        if (isCurrentlyCollapsed) {
            subStepsContainer.classList.remove('collapsed');
        } else {
            subStepsContainer.classList.add('collapsed');
        }
        
        // Save sub-steps collapse state
        try {
            const subStepsCollapseState = JSON.parse(localStorage.getItem('subStepsCollapseState') || '{}');
            subStepsCollapseState[stepNumber] = !isCurrentlyCollapsed;
            localStorage.setItem('subStepsCollapseState', JSON.stringify(subStepsCollapseState));
        } catch (error) {
            console.warn('Failed to save sub-steps collapse state:', error);
        }
    }
    
    // Don't call onUpdate() here to prevent re-rendering which would lose the animation
}

/**
 * Loads sub-steps collapse state from localStorage
 * @returns {Object} Object with step numbers as keys and collapse state as values
 */
export function loadSubStepsCollapseState() {
    try {
        const saved = localStorage.getItem('subStepsCollapseState');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to load sub-steps collapse state:', error);
        return {};
    }
}

/**
 * Applies sub-steps collapse state to rendered elements
 * @param {Object} subStepsCollapseState - Collapse state object
 */
export function applySubStepsCollapseState(subStepsCollapseState) {
    Object.entries(subStepsCollapseState).forEach(([stepNumber, isCollapsed]) => {
        const subStepsContainer = document.querySelector(`.sub-steps-container[data-step="${stepNumber}"]`);
        if (subStepsContainer && isCollapsed) {
            subStepsContainer.classList.add('collapsed');
        }
    });
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