/**
 * Data Management Module
 * ======================
 * 
 * Handles loading, processing, and computing data for the checklist application
 */

import { loadProgress } from './storage.js';

/**
 * Loads and processes the checklist data
 * @returns {Promise<Array>} Processed data with computed values
 */
export async function loadAndProcessData() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array of groups');
        }
        
        // Generate logical step numbers and sub-step IDs
        const dataWithNumbers = generateStepNumbers(data);
        
        // Load saved progress
        const savedProgress = loadProgress();
        
        // Merge saved progress with data
        const dataWithProgress = mergeProgressData(dataWithNumbers, savedProgress);
        
        // Compute derived values
        const dataWithComputedValues = computeValues(dataWithProgress);
        
        console.log('Data loaded and processed successfully', {
            groups: dataWithComputedValues.length,
            totalSteps: dataWithComputedValues.reduce((sum, group) => sum + group.steps.length, 0)
        });
        
        return dataWithComputedValues;
        
    } catch (error) {
        console.error('Error loading data:', error);
        throw new Error(`Failed to load checklist data: ${error.message}`);
    }
}

/**
 * Generates logical step numbers and sub-step IDs
 * @param {Array} data - Raw data from JSON
 * @returns {Array} Data with generated step numbers and sub-step IDs
 */
function generateStepNumbers(data) {
    let globalStepNumber = 1;
    
    return data.map(group => ({
        ...group,
        steps: group.steps.map(step => {
            const stepNumber = globalStepNumber++;
            
            // Generate sub-step IDs if sub_steps exist
            const processedSubSteps = step.sub_steps ? step.sub_steps.map((subStep, index) => ({
                ...subStep,
                sub_step_id: `${stepNumber}.${index + 1}`
            })) : undefined;
            
            return {
                ...step,
                step_number: stepNumber,
                sub_steps: processedSubSteps
            };
        })
    }));
}

/**
 * Merges saved progress data with the loaded data
 * @param {Array} data - Data with generated numbers
 * @param {Object} savedProgress - Saved progress from localStorage
 * @returns {Array} Data merged with saved progress
 */
