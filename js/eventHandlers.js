/* filepath: /workspaces/checklist/js/eventHandlers.js */
/**
 * Event Handlers Module - Enhanced with Sub-Steps
 * ================================================
 * 
 * Contains event handlers for steps, sub-steps, and UI interactions
 */

import { saveProgress, clearAllData } from './storage.js';
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
            
            console.log(`💾 Sub-steps collapse state saved for step ${stepNumber}: ${!isCurrentlyCollapsed}`);
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
        console.log(`💾 All sub-steps collapse state saved: ${shouldExpand ? 'expanded' : 'collapsed'}`);
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
 * Handles group collapse/expand toggle
 * @param {string} groupTitle - Title of the group to toggle
 * @param {Object} groupCollapseState - State object tracking collapsed groups
 * @param {Function} onUpdate - Callback function after update
 */
export function handleGroupToggle(groupTitle, groupCollapseState, onUpdate) {
    const wasCollapsed = groupCollapseState[groupTitle];
    groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
    
    // Save collapse state to localStorage
    try {
        localStorage.setItem('groupCollapseState', JSON.stringify(groupCollapseState));
        console.log(`💾 Group "${groupTitle}" ${wasCollapsed ? 'expanded' : 'collapsed'}`);
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
        console.log(`💾 All groups ${shouldExpand ? 'expanded' : 'collapsed'}`);
    } catch (error) {
        console.warn('Failed to save group collapse state:', error);
    }
    
    // When collapsing all groups, also collapse all sub-steps
    if (!shouldExpand) {
        console.log('🔄 Collapsing all groups - also collapsing all sub-steps');
        
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
                console.log(`💾 Auto-collapsed ${subStepsContainers.length} sub-steps containers`);
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
    const previousFilter = state.currentFilter;
    state.currentFilter = filterType;
    
    // Save filter state to localStorage
    try {
        localStorage.setItem('checklistFilter', filterType);
        console.log(`🔍 Filter changed: ${previousFilter} → ${filterType}`);
    } catch (error) {
        console.warn('Failed to save filter state:', error);
    }
    
    onUpdate();
}

/**
 * Handles search input with debounced saving
 * @param {string} searchTerm - Search term to filter by
 * @param {Object} state - Application state object
 * @param {Function} onUpdate - Callback function after update
 */
export function handleSearch(searchTerm, state, onUpdate) {
    const previousTerm = state.searchTerm;
    state.searchTerm = searchTerm.toLowerCase().trim();
    
    // Always update UI immediately for responsiveness
    onUpdate();
    
    // Log search change
    if (previousTerm !== state.searchTerm) {
        console.log(`🔍 Search term: "${previousTerm}" → "${state.searchTerm}"`);
    }
}

/**
 * Saves search state to localStorage with debouncing
 * @param {Object} state - Application state object
 */
export function saveSearchState(state) {
    try {
        localStorage.setItem('checklistSearchTerm', state.searchTerm);
        localStorage.setItem('checklistFilter', state.currentFilter);
        console.log(`💾 Search state saved: "${state.searchTerm}" (${state.currentFilter})`);
    } catch (error) {
        console.warn('Failed to save search state:', error);
    }
}

/**
 * Handles theme toggle
 * @param {Function} applyTheme - Theme application function
 */
export function handleThemeToggle(applyTheme) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'light' : 'dark';
    
    console.log(`🎨 Theme toggle: ${isDarkMode ? 'dark' : 'light'} → ${newTheme}`);
    applyTheme(newTheme);
}

/**
 * Handles reset button click with confirmation
 * @param {Function} onReset - Callback function after reset
 */
