/* filepath: /workspaces/checklist/script.js */
/**
 * @fileoverview Interactive Checklist Application - Enhanced with Sub-Steps
 * @description A streamlined checklist management system with nested task support
 * 
 * @author Interactive Checklist Team
 * @version 2.2.0
 * @created 2024
 */

import { loadAndProcessData } from './js/dataManager.js';
import { initializeTheme, applyTheme } from './js/themeManager.js';
import {
    renderFilteredGroups,
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
    handleFilterChange,
    handleSearch,
    handleThemeToggle,
    updateToggleButtonState,
    loadGroupCollapseState,
    loadSubStepsCollapseState,
    applySubStepsCollapseState,
    loadFilterState
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
        totalTimeElement: document.getElementById('total-time'),
        progressStatElement: document.getElementById('progress-stat'),
        themeToggle: document.getElementById('theme-toggle'),
        progressText: document.getElementById('progress-text'),
        progressBar: document.getElementById('progress-bar'),
        
        // Control elements
        searchInput: document.getElementById('search-input'),
        searchClear: document.getElementById('search-clear'),
        filterAll: document.getElementById('filter-all'),
        filterTodo: document.getElementById('filter-todo'),
        filterCompleted: document.getElementById('filter-completed'),
        toggleAllBtn: document.getElementById('toggle-all-btn')
    };

    // ==========================================
    //  UI STATE MANAGEMENT
    // ==========================================

    function updateUI() {
        updateStatsDisplay(dataWithComputedValues, elements);
        updateProgressBar(dataWithComputedValues, elements);
        updateFilterButtons(appState.currentFilter);
        updateSearchClearButton(appState.searchTerm);
        updateToggleButtonState(dataWithComputedValues, groupCollapseState);
        
        // Apply sub-steps collapse state after rendering
        setTimeout(() => {
            applySubStepsCollapseState(subStepsCollapseState);
        }, 100);
    }

    // ==========================================
    //  RENDERING FUNCTIONS
    // ==========================================

    function renderChecklist() {
        renderFilteredGroups(dataWithComputedValues, appState, groupCollapseState, elements.groupContainer);
        updateUI();
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
                handleSubStepToggle(subStepId, dataWithComputedValues, renderChecklist);
                return;
            }

            // Handle sub-steps header clicks (toggle collapse)
            if (subStepsHeader) {
                e.preventDefault();
                e.stopPropagation();
                const stepNumber = subStepsHeader.closest('.sub-steps-container').dataset.step;
                console.log('Sub-steps header toggle:', stepNumber);
                handleSubStepsToggle(stepNumber, () => {
                    // Update progress display without full re-render
                    updateStatsDisplay(dataWithComputedValues, elements);
                    updateProgressBar(dataWithComputedValues, elements);
                });
                return;
            }

            // Handle group header clicks (entire header is clickable)
            if (groupHeader && !stepElement) {
                e.preventDefault();
                const groupTitle = groupHeader.dataset.group;
                console.log('Group header toggle:', groupTitle);
                handleGroupToggle(groupTitle, groupCollapseState, renderChecklist);
                return;
            }

            // Handle step clicks (toggle completion)
            if (stepElement && !subStepElement && !subStepsHeader) {
                e.preventDefault();
                const stepNumber = stepElement.dataset.step;
                console.log('Step toggle:', stepNumber);
                handleStepToggle(stepNumber, dataWithComputedValues, renderChecklist);
            }
        });

        // Search functionality
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                handleSearch(e.target.value, appState, renderChecklist);
            });
        }

        if (elements.searchClear) {
            elements.searchClear.addEventListener('click', () => {
                elements.searchInput.value = '';
                handleSearch('', appState, renderChecklist);
            });
        }

        // Filter functionality
        if (elements.filterAll) {
            elements.filterAll.addEventListener('click', () => {
                handleFilterChange('all', appState, renderChecklist);
            });
        }

        if (elements.filterTodo) {
            elements.filterTodo.addEventListener('click', () => {
                handleFilterChange('todo', appState, renderChecklist);
            });
        }

        if (elements.filterCompleted) {
            elements.filterCompleted.addEventListener('click', () => {
                handleFilterChange('completed', appState, renderChecklist);
            });
        }

        // Toggle All functionality
        if (elements.toggleAllBtn) {
            elements.toggleAllBtn.addEventListener('click', () => {
                handleToggleAll(dataWithComputedValues, groupCollapseState, renderChecklist);
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
            // Initialize theme
            initializeTheme();

            // Load saved state
            groupCollapseState = loadGroupCollapseState();
            subStepsCollapseState = loadSubStepsCollapseState();
            appState.currentFilter = loadFilterState();

            // Load and process data
            dataWithComputedValues = await loadAndProcessData();

            // Render UI
            renderChecklist();

            // Bind event listeners
            bindEventListeners();

        } catch (error) {
            console.error('Critical error during initialization:', error);
            
            // Show user-friendly error message
            if (elements.groupContainer) {
                showError(elements.groupContainer, error.message);
            }
        }
    }

    // Start the application
    init();
});