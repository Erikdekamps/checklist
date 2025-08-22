/**
 * Data Management Module
 * ======================
 * 
 * Handles data loading, processing, and merging operations
 */

import { loadProgress } from './storage.js';

/**
 * Loads base checklist data from data.json with retry mechanism
 * @returns {Promise<Array<Object>>} Base checklist data
 * @throws {Error} If data cannot be loaded after all retries
 */
export async function loadBaseData() {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Basic validation - ensure it's an array
            if (!Array.isArray(data)) {
                throw new Error('Invalid data structure: expected array in data.json');
            }
            
            return data;
        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error.message);
            lastError = error;
            
            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    throw new Error(`Failed to load data.json after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Merges base checklist data with saved progress from localStorage
 * @param {Array<Object>} baseData - Original checklist data from data.json
 * @param {Array<Object>|null} savedData - Saved progress data from localStorage
 * @returns {Array<Object>} Merged data with preserved progress
 */
export function mergeWithSavedProgress(baseData, savedData) {
    if (!savedData || !Array.isArray(savedData)) {
        // No saved data, return base data with default values
        return baseData.map(group => ({
            ...group,
            steps: group.steps.map(step => ({
                ...step,
                completed: false,
                notes: "",
                sub_steps: step.sub_steps ? step.sub_steps.map(subStep => ({
                    ...subStep,
                    completed: false
                })) : []
            }))
        }));
    }

    // Create lookup maps for saved step and sub-step data
    const savedStepsMap = new Map();
    const savedSubStepsMap = new Map();
    
    savedData.forEach(group => {
        if (group.steps && Array.isArray(group.steps)) {
            group.steps.forEach(step => {
                if (step.step_number) {
                    savedStepsMap.set(step.step_number, step);
                    
                    // Index sub-steps
                    if (step.sub_steps && Array.isArray(step.sub_steps)) {
                        step.sub_steps.forEach(subStep => {
                            if (subStep.sub_step_id) {
                                savedSubStepsMap.set(subStep.sub_step_id, subStep);
                            }
                        });
                    }
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
                notes: savedStep?.notes || "",
                sub_steps: step.sub_steps ? step.sub_steps.map(subStep => {
                    const savedSubStep = savedSubStepsMap.get(subStep.sub_step_id);
                    return {
                        ...subStep,
                        completed: savedSubStep?.completed || false
                    };
                }) : []
            };
        })
    }));
}

/**
 * Processes merged data to add computed values like cumulative time
 * @param {Array<Object>} mergedData - Merged checklist data
 * @returns {Array<Object>} Data with computed values added
 */
export function addComputedValues(mergedData) {
    let runningTotal = 0;
    
    return mergedData.map(group => ({
        ...group,
        steps: group.steps.map(step => {
            // Calculate total time including sub-steps
            const subStepsTime = step.sub_steps ? 
                step.sub_steps.reduce((total, subStep) => total + (subStep.time_taken || 0), 0) : 0;
            
            const totalStepTime = (step.time_taken || 0) + subStepsTime;
            runningTotal += totalStepTime;
            
            return {
                ...step,
                cumulative_time: runningTotal,
                total_step_time: totalStepTime
            };
        })
    }));
}

/**
 * Loads and processes all checklist data
 * Combines base data with saved progress and adds computed values
 * @returns {Promise<Array<Object>>} Processed checklist data
 */
export async function loadAndProcessData() {
    try {
        // Load base data from data.json
        const baseData = await loadBaseData();

        // Load saved progress from localStorage
        const savedData = loadProgress();

        // Merge base data with saved progress
        const mergedData = mergeWithSavedProgress(baseData, savedData);

        // Add computed values (cumulative time)
        const processedData = addComputedValues(mergedData);

        const totalSteps = processedData.flatMap(g => g.steps).length;
        
        if (totalSteps === 0) {
            throw new Error('No steps found in data');
        }

        return processedData;

    } catch (error) {
        console.error('Critical error in loadAndProcessData:', error);
        throw error;
    }
}