/**
 * @fileoverview Interactive Checklist Application
 * @description A streamlined checklist management system with nested task support
 * @version 3.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    //  STATE & ELEMENTS
    // ==========================================
    
    let data = [];
    let groupCollapsed = {};
    let subStepsCollapsed = {};
    let footerCollapsed = false;
    let filter = 'all';
    let searchTerm = '';

    const el = {
        container: document.getElementById('group-container'),
        progressFooter: document.getElementById('progress-footer'),
        footerToggle: document.getElementById('footer-toggle'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressBar: document.querySelector('.progress-fill'),
        progressStat: document.getElementById('progress-stat'),
        totalTime: document.getElementById('total-time'),
        totalMoney: document.getElementById('total-money'),
        searchInput: document.getElementById('search-input'),
        searchClear: document.getElementById('search-clear'),
        filterAll: document.getElementById('filter-all'),
        filterTodo: document.getElementById('filter-todo'),
        filterCompleted: document.getElementById('filter-completed'),
        toggleAllBtn: document.getElementById('toggle-all-btn'),
        toggleSubStepsBtn: document.getElementById('toggle-substeps-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        resetBtn: document.getElementById('reset-btn')
    };

    // ==========================================
    //  UTILITIES
    // ==========================================

    const formatTime = minutes => minutes < 60 ? `${minutes}m` : `${Math.floor(minutes/60)}h${minutes%60 ? ` ${minutes%60}m` : ''}`;
    const formatMoney = amount => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 0}).format(amount);
    
    const escapeHtml = text => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const store = {
        save: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
        load: key => {
            try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
        }
    };

    // ==========================================
    //  DATA MANAGEMENT
    // ==========================================

    async function loadData() {
        const response = await fetch('./data.json');
        const rawData = await response.json();
        let stepNum = 1;
        
        return rawData.map(group => ({
            ...group,
            steps: group.steps.map(step => ({
                ...step,
                step_number: stepNum++,
                sub_steps: step.sub_steps ? step.sub_steps.map((sub, i) => ({
                    ...sub,
                    sub_step_id: `${stepNum - 1}.${i + 1}`,
                    completed: sub.completed || false
                })) : []
            }))
        }));
    }

    function computeStats() {
        const totalSteps = data.reduce((sum, group) => sum + group.steps.length, 0);
        const completedSteps = data.reduce((sum, group) => sum + group.steps.filter(s => s.completed).length, 0);
        const totalTime = data.reduce((sum, group) => sum + group.steps.reduce((s, step) => s + (step.time_taken || 0), 0), 0);
        const totalMoney = data.reduce((sum, group) => sum + group.steps.reduce((s, step) => s + parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0), 0), 0);
        
        return {
            totalSteps,
            completedSteps,
            percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            totalTime,
            totalMoney
        };
    }

    // ==========================================
    //  TARGETED UPDATE FUNCTIONS
    // ==========================================

    function updateSubStepUI(subStepId, completed) {
        const subStepElement = document.querySelector(`[data-sub-step="${subStepId}"]`);
        if (subStepElement) {
            const checkbox = subStepElement.querySelector('.sub-step-checkbox');
            
            // Update checkbox state
            if (checkbox) checkbox.checked = completed;
            
            // Update completed class with smooth transition
            if (completed) {
                subStepElement.classList.add('completed');
            } else {
                subStepElement.classList.remove('completed');
            }
        }
    }

    function updateSubStepsProgress(stepNumber) {
        const step = data.find(group => 
            group.steps.find(s => s.step_number === stepNumber)
        )?.steps.find(s => s.step_number === stepNumber);
        
        if (!step?.sub_steps) return;

        const container = document.querySelector(`[data-step="${stepNumber}"] .sub-steps-container`);
        if (!container) return;

        const completed = step.sub_steps.filter(s => s.completed).length;
        const total = step.sub_steps.length;
        const percentage = total > 0 ? (completed / total * 100) : 0;

        // Update progress bar
        const progressFill = container.querySelector('.sub-steps-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        // Update counter
        const header = container.querySelector('.sub-steps-header h4');
        if (header) {
            header.textContent = `Sub-Tasks (${completed}/${total})`;
        }
    }

    function updateStepUI(stepNumber, completed) {
        const stepElement = document.querySelector(`[data-step="${stepNumber}"]`);
        if (stepElement) {
            const checkbox = stepElement.querySelector('.step-checkbox');
            
            // Update checkbox state
            if (checkbox) checkbox.checked = completed;
            
            // Update completed class
            if (completed) {
                stepElement.classList.add('completed');
            } else {
                stepElement.classList.remove('completed');
            }

            // Update all sub-steps if they exist
            const subSteps = stepElement.querySelectorAll('.sub-step');
            subSteps.forEach(subStep => {
                const subCheckbox = subStep.querySelector('.sub-step-checkbox');
                if (subCheckbox) subCheckbox.checked = completed;
                
                if (completed) {
                    subStep.classList.add('completed');
                } else {
                    subStep.classList.remove('completed');
                }
            });

            // Update required items
            const requiredItems = stepElement.querySelectorAll('.required-item');
            requiredItems.forEach(item => {
                const itemCheckbox = item.querySelector('.required-item-checkbox');
                if (itemCheckbox) itemCheckbox.checked = completed;
                
                if (completed) {
                    item.classList.add('completed');
                } else {
                    item.classList.remove('completed');
                }
            });

            // Update sub-steps progress
            updateSubStepsProgress(stepNumber);
        }
    }

    function updateRequiredItemUI(stepNumber, itemIndex, completed) {
        const itemElement = document.querySelector(`[data-step="${stepNumber}"][data-item-index="${itemIndex}"]`);
        if (itemElement) {
            const checkbox = itemElement.querySelector('.required-item-checkbox');
            
            // Update checkbox state
            if (checkbox) checkbox.checked = completed;
            
            // Update completed class
            if (completed) {
                itemElement.classList.add('completed');
            } else {
                itemElement.classList.remove('completed');
            }
        }
    }

    function updateProgressUI() {
        const stats = computeStats();
        
        if (el.progressStat) el.progressStat.textContent = `${stats.completedSteps}/${stats.totalSteps}`;
        if (el.totalTime) el.totalTime.textContent = formatTime(stats.totalTime);
        if (el.totalMoney) el.totalMoney.textContent = formatMoney(stats.totalMoney);
        if (el.progressPercentage) el.progressPercentage.textContent = `${stats.percentage}%`;
        if (el.progressBar) el.progressBar.style.width = `${stats.percentage}%`;
        
        if (el.progressText) {
            el.progressText.textContent = stats.totalSteps === 0 ? "No steps available" :
                stats.completedSteps === stats.totalSteps ? "All steps completed! 🎉" :
                `${stats.completedSteps} of ${stats.totalSteps} steps completed`;
        }

        // Update group stats
        data.forEach(group => {
            const completed = group.steps.filter(s => s.completed).length;
            const total = group.steps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            const groupElement = document.querySelector(`[data-group="${group.group_title}"]`);
            if (groupElement) {
                const statsElement = groupElement.querySelector('.group-stats');
                if (statsElement) {
                    statsElement.textContent = `${completed}/${total} (${percentage}%)`;
                }
            }
        });
    }

    // ==========================================
    //  RENDERING
    // ==========================================

    function filterSteps(steps) {
        return steps.filter(step => {
            if (filter === 'completed' && !step.completed) return false;
            if (filter === 'todo' && step.completed) return false;
            
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return [step.step_title, step.step_instruction, step.notes, ...(step.items || [])]
                    .some(text => text?.toLowerCase().includes(search));
            }
            return true;
        });
    }

    function renderStep(step) {
        const hasSubSteps = step.sub_steps?.length > 0;
        const subCollapsed = hasSubSteps ? (subStepsCollapsed[step.step_number] !== false) : false;
        const money = parseFloat(step.money?.replace(/[^0-9.]/g, '') || 0);
        const requiredItems = step.required_items_completed || [];

        return `
            <div class="step ${step.completed ? 'completed' : ''}" data-step="${step.step_number}">
                <div class="step-header" data-step="${step.step_number}">
                    <div class="step-header-left">
                        <input type="checkbox" class="step-checkbox" ${step.completed ? 'checked' : ''} />
                        <h3 class="step-title">${escapeHtml(step.step_title)}</h3>
                    </div>
                    <div class="step-header-right">
                        <div class="step-value ${money === 0 ? 'zero-value' : ''}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${formatMoney(money)}
                        </div>
                        <div class="step-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            ${formatTime(step.time_taken || 0)}
                        </div>
                    </div>
                </div>
                <div class="step-body">
                    <p class="step-instruction">${escapeHtml(step.step_instruction)}</p>
                    ${step.items?.length ? `
                        <div class="required-items">
                            <h4>Required Items</h4>
                            <div class="required-items-list">
                                ${step.items.map((item, i) => `
                                    <div class="required-item ${requiredItems[i] ? 'completed' : ''}" data-step="${step.step_number}" data-item-index="${i}">
                                        <input type="checkbox" class="required-item-checkbox" ${requiredItems[i] ? 'checked' : ''} />
                                        <label class="required-item-label">${escapeHtml(item)}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="notes-section">
                        ${step.notes?.trim() ? `
                            <div class="note-display">${escapeHtml(step.notes)}</div>
                            <textarea class="step-notes" style="display: none;" data-step="${step.step_number}">${escapeHtml(step.notes)}</textarea>
                        ` : `
                            <button class="add-note-btn" data-step="${step.step_number}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14"></path><path d="M5 12h14"></path>
                                </svg>
                                Add Note
                            </button>
                            <textarea class="step-notes" style="display: none;" data-step="${step.step_number}"></textarea>
                        `}
                    </div>
                </div>
                ${hasSubSteps ? `
                    <div class="sub-steps-container ${subCollapsed ? 'collapsed' : ''}" data-step="${step.step_number}">
                        <div class="sub-steps-header">
                            <div class="sub-steps-header-left">
                                <h4>Sub-Tasks (${step.sub_steps.filter(s => s.completed).length}/${step.sub_steps.length})</h4>
                                <div class="sub-steps-progress">
                                    <div class="sub-steps-progress-bar">
                                        <div class="sub-steps-progress-fill" style="width: ${(step.sub_steps.filter(s => s.completed).length / step.sub_steps.length * 100)}%"></div>
                                    </div>
                                </div>
                            </div>
                            <button class="sub-steps-toggle-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>
                        <div class="sub-steps-list">
                            ${step.sub_steps.map(sub => `
                                <div class="sub-step ${sub.completed ? 'completed' : ''}" data-sub-step="${sub.sub_step_id}">
                                    <input type="checkbox" class="sub-step-checkbox" ${sub.completed ? 'checked' : ''} />
                                    <div class="sub-step-content">
                                        <h5 class="sub-step-title">${escapeHtml(sub.sub_step_title || sub.step_title || sub.title || 'Untitled')}</h5>
                                        <p class="sub-step-instruction">${escapeHtml(sub.sub_step_instruction || sub.step_instruction || sub.instruction || '')}</p>
                                        <div class="sub-step-time">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12,6 12,12 16,14"></polyline>
                                            </svg>
                                            ${formatTime(sub.time_taken || 0)}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function render() {
        if (!el.container) return;

        const html = data.map(group => {
            const collapsed = groupCollapsed[group.group_title] || false;
            const filtered = filterSteps(group.steps);
            
            if (filtered.length === 0 && searchTerm) return '';

            const completed = group.steps.filter(s => s.completed).length;
            const total = group.steps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            return `
                <div class="step-group ${collapsed ? 'collapsed' : ''}">
                    <div class="group-header" data-group="${escapeHtml(group.group_title)}">
                        <button class="group-collapse-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"></polyline>
                            </svg>
                        </button>
                        <span class="group-title">${escapeHtml(group.group_title)}</span>
                        <span class="group-stats">${completed}/${total} (${percentage}%)</span>
                    </div>
                    <div class="group-body">
                        ${filtered.map(renderStep).join('')}
                    </div>
                </div>
            `;
        }).join('');

        el.container.innerHTML = html;
        updateUI();
    }

    function updateUI() {
        const stats = computeStats();
        
        if (el.progressStat) el.progressStat.textContent = `${stats.completedSteps}/${stats.totalSteps}`;
        if (el.totalTime) el.totalTime.textContent = formatTime(stats.totalTime);
        if (el.totalMoney) el.totalMoney.textContent = formatMoney(stats.totalMoney);
        if (el.progressPercentage) el.progressPercentage.textContent = `${stats.percentage}%`;
        if (el.progressBar) el.progressBar.style.width = `${stats.percentage}%`;
        
        if (el.progressText) {
            el.progressText.textContent = stats.totalSteps === 0 ? "No steps available" :
                stats.completedSteps === stats.totalSteps ? "All steps completed! 🎉" :
                `${stats.completedSteps} of ${stats.totalSteps} steps completed`;
        }

        // Update toggle buttons
        if (el.toggleAllBtn) {
            const collapsed = data.filter(g => groupCollapsed[g.group_title]).length;
            const shouldExpand = collapsed > data.length / 2;
            const text = el.toggleAllBtn.querySelector('.button-text');
            if (text) text.textContent = shouldExpand ? 'Expand All' : 'Collapse All';
        }

        if (el.toggleSubStepsBtn) {
            const containers = document.querySelectorAll('.sub-steps-container');
            if (containers.length === 0) {
                el.toggleSubStepsBtn.style.display = 'none';
            } else {
                el.toggleSubStepsBtn.style.display = 'flex';
                const collapsed = Array.from(containers).filter(c => c.classList.contains('collapsed')).length;
                const shouldExpand = collapsed > containers.length / 2;
                const text = el.toggleSubStepsBtn.querySelector('.button-text');
                if (text) text.textContent = shouldExpand ? 'Expand Sub-Steps' : 'Collapse Sub-Steps';
            }
        }
    }

    // ==========================================
    //  EVENT HANDLERS
    // ==========================================

    function toggleStep(stepNumber) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.completed = !step.completed;
                if (step.sub_steps) step.sub_steps.forEach(sub => sub.completed = step.completed);
                if (step.items) step.required_items_completed = step.items.map(() => step.completed);
                
                // Update UI without full re-render
                updateStepUI(stepNumber, step.completed);
                updateProgressUI();
                
                store.save('checklistProgress', data);
                return;
            }
        }
    }

    function toggleSubStep(subStepId) {
        const [stepNumber, subIndex] = subStepId.split('.').map(Number);
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step?.sub_steps?.[subIndex - 1]) {
                const subStep = step.sub_steps[subIndex - 1];
                subStep.completed = !subStep.completed;
                
                // Update UI without full re-render
                updateSubStepUI(subStepId, subStep.completed);
                updateSubStepsProgress(stepNumber);
                updateProgressUI();
                
                store.save('checklistProgress', data);
                return;
            }
        }
    }

    function toggleRequiredItem(stepNumber, itemIndex) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step?.items?.[itemIndex] !== undefined) {
                if (!step.required_items_completed) step.required_items_completed = new Array(step.items.length).fill(false);
                step.required_items_completed[itemIndex] = !step.required_items_completed[itemIndex];
                
                // Update UI without full re-render
                updateRequiredItemUI(stepNumber, itemIndex, step.required_items_completed[itemIndex]);
                updateProgressUI();
                
                store.save('checklistProgress', data);
                return;
            }
        }
    }

    function toggleSubSteps(stepNumber) {
        subStepsCollapsed[stepNumber] = subStepsCollapsed[stepNumber] === undefined ? false : !subStepsCollapsed[stepNumber];
        
        // Toggle the collapsed class with smooth animation
        const container = document.querySelector(`[data-step="${stepNumber}"] .sub-steps-container`);
        if (container) {
            container.classList.toggle('collapsed', subStepsCollapsed[stepNumber]);
        }
        
        store.save('subStepsCollapseState', subStepsCollapsed);
        updateUI();
    }

    function toggleGroup(groupTitle) {
        groupCollapsed[groupTitle] = !groupCollapsed[groupTitle];
        
        // Toggle the collapsed class with smooth animation
        const groupElement = document.querySelector(`[data-group="${groupTitle}"]`).closest('.step-group');
        if (groupElement) {
            groupElement.classList.toggle('collapsed', groupCollapsed[groupTitle]);
        }
        
        store.save('groupCollapseState', groupCollapsed);
    }

    function editNote(stepNumber, noteValue) {
        for (const group of data) {
            const step = group.steps.find(s => s.step_number === stepNumber);
            if (step) {
                step.notes = noteValue;
                break;
            }
        }
        store.save('checklistProgress', data);
        render();
    }

    // ==========================================
    //  EVENT BINDING
    // ==========================================

    function bindEvents() {
        if (!el.container) return;

        el.container.addEventListener('click', e => {
            // Step header - make whole header clickable except time/value
            if (e.target.closest('.step-header') && !e.target.closest('.step-time, .step-value')) {
                const stepNumber = parseInt(e.target.closest('.step-header').dataset.step);
                toggleStep(stepNumber);
                return;
            }

            // Sub-step - make whole sub-step clickable except time
            if (e.target.closest('.sub-step') && !e.target.closest('.sub-step-time')) {
                const subStepId = e.target.closest('.sub-step').dataset.subStep;
                toggleSubStep(subStepId);
                return;
            }

            // Required item - make whole item clickable
            if (e.target.closest('.required-item')) {
                const item = e.target.closest('.required-item');
                toggleRequiredItem(parseInt(item.dataset.step), parseInt(item.dataset.itemIndex));
                return;
            }

            // Group header
            if (e.target.closest('.group-header')) {
                const groupTitle = e.target.closest('.group-header').dataset.group;
                toggleGroup(groupTitle);
                return;
            }

            // Sub-steps toggle
            if (e.target.closest('.sub-steps-header')) {
                e.stopPropagation();
                const stepNumber = parseInt(e.target.closest('.sub-steps-container').dataset.step);
                toggleSubSteps(stepNumber);
                return;
            }

            // Add note
            if (e.target.closest('.add-note-btn')) {
                const step = e.target.closest('.step');
                const textarea = step.querySelector('.step-notes');
                const addBtn = step.querySelector('.add-note-btn');
                addBtn.style.display = 'none';
                textarea.style.display = 'block';
                textarea.focus();
                return;
            }

            // Edit note
            if (e.target.classList.contains('note-display')) {
                const step = e.target.closest('.step');
                const noteDisplay = step.querySelector('.note-display');
                const textarea = step.querySelector('.step-notes');
                noteDisplay.style.display = 'none';
                textarea.style.display = 'block';
                textarea.focus();
                return;
            }
        });

        // Note editing
        el.container.addEventListener('blur', e => {
            if (e.target.classList.contains('step-notes')) {
                const stepNumber = parseInt(e.target.dataset.step);
                editNote(stepNumber, e.target.value.trim());
            }
        }, true);

        el.container.addEventListener('keydown', e => {
            if (e.target.classList.contains('step-notes') && e.key === 'Enter' && e.ctrlKey) {
                e.target.blur();
            }
        });

        // Footer toggle
        el.footerToggle?.addEventListener('click', () => {
            footerCollapsed = !footerCollapsed;
            el.progressFooter?.classList.toggle('collapsed', footerCollapsed);
            store.save('footerCollapsed', footerCollapsed);
        });

        // Search
        el.searchInput?.addEventListener('input', e => {
            searchTerm = e.target.value;
            render();
            if (el.searchClear) el.searchClear.style.opacity = e.target.value ? '1' : '0';
        });

        el.searchClear?.addEventListener('click', () => {
            if (el.searchInput) el.searchInput.value = '';
            searchTerm = '';
            render();
            el.searchClear.style.opacity = '0';
        });

        // Filters
        [el.filterAll, el.filterTodo, el.filterCompleted].forEach((btn, i) => {
            btn?.addEventListener('click', () => {
                filter = ['all', 'todo', 'completed'][i];
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render();
            });
        });

        // Toggle all groups
        el.toggleAllBtn?.addEventListener('click', () => {
            const collapsed = data.filter(g => groupCollapsed[g.group_title]).length;
            const shouldExpand = collapsed > data.length / 2;
            data.forEach(group => groupCollapsed[group.group_title] = !shouldExpand);
            store.save('groupCollapseState', groupCollapsed);
            render();
        });

        // Toggle all sub-steps
        el.toggleSubStepsBtn?.addEventListener('click', () => {
            const containers = document.querySelectorAll('.sub-steps-container');
            const collapsed = Array.from(containers).filter(c => c.classList.contains('collapsed')).length;
            const shouldExpand = collapsed > containers.length / 2;
            data.forEach(group => {
                group.steps.forEach(step => {
                    if (step.sub_steps?.length) subStepsCollapsed[step.step_number] = !shouldExpand;
                });
            });
            store.save('subStepsCollapseState', subStepsCollapsed);
            render();
        });

        // Theme toggle
        el.themeToggle?.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            store.save('checklistTheme', isDark ? 'dark' : 'light');
        });

        // Reset
        el.resetBtn?.addEventListener('click', () => {
            if (confirm('Reset all progress? This cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    // ==========================================
    //  INITIALIZATION
    // ==========================================

    try {
        // Load theme
        const savedTheme = store.load('checklistTheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
        }

        // Load data
        data = await loadData();

        // Load states
        groupCollapsed = store.load('groupCollapseState') || {};
        subStepsCollapsed = store.load('subStepsCollapseState') || {};
        footerCollapsed = store.load('footerCollapsed') || false;

        // Apply footer state
        if (el.progressFooter) el.progressFooter.classList.toggle('collapsed', footerCollapsed);

        // Merge saved progress
        const saved = store.load('checklistProgress');
        if (saved) {
            data.forEach(group => {
                const savedGroup = saved.find(sg => sg.group_title === group.group_title);
                if (savedGroup) {
                    group.steps.forEach(step => {
                        const savedStep = savedGroup.steps?.find(ss => ss.step_number === step.step_number);
                        if (savedStep) {
                            step.completed = savedStep.completed || false;
                            step.notes = savedStep.notes || '';
                            step.required_items_completed = savedStep.required_items_completed || [];
                            
                            if (step.sub_steps && savedStep.sub_steps) {
                                step.sub_steps.forEach(sub => {
                                    const savedSub = savedStep.sub_steps.find(ss => ss.sub_step_id === sub.sub_step_id);
                                    if (savedSub) sub.completed = savedSub.completed || false;
                                });
                            }
                        }
                    });
                }
            });
        }

        bindEvents();
        render();

    } catch (error) {
        console.error('Failed to initialize:', error);
        if (el.container) {
            el.container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--c-danger);">
                    <h2>Failed to load checklist</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--c-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
});