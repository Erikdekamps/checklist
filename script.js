/**
 * @fileoverview Interactive Checklist Application
 * @description A comprehensive checklist management system with collapsible groups,
 * real-time progress tracking, theme switching, search functionality, and persistent storage.
 * 
 * Features:
 * - Collapsible step groups with smooth animations
 * - Real-time note taking with auto-save to localStorage
 * - Progress tracking with visual indicators and statistics
 * - Dark/light theme support with system preference detection
 * - Advanced search and filter functionality
 * - Persistent state management using localStorage
 * - Responsive design for all screen sizes
 * - Accessibility features and keyboard navigation
 * 
 * LocalStorage Keys Used:
 * - 'checklistProgress': Stores step completion status and notes
 * - 'checklistTheme': Stores user's theme preference ('light' or 'dark')
 * - 'checklistFilter': Stores active filter state ('all', 'incomplete', 'completed')
 * - 'checklistGroupState': Stores collapse/expand state of each group
 * 
 * Data Flow:
 * 1. Load base data from data.json
 * 2. Merge with saved progress from localStorage
 * 3. Process data to add computed values (cumulative time)
 * 4. Render UI components
 * 5. Bind event listeners for user interactions
 * 6. Save state changes back to localStorage
 * 
 * @author Interactive Checklist Team
 * @version 2.0.0
 * @created 2024
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE & CONSTANTS
    // ==========================================

    /**
     * Main application data store
     * Contains processed checklist data with computed values
     * @type {Array<Object>}
     */
    let dataWithComputedValues = [];

    /**
     * Current active filter state
     * @type {'all'|'incomplete'|'completed'}
     */
    let currentFilter = 'all';

    /**
     * Group collapse state management
     * Maps group titles to their collapse state (true = collapsed, false = expanded)
     * @type {Object<string, boolean>}
     */
    let groupCollapseState = {};

    // ==========================================
    //  DOM ELEMENT REFERENCES
    // ==========================================

    /**
     * Main container for all step groups
     * @type {HTMLElement}
     */
    const groupContainer = document.getElementById('group-container');

    /**
     * Search input element
     * @type {HTMLInputElement}
     */
    const searchInput = document.getElementById('searchInput');

    /**
     * Search clear button
     * @type {HTMLButtonElement}
     */
    const searchClear = document.getElementById('search-clear');

    /**
     * Statistics display elements
     */
    const totalTimeElement = document.getElementById('total-time');
    const totalCostElement = document.getElementById('total-cost');
    const progressStatElement = document.getElementById('progress-stat');

    /**
     * Theme toggle button
     * @type {HTMLButtonElement}
     */
    const themeToggle = document.getElementById('theme-toggle');

    /**
     * Progress footer elements
     */
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');

    /**
     * Filter control buttons
     * @type {Object<string, HTMLButtonElement>}
     */
    const filterControls = {
        all: document.getElementById('filter-all'),
        incomplete: document.getElementById('filter-incomplete'),
        completed: document.getElementById('filter-completed')
    };

    /**
     * Filter count display elements
     * @type {Object<string, HTMLElement>}
     */
    const filterCounts = {
        all: document.getElementById('filter-all-count'),
        incomplete: document.getElementById('filter-incomplete-count'),
        completed: document.getElementById('filter-completed-count')
    };

    /**
     * Action buttons
     */
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const focusIncompleteBtn = document.getElementById('focus-incomplete-btn');
    const resetBtn = document.getElementById('reset-btn');

    // ==========================================
    //  UTILITY FUNCTIONS
    // ==========================================

    /**
     * Formats time in minutes to human-readable format
     * @param {number} totalMinutes - Total minutes to format
     * @returns {string} Formatted time string (e.g., "2h 30m" or "45m")
     */
    function formatTime(totalMinutes) {
        if (totalMinutes < 0) return "0m";
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let timeString = "";
        
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours === 0) timeString += `${minutes}m`;
        
        return timeString.trim();
    }

    /**
     * Formats currency amount using locale-specific formatting
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Parses currency string to numeric value
     * @param {string} moneyString - Currency string to parse (e.g., "$123.45")
     * @returns {number} Numeric value
     */
    function parseCurrency(moneyString) {
        if (!moneyString) return 0;
        return parseFloat(moneyString.replace(/[$,]/g, '')) || 0;
    }

    /**
     * Validates data structure to ensure it meets expected format
     * @param {any} data - Data to validate
     * @returns {boolean} True if data is valid
     */
    function validateDataStructure(data) {
        if (!Array.isArray(data)) return false;
        
        return data.every(group => 
            group &&
            typeof group.group_title === 'string' &&
            Array.isArray(group.steps) &&
            group.steps.every(step => 
                step &&
                typeof step.step_number !== 'undefined' &&
                typeof step.step_title === 'string' &&
                typeof step.step_instruction === 'string' &&
                Array.isArray(step.items)
            )
        );
    }

    // ==========================================
    //  DATA PERSISTENCE MANAGEMENT
    // ==========================================

    /**
     * Saves progress data to localStorage with error handling
     * @param {Array<Object>} dataToSave - Checklist data to save
     */
    function saveProgress(dataToSave) {
        try {
            // Validate data before saving
            if (!validateDataStructure(dataToSave)) {
                throw new Error('Invalid data structure cannot be saved');
            }
            
            const serializedData = JSON.stringify(dataToSave);
            localStorage.setItem('checklistProgress', serializedData);
        } catch (error) {
            console.error('Failed to save progress to localStorage:', error);
            // Could implement fallback storage or user notification here
        }
    }

    /**
     * Saves individual note to localStorage immediately
     * @param {string|number} stepNumber - Step identifier
     * @param {string} noteValue - Note content to save
     */
    function saveNoteToStorage(stepNumber, noteValue) {
        // Find and update the step in memory
        dataWithComputedValues.forEach(group => {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
                
                // Prepare data for storage (remove computed values)
                const dataToSave = dataWithComputedValues.map(g => ({ 
                    ...g, 
                    steps: g.steps.map(({ cumulative_time, ...rest }) => rest) 
                }));
                
                saveProgress(dataToSave);
            }
        });
    }

    /**
     * Merges base checklist data with saved progress from localStorage
     * @param {Array<Object>} baseData - Original checklist data from data.json
     * @param {Array<Object>|null} savedData - Saved progress data from localStorage
     * @returns {Array<Object>} Merged data with preserved progress
     */
    function mergeWithSavedProgress(baseData, savedData) {
        if (!savedData || !Array.isArray(savedData)) {
            // No saved data, return base data with default values
            return baseData.map(group => ({
                ...group,
                steps: group.steps.map(step => ({
                    ...step,
                    completed: false,
                    notes: ""
                }))
            }));
        }

        // Create lookup map for saved step data for efficient merging
        const savedStepsMap = new Map();
        savedData.forEach(group => {
            if (group.steps && Array.isArray(group.steps)) {
                group.steps.forEach(step => {
                    if (step.step_number) {
                        savedStepsMap.set(step.step_number, {
                            completed: Boolean(step.completed),
                            notes: step.notes || ""
                        });
                    }
                });
            }
        });

        // Merge saved progress with base data
        return baseData.map(group => ({
            ...group,
            steps: group.steps.map(step => {
                const savedStep = savedStepsMap.get(step.step_number);
                return {
                    ...step,
                    completed: savedStep?.completed || false,
                    notes: savedStep?.notes || ""
                };
            })
        }));
    }

    /**
     * Loads base checklist data from data.json with retry mechanism
     * @returns {Promise<Array<Object>>} Base checklist data
     * @throws {Error} If data cannot be loaded after all retries
     */
    async function loadBaseData() {
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Add cache busting to prevent stale data
                const response = await fetch('data.json?' + Date.now());
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Validate loaded data
                if (!validateDataStructure(data)) {
                    throw new Error('Invalid data format: expected valid checklist structure');
                }

                return data;

            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    // Exponential backoff for retries
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to load data.json after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Loads and processes all checklist data
     * Combines base data with saved progress and adds computed values
     */
    async function loadAndProcessData() {
        try {
            // Load base data from data.json
            const baseData = await loadBaseData();

            // Load saved progress from localStorage
            let parsedSavedData = null;
            const savedData = localStorage.getItem('checklistProgress');
            
            if (savedData) {
                try {
                    parsedSavedData = JSON.parse(savedData);
                    
                    // Validate saved data structure
                    if (!validateDataStructure(parsedSavedData)) {
                        throw new Error('Saved data structure is invalid');
                    }
                } catch (error) {
                    console.error("Invalid saved data detected, clearing:", error);
                    localStorage.removeItem('checklistProgress');
                    parsedSavedData = null;
                }
            }

            // Merge base data with saved progress
            const mergedData = mergeWithSavedProgress(baseData, parsedSavedData);

            // Process merged data to add computed values
            let runningTotal = 0;
            dataWithComputedValues = mergedData.map(group => {
                // Initialize group collapse state if not already set
                if (groupCollapseState[group.group_title] === undefined) {
                    groupCollapseState[group.group_title] = false; // Default to expanded
                }
                
                const processedSteps = group.steps.map(step => {
                    const time = Number(step.time_taken) || 0;
                    runningTotal += time;
                    return { 
                        ...step,
                        cumulative_time: runningTotal 
                    };
                });
                
                return { ...group, steps: processedSteps };
            });

            const totalSteps = dataWithComputedValues.flatMap(g => g.steps).length;
            
            if (totalSteps === 0) {
                throw new Error('No steps found in processed data');
            }

        } catch (error) {
            console.error('Critical error in loadAndProcessData:', error);
            
            // Show user-friendly error message
            if (groupContainer) {
                groupContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--c-danger);">
                        <h2>Failed to Load Checklist</h2>
                        <p>Error: ${error.message}</p>
                        <button onclick="location.reload()" style="
                            background: var(--c-primary); 
                            color: white; 
                            border: none; 
                            padding: 12px 24px; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            margin-top: 16px;
                        ">Retry</button>
                    </div>`;
            }
            
            throw error;
        }
    }

    // ==========================================
    //  THEME & UI STATE MANAGEMENT
    // ==========================================

    /**
     * Applies theme to the application
     * @param {'light'|'dark'} theme - Theme to apply
     */
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('checklistTheme', theme);
    }

    /**
     * Initializes UI state from localStorage and system preferences
     */
    function initializeUIState() {
        // Initialize theme
        const savedTheme = localStorage.getItem('checklistTheme');
        const userPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (userPrefersDark) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }

        // Initialize filter state
        const savedFilter = localStorage.getItem('checklistFilter');
        currentFilter = savedFilter || 'all';
        updateActiveFilterButton();

        // Initialize group collapse state
        const savedCollapseState = localStorage.getItem('checklistGroupState');
        try {
            if (savedCollapseState) {
                const parsedState = JSON.parse(savedCollapseState);
                // Validate that all values are boolean
                const isValid = Object.values(parsedState).every(val => typeof val === 'boolean');
                if (isValid) {
                    groupCollapseState = parsedState;
                } else {
                    throw new Error('Invalid collapse state format');
                }
            } else {
                groupCollapseState = {}; // Will be initialized when data loads
            }
        } catch (error) {
            console.error('Failed to parse group collapse state:', error);
            groupCollapseState = {};
            localStorage.removeItem('checklistGroupState');
        }
    }

    /**
     * Updates the active filter button visual state
     */
    function updateActiveFilterButton() {
        Object.values(filterControls).forEach(button => button?.classList.remove('active'));
        if (filterControls[currentFilter]) {
            filterControls[currentFilter].classList.add('active');
        }
    }

    /**
     * Updates filter count badges with current statistics
     */
    function updateFilterCounts() {
        const allSteps = dataWithComputedValues.flatMap(group => group.steps);
        const completedSteps = allSteps.filter(step => step.completed);
        const incompleteSteps = allSteps.filter(step => !step.completed);

        if (filterCounts.all) filterCounts.all.textContent = allSteps.length;
        if (filterCounts.completed) filterCounts.completed.textContent = completedSteps.length;
        if (filterCounts.incomplete) filterCounts.incomplete.textContent = incompleteSteps.length;
    }

    /**
     * Updates collapse/expand all button state and text
     */
    function updateCollapseButtonState() {
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

    // ==========================================
    //  UI RENDERING FUNCTIONS
    // ==========================================

    /**
     * Updates header statistics display
     */
    function updateStatsDisplay() {
        const allSteps = dataWithComputedValues.flatMap(group => group.steps);
        
        // Update total time
        const totalMinutes = allSteps.length > 0 ? allSteps[allSteps.length - 1].cumulative_time : 0;
        if (totalTimeElement) totalTimeElement.textContent = formatTime(totalMinutes);
        
        // Update total cost
        const totalCost = allSteps.reduce((sum, step) => sum + parseCurrency(step.money), 0);
        if (totalCostElement) totalCostElement.textContent = formatCurrency(totalCost);
        
        // Update progress statistics
        const completedSteps = allSteps.filter(step => step.completed).length;
        if (progressStatElement) progressStatElement.textContent = `${completedSteps}/${allSteps.length}`;
        
        updateFilterCounts();
    }

    /**
     * Updates the progress bar in the footer
     */
    function updateProgressBar() {
        if (!progressText || !progressBar) return;
        
        const allSteps = dataWithComputedValues.flatMap(group => group.steps);
        const totalSteps = allSteps.length;
        
        if (totalSteps === 0) {
            progressText.textContent = "No steps available.";
            progressBar.style.width = '0%';
            return;
        }
        
        const completedSteps = allSteps.filter(step => step.completed).length;
        const percentage = (completedSteps / totalSteps) * 100;
        
        progressText.textContent = `Completed ${completedSteps} of ${totalSteps} (${Math.round(percentage)}%)`;
        progressBar.style.width = `${percentage}%`;
    }

    /**
     * Updates search clear button visibility
     */
    function updateSearchClearButton() {
        if (!searchInput || !searchClear) return;
        
        const hasValue = searchInput.value.trim() !== '';
        searchClear.style.display = hasValue ? 'block' : 'none';
    }

    /**
     * Renders the complete checklist UI
     * Applies current filters and search query
     */
    function renderChecklist() {
        if (!groupContainer) return;
        
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        groupContainer.innerHTML = '';

        dataWithComputedValues.forEach(group => {
            let stepsToRender = group.steps;
            
            // Apply current filter
            if (currentFilter === 'incomplete') {
                stepsToRender = stepsToRender.filter(step => !step.completed);
            } else if (currentFilter === 'completed') {
                stepsToRender = stepsToRender.filter(step => step.completed);
            }
            
            // Apply search filter
            if (query) {
                stepsToRender = stepsToRender.filter(step =>
                    step.step_title.toLowerCase().includes(query) ||
                    step.step_instruction.toLowerCase().includes(query) ||
                    step.items.some(item => item.toLowerCase().includes(query))
                );
            }

            // Render group if it has steps to show or no search query is active
            if (stepsToRender.length > 0 || !query) {
                const groupElement = createGroupElement(group, stepsToRender);
                groupContainer.appendChild(groupElement);
            }
        });
        
        updateCollapseButtonState();
        updateStatsDisplay();
    }

    /**
     * Creates a group DOM element with all its steps
     * @param {Object} group - Group data object
     * @param {Array<Object>} stepsToRender - Filtered steps to render
     * @returns {HTMLElement} Complete group DOM element
     */
    function createGroupElement(group, stepsToRender) {
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
     * Creates a step DOM element
     * @param {Object} step - Step data object
     * @returns {HTMLElement} Complete step DOM element
     */
    function createStepElement(step) {
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

        stepElement.innerHTML = `
            <div class="step-header">
                <div class="step-header-left">
                    <input type="checkbox" ${step.completed ? 'checked' : ''} tabindex="-1">
                    <span class="step-title">${step.step_number}. ${step.step_title}</span>
                </div>
                <span class="step-time">${formatTime(step.cumulative_time)}</span>
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

    // ==========================================
    //  USER INTERACTION HANDLERS
    // ==========================================

    /**
     * Handles expand/collapse all groups functionality
     */
    function handleToggleExpand() {
        const groupTitles = Object.keys(groupCollapseState);
        if (groupTitles.length === 0) return;
        
        const allCollapsed = groupTitles.every(title => groupCollapseState[title] === true);
        
        // Toggle all groups to opposite state
        groupTitles.forEach(groupTitle => {
            groupCollapseState[groupTitle] = !allCollapsed;
        });
        
        // Save state and re-render
        localStorage.setItem('checklistGroupState', JSON.stringify(groupCollapseState));
        renderChecklist();
    }

    /**
     * Handles focus on incomplete groups functionality
     * Expands groups with incomplete steps, collapses completed groups
     */
    function handleFocusIncomplete() {
        dataWithComputedValues.forEach(group => {
            const hasIncompleteSteps = group.steps.some(step => !step.completed);
            // Expand groups with incomplete steps, collapse groups with all completed steps
            groupCollapseState[group.group_title] = !hasIncompleteSteps;
        });
        
        localStorage.setItem('checklistGroupState', JSON.stringify(groupCollapseState));
        renderChecklist();
    }

    /**
     * Handles complete progress reset
     */
    function handleResetProgress() {
        const isConfirmed = window.confirm(
            "Are you sure you want to reset all progress?\n\n" +
            "This will:\n" +
            "• Uncheck all completed steps\n" +
            "• Delete all notes\n" +
            "• Reset all preferences\n\n" +
            "This action cannot be undone."
        );
        
        if (!isConfirmed) return;

        try {
            // Clear all localStorage data
            localStorage.removeItem('checklistProgress');
            localStorage.removeItem('checklistGroupState');
            localStorage.removeItem('checklistFilter');
            
            // Reset in-memory state
            currentFilter = 'all';
            groupCollapseState = {};
            
            // Reinitialize application
            init();
        } catch (error) {
            console.error('Error during reset:', error);
            alert('Error resetting progress. Please refresh the page.');
        }
    }

    /**
     * Handles clearing the search input
     */
    function handleSearchClear() {
        if (!searchInput) return;
        
        searchInput.value = '';
        updateSearchClearButton();
        renderChecklist();
        searchInput.focus();
    }

    /**
     * Handles individual group expand/collapse toggle
     * @param {string} groupTitle - Title of the group to toggle
     * @param {HTMLElement} groupElement - DOM element of the group
     */
    function handleGroupToggle(groupTitle, groupElement) {
        // Toggle state
        groupCollapseState[groupTitle] = !groupCollapseState[groupTitle];
        
        // Apply visual state immediately for responsive feedback
        groupElement.classList.toggle('is-collapsed', groupCollapseState[groupTitle]);
        
        // Save state to localStorage
        localStorage.setItem('checklistGroupState', JSON.stringify(groupCollapseState));
        
        // Update collapse button state
        updateCollapseButtonState();
    }

    /**
     * Handles step completion toggle
     * @param {string|number} stepNumber - Identifier of the step to toggle
     */
    function handleStepToggle(stepNumber) {
        dataWithComputedValues.forEach(group => {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.completed = !step.completed;
                
                // Prepare data for storage (remove computed values)
                const dataToSave = dataWithComputedValues.map(g => ({ 
                    ...g, 
                    steps: g.steps.map(({ cumulative_time, ...rest }) => rest) 
                }));
                
                saveProgress(dataToSave);
                renderChecklist();
                updateProgressBar();
            }
        });
    }

    /**
     * Handles entering note editing mode
     * @param {HTMLElement} stepElement - Step DOM element
     */
    function handleNoteEdit(stepElement) {
        stepElement.classList.add('is-editing-note');
        const textarea = stepElement.querySelector('.step-notes');
        if (textarea) {
            textarea.focus();
            // Position cursor at end of text
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    /**
     * Handles note blur event (when user finishes editing)
     * @param {HTMLElement} stepElement - Step DOM element
     * @param {string} stepNumber - Step identifier
     * @param {string} noteValue - New note value
     */
    function handleNoteBlur(stepElement, stepNumber, noteValue) {
        // Update the data
        dataWithComputedValues.forEach(group => {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
            }
        });
        
        // Re-render to show/hide note display
        renderChecklist();
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    /**
     * Binds all event listeners for user interactions
     */
    function bindEventListeners() {
        if (!groupContainer) return;
        
        // Main container event delegation
        groupContainer.addEventListener('click', (e) => {
            const groupElement = e.target.closest('.step-group');
            const stepElement = e.target.closest('.step');

            // Handle group header clicks (expand/collapse)
            if (e.target.closest('.group-header')) {
                const groupTitle = groupElement.dataset.groupTitle;
                handleGroupToggle(groupTitle, groupElement);
                return;
            }

            // Handle note display/add note button clicks
            if (e.target.matches('.note-display') || e.target.closest('.add-note-btn')) {
                handleNoteEdit(stepElement);
                return;
            }

            // Handle step clicks (toggle completion)
            if (stepElement && !e.target.matches('.step-notes')) {
                const stepNumber = stepElement.dataset.step;
                handleStepToggle(stepNumber);
            }
        });

        // Real-time note saving on input
        groupContainer.addEventListener('input', (e) => {
            if (e.target.matches('.step-notes')) {
                const stepElement = e.target.closest('.step');
                const stepNumber = stepElement.dataset.step;
                const noteValue = e.target.value;
                
                // Save immediately as user types
                saveNoteToStorage(stepNumber, noteValue);
            }
        });

        // Note editing completion
        groupContainer.addEventListener('blur', (e) => {
            if (!e.target.matches('.step-notes')) return;
            
            const stepElement = e.target.closest('.step');
            const stepNumber = stepElement.dataset.step;
            const noteValue = e.target.value;

            handleNoteBlur(stepElement, stepNumber, noteValue);
        }, true);

        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDarkMode = document.body.classList.contains('dark-mode');
                applyTheme(isDarkMode ? 'light' : 'dark');
            });
        }

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                updateSearchClearButton();
                renderChecklist();
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', handleSearchClear);
        }

        // Filter controls
        Object.keys(filterControls).forEach(key => {
            if (filterControls[key]) {
                filterControls[key].addEventListener('click', () => {
                    currentFilter = key;
                    localStorage.setItem('checklistFilter', currentFilter);
                    updateActiveFilterButton();
                    renderChecklist();
                });
            }
        });

        // Action buttons
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', handleToggleExpand);
        if (focusIncompleteBtn) focusIncompleteBtn.addEventListener('click', handleFocusIncomplete);
        if (resetBtn) resetBtn.addEventListener('click', handleResetProgress);
    }

    // ==========================================
    //  APPLICATION INITIALIZATION
    // ==========================================

    /**
     * Initializes the complete application
     * Loads data, sets up UI, and binds events
     */
    async function init() {
        try {
            // Initialize UI state from localStorage and preferences
            initializeUIState();
            
            // Load and process all checklist data
            await loadAndProcessData();
            
            // Render initial UI
            updateStatsDisplay();
            renderChecklist();
            updateProgressBar();
            
            // Bind all event listeners
            bindEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            
            // Show error state in UI
            if (groupContainer) {
                groupContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--c-danger);">
                        <h2>Application Failed to Start</h2>
                        <p>Please check your internet connection and try again.</p>
                        <button onclick="location.reload()" style="
                            background: var(--c-primary); 
                            color: white; 
                            border: none; 
                            padding: 12px 24px; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            margin-top: 16px;
                        ">Reload Application</button>
                    </div>`;
            }
        }
    }

    // ==========================================
    //  APPLICATION STARTUP
    // ==========================================

    // Start the application
    init();

});

// ==========================================
//  END OF APPLICATION
// ==========================================