/**
 * @fileoverview Interactive Checklist Application - Simplified Version
 * @description A streamlined checklist management system for checking off items
 * 
 * @author Interactive Checklist Team
 * @version 2.1.0
 * @created 2024
 */

import { loadAndProcessData } from './js/dataManager.js';
import { initializeTheme, applyTheme } from './js/themeManager.js';
import {
    createGroupElement,
    updateStatsDisplay,
    updateProgressBar,
    showError
} from './js/renderer.js';
import {
    handleStepToggle,
    handleGroupToggle,
    handleThemeToggle,
    loadGroupCollapseState
} from './js/eventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE
    // ==========================================

    let dataWithComputedValues = [];
    let groupCollapseState = {};

    // ==========================================
    //  DOM ELEMENT REFERENCES
    // ==========================================

    const elements = {
        groupContainer: document.getElementById('group-container'),
        totalTimeElement: document.getElementById('total-time'),
        progressStatElement: document.getElementById('progress-stat'),
        themeToggle: document.getElementById('theme-toggle'),
        progressText: document.getElementById('progress-text'),
        progressBar: document.getElementById('progress-bar')
    };

    // ==========================================
    //  UI STATE MANAGEMENT
    // ==========================================

    function updateUI() {
        updateStatsDisplay(dataWithComputedValues, elements);
        updateProgressBar(dataWithComputedValues, elements);
    }

    // ==========================================
    //  RENDERING FUNCTIONS
    // ==========================================

    function renderChecklist() {
        if (!elements.groupContainer) return;
        
        elements.groupContainer.innerHTML = '';

        dataWithComputedValues.forEach(group => {
            const isCollapsed = groupCollapseState[group.group_title] || false;
            const groupElement = createGroupElement(group, group.steps, isCollapsed);
            elements.groupContainer.appendChild(groupElement);
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
            const stepElement = e.target.closest('.step');
            const groupHeader = e.target.closest('.group-header');

            // Handle group header clicks (entire header is clickable)
            if (groupHeader && !stepElement) {
                e.preventDefault();
                const groupTitle = groupHeader.dataset.group;
                handleGroupToggle(groupTitle, groupCollapseState, renderChecklist);
                return;
            }

            // Handle step clicks (toggle completion)
            if (stepElement) {
                e.preventDefault();
                const stepNumber = stepElement.dataset.step;
                handleStepToggle(stepNumber, dataWithComputedValues, renderChecklist);
            }
        });

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

            // Load group collapse state
            groupCollapseState = loadGroupCollapseState();

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