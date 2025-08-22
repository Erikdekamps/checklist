/**
 * Renderer Module - Enhanced with Sub-Steps
 * ==========================================
 * 
 * Handles rendering of steps, groups, and sub-steps with dynamic numbering
 */

import { formatTime, formatMoney } from './dataManager.js';

/**
 * Renders the complete checklist with groups and steps
 * @param {Array<Object>} dataWithComputedValues - Processed checklist data
 * @param {Object} groupCollapseState - Group collapse state
 * @param {Object} subStepsCollapseState - Sub-steps collapse state
 * @param {Object} appState - Application state (filter, search)
 * @returns {string} Complete HTML for the checklist
 */
export function renderChecklist(dataWithComputedValues, groupCollapseState, subStepsCollapseState, appState) {
    if (!Array.isArray(dataWithComputedValues) || dataWithComputedValues.length === 0) {
        return '<div class="empty-state">No checklist data available</div>';
    }

    return dataWithComputedValues
        .map(group => renderGroup(group, groupCollapseState, subStepsCollapseState, appState))
        .filter(html => html) // Remove empty groups
        .join('');
}

/**
 * Renders a single group with its steps
 * @param {Object} group - Group data
 * @param {Object} groupCollapseState - Group collapse state
 * @param {Object} subStepsCollapseState - Sub-steps collapse state
 * @param {Object} appState - Application state (filter, search)
 * @returns {string} HTML for the group
 */
function renderGroup(group, groupCollapseState, subStepsCollapseState, appState) {
    const isCollapsed = groupCollapseState[group.group_title] || false;
    const filteredSteps = filterSteps(group.steps || [], appState);
    
    // Don't render group if no steps match filter
    if (filteredSteps.length === 0) {
        return '';
    }
    
    const stats = group.group_stats || {};
    const progressPercentage = stats.completion_percentage || 0;
    
    return `
        <div class="step-group ${isCollapsed ? 'collapsed' : ''}">
            <div class="group-header" data-group="${escapeHtml(group.group_title)}">
                <button class="group-collapse-btn" type="button" aria-label="Toggle group">
                    <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </button>
                <span class="group-title">${escapeHtml(group.group_title)}</span>
                <span class="group-stats">${stats.completed_steps || 0}/${stats.total_steps || 0}</span>
            </div>
            <div class="group-body">
                ${filteredSteps.map(step => renderStep(step, subStepsCollapseState)).join('')}
            </div>
        </div>
    `;
}

/**
 * Filters steps based on current filter and search criteria
 * @param {Array<Object>} steps - Array of step objects
 * @param {Object} appState - Application state with filter and search
 * @returns {Array<Object>} Filtered steps
 */
