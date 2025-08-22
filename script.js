/* filepath: /workspaces/checklist/script.js */
/**
 * @fileoverview Interactive Checklist Application - Enhanced with Sub-Steps
 * @description A streamlined checklist management system with nested task support
 * 
 * @author Interactive Checklist Team
 * @version 2.3.0
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

            console.log('Click detected:', {
                stepElement: !!stepElement,
                groupHeader: !!groupHeader,
                subStepElement: !!subStepElement,
                subStepsHeader: !!subStepsHeader,
                target: e.target
            });

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

            // Handle step clicks (toggle completion)
            if (stepElement && !subStepElement && !subStepsHeader) {
                e.preventDefault();
                const stepNumber = parseInt(stepElement.dataset.step);
                console.log('Step toggle:', stepNumber);
                handleStepToggle(stepNumber, dataWithComputedValues, renderApp);
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
    //  APPLICATION INITIALIZATION
    // ==========================================

    async function init() {
        try {
            console.log('🚀 Initializing Interactive Checklist Application v2.3.0...');
            
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

            // Load and process data
            dataWithComputedValues = await loadAndProcessData();
            
            console.log('✅ Data loaded:', {
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
                showError(elements.groupContainer, error.message);
            }
        }
    }

    // Start the application
    init();
});