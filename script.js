/**
 * @fileoverview Interactive Checklist Application - Main Entry Point
 * @description A comprehensive checklist management system with modular architecture
 * 
 * @author Interactive Checklist Team
 * @version 2.0.0
 * @created 2024
 */

import { debounce } from './js/utils.js';
import { loadAndProcessData } from './js/dataManager.js';
import { loadFilter, loadGroupState } from './js/storage.js';
import { initializeTheme, applyTheme } from './js/themeManager.js';
import {
    createGroupElement,
    updateStatsDisplay,
    updateFilterCounts,
    updateProgressBar,
    updateSearchClearButton,
    updateCollapseButtonState,
    showError
} from './js/renderer.js';
import {
    handleStepToggle,
    handleGroupToggle,
    handleToggleExpand,
    handleFocusIncomplete,
    handleResetProgress,
    handleSearchClear,
    handleNoteEdit,
    handleNoteBlur,
    handleFilterChange,
    handleThemeToggle
} from './js/eventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE
    // ==========================================

    let dataWithComputedValues = [];
    let currentFilter = 'all';
    let groupCollapseState = {};

    // ==========================================
    //  DOM ELEMENT REFERENCES
    // ==========================================

    const elements = {
        groupContainer: document.getElementById('group-container'),
        searchInput: document.getElementById('searchInput'),
        searchClear: document.getElementById('search-clear'),
        totalTimeElement: document.getElementById('total-time'),
        totalCostElement: document.getElementById('total-cost'),
        progressStatElement: document.getElementById('progress-stat'),
        themeToggle: document.getElementById('theme-toggle'),
        progressText: document.getElementById('progress-text'),
        progressBar: document.getElementById('progress-bar'),
        collapseAllBtn: document.getElementById('collapse-all-btn'),
        focusIncompleteBtn: document.getElementById('focus-incomplete-btn'),
        resetBtn: document.getElementById('reset-btn')
    };

    const filterControls = {
        all: document.getElementById('filter-all'),
        incomplete: document.getElementById('filter-incomplete'),
        completed: document.getElementById('filter-completed')
    };

    const filterCounts = {
        all: document.getElementById('filter-all-count'),
        incomplete: document.getElementById('filter-incomplete-count'),
        completed: document.getElementById('filter-completed-count')
    };

    // ==========================================
    //  UI STATE MANAGEMENT
    // ==========================================

    function updateActiveFilterButton() {
        Object.values(filterControls).forEach(button => button?.classList.remove('active'));
        if (filterControls[currentFilter]) {
            filterControls[currentFilter].classList.add('active');
        }
    }

    function updateUI() {
        updateStatsDisplay(dataWithComputedValues, elements);
        updateFilterCounts(dataWithComputedValues, filterCounts);
        updateProgressBar(dataWithComputedValues, elements);
        updateSearchClearButton(elements.searchInput, elements.searchClear);
        updateCollapseButtonState(groupCollapseState, elements.collapseAllBtn);
    }

    // ==========================================
    //  RENDERING FUNCTIONS
    // ==========================================

    function renderChecklist() {
        if (!elements.groupContainer) return;
        
        const query = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
        elements.groupContainer.innerHTML = '';

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
                    step.items.some(item => item.toLowerCase().includes(query)) ||
                    step.notes.toLowerCase().includes(query)
                );
            }

            // Render group if it has steps to show or no search query is active
            if (stepsToRender.length > 0 || !query) {
                const groupElement = createGroupElement(group, stepsToRender, groupCollapseState);
                elements.groupContainer.appendChild(groupElement);
            }
        });
        
        updateUI();
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    function bindEventListeners() {
        if (!elements.groupContainer) return;
        
        // Main container event delegation
        elements.groupContainer.addEventListener('click', (e) => {
            const groupElement = e.target.closest('.step-group');
            const stepElement = e.target.closest('.step');

            // Handle group header clicks (expand/collapse)
            if (e.target.closest('.group-header')) {
                e.preventDefault();
                e.stopPropagation();
                const groupTitle = groupElement.dataset.groupTitle;
                handleGroupToggle(groupTitle, groupElement, groupCollapseState, () => {
                    updateCollapseButtonState(groupCollapseState, elements.collapseAllBtn);
                });
                return;
            }

            // Handle note display/add note button clicks
            if (e.target.matches('.note-display') || e.target.closest('.add-note-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleNoteEdit(stepElement);
                return;
            }

            // Handle step clicks (toggle completion)
            if (stepElement && !e.target.matches('.step-notes')) {
                e.preventDefault();
                const stepNumber = stepElement.dataset.step;
                handleStepToggle(stepNumber, dataWithComputedValues, renderChecklist);
            }
        });

        // Real-time note saving on input
        elements.groupContainer.addEventListener('input', (e) => {
            if (e.target.matches('.step-notes')) {
                const stepElement = e.target.closest('.step');
                const stepNumber = stepElement.dataset.step;
                const noteValue = e.target.value;
                
                // Save immediately without re-rendering
                import('./js/storage.js').then(({ saveNoteToStorage }) => {
                    saveNoteToStorage(stepNumber, noteValue, dataWithComputedValues);
                });
            }
        });

        // Note editing completion
        elements.groupContainer.addEventListener('blur', (e) => {
            if (!e.target.matches('.step-notes')) return;
            
            const stepElement = e.target.closest('.step');
            const stepNumber = stepElement.dataset.step;
            const noteValue = e.target.value;

            handleNoteBlur(stepElement, stepNumber, noteValue, dataWithComputedValues, renderChecklist);
        }, true);

        // Theme toggle
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', () => {
                handleThemeToggle(applyTheme);
            });
        }

        // Search functionality with debouncing
        if (elements.searchInput) {
            const debouncedRender = debounce(renderChecklist, 300);
            elements.searchInput.addEventListener('input', () => {
                updateSearchClearButton(elements.searchInput, elements.searchClear);
                debouncedRender();
            });
        }

        if (elements.searchClear) {
            elements.searchClear.addEventListener('click', () => {
                handleSearchClear(elements.searchInput, renderChecklist);
            });
        }

        // Filter controls
        Object.keys(filterControls).forEach(key => {
            if (filterControls[key]) {
                filterControls[key].addEventListener('click', () => {
                    currentFilter = handleFilterChange(key, () => {
                        updateActiveFilterButton();
                        renderChecklist();
                    });
                });
            }
        });

        // Action buttons
        if (elements.collapseAllBtn) {
            elements.collapseAllBtn.addEventListener('click', () => {
                handleToggleExpand(groupCollapseState, renderChecklist);
            });
        }

        if (elements.focusIncompleteBtn) {
            elements.focusIncompleteBtn.addEventListener('click', () => {
                handleFocusIncomplete(dataWithComputedValues, groupCollapseState, renderChecklist);
            });
        }

        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', () => {
                handleResetProgress(init);
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

            // Load initial UI state
            const savedFilter = loadFilter();
            currentFilter = savedFilter || 'all';
            groupCollapseState = loadGroupState();
            
            updateActiveFilterButton();

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