function filterSteps(steps, appState) {
    if (!Array.isArray(steps)) return [];
    
    return steps.filter(step => {
        // Filter by completion status
        if (appState.currentFilter === 'completed' && !step.completed) return false;
        if (appState.currentFilter === 'todo' && step.completed) return false;
        
        // Filter by search term
        if (appState.searchTerm) {
            const searchLower = appState.searchTerm.toLowerCase();
            const matchesTitle = step.step_title?.toLowerCase().includes(searchLower);
            const matchesInstruction = step.step_instruction?.toLowerCase().includes(searchLower);
            const matchesItems = step.items?.some(item => 
                item.toLowerCase().includes(searchLower)
            );
            const matchesNotes = step.notes?.toLowerCase().includes(searchLower);
            
            // Check sub-steps for search matches
            const matchesSubSteps = step.sub_steps?.some(subStep =>
                subStep.sub_step_title?.toLowerCase().includes(searchLower) ||
                subStep.sub_step_instruction?.toLowerCase().includes(searchLower)
            );
            
            if (!matchesTitle && !matchesInstruction && !matchesItems && !matchesNotes && !matchesSubSteps) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Renders a single step
 * @param {Object} step - Step data with generated step_number
 * @param {Object} subStepsCollapseState - Sub-steps collapse state
 * @returns {string} HTML for the step
 */
function renderStep(step, subStepsCollapseState) {
    const stepNumber = step.step_number;
    const hasSubSteps = step.sub_steps && Array.isArray(step.sub_steps) && step.sub_steps.length > 0;
    const subStepsCollapsed = subStepsCollapseState[stepNumber] || false;
    
    return `
        <div class="step ${step.completed ? 'completed' : ''} ${hasSubSteps ? 'has-sub-steps' : ''}" 
             data-step="${stepNumber}">
            
            <div class="step-header">
                <div class="step-header-left">
                    <input type="checkbox" 
                           ${step.completed ? 'checked' : ''} 
                           tabindex="-1"
                           aria-label="Mark step ${stepNumber} as ${step.completed ? 'incomplete' : 'complete'}">
                    <span class="step-title">${stepNumber}. ${escapeHtml(step.step_title)}</span>
                </div>
                <div class="step-time">${formatTime(step.time_taken)}</div>
            </div>
            
            <div class="step-body">
                <p class="step-instruction">${escapeHtml(step.step_instruction)}</p>
                
                ${step.notes ? `<div class="note-display">${escapeHtml(step.notes)}</div>` : ''}
                
                <textarea class="step-notes" 
                         placeholder="Add notes for this step..."
                         style="display: none;">${escapeHtml(step.notes || '')}</textarea>
                
                ${hasSubSteps ? renderSubSteps(step, subStepsCollapsed) : ''}
            </div>
            
            <div class="step-footer">
                <div class="step-meta">
                    ${step.money_value > 0 ? `
                        <div class="step-money">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${formatMoney(step.money_value)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="step-items">
                    ${step.items && step.items.length > 0 ? 
                        `<strong>Items:</strong> ${step.items.join(', ')}` : ''
                    }
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders sub-steps for a step
 * @param {Object} step - Step data with sub_steps array
 * @param {boolean} isCollapsed - Whether sub-steps are collapsed
 * @returns {string} HTML for the sub-steps container
 */
function renderSubSteps(step, isCollapsed) {
    if (!step.sub_steps || !Array.isArray(step.sub_steps) || step.sub_steps.length === 0) {
        return '';
    }
    
    const progress = step.sub_steps_progress || { completed: 0, total: step.sub_steps.length, percentage: 0 };
    
    return `
        <div class="sub-steps-container ${isCollapsed ? 'collapsed' : ''}" data-step="${step.step_number}">
            <div class="sub-steps-header">
                <div class="sub-steps-header-left">
                    <button class="sub-steps-toggle-btn" type="button" aria-label="Toggle sub-steps">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    </button>
                    Sub-Steps
                </div>
                <div class="sub-steps-progress">
                    ${progress.completed}/${progress.total} (${progress.percentage}%)
                    <div class="sub-steps-progress-bar">
                        <div class="sub-steps-progress-fill" style="width: ${progress.percentage}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="sub-steps-list">
                ${step.sub_steps.map(subStep => renderSubStep(subStep)).join('')}
            </div>
        </div>
    `;
}

/**
 * Renders a single sub-step
 * @param {Object} subStep - Sub-step data with generated sub_step_id
 * @returns {string} HTML for the sub-step
 */
function renderSubStep(subStep) {
    return `
        <div class="sub-step ${subStep.completed ? 'completed' : ''}" 
             data-sub-step="${subStep.sub_step_id}">
            <input type="checkbox" 
                   class="sub-step-checkbox"
                   ${subStep.completed ? 'checked' : ''} 
                   tabindex="-1"
                   aria-label="Mark sub-step ${subStep.sub_step_id} as ${subStep.completed ? 'incomplete' : 'complete'}">
            
            <div class="sub-step-content">
                <div class="sub-step-title">${escapeHtml(subStep.sub_step_title)}</div>
                <div class="sub-step-instruction">${escapeHtml(subStep.sub_step_instruction)}</div>
                ${subStep.time_taken ? `<div class="sub-step-time">${formatTime(subStep.time_taken)}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
 * Updates enhanced footer progress display
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} elements - DOM element references
 */
export function updateStatsDisplay(dataWithComputedValues, elements) {
    const allSteps = dataWithComputedValues.flatMap(group => group.steps || []);
    const totalSteps = allSteps.length;
    
    if (totalSteps === 0) {
        if (elements.progressText) elements.progressText.textContent = "No steps available";
        if (elements.progressStatElement) elements.progressStatElement.textContent = "0/0 steps";
        if (elements.totalTimeElement) elements.totalTimeElement.textContent = "0m / 0m";
        return;
    }
    
    // Calculate completed steps and time
    const completedSteps = allSteps.filter(step => step.completed);
    const completedCount = completedSteps.length;
    
    // Sum up time for completed and total
    const completedTime = completedSteps.reduce((sum, step) => sum + (step.time_taken || 0), 0);
    const totalTime = allSteps.reduce((sum, step) => sum + (step.time_taken || 0), 0);
    
    // Update main progress text
    if (elements.progressText) {
        elements.progressText.textContent = `Completed ${completedCount} of ${totalSteps} steps`;
    }
    
    // Update detailed stats
    if (elements.progressStatElement) {
        elements.progressStatElement.textContent = `${completedCount}/${totalSteps} steps`;
    }
    
    if (elements.totalTimeElement) {
        elements.totalTimeElement.textContent = `${formatTime(completedTime)} / ${formatTime(totalTime)}`;
    }
}

/**
 * Updates the enhanced progress bar with percentage and completion state
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @param {Object} elements - Progress elements
 */
export function updateProgressBar(dataWithComputedValues, elements) {
    if (!elements.progressBar) return;
    
    const allSteps = dataWithComputedValues.flatMap(group => group.steps || []);
    const totalSteps = allSteps.length;
    
    if (totalSteps === 0) {
        elements.progressBar.style.width = '0%';
        if (elements.progressText) elements.progressText.textContent = "No steps available";
        
        // Update percentage display
        const percentageElement = document.getElementById('progress-percentage');
        if (percentageElement) percentageElement.textContent = '0%';
        return;
    }
    
    const completedSteps = allSteps.filter(step => step.completed).length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    
    // Update progress bar width
    elements.progressBar.style.width = `${percentage}%`;
    
    // Update percentage display
    const percentageElement = document.getElementById('progress-percentage');
    if (percentageElement) {
        percentageElement.textContent = `${percentage}%`;
    }
    
    // Add completion state class
    const footer = document.getElementById('progress-footer');
    if (footer) {
        footer.classList.toggle('progress-complete', percentage === 100);
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