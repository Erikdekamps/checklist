/**
 * UI Rendering Module - Enhanced with Sub-Steps
 * ==============================================
 * 
 * Handles DOM manipulation for checklist functionality including sub-steps
 */

/**
 * Utility functions
 */
function formatTime(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

/**
 * Filters steps based on current filter and search term
 * @param {Array<Object>} steps - Steps to filter
 * @param {string} filter - Current filter ('all', 'todo', 'completed')
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array<Object>} Filtered steps
 */
function filterSteps(steps, filter, searchTerm) {
    let filteredSteps = steps;
    
    // Apply completion filter
    if (filter === 'todo') {
        filteredSteps = steps.filter(step => !step.completed);
    } else if (filter === 'completed') {
        filteredSteps = steps.filter(step => step.completed);
    }
    
    // Apply search filter
    if (searchTerm) {
        filteredSteps = filteredSteps.filter(step => {
            const searchableText = [
                step.step_title,
                step.step_instruction,
                ...(step.items || []),
                step.notes || '',
                // Include sub-step content in search
                ...(step.sub_steps || []).flatMap(sub => [
                    sub.sub_step_title || '',
                    sub.sub_step_instruction || ''
                ])
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    return filteredSteps;
}

/**
 * Creates sub-steps HTML content
 * @param {Array<Object>} subSteps - Array of sub-steps
 * @param {string} stepNumber - Parent step number
 * @returns {string} HTML string for sub-steps
 */
function createSubStepsHTML(subSteps, stepNumber) {
    if (!subSteps || subSteps.length === 0) return '';
    
    const completedCount = subSteps.filter(sub => sub.completed).length;
    const totalCount = subSteps.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    const subStepsListHTML = subSteps.map(subStep => `
        <div class="sub-step ${subStep.completed ? 'completed' : ''}" data-sub-step="${subStep.sub_step_id}">
            <input type="checkbox" class="sub-step-checkbox" ${subStep.completed ? 'checked' : ''} tabindex="-1">
            <div class="sub-step-content">
                <div class="sub-step-title">${subStep.sub_step_title}</div>
                <div class="sub-step-instruction">${subStep.sub_step_instruction}</div>
                <div class="sub-step-time">${formatTime(subStep.time_taken)}</div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="sub-steps-container" data-step="${stepNumber}">
            <div class="sub-steps-header">
                <div class="sub-steps-header-left">
                    <button class="sub-steps-toggle-btn" type="button" aria-label="Toggle sub-steps">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <span>Sub-tasks</span>
                </div>
                <div class="sub-steps-progress">
                    ${completedCount}/${totalCount}
                    <div class="sub-steps-progress-bar">
                        <div class="sub-steps-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            </div>
            <div class="sub-steps-list">
                ${subStepsListHTML}
            </div>
        </div>
    `;
}

/**
 * Creates a step DOM element with sub-steps support
 * @param {Object} step - Step data object
 * @returns {HTMLElement} Complete step DOM element
 */
export function createStepElement(step) {
    const stepElement = document.createElement('div');
    stepElement.className = 'step';
    stepElement.dataset.step = step.step_number;
    stepElement.classList.toggle('completed', step.completed);
    
    if (step.sub_steps && step.sub_steps.length > 0) {
        stepElement.classList.add('has-sub-steps');
    }

    const subStepsHTML = createSubStepsHTML(step.sub_steps, step.step_number);

    stepElement.innerHTML = `
        <div class="step-header">
            <div class="step-header-left">
                <input type="checkbox" ${step.completed ? 'checked' : ''} tabindex="-1">
                <span class="step-title">${step.step_number}. ${step.step_title}</span>
            </div>
            <div class="step-header-right">
                <span class="step-time">${formatTime(step.cumulative_time)}</span>
            </div>
        </div>
        <div class="step-body">
            <p class="step-instruction">${step.step_instruction}</p>
            ${step.notes ? `<div class="step-notes-display">${step.notes.replace(/\n/g, '<br>')}</div>` : ''}
            ${subStepsHTML}
        </div>
        <div class="step-footer">
           <span class="step-items">${step.items.join(', ')}</span>
        </div>
    `;

    return stepElement;
}

/**
 * Creates a group DOM element with collapse functionality
 * @param {Object} group - Group data object
 * @param {Array<Object>} stepsToRender - Steps to render
 * @param {boolean} isCollapsed - Whether the group is collapsed
 * @returns {HTMLElement} Complete group DOM element
 */
export function createGroupElement(group, stepsToRender, isCollapsed = false) {
    const groupElement = document.createElement('div');
    groupElement.className = 'step-group';
    groupElement.dataset.groupTitle = group.group_title;
    
    if (isCollapsed) {
        groupElement.classList.add('collapsed');
    }

    // Hide group if no steps to show
    if (stepsToRender.length === 0) {
        groupElement.style.display = 'none';
        return groupElement;
    }

    // Create group header with collapse button
    groupElement.innerHTML = `
        <div class="group-header" data-group="${group.group_title}">
            <button class="group-collapse-btn" type="button" aria-label="Toggle group">
                <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <span class="group-title">${group.group_title}</span>
            <span class="group-stats">${stepsToRender.filter(s => s.completed).length}/${stepsToRender.length}</span>
        </div>
        <div class="group-body"></div>
    `;

    // Populate group body with steps
    const groupBody = groupElement.querySelector('.group-body');
    stepsToRender.forEach(step => {
        const stepElement = createStepElement(step);
        groupBody.appendChild(stepElement);
    });

    return groupElement;
}

/**
 * Renders all groups with filtering applied
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} state - Application state (filter, search, etc.)
 * @param {Object} groupCollapseState - Collapse state for groups
 * @param {HTMLElement} container - Container element
 */
export function renderFilteredGroups(dataWithComputedValues, state, groupCollapseState, container) {
    if (!container) return;
    
    container.innerHTML = '';

    dataWithComputedValues.forEach(group => {
        const filteredSteps = filterSteps(group.steps, state.currentFilter, state.searchTerm);
        const isCollapsed = groupCollapseState[group.group_title] || false;
        const groupElement = createGroupElement(group, filteredSteps, isCollapsed);
        container.appendChild(groupElement);
    });
}

/**
 * Updates filter button states
 * @param {string} activeFilter - Currently active filter
 */
export function updateFilterButtons(activeFilter) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `filter-${activeFilter}`) {
            btn.classList.add('active');
        }
    });
}

/**
 * Updates search clear button visibility
 * @param {string} searchTerm - Current search term
 */
export function updateSearchClearButton(searchTerm) {
    const clearButton = document.getElementById('search-clear');
    if (clearButton) {
        clearButton.classList.toggle('visible', searchTerm.length > 0);
    }
}

/**
 * Updates header statistics display
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} elements - DOM element references
 */
export function updateStatsDisplay(dataWithComputedValues, elements) {
    const allSteps = dataWithComputedValues.flatMap(group => group.steps);
    
    // Calculate completed and total time
    const completedSteps = allSteps.filter(step => step.completed);
    let completedTime = 0;
    
    // Sum up time for completed steps (including sub-steps)
    completedSteps.forEach(step => {
        completedTime += step.total_step_time || step.time_taken || 0;
    });
    
    // Total time is the cumulative time of the last step
    const totalMinutes = allSteps.length > 0 ? allSteps[allSteps.length - 1].cumulative_time : 0;
    
    // Update total time display with completed/total format
    if (elements.totalTimeElement) {
        elements.totalTimeElement.textContent = `${formatTime(completedTime)} / ${formatTime(totalMinutes)}`;
    }
    
    // Update progress statistics
    if (elements.progressStatElement) {
        elements.progressStatElement.textContent = `${completedSteps.length}/${allSteps.length}`;
    }
}

/**
 * Updates the progress bar in the footer
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} elements - Progress elements
 */
export function updateProgressBar(dataWithComputedValues, elements) {
    if (!elements.progressText || !elements.progressBar) return;
    
    const allSteps = dataWithComputedValues.flatMap(group => group.steps);
    const totalSteps = allSteps.length;
    
    if (totalSteps === 0) {
        elements.progressText.textContent = "No steps available.";
        elements.progressBar.style.width = '0%';
        return;
    }
    
    const completedSteps = allSteps.filter(step => step.completed).length;
    const percentage = (completedSteps / totalSteps) * 100;
    
    elements.progressText.textContent = `Completed ${completedSteps} of ${totalSteps} (${Math.round(percentage)}%)`;
    elements.progressBar.style.width = `${percentage}%`;
}

/**
 * Shows error message in the main container
 * @param {HTMLElement} container - Main container element
 * @param {string} message - Error message to display
 */
export function showError(container, message) {
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            text-align: center; 
            padding: var(--spacing-xl); 
            color: var(--c-danger);
            background: var(--c-bg-surface-1);
            border-radius: var(--border-radius-lg);
            border: 2px dashed var(--c-danger);
            margin: var(--spacing-xl);
        ">
            <h2>⚠️ Error Loading Checklist</h2>
            <p>${message}</p>
            <p style="font-size: 0.9em; color: var(--c-text-secondary);">
                Please refresh the page or check the console for more details.
            </p>
            <button onclick="location.reload()" style="
                margin-top: var(--spacing-md);
                padding: var(--spacing-sm) var(--spacing-md);
                background: var(--c-primary);
                color: white;
                border: none;
                border-radius: var(--border-radius-md);
                cursor: pointer;
            ">
                Refresh Page
            </button>
        </div>
    `;
}