export function handleReset(onReset) {
    // Create confirmation modal
    const confirmReset = confirm(
        '⚠️ Are you sure you want to reset all progress?\n\n' +
        'This will:\n' +
        '• Clear all completed steps\n' +
        '• Reset all sub-steps\n' +
        '• Clear all saved state\n' +
        '• Restore to initial state\n\n' +
        'This action cannot be undone!'
    );
    
    if (confirmReset) {
        try {
            // Clear all localStorage data
            clearAllData();
            
            // Also clear additional state data
            localStorage.removeItem('groupCollapseState');
            localStorage.removeItem('subStepsCollapseState');
            localStorage.removeItem('checklistSearchTerm');
            
            console.log('🧹 All data reset successfully');
            
            // Show success message
            const notification = document.createElement('div');
            notification.className = 'reset-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span>Reset completed successfully!</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
            
            // Trigger app reset
            onReset();
            
        } catch (error) {
            console.error('❌ Error during reset:', error);
            alert('❌ Error occurred during reset. Please refresh the page and try again.');
        }
    }
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
 * Storage and State Management Functions
 */

/**
 * Loads sub-steps collapse state from localStorage
 * @returns {Object} Object with step numbers as keys and collapse state as values
 */
export function loadSubStepsCollapseState() {
    try {
        const saved = localStorage.getItem('subStepsCollapseState');
        const state = saved ? JSON.parse(saved) : {};
        console.log('📁 Loaded sub-steps collapse state:', Object.keys(state).length, 'steps');
        return state;
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
    let appliedCount = 0;
    Object.entries(subStepsCollapseState).forEach(([stepNumber, isCollapsed]) => {
        const subStepsContainer = document.querySelector(`.sub-steps-container[data-step="${stepNumber}"]`);
        if (subStepsContainer && isCollapsed) {
            subStepsContainer.classList.add('collapsed');
            appliedCount++;
        }
    });
    
    if (appliedCount > 0) {
        console.log(`🎨 Applied sub-steps collapse state to ${appliedCount} containers`);
    }
}

/**
 * Loads group collapse state from localStorage
 * @returns {Object} Object with group titles as keys and collapse state as values
 */
export function loadGroupCollapseState() {
    try {
        const saved = localStorage.getItem('groupCollapseState');
        const state = saved ? JSON.parse(saved) : {};
        console.log('📁 Loaded group collapse state:', Object.keys(state).length, 'groups');
        return state;
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
        const filterState = localStorage.getItem('checklistFilter') || 'all';
        console.log('📁 Loaded filter state:', filterState);
        return filterState;
    } catch (error) {
        console.warn('Failed to load filter state:', error);
        return 'all';
    }
}

/**
 * Loads search term from localStorage
 * @returns {string} Saved search term
 */
export function loadSearchTerm() {
    try {
        const searchTerm = localStorage.getItem('checklistSearchTerm') || '';
        if (searchTerm) {
            console.log('📁 Loaded search term:', `"${searchTerm}"`);
        }
        return searchTerm;
    } catch (error) {
        console.warn('Failed to load search term:', error);
        return '';
    }
}

/**
 * Clears search state and saves to localStorage
 * @param {Object} state - Application state object
 * @param {Function} onUpdate - Callback function after update
 */
export function clearSearch(state, onUpdate) {
    state.searchTerm = '';
    
    try {
        localStorage.setItem('checklistSearchTerm', '');
        console.log('🧹 Search cleared and saved');
    } catch (error) {
        console.warn('Failed to save cleared search state:', error);
    }
    
    onUpdate();
}

/**
 * Utility Functions
 */

/**
 * Debounced function factory for localStorage operations
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Validates and sanitizes localStorage data
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default value if invalid
 * @returns {*} Validated data or default value
 */
export function getValidatedLocalStorageData(key, defaultValue) {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return defaultValue;
        
        // Try to parse as JSON first
        try {
            return JSON.parse(saved);
        } catch {
            // If JSON parsing fails, return as string
            return saved;
        }
    } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Safely saves data to localStorage with error handling
 * @param {string} key - localStorage key
 * @param {*} value - Value to save
 * @returns {boolean} Success status
 */
export function safeLocalStorageSave(key, value) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
        return false;
    }
}