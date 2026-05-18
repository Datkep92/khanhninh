// Dashboard rendering with Firebase - 2 tabs
window.renderDashboard = async function() {
    console.log('renderDashboard called');
    
    // Kiểm tra quyền Admin
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    if (!isAdmin) {
        //window.showMessage('🔒 Chỉ Quản lý mới xem được Dashboard!');
        if (window.switchView) window.switchView('companies');
        return;
    }
    
    // Đảm bảo dữ liệu đã được load
    if (!window.companiesList || window.companiesList.length === 0) {
        await window.loadCompanies();
    }
    if (!window.tasksList || window.tasksList.length === 0) {
        await window.loadTasks();
    }
    if (!window.usersList || window.usersList.length === 0) {
        await window.loadUsers();
    }
    
    const totalCompanies = window.companiesList.length;
    const totalTasks = window.tasksList.length;
    const pendingTasks = window.tasksList.filter(t => t.status === 'pending').length;
    const processingTasks = window.tasksList.filter(t => t.status === 'processing').length;
    const doneTasks = window.tasksList.filter(t => t.status === 'done').length;
    const overdueTasks = window.tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card clickable" onclick="window.showCompanyList()">
                <i class="fas fa-building stat-icon"></i>
                <h3>Tổng HKD/Công ty</h3>
                <div class="stat-number">${totalCompanies}</div>
                <div class="stat-hint"><i class="fas fa-mouse-pointer"></i> Click để xem danh sách</div>
            </div>
            <div class="stat-card clickable" onclick="window.showTaskListByFilter('all')">
                <i class="fas fa-tasks stat-icon"></i>
                <h3>Tổng công việc</h3>
                <div class="stat-number">${totalTasks}</div>
                <div class="stat-hint"><i class="fas fa-mouse-pointer"></i> Click để xem danh sách</div>
            </div>
            <div class="stat-card clickable" onclick="window.showTaskListByFilter('processing')">
                <i class="fas fa-spinner stat-icon"></i>
                <h3>Đang xử lý</h3>
                <div class="stat-number" style="color: #2196f3;">${processingTasks}</div>
                <div class="stat-hint"><i class="fas fa-mouse-pointer"></i> Click để xem danh sách</div>
            </div>
            <div class="stat-card clickable" onclick="window.showTaskListByFilter('done')">
                <i class="fas fa-check-circle stat-icon"></i>
                <h3>Hoàn thành</h3>
                <div class="stat-number" style="color: #4caf50;">${doneTasks}</div>
                <div class="stat-hint"><i class="fas fa-mouse-pointer"></i> Click để xem danh sách</div>
            </div>
            <div class="stat-card clickable" onclick="window.showTaskListByFilter('overdue')">
                <i class="fas fa-exclamation-triangle stat-icon"></i>
                <h3>Quá hạn</h3>
                <div class="stat-number" style="color: #f44336;">${overdueTasks}</div>
                <div class="stat-hint"><i class="fas fa-mouse-pointer"></i> Click để xem danh sách</div>
            </div>
        </div>
        
        <!-- Dashboard Tabs -->
        <div class="dashboard-tabs">
            <button class="dashboard-tab active" onclick="switchDashboardTab('normal')">
                <i class="fas fa-tasks"></i> Tiến độ công việc cần làm
            </button>
            <button class="dashboard-tab" onclick="switchDashboardTab('recurring')">
                <i class="fas fa-sync-alt"></i> Công việc định kỳ
            </button>
        </div>
        
        <!-- Tab 1: Tiến độ công việc cần làm (Normal Tasks) -->
        <div id="dashboardNormalTab" class="dashboard-tab-content active">
            ${renderNormalTasksProgress()}
        </div>
        
        <!-- Tab 2: Công việc định kỳ - Tiến độ theo công ty/HKD -->
        <div id="dashboardRecurringTab" class="dashboard-tab-content hidden">
            ${renderRecurringTasksProgress()}
        </div>
    `;
    
    const dashboardView = document.getElementById('dashboardView');
    if (dashboardView) dashboardView.innerHTML = html;
};

// Render tiến độ công việc cần làm (theo nhân viên)
function renderNormalTasksProgress() {
    let staffStatsHtml = '';
    
    for (const user of window.usersList) {
        if (user.role === 'staff') {
            const stats = window.getUserStats(user.uid);
            const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            staffStatsHtml += `
                <tr style="${stats.overdue > 0 ? 'background: #fff3e0;' : ''}">
                    <td><strong>${user.name}</strong>${stats.overdue > 0 ? ' ⚠️' : ''}</td>
                    <td>${stats.total}</td>
                    <td style="color: #4caf50; font-weight: bold;">${stats.done}</td>
                    <td style="color: #2196f3;">${stats.processing}</td>
                    <td style="color: #ff9800;">${stats.pending}</td>
                    <td style="color: #f44336; font-weight: bold;">${stats.overdue}</td>
                    <td style="min-width: 150px;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                        <span style="font-size: 12px; font-weight: bold;">${percent}%</span>
                    </td>
                </tr>
            `;
        }
    }

    // Lấy 8 công việc sắp đến hạn
const today = new Date();
today.setHours(0, 0, 0, 0);

const upcomingTasks = window.tasksList
    .filter(t => t.status !== 'done' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 8);

const upcomingHtml = upcomingTasks.map(task => {
    const company = window.getCompanyById(task.companyId);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    const isUrgent = daysLeft >= 0 && daysLeft <= 7;
    
    let warningText = '';
    let warningClass = '';
    let statusText = task.status === 'pending' ? 'Chờ xử lý' : task.status === 'processing' ? 'Đang xử lý' : 'Hoàn thành';
    let statusClass = task.status === 'pending' ? 'pending' : task.status === 'processing' ? 'processing' : 'done';
    let borderClass = '';
    
    if (isOverdue) {
        warningText = `🔴 QUÁ HẠN ${Math.abs(daysLeft)} ngày`;
        warningClass = 'overdue';
        statusClass = 'overdue';
        borderClass = 'critical';
    } else if (isUrgent) {
        warningText = `⚠️ Còn ${daysLeft} ngày`;
        warningClass = 'upcoming';
        borderClass = 'urgent';
    } else {
        warningText = `📅 Còn ${daysLeft} ngày`;
        warningClass = '';
        borderClass = '';
    }
    
    const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    
    return `
        <div class="upcoming-task-item ${borderClass}" onclick="window.showTaskDetail('${task.id}')">
            <div class="upcoming-task-info">
                <div class="upcoming-task-title">
                    ${priorityIcon} ${task.title}
                </div>
                <div class="upcoming-task-company">
                    <i class="fas fa-building"></i> ${company?.name || 'N/A'}
                </div>
                <div class="upcoming-task-date">
                    <i class="fas fa-calendar"></i> Hạn: ${window.formatDate(task.dueDate)}
                </div>
                <div class="upcoming-task-warning ${warningClass}">
                    ${warningText}
                </div>
            </div>
            <div class="upcoming-task-status ${statusClass}">
                ${statusText}
            </div>
        </div>
    `;
}).join('');
    
    return `
        
        <div class="card">
            <div class="card-title">
                <span><i class="fas fa-clock"></i> Công việc sắp đến hạn</span>
                <button class="btn btn-outline btn-sm" onclick="window.showTaskListByFilter('upcoming')">Xem tất cả</button>
            </div>
            <div id="upcomingTasks">
                ${upcomingHtml || '<div class="empty-state">Không có công việc sắp đến hạn</div>'}
            </div>
        </div>
    `;
}

// Render tiến độ công việc định kỳ (theo công ty/HKD)
function renderRecurringTasksProgress() {
    // Lấy các công ty có công việc định kỳ
    const companiesWithRecurring = window.companiesList.filter(company => {
        const tasks = window.getTasksByCompany(company.id);
        return tasks.some(t => t.isRecurring === true);
    });
    
    // Tính % hoàn thành cho từng công ty
    const companyProgress = companiesWithRecurring.map(company => {
        const tasks = window.getTasksByCompany(company.id);
        const recurringTasks = tasks.filter(t => t.isRecurring === true);
        const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
        
        let completed = 0;
        for (const task of recurringTasks) {
            const completedThisPeriod = (task.history || []).some(h => h.action === 'completed' && h.period === currentPeriod);
            if (completedThisPeriod) completed++;
        }
        
        const percent = recurringTasks.length > 0 ? Math.round((completed / recurringTasks.length) * 100) : 0;
        const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
        const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
        
        return {
            id: company.id,
            name: company.name,
            type: company.type,
            badgeClass: badgeClass,
            badgeText: badgeText,
            total: recurringTasks.length,
            completed: completed,
            percent: percent,
            tasks: recurringTasks
        };
    });
    
    // Sắp xếp theo % cao nhất -> thấp nhất
    companyProgress.sort((a, b) => b.percent - a.percent);
    
    const companiesHtml = companyProgress.map(cp => {
        let statusIcon = '';
        let statusColor = '';
        if (cp.percent === 100) {
            statusIcon = '✅';
            statusColor = '#4caf50';
        } else if (cp.percent >= 50) {
            statusIcon = '🟡';
            statusColor = '#ff9800';
        } else {
            statusIcon = '🔴';
            statusColor = '#f44336';
        }
        
        return `
            <div class="company-progress-card" onclick="window.showCompanyRecurringTasks('${cp.id}')">
                <div class="company-progress-header">
                    <div class="company-name-section">
                        <span class="company-name">${cp.type === 'household' ? '🏪' : '🏭'} ${cp.name}</span>
                        <span class="company-badge ${cp.badgeClass}">${cp.badgeText}</span>
                    </div>
                    <div class="company-progress-status" style="color: ${statusColor}">
                        ${statusIcon} ${cp.percent}%
                    </div>
                </div>
                <div class="company-progress-bar">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${cp.percent}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                    </div>
                </div>
                <div class="company-progress-stats">
                    <span>✅ Hoàn thành: ${cp.completed}/${cp.total}</span>
                    <span>📋 Tổng: ${cp.total} việc định kỳ</span>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="card">
            <div class="card-title">
                <span><i class="fas fa-chart-line"></i> Tiến độ công việc định kỳ theo công ty/HKD</span>
                <span class="info-badge">Click vào công ty để xem chi tiết</span>
            </div>
            <div class="company-progress-list">
                ${companiesHtml || '<div class="empty-state">📭 Chưa có công việc định kỳ nào</div>'}
            </div>
        </div>
    `;
}

// Chuyển tab trong Dashboard
window.switchDashboardTab = function(tab) {
    const btns = document.querySelectorAll('.dashboard-tab');
    const normalTab = document.getElementById('dashboardNormalTab');
    const recurringTab = document.getElementById('dashboardRecurringTab');
    
    btns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'normal') {
        btns[0]?.classList.add('active');
        if (normalTab) normalTab.classList.remove('hidden');
        if (recurringTab) recurringTab.classList.add('hidden');
    } else {
        btns[1]?.classList.add('active');
        if (normalTab) normalTab.classList.add('hidden');
        if (recurringTab) recurringTab.classList.remove('hidden');
    }
};

// Hiển thị chi tiết công việc định kỳ của công ty
window.showCompanyRecurringTasks = async function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const tasks = window.getTasksByCompany(companyId);
    const recurringTasks = tasks.filter(t => t.isRecurring === true);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    // Tạo modal hiển thị chi tiết
    const tasksHtml = recurringTasks.map(task => {
        const completedThisPeriod = (task.history || []).some(h => h.action === 'completed' && h.period === currentPeriod);
        const frequencyText = task.frequency === 'monthly' ? 'Tháng' : task.frequency === 'quarterly' ? 'Quý' : 'Năm';
        
        // Lấy lịch sử hoàn thành
        const completedHistory = (task.history || []).filter(h => h.action === 'completed');
        const historyHtml = completedHistory.map(h => `
            <div class="history-item-mini">
                ✅ ${h.period || 'Đã hoàn thành'} - ${h.byName} (${new Date(h.at || h.timestamp).toLocaleDateString('vi-VN')})
            </div>
        `).join('');
        
        return `
            <div class="recurring-task-detail">
                <div class="recurring-task-header">
                    <span class="task-title">${task.title}</span>
                    <span class="task-badge">🔄 ${frequencyText}</span>
                    ${completedThisPeriod ? '<span class="status-badge status-done">✅ Đã xong</span>' : '<span class="status-badge status-pending">⏳ Chờ</span>'}
                </div>
                <div class="task-meta">
                    👤 ${task.assignedToName || 'Chưa phân công'} | 📅 Hạn: ${window.formatDate(task.dueDate)}
                </div>
                ${historyHtml ? `
                    <div class="task-history-mini">
                        <strong>📜 Lịch sử hoàn thành:</strong>
                        ${historyHtml}
                    </div>
                ` : '<div class="task-history-mini empty">📜 Chưa có lịch sử hoàn thành</div>'}
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>🏢 ${company.name} (${company.type === 'household' ? 'HKD' : 'CTY'})</strong>
                <span style="float: right;">📋 Tổng số: ${recurringTasks.length} công việc định kỳ</span>
            </div>
            <div class="recurring-tasks-list">
                ${tasksHtml}
            </div>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="window.closeTaskListModal()">Đóng</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = `📊 Công việc định kỳ - ${company.name}`;
    document.getElementById('taskModal').classList.remove('hidden');
};

