/**
 * Event Handlers Module - Enhanced with Sub-Steps
 * ================================================
 * 
 * Contains event handlers for steps, sub-steps, and UI interactions
 */

import { saveProgress } from './storage.js';
import { recomputeAllProgress } from './dataManager.js';

/**
 * Handles step completion toggle
 * @param {number} stepNumber - Step number to toggle
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 */
export function handleStepToggle(stepNumber, dataWithComputedValues, onUpdate) {
    console.log('Toggling step:', stepNumber);
    
    dataWithComputedValues.forEach(group => {
        const step = group.steps.find(s => s.step_number === stepNumber);
        if (step) {
            const wasCompleted = step.completed;
            step.completed = !step.completed;
            
            console.log(`Step ${stepNumber} completion changed: ${wasCompleted} -> ${step.completed}`);
            
            // If step has sub-steps, update them to match the parent step
            if (step.sub_steps && Array.isArray(step.sub_steps)) {
                step.sub_steps.forEach(subStep => {
                    subStep.completed = step.completed;
                });
                
                console.log(`Updated ${step.sub_steps.length} sub-steps to match parent completion: ${step.completed}`);
            }
        }
    });
    
    // Recompute all progress data to ensure consistency
    const updatedData = recomputeAllProgress(dataWithComputedValues);
    
    // Copy the updated progress back to the original data
    updatedData.forEach((updatedGroup, groupIndex) => {
        dataWithComputedValues[groupIndex] = updatedGroup;
    });
    
    saveProgress(dataWithComputedValues);
    onUpdate();
}

/**
 * Handles sub-step completion toggle
 * @param {string} subStepId - Sub-step ID to toggle (format: "stepNumber.subStepIndex")
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSubStepToggle(subStepId, dataWithComputedValues, onUpdate) {
    console.log('Toggling sub-step:', subStepId);
    
    dataWithComputedValues.forEach(group => {
        group.steps.forEach(step => {
            if (step.sub_steps) {
                const subStep = step.sub_steps.find(sub => sub.sub_step_id === subStepId);
                if (subStep) {
                    const wasCompleted = subStep.completed;
                    subStep.completed = !subStep.completed;
                    
                    console.log(`Sub-step ${subStepId} completion changed: ${wasCompleted} -> ${subStep.completed}`);
                    
                    // Check if we should auto-complete or auto-uncomplete the parent step
                    const allSubStepsCompleted = step.sub_steps.every(sub => sub.completed);
                    const anySubStepCompleted = step.sub_steps.some(sub => sub.completed);
                    
                    // Auto-complete parent step if all sub-steps are completed
                    if (allSubStepsCompleted && !step.completed) {
                        step.completed = true;
                        console.log(`Auto-completed parent step ${step.step_number} because all sub-steps are done`);
                    }
                    // Auto-uncomplete parent step if any sub-step is uncompleted and parent was completed
                    else if (!allSubStepsCompleted && step.completed) {
                        step.completed = false;
                        console.log(`Auto-uncompleted parent step ${step.step_number} because not all sub-steps are done`);
                    }
                }
            }
        });
    });
    
    // Recompute all progress data to ensure consistency
    const updatedData = recomputeAllProgress(dataWithComputedValues);
    
    // Copy the updated progress back to the original data
    updatedData.forEach((updatedGroup, groupIndex) => {
        dataWithComputedValues[groupIndex] = updatedGroup;
    });
    
    saveProgress(dataWithComputedValues);
    onUpdate();
}

/**
 * Handles sub-steps container toggle
 * @param {number} stepNumber - Parent step number
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
    
    // Call onUpdate to refresh the progress display without full re-render
    if (onUpdate) onUpdate();
}

/**
 * Handles toggle all sub-steps (smart toggle based on current state)
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Function} onUpdate - Callback function after update
 * @returns {string} The action performed ('expand' or 'collapse')
 */