function mergeProgressData(data, savedProgress) {
    if (!savedProgress || !Array.isArray(savedProgress)) {
        return data;
    }
    
    return data.map(group => {
        const savedGroup = savedProgress.find(sg => sg.group_title === group.group_title);
        if (!savedGroup) return group;
        
        return {
            ...group,
            steps: group.steps.map(step => {
                const savedStep = savedGroup.steps?.find(ss => ss.step_number === step.step_number);
                if (!savedStep) return step;
                
                // Merge step progress
                const mergedStep = {
                    ...step,
                    completed: savedStep.completed || false,
                    notes: savedStep.notes || ''
                };
                
                // Merge sub-steps progress if they exist
                if (step.sub_steps && savedStep.sub_steps) {
                    mergedStep.sub_steps = step.sub_steps.map(subStep => {
                        const savedSubStep = savedStep.sub_steps.find(sss => sss.sub_step_id === subStep.sub_step_id);
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
 * Computes derived values for groups and steps
 * @param {Array} data - Data with progress information
 * @returns {Array} Data with computed values
 */
function computeValues(data) {
    return data.map(group => {
        const processedSteps = group.steps.map(step => {
            let computedStep = { ...step };
            
            // Process sub-steps if they exist - ONLY calculate progress, no auto-completion
            if (step.sub_steps && Array.isArray(step.sub_steps)) {
                const subStepsCompleted = step.sub_steps.filter(sub => sub.completed).length;
                const totalSubSteps = step.sub_steps.length;
                
                computedStep.sub_steps_progress = {
                    completed: subStepsCompleted,
                    total: totalSubSteps,
                    percentage: totalSubSteps > 0 ? Math.round((subStepsCompleted / totalSubSteps) * 100) : 0
                };
                
                // REMOVED: Auto-completion logic that was causing conflicts
                // Let event handlers manage step completion state instead
            }
            
            // Parse money value
            if (step.money) {
                const moneyMatch = step.money.match(/\$?(\d+(?:\.\d{2})?)/);
                computedStep.money_value = moneyMatch ? parseFloat(moneyMatch[1]) : 0;
            } else {
                computedStep.money_value = 0;
            }
            
            // Ensure time_taken is a number
            computedStep.time_taken = typeof step.time_taken === 'number' ? step.time_taken : 0;
            
            return computedStep;
        });
        
        // Compute group-level statistics
        const completedSteps = processedSteps.filter(step => step.completed).length;
        const totalSteps = processedSteps.length;
        const totalMoney = processedSteps.reduce((sum, step) => sum + (step.money_value || 0), 0);
        const totalTime = processedSteps.reduce((sum, step) => sum + (step.time_taken || 0), 0);
        const completedTime = processedSteps
            .filter(step => step.completed)
            .reduce((sum, step) => sum + (step.time_taken || 0), 0);
        
        return {
            ...group,
            steps: processedSteps,
            group_stats: {
                completed_steps: completedSteps,
                total_steps: totalSteps,
                completion_percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
                total_money: totalMoney,
                total_time: totalTime,
                completed_time: completedTime,
                remaining_time: totalTime - completedTime
            }
        };
    });
}

/**
 * Recomputes all progress data for steps with sub-steps
 * @param {Array} dataWithComputedValues - Current data state
 * @returns {Array} Data with updated progress calculations
 */
export function recomputeAllProgress(dataWithComputedValues) {
    return dataWithComputedValues.map(group => ({
        ...group,
        steps: group.steps.map(step => {
            if (step.sub_steps && Array.isArray(step.sub_steps)) {
                const subStepsCompleted = step.sub_steps.filter(sub => sub.completed).length;
                const totalSubSteps = step.sub_steps.length;
                
                return {
                    ...step,
                    sub_steps_progress: {
                        completed: subStepsCompleted,
                        total: totalSubSteps,
                        percentage: totalSubSteps > 0 ? Math.round((subStepsCompleted / totalSubSteps) * 100) : 0
                    }
                };
            }
            return step;
        }),
        group_stats: (() => {
            const completedSteps = group.steps.filter(step => step.completed).length;
            const totalSteps = group.steps.length;
            const totalMoney = group.steps.reduce((sum, step) => sum + (step.money_value || 0), 0);
            const totalTime = group.steps.reduce((sum, step) => sum + (step.time_taken || 0), 0);
            const completedTime = group.steps
                .filter(step => step.completed)
                .reduce((sum, step) => sum + (step.time_taken || 0), 0);
            
            return {
                completed_steps: completedSteps,
                total_steps: totalSteps,
                completion_percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
                total_money: totalMoney,
                total_time: totalTime,
                completed_time: completedTime,
                remaining_time: totalTime - completedTime
            };
        })()
    }));
}

/**
 * Computes global statistics across all groups
 * @param {Array} dataWithComputedValues - Processed data
 * @returns {Object} Global statistics
 */
export function computeGlobalStats(dataWithComputedValues) {
    const totalSteps = dataWithComputedValues.reduce((sum, group) => 
        sum + group.group_stats.total_steps, 0);
    
    const completedSteps = dataWithComputedValues.reduce((sum, group) => 
        sum + group.group_stats.completed_steps, 0);
    
    const totalMoney = dataWithComputedValues.reduce((sum, group) => 
        sum + group.group_stats.total_money, 0);
    
    const totalTime = dataWithComputedValues.reduce((sum, group) => 
        sum + group.group_stats.total_time, 0);
    
    const completedTime = dataWithComputedValues.reduce((sum, group) => 
        sum + group.group_stats.completed_time, 0);
    
    return {
        total_steps: totalSteps,
        completed_steps: completedSteps,
        completion_percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        total_money: totalMoney,
        total_time: totalTime,
        completed_time: completedTime,
        remaining_time: totalTime - completedTime
    };
}

/**
 * Formats time in minutes to human-readable format
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
    if (!minutes || minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
        return `${remainingMinutes} min`;
    } else if (remainingMinutes === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${remainingMinutes}min`;
    }
}

/**
 * Formats money value to currency string
 * @param {number} amount - Money amount
 * @returns {string} Formatted currency string
 */
export function formatMoney(amount) {
    if (!amount || amount === 0) return '$0';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}