// Các hàm hỗ trợ khác
window.showCompanyList = function() {
    window.switchView('companies');
};

window.showTaskListByFilter = function(filter) {
    let tasks = [];
    let title = '';
    
    switch(filter) {
        case 'all':
            tasks = window.tasksList;
            title = '📋 TẤT CẢ CÔNG VIỆC';
            break;
        case 'pending':
            tasks = window.tasksList.filter(t => t.status === 'pending');
            title = '⏳ CÔNG VIỆC CHỜ XỬ LÝ';
            break;
        case 'processing':
            tasks = window.tasksList.filter(t => t.status === 'processing');
            title = '🔄 CÔNG VIỆC ĐANG XỬ LÝ';
            break;
        case 'done':
            tasks = window.tasksList.filter(t => t.status === 'done');
            title = '✅ CÔNG VIỆC HOÀN THÀNH';
            break;
        case 'overdue':
            tasks = window.tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
            title = '⚠️ CÔNG VIỆC QUÁ HẠN';
            break;
        case 'upcoming':
            tasks = window.tasksList.filter(t => t.status !== 'done' && t.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            title = '📅 CÔNG VIỆC SẮP ĐẾN HẠN';
            break;
        default:
            tasks = window.tasksList;
            title = '📋 DANH SÁCH CÔNG VIỆC';
    }
    
    if (tasks.length === 0) {
        window.showMessage(`📭 Không có công việc nào!`);
        return;
    }
    
    const modalHtml = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>Tổng số: ${tasks.length} công việc</strong>
            </div>
            ${tasks.map(task => {
                const company = window.getCompanyById(task.companyId);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                const statusText = task.status === 'pending' ? 'Chờ' : task.status === 'processing' ? 'Đang xử lý' : 'Hoàn thành';
                const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                
                return `
                    <div class="task-item" style="cursor: pointer; margin-bottom: 10px;" onclick="window.closeModalAndViewTask('${task.id}')">
                        <div class="task-header">
                            <div>
                                <span class="task-title">${task.title}</span>
                                <span style="font-size: 11px; margin-left: 8px;">${priorityIcon} ${task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung' : 'Thấp'}</span>
                            </div>
                            <span class="status-badge status-${task.status}">${statusText}</span>
                        </div>
                        <div class="task-meta">
                            <span><i class="fas fa-building"></i> ${company?.name || 'N/A'}</span>
                            <span><i class="fas fa-user"></i> ${task.assignedToName || 'Chưa phân công'}</span>
                            <span><i class="fas fa-calendar"></i> Hạn: ${window.formatDate(task.dueDate)}</span>
                            ${isOverdue ? '<span style="color: #f44336; font-weight: 500;">⚠️ QUÁ HẠN</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="window.closeTaskListModal()">Đóng</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = title;
    document.getElementById('taskModal').classList.remove('hidden');
};

window.closeTaskListModal = function() {
    document.getElementById('taskModal').classList.add('hidden');
};

window.closeModalAndViewTask = async function(taskId) {
    document.getElementById('taskModal').classList.add('hidden');
    await window.viewTaskDetail(taskId);
};

window.showTaskDetail = async function(taskId) {
    await window.viewTaskDetail(taskId);
};

console.log('Dashboard module with 2 tabs loaded!');