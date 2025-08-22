/**
 * UI Rendering Module - Simplified Version
 * =========================================
 * 
 * Handles DOM manipulation for basic checklist functionality
 */

/**
 * Utility functions moved inline
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
 * Creates a simplified step DOM element
 * @param {Object} step - Step data object
 * @returns {HTMLElement} Complete step DOM element
 */
export function createStepElement(step) {
    const stepElement = document.createElement('div');
    stepElement.className = 'step';
    stepElement.dataset.step = step.step_number;
    stepElement.classList.toggle('completed', step.completed);

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
 * Updates header statistics display
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} elements - DOM element references
 */
export function updateStatsDisplay(dataWithComputedValues, elements) {
    const allSteps = dataWithComputedValues.flatMap(group => group.steps);
    
    // Calculate completed and total time
    const completedSteps = allSteps.filter(step => step.completed);
    let completedTime = 0;
    
    // Sum up time for completed steps
    completedSteps.forEach(step => {
        completedTime += step.time_taken || 0;
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