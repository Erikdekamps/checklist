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
    let headerCollapsed = false;
    let filter = 'all';
    let searchTerm = '';
    let debounceSaveTimeout;

    const el = {
        container: document.getElementById('group-container'),
        progressBar: document.querySelector('.progress-fill'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        headerToggle: document.getElementById('header-toggle'),
        header: document.querySelector('header'),
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
        resetBtn: document.getElementById('reset-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeModalBtn: document.querySelector('.close-modal-btn'),
        dataUrlInput: document.getElementById('data-url-input'),
        dataUrlReset: document.getElementById('data-url-reset'),
        dataUrlSave: document.getElementById('data-url-save'),
        urlTab: document.getElementById('url-tab'),
        pasteTab: document.getElementById('paste-tab'),
        urlInputContainer: document.getElementById('url-input-container'),
        pasteInputContainer: document.getElementById('paste-input-container'),
        dataJsonInput: document.getElementById('data-json-input'),
        dataJsonReset: document.getElementById('data-json-reset'),
        dataSourceSave: document.getElementById('data-source-save'),
        toastNotification: document.getElementById('toast-notification'),
        toastMessage: document.getElementById('toast-message')
    };

    let dataUrl = '';  // The custom data URL if provided
    let toastTimeout; // To track the toast timeout

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
     * Formats number as US currency without the currency symbol
     * @param {number|string} amount - Money amount
     * @returns {string} Formatted number string
     */
    const formatMoney = amount => {
        // Handle string inputs (remove any existing dollar signs or formatting)
        if (typeof amount === 'string') {
            // Extract just the numeric part
            amount = parseFloat(amount.replace(/[^0-9.]/g, '') || 0);
        }
        
        // Format as number with thousand separators but no currency symbol
        return new Intl.NumberFormat('en-US', {
            style: 'decimal', 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
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

    /**
     * Shows a toast notification
     * @param {string} message - Message to show in the toast
     * @param {number} duration - How long to show the toast in ms
     */
    function showToast(message = 'Progress saved', duration = 2000) {
        if (!el.toastNotification) return;
        
        // Clear any existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        // Set message
        if (el.toastMessage) {
            el.toastMessage.textContent = message;
        }
        
        // Show the toast
        el.toastNotification.classList.add('show');
        
        // Hide after duration
        toastTimeout = setTimeout(() => {
            el.toastNotification.classList.remove('show');
        }, duration);
    }

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
        showToast('Progress saved');
    }, 500);

    // ==========================================
    //  DATA MANAGEMENT
    // ==========================================

    /**
     * Loads data from JSON file (local or remote)
     * @param {string} [dataUrl] - Optional URL to fetch data from
     * @returns {Promise<Array>} Processed data array
     */
    async function loadData(dataUrl) {
        let url = dataUrl || './data.json'; // Default to local file if no URL provided
        
        try {
            const response = await fetch(url);
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
        } catch (error) {
            console.error(`Failed to load data from ${url}:`, error);
            throw error;
        }
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
        
        if (el.progressBar) {
            el.progressBar.style.width = `${stats.percentage}%`;
        }
        
        if (el.progressPercentage) {
            el.progressPercentage.textContent = `${stats.percentage}%`;
        }
        
        if (el.progressText) {
            el.progressText.textContent = `${stats.completedSteps} of ${stats.totalSteps} tasks completed`;
        }
        
        if (el.totalTime) {
            el.totalTime.textContent = formatTime(stats.totalTime);
        }
        
        if (el.totalMoney) {
            el.totalMoney.textContent = formatMoney(stats.totalMoney);
        }
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
                
                return titleMatch || instructionMatch || itemsMatch || subStepsMatch;
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
                <!-- Card Header -->
                <div class="step-card-header" data-step="${step.step_number}">
                    <div class="step-header-left">
                        <div class="step-checkbox-container">
                            <input type="checkbox" class="step-checkbox" ${step.completed ? 'checked' : ''} 
                                  aria-label="${step.completed ? 'Mark as incomplete' : 'Mark as complete'}"/>
                        </div>
                        <h3 class="step-title">${escapeHtml(step.step_title)}</h3>
                    </div>
                    <div class="step-metadata">
                        <div class="step-value ${money === 0 ? 'zero-value' : ''}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${formatMoney(money)}
                        </div>
                        <div class="step-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            ${formatTime(step.time_taken || 0)}
                        </div>
                    </div>
                </div>
                
                <!-- Card Content -->
                <div class="step-card-content">
                    ${renderRequiredItems(step, requiredItems)}
                    <p class="step-instruction">${escapeHtml(step.step_instruction)}</p>
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
                <h4>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    Required Items
                </h4>
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
                        <h4 class="sub-steps-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sub-Tasks (${completedSubSteps}/${totalSubSteps})
                        </h4>
                        <div class="sub-steps-progress">
                            <div class="sub-steps-progress-bar">
                                <div class="sub-steps-progress-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        <button class="sub-steps-toggle-btn" aria-label="${collapsed ? 'Expand' : 'Collapse'} sub-steps">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                    </div>
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
                <div class="sub-step-checkbox-wrapper">
                    <input type="checkbox" 
                           class="sub-step-checkbox" 
                           ${subStep.completed ? 'checked' : ''} 
                           aria-label="${subStep.completed ? 'Mark as incomplete' : 'Mark as complete'}"/>
                </div>
                <div class="sub-step-content">
                    <div class="sub-step-header">
                        <h5 class="sub-step-title">${escapeHtml(subStep.sub_step_title || subStep.step_title || subStep.title || 'Untitled')}</h5>
                        <div class="sub-step-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            ${formatTime(subStep.time_taken || 0)}
                        </div>
                    </div>
                    <p class="sub-step-instruction">${escapeHtml(subStep.sub_step_instruction || subStep.step_instruction || subStep.instruction || '')}</p>
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
                
                // Save progress immediately
                debounceSaveProgress();
                
                // If filter is active and completion state changes, we need to re-render
                // to hide tasks that no longer match the filter
                if ((filter === 'todo' && step.completed) || 
                    (filter === 'completed' && !step.completed)) {
                    render(); // Full re-render to apply filters
                    updateProgressUI();
                    return;
                }
                
                // For other cases, just update the UI without full re-render
                updateStepUI(stepNumber, step.completed);
                updateProgressUI();
                
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
                
                // Track if parent step completion changed
                let parentCompletionChanged = false;
                
                // Auto-update parent step if all sub-steps share the same state
                if (allCompleted && !step.completed) {
                    step.completed = true;
                    updateStepUI(stepNumber, true);
                    parentCompletionChanged = true;
                } else if (allIncomplete && step.completed) {
                    step.completed = false;
                    updateStepUI(stepNumber, false);
                    parentCompletionChanged = true;
                }
                
                // If filter is active and parent completion changed, re-render
                if ((filter === 'todo' && step.completed && parentCompletionChanged) || 
                    (filter === 'completed' && !step.completed && parentCompletionChanged)) {
                    render(); // Full re-render to apply filters
                    updateProgressUI();
                    debounceSaveProgress();
                    return;
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
                
                // Track if parent step completion changed
                let parentCompletionChanged = false;
                
                // Auto-update parent step if all items share the same state and no sub-steps
                const hasSubSteps = step.sub_steps && step.sub_steps.length > 0;
                if (!hasSubSteps) {
                    if (allCompleted && !step.completed) {
                        step.completed = true;
                        updateStepUI(stepNumber, true);
                        parentCompletionChanged = true;
                    } else if (allIncomplete && step.completed) {
                        step.completed = false;
                        updateStepUI(stepNumber, false);
                        parentCompletionChanged = true;
                    }
                }
                
                // If filter is active and parent completion changed, re-render
                if ((filter === 'todo' && step.completed && parentCompletionChanged) || 
                    (filter === 'completed' && !step.completed && parentCompletionChanged)) {
                    render(); // Full re-render to apply filters
                    updateProgressUI();
                    debounceSaveProgress();
                    return;
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
     * Toggles header collapse state
     */
    function toggleHeader() {
        headerCollapsed = !headerCollapsed;
        if (el.header) {
            el.header.classList.toggle('collapsed', headerCollapsed);
        }
        document.body.classList.toggle('header-collapsed', headerCollapsed);
        
        // Update toggle button icon
        if (el.headerToggle) {
            el.headerToggle.innerHTML = headerCollapsed ? 
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' : // Down arrow when collapsed
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>'; // Up arrow when expanded
        }
        
        // Save state
        store.save('headerCollapsed', headerCollapsed);
    }

    // ==========================================
    //  BIND EVENTS
    // ==========================================
    
    /**
     * Binds all event listeners
     */
    function bindEvents() {
        if (!el.container) return;

        // Click handler for container - handles multiple interactions
        el.container.addEventListener('click', e => {
            // Step header - make whole header clickable except time/value
            if (e.target.closest('.step-card-header') && !e.target.closest('.step-time, .step-value')) {
                const stepNumber = parseInt(e.target.closest('.step-card-header').dataset.step);
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
        });

        // Header toggle
        el.headerToggle?.addEventListener('click', toggleHeader);
        
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

        // Settings button
        el.settingsBtn?.addEventListener('click', openSettingsModal);

        // Close modal button
        el.closeModalBtn?.addEventListener('click', closeSettingsModal);

        // Close modal on outside click
        el.settingsModal?.addEventListener('click', e => {
            if (e.target === el.settingsModal) {
                closeSettingsModal();
            }
        });

        // Source tab buttons
        el.urlTab?.addEventListener('click', () => switchSourceTab('url'));
        el.pasteTab?.addEventListener('click', () => switchSourceTab('paste'));

        // Data JSON reset button
        el.dataJsonReset?.addEventListener('click', resetJsonInput);
    }

    /**
     * Bind additional event listeners for the settings modal
     */
    function bindSettingsEvents() {
        // Save button in settings modal
        document.getElementById('settings-save')?.addEventListener('click', saveDataSource);
        
        // Cancel button in settings modal
        document.getElementById('settings-cancel')?.addEventListener('click', closeSettingsModal);
    }

    // ==========================================
    //  INITIALIZATION
    // ==========================================
    
    /**
     * Initialize the application
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

            // Load data URL preference
            dataUrl = store.load('checklistDataUrl') || '';
            if (dataUrl && el.dataUrlInput) {
                el.dataUrlInput.value = dataUrl;
            }

            // Check for stored JSON text data
            const storedJsonData = store.load('checklistJsonData');
            if (storedJsonData && el.dataJsonInput) {
                el.dataJsonInput.value = storedJsonData;
            }

            // Load data from JSON (local or remote)
            let rawData;
            if (storedJsonData) {
                try {
                    rawData = await loadJsonFromText(storedJsonData);
                    console.log(`Loaded ${rawData.length} groups from pasted JSON`);
                    // Add this line to show toast:
                    showToast(`Successfully loaded ${rawData.length} task groups`, 2000);
                } catch (error) {
                    console.error('Failed to load from stored JSON data, falling back to URL or default');
                    // Fall back to URL or default data.json
                    rawData = await loadData(dataUrl);
                }
            } else {
                // Load data from URL (local or remote)
                rawData = await loadData(dataUrl);
                console.log(`Loaded ${rawData.length} groups from ${dataUrl || 'data.json'}`);
            }

            // Load saved states
            groupCollapsed = store.load('groupCollapseState') || {};
            subStepsCollapsed = store.load('subStepsCollapseState') || {};
            filter = store.load('checklistFilter') || 'all';
            searchTerm = store.load('checklistSearchTerm') || '';

            // Set search input value if saved
            if (searchTerm && el.searchInput) {
                el.searchInput.value = searchTerm;
            }

            // Load saved progress and merge with data
            const savedProgress = store.load('checklistProgress');
            data = savedProgress ? mergeProgress(rawData, savedProgress) : rawData;
            
            // Load header collapsed state
            headerCollapsed = store.load('headerCollapsed') || false;
            
            // Set initial state for header
            if (el.header) {
                el.header.classList.toggle('collapsed', headerCollapsed);
            }
            
            document.body.classList.toggle('header-collapsed', headerCollapsed);
            
            // Set initial icon state for toggle button
            if (el.headerToggle) {
                el.headerToggle.innerHTML = headerCollapsed ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>';
                
                // Make sure toggle button is visible
                el.headerToggle.style.display = 'flex';
            }

            // Bind all events
            bindEvents();
            bindSettingsEvents();
            render();
            
            // Ensure progress is displayed properly on initial load
            setTimeout(() => updateProgressUI(), 100);
            
            console.log('Checklist initialization complete');

        } catch (error) {
            console.error('Failed to initialize:', error);
            
            if (el.container) {
                el.container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--color-danger);">
                        <h2>Failed to load checklist</h2>
                        <p>${error.message}</p>
                        ${dataUrl ? `<p>Failed to load from URL: ${dataUrl}</p>` : ''}
                        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                            <button onclick="location.reload()" 
                                    style="padding: 0.5rem 1rem; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                                Try Again
                            </button>
                            ${dataUrl ? `
                            <button onclick="localStorage.removeItem('checklistDataUrl'); location.reload()" 
                                    style="padding: 0.5rem 1rem; background: var(--color-warning); color: white; border: none; border-radius: 8px; cursor: pointer;">
                                Use Default Data
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Start the application
    init();

    // Add these functions before the bindEvents function

    /**
     * Toggles all groups between expanded and collapsed states
     */
    function toggleAllGroups() {
        const action = el.toggleAllBtn?.getAttribute('data-action') || 'expand';
        const shouldExpand = action === 'expand';
        
        // Update all groups
        data.forEach(group => {
            groupCollapsed[group.group_title] = !shouldExpand;
        });
        
        // Update all DOM elements
        document.querySelectorAll('.step-group').forEach(group => {
            group.classList.toggle('collapsed', !shouldExpand);
        });
        
        // Save state
        store.save('groupCollapseState', groupCollapsed);
        updateButtonStates();
    }

    /**
     * Toggles all sub-steps between expanded and collapsed states
     */
    function toggleAllSubSteps() {
        const action = el.toggleSubStepsBtn?.getAttribute('data-action') || 'expand';
        const shouldExpand = action === 'expand';
        
        // Get all steps with sub-steps
        const stepsWithSubSteps = data.flatMap(group => 
            group.steps.filter(step => step.sub_steps?.length > 0)
        );
        
        // Update all sub-steps collapse state
        stepsWithSubSteps.forEach(step => {
            subStepsCollapsed[step.step_number] = !shouldExpand;
        });
        
        // Update all DOM elements
        document.querySelectorAll('.sub-steps-container').forEach(container => {
            container.classList.toggle('collapsed', !shouldExpand);
        });
        
        // Save state
        store.save('subStepsCollapseState', subStepsCollapsed);
        updateButtonStates();
    }

    /**
     * Loads JSON data from a text string
     * @param {string} jsonText - The JSON text to parse
     * @returns {Promise<Array>} Processed data array
     */
    function loadJsonFromText(jsonText) {
        try {
            const rawData = JSON.parse(jsonText);
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
        } catch (error) {
            console.error('Failed to parse JSON text:', error);
            throw new Error('Invalid JSON data format');
        }
    }

    /**
     * Toggles theme between light and dark mode
     */
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        store.save('checklistTheme', isDark ? 'dark' : 'light');
    }

    /**
     * Resets all progress and application data
     */
    function resetProgress() {
        if (confirm('Are you sure you want to reset ALL data? This will clear your progress, settings, filters, and custom data. This cannot be undone.')) {
            // Clear all localStorage data
            store.clear();
            
            // Show confirmation
            showToast('All data reset successfully. Reloading...', 1500);
            
            // Wait a moment to show the message before reloading
            setTimeout(() => {
                location.reload();
            }, 1500);
        }
    }

    /**
     * Opens the settings modal
     */
    function openSettingsModal() {
        if (el.settingsModal) {
            el.settingsModal.classList.add('active');
            
            // Load any saved JSON data
            const storedJsonData = store.load('checklistJsonData');
            if (storedJsonData && el.dataJsonInput) {
                el.dataJsonInput.value = storedJsonData;
            }
        }
    }

    /**
     * Closes the settings modal
     */
    function closeSettingsModal() {
        if (el.settingsModal) {
            el.settingsModal.classList.remove('active');
        }
    }

    /**
     * Switches between URL and paste tabs in settings
     * @param {string} tabName - Tab to switch to ('url' or 'paste')
     */
    function switchSourceTab(tabName) {
        if (!el.urlTab || !el.pasteTab || !el.urlInputContainer || !el.pasteInputContainer) return;
        
        if (tabName === 'url') {
            el.urlTab.classList.add('active');
            el.pasteTab.classList.remove('active');
            el.urlInputContainer.style.display = 'block';
            el.pasteInputContainer.style.display = 'none';
        } else {
            el.urlTab.classList.remove('active');
            el.pasteTab.classList.add('active');
            el.urlInputContainer.style.display = 'none';
            el.pasteInputContainer.style.display = 'block';
        }
    }

    /**
     * Resets JSON input to default
     */
    function resetJsonInput() {
        if (confirm('Reset to default JSON data? This will remove any custom data you\'ve entered.')) {
            if (el.dataJsonInput) el.dataJsonInput.value = '';
            store.remove('checklistJsonData');
        }
    }

    /**
     * Sets filter mode
     * @param {string} newFilter - Filter mode to set
     */
    function setFilter(newFilter) {
        filter = newFilter;
        store.save('checklistFilter', filter);
        render();
        updateProgressUI();
    }

    /**
     * Sets search term
     * @param {string} term - Search term
     */
    function setSearchTerm(term) {
        searchTerm = term.trim();
        store.save('checklistSearchTerm', searchTerm);
        render();
    }

    /**
     * Saves data source (only JSON data now)
     */
    function saveDataSource() {
        // Save JSON data
        const jsonData = el.dataJsonInput?.value.trim() || '';
        
        if (!jsonData) {
            showToast('Please enter valid JSON data', 3000);
            return;
        }
        
        try {
            // Try to parse the JSON to validate it
            JSON.parse(jsonData);
            
            // Save to localStorage
            store.save('checklistJsonData', jsonData);
            store.remove('checklistDataUrl'); // Clear any stored URL
            
            // Show success message before reload
            showToast('JSON data saved! Loading new data...', 1500);
            
            // Wait a moment to show the message before reloading
            setTimeout(() => {
                location.reload();
            }, 1500);
            
        } catch (error) {
            // Show error if invalid JSON
            showToast('Invalid JSON format. Please check your data.', 4000);
            console.error('Invalid JSON:', error);
        }
    }
});