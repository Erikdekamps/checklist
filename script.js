/**
 * @fileoverview Interactive Checklist Application - Enhanced with Sub-Steps and Required Items
 * @description A streamlined checklist management system with nested task support and required items
 * 
 * @author Interactive Checklist Team
 * @version 2.5.0
 * @created 2024
 * @updated 2025
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE
    // ==========================================

    let dataWithComputedValues = [];
    let groupCollapseState = {};
    let subStepsCollapseState = {};
    let footerCollapsed = false;
    let appState = {
        currentFilter: 'all',
        searchTerm: ''
    };

    // ==========================================
    //  DOM ELEMENT REFERENCES
    // ==========================================

    const elements = {
        groupContainer: document.getElementById('group-container'),
        themeToggle: document.getElementById('theme-toggle'),
        
        // Footer progress elements
        progressFooter: document.getElementById('progress-footer'),
        footerToggle: document.getElementById('footer-toggle'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressBar: document.querySelector('.progress-fill'),
        progressStat: document.getElementById('progress-stat'),
        totalTime: document.getElementById('total-time'),
        totalMoney: document.getElementById('total-money'),
        
        // Control elements
        searchInput: document.getElementById('search-input'),
        searchClear: document.getElementById('search-clear'),
        filterAll: document.getElementById('filter-all'),
        filterTodo: document.getElementById('filter-todo'),
        filterCompleted: document.getElementById('filter-completed'),
        toggleAllBtn: document.getElementById('toggle-all-btn'),
        toggleSubStepsBtn: document.getElementById('toggle-substeps-btn'),
        resetBtn: document.getElementById('reset-btn')
    };

    // ==========================================
    //  DATA MANAGEMENT
    // ==========================================

    async function loadAndProcessData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return generateStepNumbers(data);
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    function generateStepNumbers(data) {
        let globalStepNumber = 1;
        
        return data.map(group => ({
            ...group,
            steps: group.steps.map(step => {
                const processedStep = {
                    ...step,
                    step_number: globalStepNumber++,
                    sub_steps: step.sub_steps ? step.sub_steps.map((subStep, index) => ({
                        ...subStep,
                        sub_step_id: `${globalStepNumber - 1}.${index + 1}`,
                        completed: subStep.completed || false
                    })) : []
                };
                return processedStep;
            })
        }));
    }

    function computeGlobalStats(dataWithComputedValues) {
        const totalSteps = dataWithComputedValues.reduce((sum, group) => 
            sum + group.steps.length, 0);
        
        const completedSteps = dataWithComputedValues.reduce((sum, group) => 
            sum + group.steps.filter(step => step.completed).length, 0);
        
        const totalTime = dataWithComputedValues.reduce((sum, group) => 
            sum + group.steps.reduce((stepSum, step) => 
                stepSum + (step.time_taken || 0), 0), 0);
        
        const totalMoney = dataWithComputedValues.reduce((sum, group) => 
            sum + group.steps.reduce((stepSum, step) => {
                const money = parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0);
                return stepSum + money;
            }, 0), 0);
        
        const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        
        return {
            total_steps: totalSteps,
            completed_steps: completedSteps,
            completion_percentage: completionPercentage,
            total_time: totalTime,
            total_money: totalMoney
        };
    }

    function formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // ==========================================
    //  STORAGE MANAGEMENT
    // ==========================================

    function saveProgress(dataToSave) {
        try {
            const dataToStore = JSON.stringify(dataToSave);
            localStorage.setItem('checklistProgress', dataToStore);
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem('checklistProgress');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load progress:', error);
            return null;
        }
    }

    function saveFooterState(collapsed) {
        try {
            localStorage.setItem('footerCollapsed', JSON.stringify(collapsed));
        } catch (error) {
            console.error('Failed to save footer state:', error);
        }
    }

    function loadFooterState() {
        try {
            const saved = localStorage.getItem('footerCollapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            console.error('Failed to load footer state:', error);
            return false;
        }
    }

    function saveGroupCollapseState() {
        try {
            localStorage.setItem('groupCollapseState', JSON.stringify(groupCollapseState));
        } catch (error) {
            console.error('Failed to save group collapse state:', error);
        }
    }

    function loadGroupCollapseState() {
        try {
            const saved = localStorage.getItem('groupCollapseState');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load group collapse state:', error);
            return {};
        }
    }

    function saveSubStepsCollapseState() {
        try {
            localStorage.setItem('subStepsCollapseState', JSON.stringify(subStepsCollapseState));
        } catch (error) {
            console.error('Failed to save sub-steps collapse state:', error);
        }
    }

    function loadSubStepsCollapseState() {
        try {
            const saved = localStorage.getItem('subStepsCollapseState');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load sub-steps collapse state:', error);
            return {};
        }
    }

    // ==========================================
    //  UI STATE MANAGEMENT
    // ==========================================

    function updateFooterProgress() {
        const globalStats = computeGlobalStats(dataWithComputedValues);
        
        // Update progress stats
        if (elements.progressStat) {
            elements.progressStat.textContent = `${globalStats.completed_steps}/${globalStats.total_steps}`;
        }
        
        if (elements.totalTime) {
            elements.totalTime.textContent = formatTime(globalStats.total_time);
        }
        
        if (elements.totalMoney) {
            elements.totalMoney.textContent = formatMoney(globalStats.total_money);
        }
        
        // Update progress percentage
        if (elements.progressPercentage) {
            elements.progressPercentage.textContent = `${globalStats.completion_percentage}%`;
        }
        
        // Update progress text
        if (elements.progressText) {
            if (globalStats.total_steps === 0) {
                elements.progressText.textContent = "No steps available";
            } else if (globalStats.completed_steps === globalStats.total_steps) {
                elements.progressText.textContent = "All steps completed! 🎉";
            } else {
                elements.progressText.textContent = `${globalStats.completed_steps} of ${globalStats.total_steps} steps completed`;
            }
        }
        
        // Update progress bar
        if (elements.progressBar) {
            elements.progressBar.style.width = `${globalStats.completion_percentage}%`;
        }
    }

    function updateToggleButtonStates() {
        // Update toggle all groups button
        if (elements.toggleAllBtn) {
            const totalGroups = dataWithComputedValues.length;
            const collapsedGroups = dataWithComputedValues.filter(group => 
                groupCollapseState[group.group_title]
            ).length;
            
            const buttonText = elements.toggleAllBtn.querySelector('.button-text');
            if (collapsedGroups > totalGroups / 2) {
                elements.toggleAllBtn.setAttribute('data-state', 'expand');
                if (buttonText) buttonText.textContent = 'Expand All';
            } else {
                elements.toggleAllBtn.setAttribute('data-state', 'collapse');
                if (buttonText) buttonText.textContent = 'Collapse All';
            }
        }

        // Update toggle sub-steps button
        if (elements.toggleSubStepsBtn) {
            // Get actual sub-steps containers from DOM
            const subStepsContainers = document.querySelectorAll('.sub-steps-container');
            const totalSubStepsContainers = subStepsContainers.length;
            
            if (totalSubStepsContainers === 0) {
                elements.toggleSubStepsBtn.style.display = 'none';
                return;
            }
            
            elements.toggleSubStepsBtn.style.display = 'flex';
            
            const collapsedContainers = Array.from(subStepsContainers).filter(container => 
                container.classList.contains('collapsed')
            ).length;
            
            const buttonText = elements.toggleSubStepsBtn.querySelector('.button-text');
            if (collapsedContainers > totalSubStepsContainers / 2) {
                elements.toggleSubStepsBtn.setAttribute('data-state', 'expand');
                if (buttonText) buttonText.textContent = 'Expand Sub-Steps';
            } else {
                elements.toggleSubStepsBtn.setAttribute('data-state', 'collapse');
                if (buttonText) buttonText.textContent = 'Collapse Sub-Steps';
            }
        }
    }

    function toggleFooter() {
        footerCollapsed = !footerCollapsed;
        elements.progressFooter?.classList.toggle('collapsed', footerCollapsed);
        saveFooterState(footerCollapsed);
    }

    function updateUI() {
        updateFooterProgress();
        updateToggleButtonStates();
        
        // Update search input value if needed
        if (elements.searchInput && elements.searchInput.value !== appState.searchTerm) {
            elements.searchInput.value = appState.searchTerm;
        }
    }

    // ==========================================
    //  RENDERING FUNCTIONS
    // ==========================================

    function renderChecklist(dataWithComputedValues, groupCollapseState, subStepsCollapseState, appState) {
        return dataWithComputedValues.map(group => {
            const isCollapsed = groupCollapseState[group.group_title] || false;
            const filteredSteps = filterSteps(group.steps, appState);
            
            if (filteredSteps.length === 0 && appState.searchTerm) {
                return '';
            }

            const completedSteps = group.steps.filter(step => step.completed).length;
            const totalSteps = group.steps.length;
            const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

            return `
                <div class="step-group ${isCollapsed ? 'collapsed' : ''}">
                    <div class="group-header" data-group="${escapeHtml(group.group_title)}">
                        <button class="group-collapse-btn" type="button" aria-label="Toggle group">
                            <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                            </svg>
                        </button>
                        <span class="group-title">${escapeHtml(group.group_title)}</span>
                        <span class="group-stats">${completedSteps}/${totalSteps} (${completionPercentage}%)</span>
                    </div>
                    <div class="group-body">
                        ${filteredSteps.map(step => renderStep(step, subStepsCollapseState)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function filterSteps(steps, appState) {
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
                
                if (!matchesTitle && !matchesInstruction && !matchesItems && !matchesNotes) {
                    return false;
                }
            }
            
            return true;
        });
    }

    function renderStep(step, subStepsCollapseState) {
        const hasSubSteps = step.sub_steps && step.sub_steps.length > 0;
        // Default to collapsed (true) if not explicitly set to false
        const subStepsCollapsed = hasSubSteps ? (subStepsCollapseState[step.step_number] !== false) : false;
        
        return `
            <div class="step ${step.completed ? 'completed' : ''}" data-step="${step.step_number}">
                <div class="step-header" data-step="${step.step_number}">
                    <div class="step-header-left">
                        <input type="checkbox" class="step-checkbox" data-step="${step.step_number}" ${step.completed ? 'checked' : ''} />
                        <h3 class="step-title">${escapeHtml(step.step_title)}</h3>
                    </div>
                    <div class="step-header-right">
                        ${renderStepValue(step)}
                        <div class="step-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            ${formatTime(step.time_taken || 0)}
                        </div>
                    </div>
                </div>
                <div class="step-body">
                    <p class="step-instruction">${escapeHtml(step.step_instruction)}</p>
                    ${renderRequiredItems(step)}
                    ${renderNotes(step)}
                </div>
                ${hasSubSteps ? renderSubSteps(step, subStepsCollapsed) : ''}
            </div>
        `;
    }

    function renderStepValue(step) {
        const money = parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0);
        const isZero = money === 0;
        
        if (isZero) {
            return `
                <div class="step-value zero-value">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    ${formatMoney(money)}
                </div>
            `;
        } else {
            return `
                <div class="step-value">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    ${formatMoney(money)}
                </div>
            `;
        }
    }

    function renderRequiredItems(step) {
        if (!step.items || step.items.length === 0) return '';
        
        const requiredItemsCompleted = step.required_items_completed || [];
        
        return `
            <div class="required-items">
                <h4>Required Items</h4>
                <div class="required-items-list">
                    ${step.items.map((item, index) => {
                        const isCompleted = requiredItemsCompleted[index] || false;
                        return `
                            <div class="required-item ${isCompleted ? 'completed' : ''}" data-step="${step.step_number}" data-item-index="${index}">
                                <input type="checkbox" class="required-item-checkbox" data-step="${step.step_number}" data-item-index="${index}" ${isCompleted ? 'checked' : ''} />
                                <label class="required-item-label">${escapeHtml(item)}</label>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    function renderNotes(step) {
        const hasNote = step.notes && step.notes.trim();
        
        if (hasNote) {
            return `
                <div class="notes-section">
                    <div class="note-display">${escapeHtml(step.notes)}</div>
                    <textarea class="step-notes" placeholder="Add notes for this step..." style="display: none;" data-step="${step.step_number}">${escapeHtml(step.notes)}</textarea>
                </div>
            `;
        } else {
            return `
                <div class="notes-section">
                    <button class="add-note-btn" type="button" data-step="${step.step_number}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 5v14"></path>
                            <path d="M5 12h14"></path>
                        </svg>
                        Add Note
                    </button>
                    <textarea class="step-notes" placeholder="Add notes for this step..." style="display: none;" data-step="${step.step_number}">${escapeHtml(step.notes || '')}</textarea>
                </div>
            `;
        }
    }

    function renderSubSteps(step, isCollapsed) {
        const completedSubSteps = step.sub_steps.filter(subStep => subStep.completed).length;
        const totalSubSteps = step.sub_steps.length;
        const progressPercentage = totalSubSteps > 0 ? (completedSubSteps / totalSubSteps) * 100 : 0;

        return `
            <div class="sub-steps-container ${isCollapsed ? 'collapsed' : ''}" data-step="${step.step_number}">
                <div class="sub-steps-header">
                    <div class="sub-steps-header-left">
                        <h4>Sub-Tasks (${completedSubSteps}/${totalSubSteps})</h4>
                        <div class="sub-steps-progress">
                            <div class="sub-steps-progress-bar">
                                <div class="sub-steps-progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                    <button class="sub-steps-toggle-btn" type="button" aria-label="Toggle sub-steps">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="sub-steps-list">
                    ${step.sub_steps.map(subStep => renderSubStep(subStep)).join('')}
                </div>
            </div>
        `;
    }

    function renderSubStep(subStep) {
        return `
            <div class="sub-step ${subStep.completed ? 'completed' : ''}" data-sub-step="${subStep.sub_step_id}">
                <input type="checkbox" class="sub-step-checkbox" data-sub-step="${subStep.sub_step_id}" ${subStep.completed ? 'checked' : ''} />
                <div class="sub-step-content">
                    <h5 class="sub-step-title">${escapeHtml(subStep.sub_step_title || subStep.step_title || subStep.title || 'Untitled Sub-step')}</h5>
                    <p class="sub-step-instruction">${escapeHtml(subStep.sub_step_instruction || subStep.step_instruction || subStep.instruction || '')}</p>
                    <div class="sub-step-time">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        ${formatTime(subStep.time_taken || 0)}
                    </div>
                </div>
            </div>
        `;
    }

    function renderApp() {
        if (!elements.groupContainer) return;
        
        try {
            const html = renderChecklist(dataWithComputedValues, groupCollapseState, subStepsCollapseState, appState);
            elements.groupContainer.innerHTML = html;
            updateUI();
        } catch (error) {
            console.error('Rendering error:', error);
            elements.groupContainer.innerHTML = '<div class="error">Error rendering checklist</div>';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    //  EVENT HANDLERS
    // ==========================================

    function handleStepToggle(stepNumber) {
        console.log('Toggling step:', stepNumber);
        
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.completed = !step.completed;
                
                // If step has sub-steps, update them to match
                if (step.sub_steps && step.sub_steps.length > 0) {
                    step.sub_steps.forEach(subStep => {
                        subStep.completed = step.completed;
                    });
                }
                
                // If step has required items, update them to match
                if (step.items && step.items.length > 0) {
                    step.required_items_completed = step.items.map(() => step.completed);
                }
                
                break;
            }
        }
        
        saveProgress(dataWithComputedValues);
        renderApp();
    }

    function handleRequiredItemToggle(stepNumber, itemIndex) {
        console.log('Toggling required item:', stepNumber, itemIndex);
        
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step && step.items && step.items[itemIndex] !== undefined) {
                if (!step.required_items_completed) {
                    step.required_items_completed = new Array(step.items.length).fill(false);
                }
                
                step.required_items_completed[itemIndex] = !step.required_items_completed[itemIndex];
                
                // Check if all required items are completed
                const allItemsCompleted = step.required_items_completed.every(completed => completed);
                if (allItemsCompleted && !step.completed) {
                    // Optionally auto-complete step when all items are done
                    // step.completed = true;
                }
                
                break;
            }
        }
        
        saveProgress(dataWithComputedValues);
        renderApp();
    }

    function handleSubStepToggle(subStepId) {
        console.log('Toggling sub-step:', subStepId);
        
        const [stepNumber, subStepIndex] = subStepId.split('.').map(num => parseInt(num));
        
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step && step.sub_steps && step.sub_steps[subStepIndex - 1]) {
                step.sub_steps[subStepIndex - 1].completed = !step.sub_steps[subStepIndex - 1].completed;
                
                // Check if all sub-steps are completed
                const allSubStepsCompleted = step.sub_steps.every(subStep => subStep.completed);
                if (allSubStepsCompleted && !step.completed) {
                    // Optionally auto-complete step when all sub-steps are done
                    // step.completed = true;
                }
                
                break;
            }
        }
        
        saveProgress(dataWithComputedValues);
        renderApp();
    }

    function handleSubStepsToggle(stepNumber) {
        // Get current state - if undefined, treat as collapsed (true)
        const currentState = subStepsCollapseState[stepNumber];
        
        if (currentState === undefined) {
            // First time clicking - set to expanded (false)
            subStepsCollapseState[stepNumber] = false;
        } else {
            // Toggle existing state
            subStepsCollapseState[stepNumber] = !currentState;
        }
        
        saveSubStepsCollapseState();
        renderApp();
    }

    function handleGroupToggle(groupTitle) {
        groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
        saveGroupCollapseState();
        renderApp();
    }

    function handleToggleAllGroups() {
        const totalGroups = dataWithComputedValues.length;
        const collapsedGroups = dataWithComputedValues.filter(group => 
            groupCollapseState[group.group_title]
        ).length;
        
        // If more than half are collapsed, expand all; otherwise collapse all
        const shouldExpand = collapsedGroups > totalGroups / 2;
        
        dataWithComputedValues.forEach(group => {
            groupCollapseState[group.group_title] = !shouldExpand;
        });
        
        saveGroupCollapseState();
        renderApp();
        
        console.log(`Groups ${shouldExpand ? 'expanded' : 'collapsed'}`);
    }

    function handleToggleAllSubSteps() {
        // Get current DOM state for sub-steps containers
        const subStepsContainers = document.querySelectorAll('.sub-steps-container');
        const totalSubStepsContainers = subStepsContainers.length;
        
        if (totalSubStepsContainers === 0) return;
        
        const collapsedContainers = Array.from(subStepsContainers).filter(container => 
            container.classList.contains('collapsed')
        ).length;
        
        // If more than half are collapsed, expand all; otherwise collapse all
        const shouldExpand = collapsedContainers > totalSubStepsContainers / 2;
        
        // Update collapse state for all sub-steps containers
        dataWithComputedValues.forEach(group => {
            group.steps.forEach(step => {
                if (step.sub_steps && step.sub_steps.length > 0) {
                    subStepsCollapseState[step.step_number] = !shouldExpand;
                }
            });
        });
        
        saveSubStepsCollapseState();
        renderApp();
        
        console.log(`Sub-steps ${shouldExpand ? 'expanded' : 'collapsed'}`);
    }

    function handleSearch(searchTerm) {
        appState.searchTerm = searchTerm;
        renderApp();
    }

    function handleFilterChange(filter) {
        appState.currentFilter = filter;
        
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.getElementById(`filter-${filter}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        renderApp();
    }

    function handleNoteEdit(stepNumber, noteValue) {
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
                break;
            }
        }
        
        saveProgress(dataWithComputedValues);
        renderApp();
    }

    function handleThemeToggle() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.toggle('dark-mode', newTheme === 'dark');
        
        try {
            localStorage.setItem('checklistTheme', newTheme);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    }

    function handleReset() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    function bindEventListeners() {
        if (!elements.groupContainer) return;
        
        // Main container event delegation
        elements.groupContainer.addEventListener('click', (e) => {
            // Step header click (make whole header clickable)
            if (e.target.closest('.step-header') && !e.target.closest('.step-time') && !e.target.closest('.step-value')) {
                const stepHeader = e.target.closest('.step-header');
                const stepNumber = parseInt(stepHeader.dataset.step);
                handleStepToggle(stepNumber);
                return;
            }
            
            // Sub-step click (make whole sub-step clickable)
            if (e.target.closest('.sub-step') && !e.target.closest('.sub-step-time')) {
                const subStepEl = e.target.closest('.sub-step');
                const subStepId = subStepEl.dataset.subStep;
                handleSubStepToggle(subStepId);
                return;
            }
            
            // Required item click (make whole item clickable)
            if (e.target.closest('.required-item')) {
                const itemEl = e.target.closest('.required-item');
                const stepNumber = parseInt(itemEl.dataset.step);
                const itemIndex = parseInt(itemEl.dataset.itemIndex);
                handleRequiredItemToggle(stepNumber, itemIndex);
                return;
            }
            
            // Group header toggle (only if not clicking on checkbox)
            if (e.target.closest('.group-header')) {
                const groupHeader = e.target.closest('.group-header');
                const groupTitle = groupHeader.dataset.group;
                handleGroupToggle(groupTitle);
                return;
            }
            
            // Sub-steps toggle
            if (e.target.closest('.sub-steps-toggle-btn') || (e.target.closest('.sub-steps-header') && !e.target.closest('.sub-steps-toggle-btn'))) {
                e.stopPropagation();
                
                const subStepsContainer = e.target.closest('.sub-steps-container');
                if (subStepsContainer) {
                    const stepNumber = parseInt(subStepsContainer.dataset.step);
                    handleSubStepsToggle(stepNumber);
                }
                return;
            }
            
            // Add note button
            if (e.target.closest('.add-note-btn')) {
                const stepNumber = parseInt(e.target.closest('.add-note-btn').dataset.step);
                const step = e.target.closest('.step');
                const noteDisplay = step.querySelector('.note-display');
                const textarea = step.querySelector('.step-notes');
                const addBtn = step.querySelector('.add-note-btn');
                
                if (addBtn) addBtn.style.display = 'none';
                if (noteDisplay) noteDisplay.style.display = 'none';
                if (textarea) {
                    textarea.style.display = 'block';
                    textarea.focus();
                }
                return;
            }
            
            // Note display click to edit
            if (e.target.classList.contains('note-display')) {
                const step = e.target.closest('.step');
                const noteDisplay = step.querySelector('.note-display');
                const textarea = step.querySelector('.step-notes');
                
                if (noteDisplay) noteDisplay.style.display = 'none';
                if (textarea) {
                    textarea.style.display = 'block';
                    textarea.focus();
                }
                return;
            }
        });

        // Note editing - handle both blur and Enter key
        elements.groupContainer.addEventListener('blur', (e) => {
            if (e.target.classList.contains('step-notes')) {
                const stepNumber = parseInt(e.target.dataset.step);
                const noteValue = e.target.value.trim();
                
                handleNoteEdit(stepNumber, noteValue);
            }
        }, true);

        elements.groupContainer.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('step-notes') && e.key === 'Enter' && e.ctrlKey) {
                e.target.blur(); // Trigger blur event to save note
            }
        });

        // Footer toggle
        if (elements.footerToggle) {
            elements.footerToggle.addEventListener('click', toggleFooter);
        }

        // Search functionality
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                handleSearch(e.target.value);
                
                // Show/hide clear button
                if (elements.searchClear) {
                    elements.searchClear.style.opacity = e.target.value ? '1' : '0';
                }
            });
        }

        if (elements.searchClear) {
            elements.searchClear.addEventListener('click', () => {
                if (elements.searchInput) {
                    elements.searchInput.value = '';
                    handleSearch('');
                    elements.searchClear.style.opacity = '0';
                }
            });
        }

        // Filter functionality
        if (elements.filterAll) {
            elements.filterAll.addEventListener('click', () => handleFilterChange('all'));
        }
        if (elements.filterTodo) {
            elements.filterTodo.addEventListener('click', () => handleFilterChange('todo'));
        }
        if (elements.filterCompleted) {
            elements.filterCompleted.addEventListener('click', () => handleFilterChange('completed'));
        }

        // Toggle all groups button
        if (elements.toggleAllBtn) {
            elements.toggleAllBtn.addEventListener('click', handleToggleAllGroups);
        }

        // Toggle all sub-steps button
        if (elements.toggleSubStepsBtn) {
            elements.toggleSubStepsBtn.addEventListener('click', handleToggleAllSubSteps);
        }

        // Theme toggle
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', handleThemeToggle);
        }

        // Reset functionality
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', handleReset);
        }
    }

    // ==========================================
    //  THEME INITIALIZATION
    // ==========================================

    function initializeTheme() {
        try {
            const savedTheme = localStorage.getItem('checklistTheme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.body.classList.add('dark-mode');
            }
        } catch (error) {
            console.error('Failed to initialize theme:', error);
        }
    }

    // ==========================================
    //  APPLICATION INITIALIZATION
    // ==========================================

    async function init() {
        try {
            console.log('🚀 Initializing Interactive Checklist...');
            
            // Initialize theme first
            initializeTheme();
            
            // Load and process data
            dataWithComputedValues = await loadAndProcessData();
            
            // Load saved states
            groupCollapseState = loadGroupCollapseState();
            subStepsCollapseState = loadSubStepsCollapseState();
            footerCollapsed = loadFooterState();
            
            // Apply footer state
            if (elements.progressFooter) {
                elements.progressFooter.classList.toggle('collapsed', footerCollapsed);
            }
            
            // Merge saved progress
            const savedProgress = loadProgress();
            if (savedProgress) {
                // Merge saved progress with loaded data
                dataWithComputedValues.forEach(group => {
                    const savedGroup = savedProgress.find(sg => sg.group_title === group.group_title);
                    if (savedGroup) {
                        group.steps.forEach(step => {
                            const savedStep = savedGroup.steps?.find(ss => ss.step_number === step.step_number);
                            if (savedStep) {
                                step.completed = savedStep.completed || false;
                                step.notes = savedStep.notes || '';
                                step.required_items_completed = savedStep.required_items_completed || [];
                                
                                if (step.sub_steps && savedStep.sub_steps) {
                                    step.sub_steps.forEach(subStep => {
                                        const savedSubStep = savedStep.sub_steps.find(sss => sss.sub_step_id === subStep.sub_step_id);
                                        if (savedSubStep) {
                                            subStep.completed = savedSubStep.completed || false;
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
            
            // Bind events
            bindEventListeners();
            
            // Initial render
            renderApp();
            
            console.log('✅ Interactive Checklist initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize checklist:', error);
            if (elements.groupContainer) {
                elements.groupContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--c-danger);">
                        <h2>Failed to load checklist</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--c-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }

    // Start the application
    init();
});