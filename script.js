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
    handleThemeToggle
} from './js/eventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  APPLICATION STATE
    // ==========================================

    let dataWithComputedValues = [];

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
            // Render all steps in each group
            const groupElement = createGroupElement(group, group.steps, {});
            elements.groupContainer.appendChild(groupElement);
        });
        
        updateUI();
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    function bindEventListeners() {
        if (!elements.groupContainer) return;
        
        // Main container event delegation for step clicks
        elements.groupContainer.addEventListener('click', (e) => {
            const stepElement = e.target.closest('.step');

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