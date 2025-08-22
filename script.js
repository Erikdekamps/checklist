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
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
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
                elements.progressText.textContent = 'Ready to start your checklist';
            } else if (globalStats.completion_percentage === 100) {
                elements.progressText.textContent = '🎉 Congratulations! All tasks completed!';
                elements.progressFooter?.classList.add('progress-complete');
            } else {
                elements.progressFooter?.classList.remove('progress-complete');
                if (globalStats.completion_percentage === 0) {
                    elements.progressText.textContent = 'Let\'s get started on your tasks';
                } else if (globalStats.completion_percentage < 25) {
                    elements.progressText.textContent = 'Great start! Keep going strong';
                } else if (globalStats.completion_percentage < 50) {
                    elements.progressText.textContent = 'Making good progress!';
                } else if (globalStats.completion_percentage < 75) {
                    elements.progressText.textContent = 'More than halfway there!';
                } else {
                    elements.progressText.textContent = 'Almost finished! You\'re doing great!';
                }
            }
        }
        
        // Update progress bar
        if (elements.progressBar) {
            elements.progressBar.style.width = `${globalStats.completion_percentage}%`;
        }
    }

    function toggleFooter() {
        footerCollapsed = !footerCollapsed;
        elements.progressFooter?.classList.toggle('collapsed', footerCollapsed);
        saveFooterState(footerCollapsed);
    }

    function updateUI() {
        updateFooterProgress();
        
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
                return ''; // Hide empty groups when searching
            }

            const completedSteps = group.steps.filter(step => step.completed).length;
            const totalSteps = group.steps.length;
            const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

            return `
                <div class="step-group ${isCollapsed ? 'collapsed' : ''}" data-group="${escapeHtml(group.group_title)}">
                    <div class="group-header" data-group="${escapeHtml(group.group_title)}">
                        <button class="group-collapse-btn" type="button">
                            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <h2 class="group-title">${escapeHtml(group.group_title)}</h2>
                        <div class="group-stats">
                            <span class="group-progress">${completedSteps}/${totalSteps} (${completionPercentage}%)</span>
                        </div>
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
                const titleMatch = step.step_title?.toLowerCase().includes(searchLower);
                const instructionMatch = step.step_instruction?.toLowerCase().includes(searchLower);
                const itemsMatch = step.items?.some(item => item.toLowerCase().includes(searchLower));
                
                if (!titleMatch && !instructionMatch && !itemsMatch) return false;
            }
            
            return true;
        });
    }

    function renderStep(step, subStepsCollapseState) {
        const hasSubSteps = step.sub_steps && step.sub_steps.length > 0;
        const subStepsCollapsed = hasSubSteps ? (subStepsCollapseState[step.step_number] !== false) : false;
        
        return `
            <div class="step ${step.completed ? 'completed' : ''}" data-step="${step.step_number}">
                <div class="step-header">
                    <div class="step-header-left">
                        <input type="checkbox" ${step.completed ? 'checked' : ''} />
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span class="value-text">Free</span>
                </div>
            `;
        } else {
            return `
                <div class="step-value money-value">
                    <div class="money-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        <span class="money-amount">${formatMoney(money)}</span>
                    </div>
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
                            <div class="required-item ${isCompleted ? 'completed' : ''}" data-item-index="${index}">
                                <input type="checkbox" ${isCompleted ? 'checked' : ''} />
                                <label>${escapeHtml(item)}</label>
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
                    <textarea class="step-notes" placeholder="Add your notes here...">${escapeHtml(step.notes)}</textarea>
                </div>
            `;
        } else {
            return `
                <div class="notes-section">
                    <button class="add-note-btn" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Add Note
                    </button>
                    <textarea class="step-notes" placeholder="Add your notes here..."></textarea>
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
                    <button class="sub-steps-toggle-btn" type="button">
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
                <input type="checkbox" class="sub-step-checkbox" ${subStep.completed ? 'checked' : ''} />
                <div class="sub-step-content">
                    <h5 class="sub-step-title">${escapeHtml(subStep.step_title)}</h5>
                    <p class="sub-step-instruction">${escapeHtml(subStep.step_instruction)}</p>
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
            console.error('Error rendering app:', error);
            elements.groupContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error loading checklist</h3>
                    <p>${error.message}</p>
                </div>
            `;
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
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.completed = !step.completed;
                saveProgress(dataWithComputedValues);
                renderApp();
                break;
            }
        }
    }

    function handleRequiredItemToggle(stepNumber, itemIndex) {
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                if (!step.required_items_completed) {
                    step.required_items_completed = new Array(step.items ? step.items.length : 0).fill(false);
                }
                
                if (itemIndex >= 0 && itemIndex < step.required_items_completed.length) {
                    step.required_items_completed[itemIndex] = !step.required_items_completed[itemIndex];
                    saveProgress(dataWithComputedValues);
                    renderApp();
                }
                break;
            }
        }
    }

    function handleSubStepToggle(subStepId) {
        const [stepNumber, subStepIndex] = subStepId.split('.').map(num => parseInt(num));
        
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step && step.sub_steps) {
                const subStep = step.sub_steps.find(ss => ss.sub_step_id === subStepId);
                if (subStep) {
                    subStep.completed = !subStep.completed;
                    saveProgress(dataWithComputedValues);
                    renderApp();
                    break;
                }
            }
        }
    }

    function handleSubStepsToggle(stepNumber) {
        const currentState = subStepsCollapseState[stepNumber];
        subStepsCollapseState[stepNumber] = currentState === false ? true : false;
        
        const container = document.querySelector(`[data-step="${stepNumber}"].sub-steps-container`);
        if (container) {
            container.classList.toggle('collapsed', subStepsCollapseState[stepNumber]);
        }
    }

    function handleGroupToggle(groupTitle) {
        groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
        renderApp();
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
                saveProgress(dataWithComputedValues);
                break;
            }
        }
    }

    function handleThemeToggle() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.toggle('dark-mode', newTheme === 'dark');
        
        try {
            localStorage.setItem('checklistTheme', newTheme);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    }

    function handleReset() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            localStorage.removeItem('checklistProgress');
            localStorage.removeItem('footerCollapsed');
            groupCollapseState = {};
            subStepsCollapseState = {};
            footerCollapsed = false;
            appState = { currentFilter: 'all', searchTerm: '' };
            
            if (elements.searchInput) {
                elements.searchInput.value = '';
            }
            
            init();
        }
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    function bindEventListeners() {
        if (!elements.groupContainer) return;
        
        // Main container event delegation
        elements.groupContainer.addEventListener('click', (e) => {
            const stepElement = e.target.closest('.step');
            const groupHeader = e.target.closest('.group-header');
            const subStepElement = e.target.closest('.sub-step');
            const subStepsHeader = e.target.closest('.sub-steps-header');
            const requiredItemElement = e.target.closest('.required-item');

            // Handle required item clicks
            if (requiredItemElement && !subStepElement && !subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const stepNumber = parseInt(stepElement.dataset.step);
                const itemIndex = parseInt(requiredItemElement.dataset.itemIndex);
                handleRequiredItemToggle(stepNumber, itemIndex);
                return;
            }

            // Handle sub-step clicks
            if (subStepElement && !subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const subStepId = subStepElement.dataset.subStep;
                handleSubStepToggle(subStepId);
                return;
            }

            // Handle sub-steps header clicks
            if (subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const stepNumber = parseInt(subStepsHeader.closest('.sub-steps-container').dataset.step);
                handleSubStepsToggle(stepNumber);
                return;
            }

            // Handle group header clicks
            if (groupHeader && !stepElement) {
                e.preventDefault();
                const groupTitle = groupHeader.dataset.group;
                handleGroupToggle(groupTitle);
                return;
            }

            // Handle step clicks
            if (stepElement && !subStepElement && !subStepsHeader && !requiredItemElement) {
                e.preventDefault();
                const stepNumber = parseInt(stepElement.dataset.step);
                handleStepToggle(stepNumber);
            }
        });

        // Note editing
        elements.groupContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('note-display') || e.target.classList.contains('add-note-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const stepElement = e.target.closest('.step');
                if (stepElement) {
                    stepElement.classList.add('is-editing-note');
                    const textarea = stepElement.querySelector('.step-notes');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }
        });

        elements.groupContainer.addEventListener('blur', (e) => {
            if (e.target.classList.contains('step-notes')) {
                const stepElement = e.target.closest('.step');
                if (stepElement) {
                    stepElement.classList.remove('is-editing-note');
                    const stepNumber = parseInt(stepElement.dataset.step);
                    const noteValue = e.target.value.trim();
                    handleNoteEdit(stepNumber, noteValue);
                    renderApp();
                }
            }
        }, true);

        // Footer toggle
        if (elements.footerToggle) {
            elements.footerToggle.addEventListener('click', toggleFooter);
        }

        // Search functionality
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                handleSearch(e.target.value);
            });
        }

        if (elements.searchClear) {
            elements.searchClear.addEventListener('click', () => {
                elements.searchInput.value = '';
                handleSearch('');
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
            const userPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme) {
                document.body.classList.toggle('dark-mode', savedTheme === 'dark');
            } else if (userPrefersDark) {
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
            console.log('🚀 Initializing Interactive Checklist Application v2.5.0...');
            
            // Initialize theme
            initializeTheme();

            // Load footer state
            footerCollapsed = loadFooterState();
            if (elements.progressFooter) {
                elements.progressFooter.classList.toggle('collapsed', footerCollapsed);
            }

            // Load data
            const freshData = await loadAndProcessData();
            const savedProgress = loadProgress();
            
            // Merge saved progress with fresh data
            if (savedProgress) {
                dataWithComputedValues = freshData.map(group => {
                    const savedGroup = savedProgress.find(sg => sg.group_title === group.group_title);
                    
                    return {
                        ...group,
                        steps: group.steps.map(step => {
                            const savedStep = savedGroup?.steps?.find(ss => ss.step_number === step.step_number);
                            
                            if (savedStep) {
                                return {
                                    ...step,
                                    completed: savedStep.completed || false,
                                    notes: savedStep.notes || '',
                                    required_items_completed: savedStep.required_items_completed || [],
                                    sub_steps: step.sub_steps ? step.sub_steps.map(subStep => {
                                        const savedSubStep = savedStep.sub_steps?.find(sss => sss.sub_step_id === subStep.sub_step_id);
                                        return {
                                            ...subStep,
                                            completed: savedSubStep?.completed || false
                                        };
                                    }) : []
                                };
                            }
                            
                            return {
                                ...step,
                                completed: false,
                                notes: '',
                                required_items_completed: step.items ? new Array(step.items.length).fill(false) : []
                            };
                        })
                    };
                });
            } else {
                dataWithComputedValues = freshData.map(group => ({
                    ...group,
                    steps: group.steps.map(step => ({
                        ...step,
                        completed: false,
                        notes: '',
                        required_items_completed: step.items ? new Array(step.items.length).fill(false) : []
                    }))
                }));
            }

            // Render UI
            renderApp();

            // Bind event listeners
            bindEventListeners();

            console.log('✅ Application initialized successfully');

        } catch (error) {
            console.error('❌ Critical error during initialization:', error);
            
            if (elements.groupContainer) {
                elements.groupContainer.innerHTML = `
                    <div class="error-message">
                        <h3>Failed to load checklist</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Reload Page</button>
                    </div>
                `;
            }
        }
    }

    // Start the application
    init();
});