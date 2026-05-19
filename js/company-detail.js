// ========== CHI TIẐT CÔNG TY/HKD ==========

// Format ngày giờ
function formatDateTime(dateString) {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Kiểm tra số ngày còn lại
function getDaysLeft(dueDate) {
    if (!dueDate) return 999;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// Lấy cảnh báo hạn
function getTaskWarning(dueDate, status) {
    if (status === 'done') return '';
    const daysLeft = getDaysLeft(dueDate);
    if (daysLeft < 0) return `<span class="warning-overdue">🔴 QUÁ HẠN ${Math.abs(daysLeft)} ngày</span>`;
    if (daysLeft <= 7) return `<span class="warning-upcoming">⚠️ Còn ${daysLeft} ngày</span>`;
    return '';
}

// Hàm lấy thời gian hoàn thành của task
function getCompletionTime(task) {
    if (task.completedAt) return task.completedAt;
    const completedHistory = (task.history || []).find(h => h.action === 'completed');
    if (completedHistory) return completedHistory.at || completedHistory.timestamp;
    return task.updatedAt || task.createdAt;
}

// Chuyển tab trong chi tiết công ty
window.switchCompanyTaskTab = function(tab) {
    const btns = document.querySelectorAll('.company-task-tab');
    const normalDiv = document.getElementById('companyNormalTasks');
    const recurringDiv = document.getElementById('companyRecurringTasks');
    
    btns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'normal') {
        btns[0]?.classList.add('active');
        if (normalDiv) normalDiv.classList.remove('hidden');
        if (recurringDiv) recurringDiv.classList.add('hidden');
    } else {
        btns[1]?.classList.add('active');
        if (normalDiv) normalDiv.classList.add('hidden');
        if (recurringDiv) recurringDiv.classList.remove('hidden');
    }
};

// Render chi tiết công ty
window.renderCompanyDetail = async function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) {
        console.error('Company not found:', companyId);
        return;
    }
    
    const stats = window.getCompanyStats(companyId);
    const companyTasks = window.getTasksByCompany(companyId);
    
    // Lấy danh sách công việc
    const allNormalTasks = companyTasks.filter(t => !t.isRecurring);
    const allRecurringTasks = companyTasks.filter(t => t.isRecurring === true);
    
    // ===== SẮP XẾP CÔNG VIỆC THƯỜNG =====
    const normalTasks = [...allNormalTasks].sort((a, b) => {
        const aDone = a.status === 'done';
        const bDone = b.status === 'done';
        
        if (aDone === bDone) {
            if (aDone) {
                const aTime = getCompletionTime(a);
                const bTime = getCompletionTime(b);
                return new Date(bTime) - new Date(aTime);
            } else {
                if (a.isUrgent && !b.isUrgent) return -1;
                if (!a.isUrgent && b.isUrgent) return 1;
                
                const aOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                const bOverdue = b.dueDate && new Date(b.dueDate) < new Date();
                if (aOverdue && !bOverdue) return -1;
                if (!aOverdue && bOverdue) return 1;
                
                const aDays = a.dueDate ? Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 999;
                const bDays = b.dueDate ? Math.ceil((new Date(b.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 999;
                return aDays - bDays;
            }
        }
        return aDone ? 1 : -1;
    });
    
    // ===== SẮP XẾP CÔNG VIỆC ĐỊNH KỲ =====
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    const recurringTasks = [...allRecurringTasks].sort((a, b) => {
        const aCompleted = (a.history || []).some(h => (h.action === 'completed' || h.action === 'skipped') && h.period === currentPeriod);
        const bCompleted = (b.history || []).some(h => (h.action === 'completed' || h.action === 'skipped') && h.period === currentPeriod);
        
        if (aCompleted === bCompleted) {
            const aDue = a.dueDate ? new Date(a.dueDate) : new Date(0);
            const bDue = b.dueDate ? new Date(b.dueDate) : new Date(0);
            return aDue - bDue;
        }
        return aCompleted ? 1 : -1;
    });
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const isAssignedStaff = company.assignedTo === window.currentUser?.uid;
    const canEdit = isAdmin || isAssignedStaff;
    
    const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
    const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
    
    // ===== CÔNG VIỆC THƯỜNG HTML =====
    const normalTasksHtml = normalTasks.map(task => {
        const warning = getTaskWarning(task.dueDate, task.status);
        const statusText = task.status === 'pending' ? 'Chờ' : task.status === 'processing' ? 'Đang làm' : '✅ Xong';
        const statusClass = task.status === 'pending' ? 'status-pending' : task.status === 'processing' ? 'status-processing' : 'status-done';
        
        const mainHandler = task.assignedToName || 'Chưa phân công';
        const supportHandler = task.supportBy ? task.supportByName : null;
        
        const recentHistory = (task.history || []).slice(-3);
        
        return `
            <div class="task-card ${task.isUrgent && task.status !== 'done' ? 'urgent-task' : ''}">
                ${task.isUrgent && task.status !== 'done' ? '<div class="urgent-ribbon">🔥 LÀM NGAY</div>' : ''}
                <div class="task-row">
                    <div class="task-info">
                        <span class="task-title">${escapeHtml(task.title)}</span>
                        <span class="task-priority ${task.priority}">${task.priority === 'high' ? '🔴 Cao' : task.priority === 'medium' ? '🟡 Trung' : '🟢 Thấp'}</span>
                    </div>
                    <span class="task-status ${statusClass}">${statusText}</span>
                </div>
                <div class="task-row">
                    <div class="task-meta">
                        👤 <strong>Chính:</strong> ${escapeHtml(mainHandler)}
                        ${supportHandler ? ` | 🤝 <strong>Hỗ trợ:</strong> ${escapeHtml(supportHandler)}` : ''}
                    </div>
                    <div class="task-date">
                        📅 Tạo: ${formatDateTime(task.createdAt)}
                    </div>
                </div>
                <div class="task-row">
                    <div class="task-meta">
                        📅 Hạn: ${window.formatDate(task.dueDate)} ${warning}
                    </div>
                    <div class="task-actions">
                        <button class="btn-sm" onclick="window.viewTaskNotes('${task.id}')">📝 Ghi chú</button>
                        ${task.status !== 'done' && task.assignedTo === window.currentUser?.uid ? `
                            ${task.status !== 'processing' ? `<button class="btn-sm btn-start" onclick="window.startTask('${task.id}')">▶️ Bắt đầu</button>` : ''}
                            <button class="btn-sm btn-done" onclick="window.completeTask('${task.id}')">✅ Hoàn thành</button>
                        ` : ''}
                        ${isAdmin ? `<button class="btn-sm btn-danger" onclick="window.deleteTask('${task.id}')">🗑️ Xóa</button>` : ''}
                    </div>
                </div>
                ${recentHistory.length > 0 ? `
                    <div class="task-history">
                        📜 ${recentHistory.map(h => {
                            let action = '';
                            if (h.action === 'created') action = '✨ Tạo';
                            else if (h.action === 'started') action = '▶️ Bắt đầu';
                            else if (h.action === 'completed') action = '✅ Hoàn thành';
                            else if (h.action === 'supported') action = '🤝 Hỗ trợ';
                            else action = h.action;
                            return `${action} (${h.byName || h.by} - ${new Date(h.at || h.timestamp).toLocaleString('vi-VN')})`;
                        }).join(' | ')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // ===== CÔNG VIỆC ĐỊNH KỲ HTML =====
    const recurringTasksHtml = recurringTasks.map(task => {
        // Kiểm tra đã hoàn thành hoặc bỏ qua trong kỳ này
        const completedThisPeriod = (task.history || []).some(h => 
            (h.action === 'completed' || h.action === 'skipped') && h.period === currentPeriod
        );
        const warning = !completedThisPeriod ? getTaskWarning(task.dueDate, 'pending') : '';
        const isRequired = task.required === true;
        
        // Lấy lịch sử (bao gồm cả completed và skipped)
        const allHistory = (task.history || [])
            .filter(h => h.action === 'completed' || h.action === 'skipped')
            .sort((a, b) => new Date(b.at) - new Date(a.at));
        const recentHistory = allHistory.slice(-3);
        
        // Lấy lần cuối cùng hoàn thành hoặc bỏ qua
        const lastAction = allHistory[0];
        
        // Lấy lịch sử để hiển thị
        let historyHtml = '';
        if (allHistory.length > 0) {
            historyHtml = `
                <div class="recurring-history-sm">
                    <div class="history-header-sm" onclick="toggleRecurringHistory(this)">
                        <i class="fas fa-history"></i> Lịch sử (${allHistory.length})
                        <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                    </div>
                    <div class="history-list-sm">
                        ${allHistory.map(h => {
                            const icon = h.action === 'completed' ? '✅' : '⏭️';
                            const text = h.action === 'completed' ? 'Hoàn thành' : 'Bỏ qua';
                            return `
                                <div class="history-item-sm">
                                    <span class="history-period-sm">${h.period || 'Đã xử lý'}</span>
                                    <span class="history-user-sm">${icon} ${text} - ${h.byName}</span>
                                    <span class="history-date-sm">📅 ${new Date(h.at || h.timestamp).toLocaleDateString('vi-VN')}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="task-card recurring ${completedThisPeriod ? 'completed' : ''}">
                <div class="task-row">
                    <div class="task-info">
                        <span class="task-title">${escapeHtml(task.title)}</span>
                        <span class="task-badge">🔄 ${task.frequency === 'monthly' ? 'Tháng' : task.frequency === 'quarterly' ? 'Quý' : 'Năm'}</span>
                        ${isRequired ? '<span class="required-badge">📌 Bắt buộc</span>' : ''}
                    </div>
                    ${completedThisPeriod ? '<span class="task-status status-done">✅ Đã xong</span>' : ''}
                </div>
                <div class="task-row">
                    <div class="task-meta">
                        👤 <strong>Phụ trách:</strong> ${escapeHtml(task.assignedToName) || 'Chưa phân công'}
                    </div>
                    <div class="task-date">
                        📅 Tạo: ${formatDateTime(task.createdAt)}
                    </div>
                </div>
                <div class="task-row">
                    <div class="task-meta">
                        📅 Hạn: ${window.formatDate(task.dueDate)} ${warning}
                    </div>
                    <div class="task-actions">
                        ${!completedThisPeriod ? `
                            <button class="btn-sm btn-done" onclick="window.completeRecurringTaskFromCompany('${task.id}')">✅ Xác nhận</button>
                            ${!isRequired ? `<button class="btn-sm btn-skip" onclick="window.skipRecurringTaskFromCompany('${task.id}')">⏭️ Bỏ qua</button>` : ''}
                        ` : lastAction ? `
                            <span class="completed-info">
                                ${lastAction.action === 'completed' ? '✅' : '⏭️'} 
                                ${lastAction.action === 'completed' ? 'Hoàn thành' : 'Đã bỏ qua'}: 
                                ${lastAction.period} (${lastAction.byName} - ${new Date(lastAction.at).toLocaleDateString('vi-VN')})
                            </span>
                        ` : '<span class="completed-info">✅ Đã xử lý</span>'}
                        ${isAdmin ? `<button class="btn-sm btn-danger" onclick="window.deleteTask('${task.id}')">🗑️ Xóa</button>` : ''}
                    </div>
                </div>
                ${historyHtml}
            </div>
        `;
    }).join('');
    
    // Nút quay lại trên mobile
    const backButton = window.innerWidth <= 768 ? `
        <div class="back-to-list-btn" onclick="window.backToCompanyList()">
            <i class="fas fa-arrow-left"></i> Danh sách
        </div>
    ` : '';
    
    // ===== HTML CHI TIẾT =====
    const html = `
        ${backButton}
        <div class="action-buttons">
            ${canEdit ? `
                <button class="btn btn-secondary btn-sm" onclick="window.showEditCompanyModal('${company.id}')"><i class="fas fa-edit"></i> Sửa thông tin</button>
            ` : ''}
            ${isAdmin ? `
                <button class="btn btn-danger btn-sm" onclick="window.deleteCompany('${company.id}')"><i class="fas fa-trash"></i> Xóa công ty</button>
                <button class="btn btn-primary btn-sm" onclick="window.generateTasksForCompany('${company.id}')"><i class="fas fa-calendar-alt"></i> Tạo việc định kỳ</button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="window.showAddTaskModal('${company.id}')"><i class="fas fa-plus"></i> Thêm việc</button>
            <button class="btn btn-outline btn-sm" onclick="window.renderCompanyDetail('${company.id}')"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        
        <!-- THÔNG TIN CÔNG TY -->
        <div class="company-info-header">
            <div class="company-title-section">
                <h2 class="company-detail-title">
                    <i class="fas ${company.type === 'household' ? 'fa-store' : 'fa-building'}"></i> 
                    ${escapeHtml(company.name)}
                </h2>
                <span class="company-badge-large ${badgeClass}">${badgeText}</span>
            </div>
            <div class="company-meta-info">
                <div class="meta-item">
                    <i class="fas fa-user-tie"></i> 
                    <strong>Phụ trách:</strong> ${escapeHtml(company.assignedToName) || 'Chưa phân công'}
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i> 
                    <strong>Ngày tạo:</strong> ${formatDateTime(company.createdAt)}
                </div>
                ${company.updatedAt ? `
                    <div class="meta-item">
                        <i class="fas fa-edit"></i> 
                        <strong>Cập nhật:</strong> ${formatDateTime(company.updatedAt)}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="info-card">
            <div class="info-row">
                <span><i class="fas fa-map-marker-alt"></i> 📍 ${escapeHtml(company.address) || 'Chưa có địa chỉ'}</span>
                <span><i class="fas fa-phone"></i> 📞 ${escapeHtml(company.phone) || 'Chưa có số'}</span>
                <span><i class="fas fa-file-invoice"></i> 📄 MST: ${escapeHtml(company.taxCode) || 'Chưa có'}</span>
            </div>
            <div class="stats-row">
                <span>📋 Tổng việc: <strong>${stats.total}</strong></span>
                <span>⏳ Chờ: <strong>${stats.pending}</strong></span>
                <span>🔄 Đang làm: <strong>${stats.processing}</strong></span>
                <span>✅ Xong: <strong>${stats.done}</strong></span>
                <span class="${stats.overdue > 0 ? 'stat-warning' : ''}">⚠️ Quá hạn: <strong>${stats.overdue}</strong></span>
            </div>
        </div>
        ${company.history && company.history.length > 0 ? `
            <div class="company-history" style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                <details>
                    <summary style="cursor: pointer; font-size: 12px; color: #667eea;">
                        <i class="fas fa-history"></i> Lịch sử thay đổi (${company.history.length})
                    </summary>
                    <div style="margin-top: 8px; font-size: 11px; max-height: 150px; overflow-y: auto;">
                        ${company.history.slice(-10).reverse().map(h => `
                            <div style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="color: ${h.action === 'transferred' ? '#ff9800' : '#667eea'}">
                                    ${h.action === 'transferred' ? '🔄' : h.action === 'created' ? '✨' : '✏️'}
                                </span>
                                <strong>${h.title || h.action}:</strong> ${h.description}
                                <span style="color: #999; float: right;">${new Date(h.at).toLocaleDateString('vi-VN')}</span>
                            </div>
                        `).join('')}
                    </div>
                </details>
            </div>
        ` : ''}
        <div class="company-task-tabs">
            <button class="company-task-tab active" onclick="switchCompanyTaskTab('normal')">
                <i class="fas fa-tasks"></i> Việc cần làm 
                <span class="tab-count">${normalTasks.length}</span>
                ${normalTasks.filter(t => t.isUrgent && t.status !== 'done').length > 0 ? 
                    `<span class="urgent-count">🔥 ${normalTasks.filter(t => t.isUrgent && t.status !== 'done').length}</span>` : ''}
            </button>
            <button class="company-task-tab" onclick="switchCompanyTaskTab('recurring')">
                <i class="fas fa-sync-alt"></i> Việc định kỳ 
                <span class="tab-count">${recurringTasks.length}</span>
            </button>
        </div>
        
        <div id="companyNormalTasks" class="task-list-container">
            ${normalTasksHtml || '<div class="empty-state">📭 Chưa có việc gì. Hãy thêm công việc mới!</div>'}
        </div>
        
        <div id="companyRecurringTasks" class="task-list-container hidden">
            ${recurringTasksHtml || '<div class="empty-state">📭 Chưa có việc định kỳ. Admin hãy nhấn "Tạo việc định kỳ"!</div>'}
        </div>
    `;
    
    const detailPanel = document.getElementById('companyDetailPanel');
    if (detailPanel) detailPanel.innerHTML = html;
};

// Hàm thoát HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ========== RECURRING TASK ACTIONS ==========

// Hoàn thành công việc định kỳ
window.completeRecurringTaskFromCompany = async function(taskId) {
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) {
        window.showMessage('Không tìm thấy công việc!');
        return;
    }
    
    const period = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    if (!confirm(`✅ Xác nhận hoàn thành "${task.title}" cho ${period}?`)) {
        return;
    }
    
    window.showLoading();
    
    const history = task.history || [];
    // Xóa log cũ của kỳ này (nếu có)
    const filteredHistory = history.filter(h => !(h.period === period));
    
    filteredHistory.push({
        action: 'completed',
        title: '✅ Hoàn thành công việc định kỳ',
        description: `Đã hoàn thành công việc cho ${period}`,
        period: period,
        by: window.currentUser.uid,
        byName: window.currentUserData?.name || window.currentUser?.email,
        at: new Date().toISOString(),
        timestamp: new Date().toISOString()
    });
    
    const updates = {
        history: filteredHistory,
        lastCompletedAt: new Date().toISOString(),
        lastCompletedBy: window.currentUser.uid,
        lastCompletedByName: window.currentUserData?.name,
        lastCompletedPeriod: period,
        status: 'pending',
        updatedAt: new Date().toISOString()
    };
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, updates);
    
    await window.loadTasks();
    
    if (window.selectedCompanyId) {
        await window.renderCompanyDetail(window.selectedCompanyId);
    }
    if (window.renderCompanyList) window.renderCompanyList();
    
    window.hideLoading();
    window.showMessage(`✅ Đã hoàn thành "${task.title}" cho ${period}!`);
};

// Bỏ qua công việc định kỳ (vẫn tính vào tiến độ)
window.skipRecurringTaskFromCompany = async function(taskId) {
    const task = window.tasksList.find(t => t.id === taskId);
    if (!task) {
        window.showMessage('Không tìm thấy công việc!');
        return;
    }
    
    const period = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    if (!confirm(`⏭️ Bỏ qua "${task.title}" cho ${period}?\n\nCông việc này sẽ được đánh dấu là đã xử lý (bỏ qua).`)) {
        return;
    }
    
    window.showLoading();
    
    const history = task.history || [];
    // Xóa log cũ của kỳ này (nếu có)
    const filteredHistory = history.filter(h => !(h.period === period));
    
    filteredHistory.push({
        action: 'skipped',
        title: '⏭️ Bỏ qua công việc định kỳ',
        description: `Đã bỏ qua công việc cho ${period}`,
        period: period,
        by: window.currentUser.uid,
        byName: window.currentUserData?.name || window.currentUser?.email,
        at: new Date().toISOString(),
        timestamp: new Date().toISOString()
    });
    
    const updates = {
        history: filteredHistory,
        lastSkippedAt: new Date().toISOString(),
        lastSkippedBy: window.currentUser.uid,
        lastSkippedByName: window.currentUserData?.name,
        lastSkippedPeriod: period,
        status: 'pending',
        updatedAt: new Date().toISOString()
    };
    
    const taskRef = window.firebaseRef(window.firebaseDb, `tasks/${taskId}`);
    await window.firebaseUpdate(taskRef, updates);
    
    await window.loadTasks();
    
    if (window.selectedCompanyId) {
        await window.renderCompanyDetail(window.selectedCompanyId);
    }
    if (window.renderCompanyList) window.renderCompanyList();
    
    window.hideLoading();
    window.showMessage(`⏭️ Đã bỏ qua "${task.title}" cho ${period}!`);
};
// ========== TOGGLE FUNCTIONS ==========

// Toggle lịch sử cho recurring task
window.toggleRecurringHistory = function(element) {
    const list = element.nextElementSibling;
    const icon = element.querySelector('.fa-chevron-down');
    if (list) {
        if (list.style.display === 'none' || !list.style.display) {
            list.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            list.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
};

// Toggle lịch sử cho normal task (nếu có)
window.toggleNormalHistory = function(element) {
    const list = element.nextElementSibling;
    const icon = element.querySelector('.fa-chevron-down');
    if (list) {
        if (list.style.display === 'none' || !list.style.display) {
            list.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            list.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
};

// Toggle lịch sử chung
window.toggleHistory = function(element) {
    const content = element.nextElementSibling;
    const icon = element.querySelector('.fa-chevron-down');
    if (content) {
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
};
console.log('Company detail module loaded!');