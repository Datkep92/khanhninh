// ========== CHI TIẾT CÔNG TY/HKD ==========

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

// Chuyển tab trong chi tiết công ty
window.switchCompanyTaskTab = function(tab) {
    const tabs = document.querySelectorAll('#companyNormalTasks, #companyRecurringTasks');
    const btns = document.querySelectorAll('.company-task-tab');
    
    btns.forEach(btn => btn.classList.remove('active'));
    tabs.forEach(div => div.classList.add('hidden'));
    
    if (tab === 'normal') {
        btns[0]?.classList.add('active');
        document.getElementById('companyNormalTasks')?.classList.remove('hidden');
    } else {
        btns[1]?.classList.add('active');
        document.getElementById('companyRecurringTasks')?.classList.remove('hidden');
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
    const normalTasks = companyTasks.filter(t => !t.isRecurring);
    const recurringTasks = companyTasks.filter(t => t.isRecurring);
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    // Xác định badge cho loại hình công ty
    const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
    const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
    
    // ===== CÔNG VIỆC THƯỜNG =====
    const normalTasksHtml = normalTasks.map(task => {
        const warning = getTaskWarning(task.dueDate, task.status);
        const statusText = task.status === 'pending' ? 'Chờ' : task.status === 'processing' ? 'Đang làm' : '✅ Xong';
        const statusClass = task.status === 'pending' ? 'status-pending' : task.status === 'processing' ? 'status-processing' : 'status-done';
        
        const mainHandler = task.assignedToName || 'Chưa phân công';
        const supportHandler = task.supportBy ? task.supportByName : null;
        
        // Lấy lịch sử gần nhất
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
    
    // ===== CÔNG VIỆC ĐỊNH KỲ =====
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    const recurringTasksHtml = recurringTasks.map(task => {
        const completedThisPeriod = (task.history || []).some(h => h.action === 'completed' && h.period === currentPeriod);
        const warning = !completedThisPeriod ? getTaskWarning(task.dueDate, 'pending') : '';
        const isRequired = task.required === true;
        
        const lastCompletion = (task.history || []).filter(h => h.action === 'completed').sort((a, b) => new Date(b.at) - new Date(a.at))[0];
        const completedHistory = (task.history || []).filter(h => h.action === 'completed');
        
        // Lấy lịch sử hoàn thành gần nhất
        const recentCompleted = completedHistory.slice(-3);
        
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
                        ` : lastCompletion ? `
                            <span class="completed-info">✅ Hoàn thành: ${lastCompletion.period} (${lastCompletion.byName} - ${new Date(lastCompletion.at).toLocaleDateString('vi-VN')})</span>
                        ` : '<span class="completed-info">✅ Đã hoàn thành</span>'}
                        ${isAdmin ? `<button class="btn-sm btn-danger" onclick="window.deleteTask('${task.id}')">🗑️ Xóa</button>` : ''}
                    </div>
                </div>
                ${recentCompleted.length > 0 ? `
                    <div class="task-history">
                        📜 Đã hoàn thành: ${recentCompleted.map(h => `${h.period} (${h.byName})`).join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // ===== HTML CHI TIẾT =====
    const html = `
        <div class="action-buttons">
            ${isAdmin ? `
                <button class="btn btn-secondary btn-sm" onclick="window.showEditCompanyModal('${company.id}')"><i class="fas fa-edit"></i> Sửa</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteCompany('${company.id}')"><i class="fas fa-trash"></i> Xóa</button>
                <button class="btn btn-primary btn-sm" onclick="window.generateTasksForCompany('${company.id}')"><i class="fas fa-calendar-alt"></i> Tạo việc định kỳ</button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="window.showAddTaskModal('${company.id}')"><i class="fas fa-plus"></i> Thêm việc</button>
            <button class="btn btn-outline btn-sm" onclick="window.renderCompanyDetail('${company.id}')"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        
        <!-- THÔNG TIN CÔNG TY CHI TIẾT -->
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

console.log('Company detail module loaded!');