/**
 * @fileoverview Interactive Checklist Application
 * @description A streamlined checklist management system with nested task support
 * @version 3.1.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    //  STATE & ELEMENTS
    // ==========================================
    
    let data = [];
    let groupCollapsed = {};
    let subStepsCollapsed = {};
    let footerCollapsed = false;
    let filter = 'all';
    let searchTerm = '';
    let debounceSaveTimeout;

    const el = {
        container: document.getElementById('group-container'),
        progressFooter: document.getElementById('progress-footer'),
        footerToggle: document.getElementById('footer-toggle'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressBar: document.querySelector('.progress-fill'),
        progressStat: document.getElementById('progress-stat'),
        totalTime: document.getElementById('total-time'),
        totalMoney: document.getElementById('total-money'),
        searchInput: document.getElementById('search-input'),
        searchClear: document.getElementById('search-clear'),
        filterAll: document.getElementById('filter-all'),
        filterTodo: document.getElementById('filter-todo'),
        filterCompleted: document.getElementById('filter-completed'),
        toggleAllBtn: document.getElementById('toggle-all-btn'),
        toggleSubStepsBtn: document.getElementById('toggle-substeps-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        resetBtn: document.getElementById('reset-btn')
    };

    // ==========================================
    //  UTILITIES
    // ==========================================

    /**
     * Formats minutes into readable time format
     * @param {number} minutes - Time in minutes
     * @returns {string} Formatted time string
     */
    const formatTime = minutes => {
        if (!minutes) return '0m';
        return minutes < 60 ? 
            `${minutes}m` : 
            `${Math.floor(minutes/60)}h${minutes%60 ? ` ${minutes%60}m` : ''}`;
    };

    /**
     * Formats number as US currency
     * @param {number} amount - Money amount
     * @returns {string} Formatted currency string
     */
    const formatMoney = amount => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', 
            currency: 'USD', 
            minimumFractionDigits: 0
        }).format(amount);
    };
    
    /**
     * Escapes HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    const escapeHtml = text => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * Creates a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    };

    // ==========================================
    //  STORAGE FUNCTIONS
    // ==========================================

    const store = {
        /**
         * Saves data to localStorage with error handling
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         */
        save: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Failed to save ${key} to localStorage:`, error);
            }
        },
        
        /**
         * Loads data from localStorage with error handling
         * @param {string} key - Storage key
         * @returns {*} Retrieved data or null if not found/error
         */
        load: key => {
            try { 
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) { 
                console.error(`Failed to load ${key} from localStorage:`, error);
                return null; 
            }
        },
        
        /**
         * Removes a key from localStorage with error handling
         * @param {string} key - Storage key to remove
         */
        remove: key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error(`Failed to remove ${key} from localStorage:`, error);
            }
        },
        
        /**
         * Clear all localStorage data with error handling
         */
        clear: () => {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('Failed to clear localStorage:', error);
            }
        }
    };

    // Debounced function for saving progress data
    const debounceSaveProgress = debounce(() => {
        store.save('checklistProgress', data);
    }, 500);

    // ==========================================
    //  DATA MANAGEMENT
    // ==========================================

    /**
     * Loads data from JSON file and structures it
     * @returns {Promise<Array>} Processed data array
     */
    async function loadData() {
        const response = await fetch('./data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawData = await response.json();
        let stepNum = 1;
        
        return rawData.map(group => ({
            ...group,
            steps: group.steps.map(step => ({
                ...step,
                step_number: stepNum++,
                sub_steps: step.sub_steps ? step.sub_steps.map((sub, i) => ({
                    ...sub,
                    sub_step_id: `${stepNum - 1}.${i + 1}`,
                    completed: sub.completed || false
                })) : [],
                required_items_completed: step.items ? new Array(step.items.length).fill(false) : []
            }))
        }));
    }

    /**
     * Merges saved progress with the loaded data
     * @param {Array} loadedData - Fresh data from JSON
     * @param {Array} savedData - Saved progress data from localStorage
     * @returns {Array} Merged data
     */
    function mergeProgress(loadedData, savedData) {
        if (!savedData || !Array.isArray(savedData)) return loadedData;
        
        return loadedData.map(group => {
            const savedGroup = savedData.find(sg => sg.group_title === group.group_title);
            if (!savedGroup) return group;
            
            return {
                ...group,
                steps: group.steps.map(step => {
                    const savedStep = savedGroup.steps?.find(ss => ss.step_number === step.step_number);
                    if (!savedStep) return step;
                    
                    // Merge step data
                    const mergedStep = {
                        ...step,
                        completed: savedStep.completed || false,
                        notes: savedStep.notes || '',
                        required_items_completed: savedStep.required_items_completed || step.required_items_completed
                    };
                    
                    // Merge sub-steps if they exist
                    if (step.sub_steps && savedStep.sub_steps) {
                        mergedStep.sub_steps = step.sub_steps.map(subStep => {
                            const savedSubStep = savedStep.sub_steps.find(
                                ss => ss.sub_step_id === subStep.sub_step_id
                            );
                            return savedSubStep ? {
                                ...subStep,
                                completed: savedSubStep.completed || false
                            } : subStep;
                        });
                    }
                    
                    return mergedStep;
                })
            };
        });
    }

    /**
     * Computes statistics for the checklist
     * @returns {Object} Statistics object
     */
    function computeStats() {
        const totalSteps = data.reduce((sum, group) => sum + group.steps.length, 0);
        const completedSteps = data.reduce((sum, group) => 
            sum + group.steps.filter(s => s.completed).length, 0);
        const totalTime = data.reduce((sum, group) => 
            sum + group.steps.reduce((s, step) => s + (step.time_taken || 0), 0), 0);
        const totalMoney = data.reduce((sum, group) => 
            sum + group.steps.reduce((s, step) => 
                s + parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0), 0), 0);
        
        return {
            totalSteps,
            completedSteps,
            percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            totalTime,
            totalMoney
        };
    }

    /**
     * Recalculates sub-steps progress for a step
     * @param {number} stepNumber - Step number to update
     * @returns {Object|null} Updated progress or null if step not found
     */
    function calculateSubStepsProgress(stepNumber) {
        const step = data.flatMap(group => group.steps)
            .find(s => s.step_number === stepNumber);
        
        if (!step?.sub_steps?.length) return null;

        const completed = step.sub_steps.filter(s => s.completed).length;
        const total = step.sub_steps.length;
        const percentage = total > 0 ? Math.round((completed / total * 100)) : 0;
        
        return { completed, total, percentage };
    }

    // ==========================================
    //  TARGETED UPDATE FUNCTIONS
    // ==========================================

    /**
     * Updates a sub-step's UI elements
     * @param {string} subStepId - Sub-step ID
     * @param {boolean} completed - Completion status
     */
    function updateSubStepUI(subStepId, completed) {
        const subStepElement = document.querySelector(`[data-sub-step="${subStepId}"]`);
        if (!subStepElement) return;
        
        const checkbox = subStepElement.querySelector('.sub-step-checkbox');
        if (checkbox) checkbox.checked = completed;
        
        subStepElement.classList.toggle('completed', completed);
    }

    /**
     * Updates sub-steps progress display
     * @param {number} stepNumber - Parent step number
     */
    function updateSubStepsProgress(stepNumber) {
        const progress = calculateSubStepsProgress(stepNumber);
        if (!progress) return;

        const container = document.querySelector(`[data-step="${stepNumber}"] .sub-steps-container`);
        if (!container) return;

        // Update progress bar
        const progressFill = container.querySelector('.sub-steps-progress-fill');
        if (progressFill) progressFill.style.width = `${progress.percentage}%`;

        // Update counter
        const header = container.querySelector('.sub-steps-header h4');
        if (header) header.textContent = `Sub-Tasks (${progress.completed}/${progress.total})`;
    }

    /**
     * Updates a step's UI elements
     * @param {number} stepNumber - Step number
     * @param {boolean} completed - Completion status
     */
    function updateStepUI(stepNumber, completed) {
        const stepElement = document.querySelector(`[data-step="${stepNumber}"]`);
        if (!stepElement) return;
        
        // Update checkbox and class
        const checkbox = stepElement.querySelector('.step-checkbox');
        if (checkbox) checkbox.checked = completed;
        stepElement.classList.toggle('completed', completed);

        // Update all sub-steps if they exist
        const subSteps = stepElement.querySelectorAll('.sub-step');
        subSteps.forEach(subStep => {
            const subCheckbox = subStep.querySelector('.sub-step-checkbox');
            if (subCheckbox) subCheckbox.checked = completed;
            subStep.classList.toggle('completed', completed);
        });

        // Update required items
        const requiredItems = stepElement.querySelectorAll('.required-item');
        requiredItems.forEach(item => {
            const itemCheckbox = item.querySelector('.required-item-checkbox');
            if (itemCheckbox) itemCheckbox.checked = completed;
            item.classList.toggle('completed', completed);
        });

        // Update sub-steps progress
        updateSubStepsProgress(stepNumber);
    }

    /**
     * Updates a required item's UI elements
     * @param {number} stepNumber - Parent step number
     * @param {number} itemIndex - Item index
     * @param {boolean} completed - Completion status
     */
    function updateRequiredItemUI(stepNumber, itemIndex, completed) {
        const itemElement = document.querySelector(
            `.required-item[data-step="${stepNumber}"][data-item-index="${itemIndex}"]`
        );
        if (!itemElement) return;
        
        const checkbox = itemElement.querySelector('.required-item-checkbox');
        if (checkbox) checkbox.checked = completed;
        itemElement.classList.toggle('completed', completed);
    }

    /**
     * Updates progress UI elements
     */
    function updateProgressUI() {
        const stats = computeStats();
        
        // Update stats display
        if (el.progressStat) el.progressStat.textContent = `${stats.completedSteps}/${stats.totalSteps}`;
        if (el.totalTime) el.totalTime.textContent = formatTime(stats.totalTime);
        if (el.totalMoney) el.totalMoney.textContent = formatMoney(stats.totalMoney);
        if (el.progressPercentage) el.progressPercentage.textContent = `${stats.percentage}%`;
        if (el.progressBar) el.progressBar.style.width = `${stats.percentage}%`;
        
        // Update progress message
        if (el.progressText) {
            if (stats.totalSteps === 0) {
                el.progressText.textContent = "No steps available";
            } else if (stats.completedSteps === stats.totalSteps) {
                el.progressText.textContent = "All steps completed! 🎉";
            } else {
                el.progressText.textContent = `${stats.completedSteps} of ${stats.totalSteps} steps completed`;
            }
        }

        // Update group stats
        data.forEach(group => {
            const completed = group.steps.filter(s => s.completed).length;
            const total = group.steps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            const groupElement = document.querySelector(`[data-group="${group.group_title}"]`);
            if (groupElement) {
                const statsElement = groupElement.querySelector('.group-stats');
                if (statsElement) {
                    statsElement.textContent = `${completed}/${total} (${percentage}%)`;
                }
            }
        });
    }

    /**
     * Updates button states based on current application state
     */
    function updateButtonStates() {
        // Update toggle all groups button
        if (el.toggleAllBtn) {
            const collapsed = data.filter(g => groupCollapsed[g.group_title]).length;
            const shouldExpand = collapsed > data.length / 2;
            const text = el.toggleAllBtn.querySelector('.button-text');
            if (text) text.textContent = shouldExpand ? 'Expand All' : 'Collapse All';
            el.toggleAllBtn.setAttribute('data-action', shouldExpand ? 'expand' : 'collapse');
        }

        // Update toggle sub-steps button
        if (el.toggleSubStepsBtn) {
            const containers = document.querySelectorAll('.sub-steps-container');
            if (containers.length === 0) {
                el.toggleSubStepsBtn.style.display = 'none';
            } else {
                el.toggleSubStepsBtn.style.display = 'flex';
                const collapsed = Array.from(containers).filter(c => c.classList.contains('collapsed')).length;
                const shouldExpand = collapsed > containers.length / 2;
                const text = el.toggleSubStepsBtn.querySelector('.button-text');
                if (text) text.textContent = shouldExpand ? 'Expand Sub-Steps' : 'Collapse Sub-Steps';
                el.toggleSubStepsBtn.setAttribute('data-action', shouldExpand ? 'expand' : 'collapse');
            }
        }

        // Update search clear button
        if (el.searchClear) {
            el.searchClear.style.opacity = searchTerm ? '1' : '0';
        }

        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (filter === 'all' && el.filterAll) el.filterAll.classList.add('active');
        if (filter === 'todo' && el.filterTodo) el.filterTodo.classList.add('active');
        if (filter === 'completed' && el.filterCompleted) el.filterCompleted.classList.add('active');
    }

    // ==========================================
    //  RENDERING
    // ==========================================

    /**
     * Filters steps based on current filter and search
     * @param {Array} steps - Steps to filter
     * @returns {Array} Filtered steps
     */
    function filterSteps(steps) {
        return steps.filter(step => {
            // Filter by completion state
            if (filter === 'completed' && !step.completed) return false;
            if (filter === 'todo' && step.completed) return false;
            
            // Filter by search term
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                
                // Check main step content
                const titleMatch = step.step_title?.toLowerCase().includes(search);
                const instructionMatch = step.step_instruction?.toLowerCase().includes(search);
                const notesMatch = step.notes?.toLowerCase().includes(search);
                
                // Check required items
                const itemsMatch = step.items?.some(item => 
                    item?.toLowerCase().includes(search)
                );
                
                // Check sub-steps
                const subStepsMatch = step.sub_steps?.some(subStep => {
                    const subTitle = subStep.sub_step_title || subStep.step_title || subStep.title;
                    const subInstruction = subStep.sub_step_instruction || subStep.step_instruction || subStep.instruction;
                    
                    return (subTitle && subTitle.toLowerCase().includes(search)) || 
                           (subInstruction && subInstruction.toLowerCase().includes(search));
                });
                
                return titleMatch || instructionMatch || notesMatch || itemsMatch || subStepsMatch;
            }
            return true;
        });
    }

    /**
     * Renders a single step
     * @param {Object} step - Step data
     * @returns {string} HTML for the step
     */
    function renderStep(step) {
        const hasSubSteps = step.sub_steps?.length > 0;
        const subCollapsed = hasSubSteps ? (subStepsCollapsed[step.step_number] !== false) : false;
        const money = parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0);
        const requiredItems = step.required_items_completed || [];

        return `
            <div class="step ${step.completed ? 'completed' : ''}" data-step="${step.step_number}">
                <div class="step-header" data-step="${step.step_number}">
                    <div class="step-header-left">
                        <input type="checkbox" class="step-checkbox" ${step.completed ? 'checked' : ''} 
                               aria-label="${step.completed ? 'Mark as incomplete' : 'Mark as complete'}"/>
                        <h3 class="step-title">${escapeHtml(step.step_title)}</h3>
                    </div>
                    <div class="step-header-right">
                        <div class="step-value ${money === 0 ? 'zero-value' : ''}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${formatMoney(money)}
                        </div>
                        <div class="step-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            ${formatTime(step.time_taken || 0)}
                        </div>
                    </div>
                </div>
                <div class="step-body">
                    <p class="step-instruction">${escapeHtml(step.step_instruction)}</p>
                    ${renderRequiredItems(step, requiredItems)}
                    ${renderNotes(step)}
                    ${hasSubSteps ? renderSubSteps(step, subCollapsed) : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Renders required items section
     * @param {Object} step - Step data
     * @param {Array} completedItems - Array of completed items
     * @returns {string} HTML for required items
     */
    function renderRequiredItems(step, completedItems) {
        if (!step.items?.length) return '';
        
        return `
            <div class="required-items">
                <h4>Required Items</h4>
                <div class="required-items-list">
                    ${step.items.map((item, i) => `
                        <div class="required-item ${completedItems[i] ? 'completed' : ''}" 
                             data-step="${step.step_number}" 
                             data-item-index="${i}">
                            <input type="checkbox" 
                                   class="required-item-checkbox" 
                                   ${completedItems[i] ? 'checked' : ''} 
                                   aria-label="${completedItems[i] ? 'Mark as not required' : 'Mark as required'}"/>
                            <label class="required-item-label">${escapeHtml(item)}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Renders notes section
     * @param {Object} step - Step data
     * @returns {string} HTML for notes section
     */
    function renderNotes(step) {
        return `
            <div class="notes-section">
                ${step.notes?.trim() ? `
                    <div class="note-display">${escapeHtml(step.notes)}</div>
                    <textarea class="step-notes" style="display: none;" 
                              data-step="${step.step_number}">${escapeHtml(step.notes)}</textarea>
                ` : `
                    <button class="add-note-btn" data-step="${step.step_number}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14"></path><path d="M5 12h14"></path>
                        </svg>
                        Add Note
                    </button>
                    <textarea class="step-notes" style="display: none;" data-step="${step.step_number}"></textarea>
                `}
            </div>
        `;
    }
    
    /**
     * Renders sub-steps section
     * @param {Object} step - Step data
     * @param {boolean} collapsed - Whether section is collapsed
     * @returns {string} HTML for sub-steps
     */
    function renderSubSteps(step, collapsed) {
        const completedSubSteps = step.sub_steps.filter(s => s.completed).length;
        const totalSubSteps = step.sub_steps.length;
        const percentage = totalSubSteps > 0 ? 
            Math.round((completedSubSteps / totalSubSteps) * 100) : 0;
        
        return `
            <div class="sub-steps-container ${collapsed ? 'collapsed' : ''}" data-step="${step.step_number}">
                <div class="sub-steps-header">
                    <div class="sub-steps-header-left">
                        <h4>Sub-Tasks (${completedSubSteps}/${totalSubSteps})</h4>
                        <div class="sub-steps-progress">
                            <div class="sub-steps-progress-bar">
                                <div class="sub-steps-progress-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    </div>
                    <button class="sub-steps-toggle-btn" aria-label="${collapsed ? 'Expand' : 'Collapse'} sub-steps">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="sub-steps-list">
                    ${step.sub_steps.map(renderSubStep).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Renders a single sub-step
     * @param {Object} subStep - Sub-step data
     * @returns {string} HTML for sub-step
     */
    function renderSubStep(subStep) {
        return `
            <div class="sub-step ${subStep.completed ? 'completed' : ''}" data-sub-step="${subStep.sub_step_id}">
                <input type="checkbox" 
                       class="sub-step-checkbox" 
                       ${subStep.completed ? 'checked' : ''} 
                       aria-label="${subStep.completed ? 'Mark as incomplete' : 'Mark as complete'}"/>
                <div class="sub-step-content">
                    <h5 class="sub-step-title">${escapeHtml(subStep.sub_step_title || subStep.step_title || subStep.title || 'Untitled')}</h5>
                    <p class="sub-step-instruction">${escapeHtml(subStep.sub_step_instruction || subStep.step_instruction || subStep.instruction || '')}</p>
                    <div class="sub-step-time">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        ${formatTime(subStep.time_taken || 0)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renders the entire checklist
     */
    function render() {
        if (!el.container) return;

        const html = data.map(group => {
            const collapsed = groupCollapsed[group.group_title] || false;
            const filtered = filterSteps(group.steps);
            
            // Skip empty groups when searching
            if (filtered.length === 0 && searchTerm) return '';

            const completed = group.steps.filter(s => s.completed).length;
            const total = group.steps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            return `
                <div class="step-group ${collapsed ? 'collapsed' : ''}">
                    <div class="group-header" data-group="${escapeHtml(group.group_title)}">
                        <button class="group-collapse-btn" aria-label="${collapsed ? 'Expand' : 'Collapse'} group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                            </svg>
                        </button>
                        <span class="group-title">${escapeHtml(group.group_title)}</span>
                        <span class="group-stats">${completed}/${total} (${percentage}%)</span>
                    </div>
                    <div class="group-body">
                        ${filtered.map(renderStep).join('')}
                    </div>
                </div>
            `;
        }).join('');

        el.container.innerHTML = html;
        updateButtonStates();
    }

    // ==========================================
    //  EVENT HANDLERS
    // ==========================================

    /**
     * Toggles step completion state
     * @param {number} stepNumber - Step number to toggle
     */
    function toggleStep(stepNumber) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.completed = !step.completed;
                
                // Update sub-steps to match parent
                if (step.sub_steps) {
                    step.sub_steps.forEach(sub => sub.completed = step.completed);
                }
                
                // Update required items to match parent
                if (step.items) {
                    step.required_items_completed = step.items.map(() => step.completed);
                }
                
                // Update UI without full re-render
                updateStepUI(stepNumber, step.completed);
                updateProgressUI();
                
                debounceSaveProgress();
                return;
            }
        }
    }

    /**
     * Toggles sub-step completion state
     * @param {string} subStepId - Sub-step ID to toggle
     */
    function toggleSubStep(subStepId) {
        const [stepNumber, subIndex] = subStepId.split('.').map(Number);
        
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step?.sub_steps?.[subIndex - 1]) {
                const subStep = step.sub_steps[subIndex - 1];
                subStep.completed = !subStep.completed;
                
                // Check if all sub-steps share the same state
                const allCompleted = step.sub_steps.every(s => s.completed);
                const allIncomplete = step.sub_steps.every(s => !s.completed);
                
                // Auto-update parent step if all sub-steps share the same state
                if (allCompleted && !step.completed) {
                    step.completed = true;
                    updateStepUI(stepNumber, true);
                } else if (allIncomplete && step.completed) {
                    step.completed = false;
                    updateStepUI(stepNumber, false);
                }
                
                // Update UI without full re-render
                updateSubStepUI(subStepId, subStep.completed);
                updateSubStepsProgress(stepNumber);
                updateProgressUI();
                
                debounceSaveProgress();
                return;
            }
        }
    }

    /**
     * Toggles required item completion state
     * @param {number} stepNumber - Parent step number
     * @param {number} itemIndex - Item index to toggle
     */
    function toggleRequiredItem(stepNumber, itemIndex) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step?.items?.[itemIndex] !== undefined) {
                // Initialize if needed
                if (!step.required_items_completed) {
                    step.required_items_completed = new Array(step.items.length).fill(false);
                }
                
                // Toggle the item
                step.required_items_completed[itemIndex] = !step.required_items_completed[itemIndex];
                
                // Check if all items share the same state
                const allCompleted = step.required_items_completed.every(item => item);
                const allIncomplete = step.required_items_completed.every(item => !item);
                
                // Auto-update parent step if all items share the same state and no sub-steps
                const hasSubSteps = step.sub_steps && step.sub_steps.length > 0;
                if (!hasSubSteps) {
                    if (allCompleted && !step.completed) {
                        step.completed = true;
                        updateStepUI(stepNumber, true);
                    } else if (allIncomplete && step.completed) {
                        step.completed = false;
                        updateStepUI(stepNumber, false);
                    }
                }
                
                // Update UI without full re-render
                updateRequiredItemUI(stepNumber, itemIndex, step.required_items_completed[itemIndex]);
                updateProgressUI();
                
                debounceSaveProgress();
                return;
            }
        }
    }

    /**
     * Toggles sub-steps container collapse state
     * @param {number} stepNumber - Step number
     */
    function toggleSubSteps(stepNumber) {
        subStepsCollapsed[stepNumber] = subStepsCollapsed[stepNumber] === undefined ? 
            true : !subStepsCollapsed[stepNumber];
        
        // Toggle the collapsed class with smooth animation
        const container = document.querySelector(`[data-step="${stepNumber}"] .sub-steps-container`);
        if (container) {
            container.classList.toggle('collapsed', subStepsCollapsed[stepNumber]);
        }
        
        store.save('subStepsCollapseState', subStepsCollapsed);
        updateButtonStates();
    }

    /**
     * Toggles group collapse state
     * @param {string} groupTitle - Group title
     */
    function toggleGroup(groupTitle) {
        groupCollapsed[groupTitle] = !groupCollapsed[groupTitle];
        
        // Toggle the collapsed class with smooth animation
        const groupElement = document.querySelector(`[data-group="${groupTitle}"]`).closest('.step-group');
        if (groupElement) {
            groupElement.classList.toggle('collapsed', groupCollapsed[groupTitle]);
        }
        
        store.save('groupCollapseState', groupCollapsed);
        updateButtonStates();
    }

    /**
     * Updates note content for a step
     * @param {number} stepNumber - Step number
     * @param {string} noteValue - New note content
     */
    function editNote(stepNumber, noteValue) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
                break;
            }
        }
        debounceSaveProgress();
        render(); // Full render to properly display updated notes
    }

    /**
     * Toggles footer collapse state
     */
    function toggleFooter() {
        footerCollapsed = !footerCollapsed;
        el.progressFooter?.classList.toggle('collapsed', footerCollapsed);
        store.save('footerCollapsed', footerCollapsed);
    }

    /**
     * Toggles all groups collapse state
     */
    function toggleAllGroups() {
        const collapsed = data.filter(g => groupCollapsed[g.group_title]).length;
        const shouldExpand = collapsed > data.length / 2;
        
        data.forEach(group => {
            groupCollapsed[group.group_title] = !shouldExpand;
        });
        
        store.save('groupCollapseState', groupCollapsed);
        render();
    }

    /**
     * Toggles all sub-steps collapse state
     */
    function toggleAllSubSteps() {
        const containers = document.querySelectorAll('.sub-steps-container');
        if (containers.length === 0) return;
        
        const collapsed = Array.from(containers).filter(c => c.classList.contains('collapsed')).length;
        const shouldExpand = collapsed > containers.length / 2;
        
        data.forEach(group => {
            group.steps.forEach(step => {
                if (step.sub_steps?.length) {
                    subStepsCollapsed[step.step_number] = !shouldExpand;
                }
            });
        });
        
        store.save('subStepsCollapseState', subStepsCollapsed);
        render();
    }

    /**
     * Sets the current filter
     * @param {string} newFilter - Filter to set ('all', 'todo', 'completed')
     */
    function setFilter(newFilter) {
        filter = newFilter;
        store.save('checklistFilter', filter);
        render();
    }

    /**
     * Updates search term
     * @param {string} term - Search term
     */
    function setSearchTerm(term) {
        searchTerm = term;
        store.save('checklistSearchTerm', searchTerm);
        render();
    }

    /**
     * Toggles theme between light and dark
     */
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        store.save('checklistTheme', isDark ? 'dark' : 'light');
    }

    /**
     * Resets all progress data
     */
    function resetProgress() {
        if (confirm('Reset all progress? This cannot be undone.')) {
            store.clear();
            location.reload();
        }
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    /**
     * Binds event listeners to elements
     */
    function bindEvents() {
        if (!el.container) return;

        // Click handler for container - handles multiple interactions
        el.container.addEventListener('click', e => {
            // Step header - make whole header clickable except time/value
            if (e.target.closest('.step-header') && !e.target.closest('.step-time, .step-value')) {
                const stepNumber = parseInt(e.target.closest('.step-header').dataset.step);
                toggleStep(stepNumber);
                return;
            }

            // Sub-step - make whole sub-step clickable except time
            if (e.target.closest('.sub-step') && !e.target.closest('.sub-step-time')) {
                const subStepId = e.target.closest('.sub-step').dataset.subStep;
                toggleSubStep(subStepId);
                return;
            }

            // Required item - make whole item clickable
            if (e.target.closest('.required-item')) {
                const item = e.target.closest('.required-item');
                toggleRequiredItem(parseInt(item.dataset.step), parseInt(item.dataset.itemIndex));
                return;
            }

            // Group header - toggle collapse
            if (e.target.closest('.group-header')) {
                const groupTitle = e.target.closest('.group-header').dataset.group;
                toggleGroup(groupTitle);
                return;
            }

            // Sub-steps toggle - toggle collapse
            if (e.target.closest('.sub-steps-header')) {
                e.stopPropagation();
                const stepNumber = parseInt(e.target.closest('.sub-steps-container').dataset.step);
                toggleSubSteps(stepNumber);
                return;
            }

            // Add note - show textarea
            if (e.target.closest('.add-note-btn')) {
                const step = e.target.closest('.step');
                const textarea = step.querySelector('.step-notes');
                const addBtn = step.querySelector('.add-note-btn');
                addBtn.style.display = 'none';
                textarea.style.display = 'block';
                textarea.focus();
                return;
            }

            // Edit note - show textarea
            if (e.target.classList.contains('note-display')) {
                const step = e.target.closest('.step');
                const noteDisplay = step.querySelector('.note-display');
                const textarea = step.querySelector('.step-notes');
                noteDisplay.style.display = 'none';
                textarea.style.display = 'block';
                textarea.focus();
                return;
            }
        });

        // Note editing - handle blur event
        el.container.addEventListener('blur', e => {
            if (e.target.classList.contains('step-notes')) {
                const stepNumber = parseInt(e.target.dataset.step);
                editNote(stepNumber, e.target.value.trim());
            }
        }, true);

        // Note editing - handle keyboard shortcuts
        el.container.addEventListener('keydown', e => {
            if (e.target.classList.contains('step-notes') && e.key === 'Enter' && e.ctrlKey) {
                e.target.blur(); // Save on Ctrl+Enter
            }
        });

        // Footer toggle
        el.footerToggle?.addEventListener('click', toggleFooter);

        // Search input
        el.searchInput?.addEventListener('input', e => {
            setSearchTerm(e.target.value);
        });

        // Clear search
        el.searchClear?.addEventListener('click', () => {
            if (el.searchInput) el.searchInput.value = '';
            setSearchTerm('');
        });

        // Filter buttons
        el.filterAll?.addEventListener('click', () => setFilter('all'));
        el.filterTodo?.addEventListener('click', () => setFilter('todo'));
        el.filterCompleted?.addEventListener('click', () => setFilter('completed'));

        // Toggle all groups button
        el.toggleAllBtn?.addEventListener('click', toggleAllGroups);

        // Toggle all sub-steps button
        el.toggleSubStepsBtn?.addEventListener('click', toggleAllSubSteps);

        // Theme toggle button
        el.themeToggle?.addEventListener('click', toggleTheme);

        // Reset button
        el.resetBtn?.addEventListener('click', resetProgress);
    }

    // ==========================================
    //  INITIALIZATION
    // ==========================================

    /**
     * Initializes the application
     */
    async function init() {
        try {
            console.log('Initializing checklist application...');
            
            // Load theme before any rendering
            const savedTheme = store.load('checklistTheme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.body.classList.add('dark-mode');
            }

            // Load data from JSON
            const rawData = await loadData();
            console.log(`Loaded ${rawData.length} groups from data.json`);

            // Load saved states
            groupCollapsed = store.load('groupCollapseState') || {};
            subStepsCollapsed = store.load('subStepsCollapseState') || {};
            footerCollapsed = store.load('footerCollapsed') || false;
            filter = store.load('checklistFilter') || 'all';
            searchTerm = store.load('checklistSearchTerm') || '';

            // Set search input value if saved
            if (searchTerm && el.searchInput) {
                el.searchInput.value = searchTerm;
            }

            // Apply footer state
            if (el.progressFooter) {
                el.progressFooter.classList.toggle('collapsed', footerCollapsed);
            }

            // Load saved progress and merge with data
            const savedProgress = store.load('checklistProgress');
            data = savedProgress ? mergeProgress(rawData, savedProgress) : rawData;
            
            // Bind events and render
            bindEvents();
            render();
            
            console.log('Checklist initialization complete');

        } catch (error) {
            console.error('Failed to initialize:', error);
            
            if (el.container) {
                el.container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--c-danger);">
                        <h2>Failed to load checklist</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" 
                                style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--c-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
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