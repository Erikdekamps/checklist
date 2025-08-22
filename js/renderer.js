/**
 * UI Rendering Module
 * ===================
 * 
 * Handles all DOM manipulation and rendering operations
 */

import { formatTime, formatCurrency, parseCurrency } from './utils.js';

/**
 * Creates a step DOM element with money information
 * @param {Object} step - Step data object
 * @returns {HTMLElement} Complete step DOM element
 */
export function createStepElement(step) {
    const stepElement = document.createElement('div');
    stepElement.className = 'step';
    stepElement.dataset.step = step.step_number;
    stepElement.classList.toggle('completed', step.completed);

    const hasNote = step.notes && step.notes.trim() !== '';
    const noteDisplayHTML = hasNote 
        ? `<div class="note-display">${step.notes.replace(/\n/g, '<br>')}</div>` 
        : '';
    const addNoteButtonHTML = !hasNote
        ? `<button class="add-note-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Note</span>
        </button>`
        : '';

    // Parse and display money if available
    const moneyAmount = parseCurrency(step.money || '$0');
    const moneyDisplay = moneyAmount > 0 
        ? `<div class="step-money">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            ${formatCurrency(moneyAmount)}
        </div>`
        : '';

    stepElement.innerHTML = `
        <div class="step-header">
            <div class="step-header-left">
                <input type="checkbox" ${step.completed ? 'checked' : ''} tabindex="-1">
                <span class="step-title">${step.step_number}. ${step.step_title}</span>
            </div>
            <div class="step-header-right">
                ${moneyDisplay}
                <span class="step-time">${formatTime(step.cumulative_time)}</span>
            </div>
        </div>
        <div class="step-body">
            <p class="step-instruction">${step.step_instruction}</p>
            ${noteDisplayHTML}
            <textarea class="step-notes" placeholder="Add a personal note...">${step.notes || ''}</textarea>
        </div>
        <div class="step-footer">
           ${addNoteButtonHTML}
           <span class="step-items">${step.items.join(', ')}</span>
        </div>
    `;

    return stepElement;
}

/**
 * Creates a group DOM element with all its steps
 * @param {Object} group - Group data object
 * @param {Array<Object>} stepsToRender - Filtered steps to render
 * @param {Object<string, boolean>} groupCollapseState - Collapse state
 * @returns {HTMLElement} Complete group DOM element
 */
export function createGroupElement(group, stepsToRender, groupCollapseState) {
    const groupElement = document.createElement('div');
    groupElement.className = 'step-group';
    groupElement.dataset.groupTitle = group.group_title;
    
    // Apply collapse state
    const isCollapsed = groupCollapseState[group.group_title] === true;
    if (isCollapsed) {
        groupElement.classList.add('is-collapsed');
    }

    // Create group header
    groupElement.innerHTML = `
        <div class="group-header">
            <span class="group-title">${group.group_title}</span>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
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
    
    // Update total time
    const totalMinutes = allSteps.length > 0 ? allSteps[allSteps.length - 1].cumulative_time : 0;
    if (elements.totalTimeElement) {
        elements.totalTimeElement.textContent = formatTime(totalMinutes);
    }
    
    // Update total cost
    const totalCost = allSteps.reduce((sum, step) => sum + parseCurrency(step.money), 0);
    if (elements.totalCostElement) {
        elements.totalCostElement.textContent = formatCurrency(totalCost);
    }
    
    // Update progress statistics
    const completedSteps = allSteps.filter(step => step.completed).length;
    if (elements.progressStatElement) {
        elements.progressStatElement.textContent = `${completedSteps}/${allSteps.length}`;
    }
}

/**
 * Updates filter count badges with current statistics
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} filterCounts - Filter count elements
 */
export function updateFilterCounts(dataWithComputedValues, filterCounts) {
    const allSteps = dataWithComputedValues.flatMap(group => group.steps);
    const completedSteps = allSteps.filter(step => step.completed);
    const incompleteSteps = allSteps.filter(step => !step.completed);

    if (filterCounts.all) filterCounts.all.textContent = allSteps.length;
    if (filterCounts.completed) filterCounts.completed.textContent = completedSteps.length;
    if (filterCounts.incomplete) filterCounts.incomplete.textContent = incompleteSteps.length;
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
 * Updates search clear button visibility
 * @param {HTMLInputElement} searchInput - Search input element
 * @param {HTMLButtonElement} searchClear - Search clear button
 */
export function updateSearchClearButton(searchInput, searchClear) {
    if (!searchInput || !searchClear) return;
    
    const hasValue = searchInput.value.trim() !== '';
    searchClear.style.display = hasValue ? 'block' : 'none';
}

/**
 * Updates collapse/expand all button state and text
 * @param {Object<string, boolean>} groupCollapseState - Group collapse state
 * @param {HTMLButtonElement} collapseAllBtn - Collapse all button
 */
export function updateCollapseButtonState(groupCollapseState, collapseAllBtn) {
    if (!collapseAllBtn) return;
    
    const groupTitles = Object.keys(groupCollapseState);
    if (groupTitles.length === 0) return;
    
    const allCollapsed = groupTitles.every(title => groupCollapseState[title] === true);
    collapseAllBtn.classList.toggle('expanded', !allCollapsed);
    
    const span = collapseAllBtn.querySelector('span');
    if (span) {
        span.textContent = allCollapsed ? 'Expand All' : 'Collapse All';
    }
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