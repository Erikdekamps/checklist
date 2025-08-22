/**
 * @fileoverview Interactive Checklist Application - Enhanced with Sub-Steps and Required Items
 * @description A streamlined checklist management system with nested task support and required items
 * 
 * @author Interactive Checklist Team
 * @version 2.4.0
 * @created 2024
 */

import { loadAndProcessData, computeGlobalStats, formatTime, formatMoney } from './js/dataManager.js';
import { initializeTheme, applyTheme } from './js/themeManager.js';
import {
    renderChecklist as renderChecklistHTML,
    updateStatsDisplay,
    updateProgressBar,
    updateFilterButtons,
    updateSearchClearButton,
    showError
} from './js/renderer.js';
import {
    handleStepToggle,
    handleSubStepToggle,
    handleSubStepsToggle,
    handleGroupToggle,
    handleToggleAll,
    handleToggleAllSubSteps,
    handleFilterChange,
    handleSearch,
    handleThemeToggle,
    handleReset,
    updateToggleButtonState,
    updateSubStepsToggleButtonState,
    loadGroupCollapseState,
    loadSubStepsCollapseState,
    applySubStepsCollapseState,
    loadFilterState,
    loadSearchTerm,
    saveSearchState,
    debounce
} from './js/eventHandlers.js';
import { saveProgress, loadProgress } from './js/storage.js';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE
    // ==========================================

    let dataWithComputedValues = [];
    let groupCollapseState = {};
    let subStepsCollapseState = {};
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
            } else if (globalStats.completion_percentage === 0) {
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
        
        // Update progress bar
        if (elements.progressBar) {
            elements.progressBar.style.width = `${globalStats.completion_percentage}%`;
        }
    }

    function updateUI() {
        updateFooterProgress();
        updateFilterButtons(appState.currentFilter);
        updateSearchClearButton(appState.searchTerm);
        updateToggleButtonState(dataWithComputedValues, groupCollapseState);
        
        // Update search input value if needed
        if (elements.searchInput && elements.searchInput.value !== appState.searchTerm) {
            elements.searchInput.value = appState.searchTerm;
        }
        
        // Update sub-steps toggle button after a short delay to ensure DOM is updated
        setTimeout(() => {
            updateSubStepsToggleButtonState(dataWithComputedValues);
            applySubStepsCollapseState(subStepsCollapseState);
        }, 100);
    }

    // ==========================================
    //  RENDERING FUNCTIONS
    // ==========================================

    function renderApp() {
        if (!elements.groupContainer) return;
        
        try {
            const html = renderChecklistHTML(dataWithComputedValues, groupCollapseState, subStepsCollapseState, appState);
            elements.groupContainer.innerHTML = html;
            updateUI();
        } catch (error) {
            console.error('❌ Error rendering app:', error);
            showError(elements.groupContainer, 'Failed to render checklist: ' + error.message);
        }
    }

    // ==========================================
    //  REQUIRED ITEMS FUNCTIONALITY
    // ==========================================

    /**
     * Handles required item toggle with proper data structure management
     * @param {number} stepNumber - Step number containing the required item
     * @param {number} itemIndex - Index of the required item to toggle
     */
    function handleRequiredItemToggle(stepNumber, itemIndex) {
        console.log(`🔄 Toggling required item ${itemIndex} for step ${stepNumber}`);
        
        try {
            // Find the step that contains this required item
            let targetStep = null;
            for (const group of dataWithComputedValues) {
                const step = group.steps.find(s => s.step_number === stepNumber);
                if (step) {
                    targetStep = step;
                    break;
                }
            }

            if (!targetStep) {
                console.error(`❌ Step ${stepNumber} not found`);
                return;
            }

            // Initialize required_items_completed array if it doesn't exist
            if (!targetStep.required_items_completed) {
                targetStep.required_items_completed = new Array(targetStep.items ? targetStep.items.length : 0).fill(false);
            }

            // Ensure the array is the right length
            if (targetStep.items && targetStep.required_items_completed.length !== targetStep.items.length) {
                // Resize the array to match items length
                const newArray = new Array(targetStep.items.length).fill(false);
                // Copy existing values
                for (let i = 0; i < Math.min(targetStep.required_items_completed.length, newArray.length); i++) {
                    newArray[i] = targetStep.required_items_completed[i];
                }
                targetStep.required_items_completed = newArray;
            }

            // Validate item index
            if (itemIndex < 0 || itemIndex >= targetStep.required_items_completed.length) {
                console.error(`❌ Invalid item index ${itemIndex} for step ${stepNumber}`);
                return;
            }

            // Toggle the completion status
            const wasCompleted = targetStep.required_items_completed[itemIndex];
            targetStep.required_items_completed[itemIndex] = !wasCompleted;

            const itemName = targetStep.items && targetStep.items[itemIndex] ? targetStep.items[itemIndex] : `Item ${itemIndex + 1}`;
            console.log(`✅ Required item "${itemName}" toggled from ${wasCompleted} to ${!wasCompleted}`);

            // Save the complete data structure to localStorage
            saveRequiredItemsProgress(dataWithComputedValues);

            // Re-render the app
            renderApp();

        } catch (error) {
            console.error('❌ Error toggling required item:', error);
        }
    }

    /**
     * Saves the complete checklist progress including required items
     * @param {Array} data - Complete data structure to save
     */
    function saveRequiredItemsProgress(data) {
        try {
            // Create a clean copy of the data for saving
            const dataToSave = data.map(group => ({
                ...group,
                steps: group.steps.map(step => ({
                    ...step,
                    // Ensure required_items_completed is included
                    required_items_completed: step.required_items_completed || []
                }))
            }));

            saveProgress(dataToSave);
            console.log('✅ Progress saved including required items');
        } catch (error) {
            console.error('❌ Error saving required items progress:', error);
        }
    }

    /**
     * Loads and merges saved progress with fresh data
     * @param {Array} freshData - Fresh data from data.json
     * @returns {Array} Data merged with saved progress
     */
    function mergeWithSavedProgress(freshData) {
        try {
            const savedProgress = loadProgress();
            
            if (!savedProgress || !Array.isArray(savedProgress)) {
                console.log('📁 No saved progress found, using fresh data');
                return initializeRequiredItemsArrays(freshData);
            }

            console.log('📁 Merging fresh data with saved progress');

            return freshData.map(group => {
                const savedGroup = savedProgress.find(sg => sg.group_title === group.group_title);
                
                return {
                    ...group,
                    steps: group.steps.map(step => {
                        const savedStep = savedGroup?.steps?.find(ss => ss.step_number === step.step_number);
                        
                        // Start with fresh step data
                        let mergedStep = {
                            ...step,
                            completed: false,
                            notes: '',
                            required_items_completed: []
                        };

                        // Apply saved progress if it exists
                        if (savedStep) {
                            mergedStep.completed = Boolean(savedStep.completed);
                            mergedStep.notes = savedStep.notes || '';
                            
                            // Merge required items completion state
                            if (step.items && Array.isArray(step.items)) {
                                mergedStep.required_items_completed = new Array(step.items.length).fill(false);
                                
                                if (savedStep.required_items_completed && Array.isArray(savedStep.required_items_completed)) {
                                    // Copy saved completion states up to the length of current items
                                    for (let i = 0; i < Math.min(step.items.length, savedStep.required_items_completed.length); i++) {
                                        mergedStep.required_items_completed[i] = Boolean(savedStep.required_items_completed[i]);
                                    }
                                }
                            }

                            // Merge sub-steps progress
                            if (step.sub_steps && savedStep.sub_steps) {
                                mergedStep.sub_steps = step.sub_steps.map(subStep => {
                                    const savedSubStep = savedStep.sub_steps.find(sss => sss.sub_step_id === subStep.sub_step_id);
                                    return {
                                        ...subStep,
                                        completed: savedSubStep ? Boolean(savedSubStep.completed) : false
                                    };
                                });
                            }
                        } else {
                            // Initialize required items array for steps with no saved data
                            if (step.items && Array.isArray(step.items)) {
                                mergedStep.required_items_completed = new Array(step.items.length).fill(false);
                            }
                        }

                        return mergedStep;
                    })
                };
            });

        } catch (error) {
            console.error('❌ Error merging saved progress:', error);
            return initializeRequiredItemsArrays(freshData);
        }
    }

    /**
     * Initializes required_items_completed arrays for all steps
     * @param {Array} data - Data to initialize
     * @returns {Array} Data with initialized arrays
     */
    function initializeRequiredItemsArrays(data) {
        return data.map(group => ({
            ...group,
            steps: group.steps.map(step => ({
                ...step,
                completed: false,
                notes: '',
                required_items_completed: step.items && Array.isArray(step.items) 
                    ? new Array(step.items.length).fill(false) 
                    : []
            }))
        }));
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

            console.log('Click detected:', {
                stepElement: !!stepElement,
                groupHeader: !!groupHeader,
                subStepElement: !!subStepElement,
                subStepsHeader: !!subStepsHeader,
                requiredItemElement: !!requiredItemElement,
                target: e.target.tagName + (e.target.className ? '.' + e.target.className : '')
            });

            // Handle required item clicks (toggle completion)
            if (requiredItemElement && !subStepElement && !subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const stepNumber = parseInt(stepElement.dataset.step);
                const itemIndex = parseInt(requiredItemElement.dataset.itemIndex);
                console.log('Required item toggle:', { stepNumber, itemIndex });
                
                // Use our enhanced handler
                handleRequiredItemToggle(stepNumber, itemIndex);
                return;
            }

            // Handle sub-step clicks (toggle completion)
            if (subStepElement && !subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const subStepId = subStepElement.dataset.subStep;
                console.log('Sub-step toggle:', subStepId);
                handleSubStepToggle(subStepId, dataWithComputedValues, renderApp);
                return;
            }

            // Handle sub-steps header clicks (toggle collapse)
            if (subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const stepNumber = subStepsHeader.closest('.sub-steps-container').dataset.step;
                console.log('Sub-steps header toggle:', stepNumber);
                handleSubStepsToggle(stepNumber, () => {
                    // Update progress display and button states without full re-render
                    updateFooterProgress();
                    setTimeout(() => updateSubStepsToggleButtonState(dataWithComputedValues), 50);
                });
                return;
            }

            // Handle group header clicks (entire header is clickable)
            if (groupHeader && !stepElement) {
                e.preventDefault();
                const groupTitle = groupHeader.dataset.group;
                console.log('Group header toggle:', groupTitle);
                handleGroupToggle(groupTitle, groupCollapseState, renderApp);
                return;
            }

            // Handle step clicks (toggle completion) - only if not clicking on required items or sub-elements
            if (stepElement && !subStepElement && !subStepsHeader && !requiredItemElement) {
                e.preventDefault();
                const stepNumber = parseInt(stepElement.dataset.step);
                console.log('Step toggle:', stepNumber);
                handleStepToggle(stepNumber, dataWithComputedValues, renderApp);
            }
        });

        // Handle note editing
        elements.groupContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('note-display') || e.target.classList.contains('add-note-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const stepElement = e.target.closest('.step');
                if (!stepElement) return;
                
                const stepNumber = parseInt(stepElement.dataset.step);
                startNoteEditing(stepElement, stepNumber);
            }
        });

        // Handle note textarea blur (save note)
        elements.groupContainer.addEventListener('blur', (e) => {
            if (e.target.classList.contains('step-notes')) {
                e.preventDefault();
                e.stopPropagation();
                
                const stepElement = e.target.closest('.step');
                if (!stepElement) return;
                
                const stepNumber = parseInt(stepElement.dataset.step);
                const noteValue = e.target.value.trim();
                
                saveNote(stepElement, stepNumber, noteValue);
            }
        }, true);

        // Handle note textarea key events
        elements.groupContainer.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('step-notes')) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.target.blur(); // This will trigger the blur event and save
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    e.target.blur(); // This will trigger the blur event and save
                }
            }
        });

        // Search functionality with debounced saving
        if (elements.searchInput) {
            const debouncedSave = debounce(saveSearchState, 300);
            
            elements.searchInput.addEventListener('input', (e) => {
                // Update search immediately for UI responsiveness
                handleSearch(e.target.value, appState, renderApp);
                
                // Debounce the localStorage save to avoid excessive writes
                debouncedSave(appState);
            });
        }

        if (elements.searchClear) {
            elements.searchClear.addEventListener('click', () => {
                elements.searchInput.value = '';
                handleSearch('', appState, renderApp);
                saveSearchState(appState);
            });
        }

        // Filter functionality
        if (elements.filterAll) {
            elements.filterAll.addEventListener('click', () => {
                handleFilterChange('all', appState, renderApp);
            });
        }

        if (elements.filterTodo) {
            elements.filterTodo.addEventListener('click', () => {
                handleFilterChange('todo', appState, renderApp);
            });
        }

        if (elements.filterCompleted) {
            elements.filterCompleted.addEventListener('click', () => {
                handleFilterChange('completed', appState, renderApp);
            });
        }

        // Toggle All functionality
        if (elements.toggleAllBtn) {
            elements.toggleAllBtn.addEventListener('click', () => {
                const action = handleToggleAll(dataWithComputedValues, groupCollapseState, renderApp);
                console.log(`Groups toggle action: ${action}`);
                
                // After collapsing all groups, ensure sub-steps button is updated
                if (action === 'collapse') {
                    setTimeout(() => {
                        updateSubStepsToggleButtonState(dataWithComputedValues);
                    }, 200);
                }
            });
        }

        // Toggle All Sub-Steps functionality
        if (elements.toggleSubStepsBtn) {
            elements.toggleSubStepsBtn.addEventListener('click', () => {
                const action = handleToggleAllSubSteps(dataWithComputedValues, () => {
                    // Update button state and progress display without full re-render
                    updateFooterProgress();
                    setTimeout(() => updateSubStepsToggleButtonState(dataWithComputedValues), 50);
                });
                console.log(`Sub-steps toggle action: ${action}`);
            });
        }

        // Reset functionality
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', () => {
                handleReset(async () => {
                    console.log('🔄 Resetting application...');
                    
                    // Reset application state
                    groupCollapseState = {};
                    subStepsCollapseState = {};
                    appState = {
                        currentFilter: 'all',
                        searchTerm: ''
                    };
                    
                    // Clear search input
                    if (elements.searchInput) {
                        elements.searchInput.value = '';
                    }
                    
                    try {
                        // Reload fresh data
                        dataWithComputedValues = await loadAndProcessData();
                        
                        // Initialize required items arrays (no saved progress)
                        dataWithComputedValues = initializeRequiredItemsArrays(dataWithComputedValues);
                        
                        // Re-render everything
                        renderApp();
                        
                        console.log('✅ Application reset completed');
                    } catch (error) {
                        console.error('❌ Error during app reset:', error);
                        if (elements.groupContainer) {
                            showError(elements.groupContainer, 'Failed to reset application: ' + error.message);
                        }
                    }
                });
            });
        }

        // Theme toggle
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', () => {
                handleThemeToggle(applyTheme);
            });
        }
    }

    // ==========================================
    //  NOTE EDITING FUNCTIONALITY
    // ==========================================

    function startNoteEditing(stepElement, stepNumber) {
        // Add editing class
        stepElement.classList.add('is-editing-note');
        
        // Find the textarea and focus it
        const textarea = stepElement.querySelector('.step-notes');
        if (textarea) {
            textarea.focus();
            // Position cursor at end
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    function saveNote(stepElement, stepNumber, noteValue) {
        // Remove editing class
        stepElement.classList.remove('is-editing-note');
        
        // Find the step in our data and update the note
        for (const group of dataWithComputedValues) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
                break;
            }
        }
        
        // Save the updated data structure
        saveRequiredItemsProgress(dataWithComputedValues);
        
        // Re-render to update the display
        renderApp();
    }

    // ==========================================
    //  APPLICATION INITIALIZATION
    // ==========================================

    async function init() {
        try {
            console.log('🚀 Initializing Interactive Checklist Application v2.4.0...');
            
            // Initialize theme
            initializeTheme();

            // Load saved state
            groupCollapseState = loadGroupCollapseState();
            subStepsCollapseState = loadSubStepsCollapseState();
            appState.currentFilter = loadFilterState();
            appState.searchTerm = loadSearchTerm();

            console.log('📁 Loaded saved state:', {
                filter: appState.currentFilter,
                searchTerm: appState.searchTerm,
                groupsCollapsed: Object.keys(groupCollapseState).length,
                subStepsCollapsed: Object.keys(subStepsCollapseState).length
            });

            // Load fresh data from data.json
            const freshData = await loadAndProcessData();
            
            // Merge with saved progress (including required items)
            dataWithComputedValues = mergeWithSavedProgress(freshData);
            
            console.log('✅ Data loaded and merged with saved progress:', {
                groups: dataWithComputedValues.length,
                totalSteps: dataWithComputedValues.reduce((sum, group) => sum + (group.steps?.length || 0), 0)
            });

            // Render UI
            renderApp();

            // Bind event listeners
            bindEventListeners();

            console.log('✅ Application initialized successfully');

        } catch (error) {
            console.error('❌ Critical error during initialization:', error);
            
            // Show user-friendly error message
            if (elements.groupContainer) {
                showError(elements.groupContainer, 'Failed to load checklist: ' + error.message);
            }
        }
    }

    // Start the application
    init();
});