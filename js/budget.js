/**
 * Budget Management Module
 * ========================
 * 
 * Handles budget calculations and money-related operations
 */

import { parseCurrency, formatCurrency } from './utils.js';

/**
 * Calculates budget statistics from current data
 * @param {Array<Object>} dataWithComputedValues - Current data state
 * @returns {Object} Budget statistics object
 */
export function calculateBudgetStats(dataWithComputedValues) {
    const allSteps = dataWithComputedValues.flatMap(group => group.steps);
    
    const totalBudget = allSteps.reduce((sum, step) => sum + parseCurrency(step.money), 0);
    const spentBudget = allSteps
        .filter(step => step.completed)
        .reduce((sum, step) => sum + parseCurrency(step.money), 0);
    const remainingBudget = totalBudget - spentBudget;
    const completionPercentage = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;
    
    return {
        total: totalBudget,
        spent: spentBudget,
        remaining: remainingBudget,
        percentage: completionPercentage,
        isOverBudget: spentBudget > totalBudget
    };
}

/**
 * Formats budget statistics for display
 * @param {Object} budgetStats - Budget statistics
 * @returns {Object} Formatted budget display data
 */
export function formatBudgetDisplay(budgetStats) {
    return {
        total: formatCurrency(budgetStats.total),
        spent: formatCurrency(budgetStats.spent),
        remaining: formatCurrency(budgetStats.remaining),
        percentage: Math.round(budgetStats.percentage),
        isOverBudget: budgetStats.isOverBudget
    };
}