export function handleToggleAllSubSteps(dataWithComputedValues, onUpdate) {
    // Get all sub-steps containers
    const subStepsContainers = document.querySelectorAll('.sub-steps-container');
    const totalSubStepsContainers = subStepsContainers.length;
    
    if (totalSubStepsContainers === 0) {
        console.log('No sub-steps containers found');
        return 'no-action';
    }
    
    // Count collapsed sub-steps containers
    const collapsedContainers = Array.from(subStepsContainers).filter(container => 
        container.classList.contains('collapsed')
    ).length;
    
    // If more than half are collapsed, expand all; otherwise collapse all
    const shouldExpand = collapsedContainers > totalSubStepsContainers / 2;
    
    console.log(`Sub-steps toggle: ${collapsedContainers}/${totalSubStepsContainers} collapsed, will ${shouldExpand ? 'expand' : 'collapse'}`);
    
    // Apply action to all sub-steps containers
    const subStepsCollapseState = {};
    subStepsContainers.forEach(container => {
        const stepNumber = container.dataset.step;
        if (stepNumber) {
            if (shouldExpand) {
                container.classList.remove('collapsed');
            } else {
                container.classList.add('collapsed');
            }
            subStepsCollapseState[stepNumber] = !shouldExpand;
        }
    });
    
    // Save the new collapse state
    try {
        localStorage.setItem('subStepsCollapseState', JSON.stringify(subStepsCollapseState));
    } catch (error) {
        console.warn('Failed to save sub-steps collapse state:', error);
    }
    
    if (onUpdate) onUpdate();
    return shouldExpand ? 'expand' : 'collapse';
}

/**
 * Updates the sub-steps toggle button state and text
 * @param {Array<Object>} dataWithComputedValues - Current data state
 */
export function updateSubStepsToggleButtonState(dataWithComputedValues) {
    const toggleBtn = document.getElementById('toggle-substeps-btn');
    const buttonText = toggleBtn?.querySelector('.button-text');
    
    if (!toggleBtn || !buttonText) return;
    
    // Get all sub-steps containers
    const subStepsContainers = document.querySelectorAll('.sub-steps-container');
    const totalSubStepsContainers = subStepsContainers.length;
    
    if (totalSubStepsContainers === 0) {
        toggleBtn.style.display = 'none';
        return;
    }
    
    toggleBtn.style.display = 'flex';
    
    // Count collapsed sub-steps containers
    const collapsedContainers = Array.from(subStepsContainers).filter(container => 
        container.classList.contains('collapsed')
    ).length;
    
    // If more than half are collapsed, show "Expand Sub-Steps"
    const shouldShowExpand = collapsedContainers > totalSubStepsContainers / 2;
    
    if (shouldShowExpand) {
        toggleBtn.setAttribute('data-state', 'expand');
        buttonText.textContent = 'Expand Sub-Steps';
    } else {
        toggleBtn.setAttribute('data-state', 'collapse');
        buttonText.textContent = 'Collapse Sub-Steps';
    }
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
 * Also manages sub-steps collapse state when collapsing all groups
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
    
    console.log(`Groups toggle: ${collapsedGroups}/${totalGroups} collapsed, will ${shouldExpand ? 'expand' : 'collapse'}`);
    
    // Update group collapse state
    dataWithComputedValues.forEach(group => {
        groupCollapseState[group.group_title] = !shouldExpand;
    });
    
    try {
        localStorage.setItem('groupCollapseState', JSON.stringify(groupCollapseState));
    } catch (error) {
        console.warn('Failed to save group collapse state:', error);
    }
    
    // When collapsing all groups, also collapse all sub-steps
    if (!shouldExpand) {
        console.log('Collapsing all groups - also collapsing all sub-steps');
        
        // Delay the sub-steps collapse until after the groups are rendered
        setTimeout(() => {
            const subStepsContainers = document.querySelectorAll('.sub-steps-container');
            const subStepsCollapseState = {};
            
            subStepsContainers.forEach(container => {
                const stepNumber = container.dataset.step;
                if (stepNumber) {
                    container.classList.add('collapsed');
                    subStepsCollapseState[stepNumber] = true;
                }
            });
            
            // Save the sub-steps collapse state
            try {
                localStorage.setItem('subStepsCollapseState', JSON.stringify(subStepsCollapseState));
            } catch (error) {
                console.warn('Failed to save sub-steps collapse state:', error);
            }
            
            // Update the sub-steps toggle button
            updateSubStepsToggleButtonState(dataWithComputedValues);
        }, 100);
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