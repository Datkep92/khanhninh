// Tiến độ công việc - Nhân viên xem danh sách công ty mình quản lý
window.renderProgressView = async function() {
    await window.loadCompanies();
    await window.loadTasks();
    await window.loadUsers();
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const currentUserId = window.currentUser?.uid;
    
    // Nếu là admin, chuyển hướng về dashboard
    if (isAdmin) {
        window.showMessage('🔒 Quản lý vui lòng sử dụng Dashboard để theo dõi tiến độ!');
        if (window.switchView) window.switchView('dashboard');
        return;
    }
    
    // Lấy danh sách công ty mà nhân viên này quản lý
    const myCompanies = window.companiesList.filter(c => c.assignedTo === currentUserId);
    
    if (myCompanies.length === 0) {
        const html = `
            <div class="empty-state" style="padding: 60px 20px;">
                <i class="fas fa-building" style="font-size: 48px; opacity: 0.5;"></i>
                <p>🏢 Bạn chưa được phân công quản lý công ty/HKD nào.</p>
                <p style="font-size: 12px; color: #999; margin-top: 8px;">Vui lòng liên hệ Admin để được phân công.</p>
            </div>
        `;
        const progressView = document.getElementById('progressView');
        if (progressView) progressView.innerHTML = html;
        return;
    }
    
    // Tính % tiến độ cho từng công ty
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    const companyProgress = myCompanies.map(company => {
        const tasks = window.getTasksByCompany(company.id);
        
        // Phân loại công việc
        const normalTasks = tasks.filter(t => !t.isRecurring);
        const recurringTasks = tasks.filter(t => t.isRecurring === true);
        
        // Tính % hoàn thành công việc thường
        let normalTotal = normalTasks.length;
        let normalDone = normalTasks.filter(t => t.status === 'done').length;
        let normalPercent = normalTotal > 0 ? Math.round((normalDone / normalTotal) * 100) : 100;
        
        // Tính % hoàn thành công việc định kỳ trong tháng/quý hiện tại
        let recurringTotal = recurringTasks.length;
        let recurringDone = 0;
        for (const task of recurringTasks) {
            const completedThisPeriod = (task.history || []).some(h => 
                h.action === 'completed' && h.period === currentPeriod
            );
            if (completedThisPeriod) recurringDone++;
        }
        let recurringPercent = recurringTotal > 0 ? Math.round((recurringDone / recurringTotal) * 100) : 100;
        
        // Tính tổng thể
        const totalTasks = normalTotal + recurringTotal;
        const doneTasks = normalDone + recurringDone;
        const overallPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 100;
        
        const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
        const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
        
        // Lấy các công việc chưa hoàn thành để hiển thị cảnh báo
        const pendingTasks = tasks.filter(t => t.status !== 'done');
        const urgentTasks = pendingTasks.filter(t => t.isUrgent === true);
        
        return {
            id: company.id,
            name: company.name,
            type: company.type,
            badgeClass: badgeClass,
            badgeText: badgeText,
            assignedToName: company.assignedToName,
            normalTotal: normalTotal,
            normalDone: normalDone,
            normalPercent: normalPercent,
            recurringTotal: recurringTotal,
            recurringDone: recurringDone,
            recurringPercent: recurringPercent,
            totalTasks: totalTasks,
            doneTasks: doneTasks,
            overallPercent: overallPercent,
            pendingCount: pendingTasks.length,
            urgentCount: urgentTasks.length
        };
    });
    
    // Sắp xếp theo % hoàn thành giảm dần
    companyProgress.sort((a, b) => b.overallPercent - a.overallPercent);
    
    // Thống kê tổng thể của nhân viên
    const totalCompanies = companyProgress.length;
    const totalTasksAll = companyProgress.reduce((sum, c) => sum + c.totalTasks, 0);
    const totalDoneAll = companyProgress.reduce((sum, c) => sum + c.doneTasks, 0);
    const overallPercentAll = totalTasksAll > 0 ? Math.round((totalDoneAll / totalTasksAll) * 100) : 100;
    
    const companiesHtml = companyProgress.map(cp => {
        let statusIcon = '';
        let statusColor = '';
        let statusText = '';
        
        if (cp.overallPercent === 100) {
            statusIcon = '✅';
            statusColor = '#4caf50';
            statusText = 'Hoàn thành xuất sắc';
        } else if (cp.overallPercent >= 70) {
            statusIcon = '📈';
            statusColor = '#2196f3';
            statusText = 'Tiến độ tốt';
        } else if (cp.overallPercent >= 40) {
            statusIcon = '⚠️';
            statusColor = '#ff9800';
            statusText = 'Cần cố gắng';
        } else {
            statusIcon = '🔴';
            statusColor = '#f44336';
            statusText = 'Chậm tiến độ';
        }
        
        // Thêm cảnh báo nếu có việc khẩn
        let urgentWarning = '';
        if (cp.urgentCount > 0) {
            urgentWarning = `<span class="urgent-warning-tag">🔥 ${cp.urgentCount} việc KHẨN</span>`;
        }
        
        return `
            <div class="company-progress-card-staff" onclick="window.showCompanyTasksPopup('${cp.id}')">
                <div class="company-progress-header">
                    <div class="company-name-section">
                        <span class="company-name">${cp.type === 'household' ? '🏪' : '🏭'} ${cp.name}</span>
                        <span class="company-badge ${cp.badgeClass}">${cp.badgeText}</span>
                        ${urgentWarning}
                    </div>
                    <div class="company-progress-status" style="color: ${statusColor};">
                        ${statusIcon} ${cp.overallPercent}%
                    </div>
                </div>
                
                <div class="company-progress-bar">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${cp.overallPercent}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                    </div>
                </div>
                
                <div class="company-progress-stats">
                    <span>📋 Tổng: ${cp.totalTasks}</span>
                    <span>✅ Xong: ${cp.doneTasks}</span>
                    <span>⏳ Còn: ${cp.totalTasks - cp.doneTasks}</span>
                    <span>⚠️ Quá hạn: ${cp.urgentCount}</span>
                </div>
                
                <div class="company-progress-detail">
                    <div class="detail-item">
                        <span class="detail-label">📋 Việc thường:</span>
                        <span class="detail-value">${cp.normalDone}/${cp.normalTotal} (${cp.normalPercent}%)</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🔄 Việc định kỳ:</span>
                        <span class="detail-value">${cp.recurringDone}/${cp.recurringTotal} (${cp.recurringPercent}%)</span>
                    </div>
                </div>
                
                <div class="company-progress-footer">
                    <span class="staff-name"><i class="fas fa-user"></i> ${cp.assignedToName || 'Chưa phân công'}</span>
                    <span class="click-hint"><i class="fas fa-mouse-pointer"></i> Click để xử lý</span>
                </div>
            </div>
        `;
    }).join('');
    
    const html = `
        <div class="staff-stats-grid">
            <div class="staff-stat-card">
                <div class="staff-stat-number">${totalCompanies}</div>
                <div class="staff-stat-label">🏢 Công ty quản lý</div>
            </div>
            <div class="staff-stat-card">
                <div class="staff-stat-number">${totalTasksAll}</div>
                <div class="staff-stat-label">📋 Tổng công việc</div>
            </div>
            <div class="staff-stat-card">
                <div class="staff-stat-number" style="color: #4caf50;">${totalDoneAll}</div>
                <div class="staff-stat-label">✅ Đã hoàn thành</div>
            </div>
            <div class="staff-stat-card">
                <div class="staff-stat-number" style="color: #667eea;">${overallPercentAll}%</div>
                <div class="staff-stat-label">📊 Tiến độ chung</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">
                <span><i class="fas fa-chart-line"></i> Tiến độ công ty/HKD quản lý</span>
                <span class="info-hint">Sắp xếp theo % hoàn thành giảm dần</span>
            </div>
            <div class="company-progress-list-staff">
                ${companiesHtml}
            </div>
        </div>
    `;
    
    const progressView = document.getElementById('progressView');
    if (progressView) progressView.innerHTML = html;
};

// Hiển thị popup công việc của công ty
window.showCompanyTasksPopup = async function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const tasks = window.getTasksByCompany(companyId);
    const normalTasks = tasks.filter(t => !t.isRecurring);
    const recurringTasks = tasks.filter(t => t.isRecurring === true);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    // Sắp xếp công việc thường: làm ngay -> quá hạn -> sắp hạn
    const sortedNormal = [...normalTasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        const aOverdue = a.dueDate && new Date(a.dueDate) < new Date();
        const bOverdue = b.dueDate && new Date(b.dueDate) < new Date();
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (new Date(a.dueDate) || 0) - (new Date(b.dueDate) || 0);
    });
    
    // Render công việc thường
    const normalTasksHtml = sortedNormal.map(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
        const daysLeft = task.dueDate ? Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const isUrgent = task.isUrgent === true && task.status !== 'done';
        
        let warningHtml = '';
        if (task.status !== 'done') {
            if (isOverdue) warningHtml = `<span class="warning-overdue">🔴 QUÁ HẠN ${Math.abs(daysLeft)} ngày</span>`;
            else if (daysLeft !== null && daysLeft <= 7) warningHtml = `<span class="warning-upcoming">⚠️ Còn ${daysLeft} ngày</span>`;
        }
        
        return `
            <div class="task-card ${isUrgent ? 'urgent-task' : ''} ${task.status === 'done' ? 'completed-task' : ''}">
                ${isUrgent ? '<div class="urgent-ribbon">🔥 LÀM NGAY</div>' : ''}
                <div class="task-row">
                    <div class="task-info">
                        <span class="task-title">${task.title}</span>
                        <span class="task-priority ${task.priority}">${task.priority === 'high' ? '🔴 Cao' : task.priority === 'medium' ? '🟡 Trung' : '🟢 Thấp'}</span>
                    </div>
                    <span class="task-status status-${task.status}">${task.status === 'pending' ? 'Chờ' : task.status === 'processing' ? 'Đang làm' : '✅ Xong'}</span>
                </div>
                <div class="task-meta">
                    <span>📅 Hạn: ${window.formatDate(task.dueDate)}</span>
                    ${warningHtml}
                </div>
                <div class="task-actions">
                    <button class="btn-sm" onclick="window.viewTaskDetail('${task.id}'); window.closeTaskListModal();">📝 Chi tiết</button>
                    ${task.status !== 'done' ? `
                        ${task.status !== 'processing' ? `<button class="btn-sm btn-start" onclick="window.startTaskFromPopup('${task.id}')">▶️ Bắt đầu</button>` : ''}
                        <button class="btn-sm btn-done" onclick="window.completeTaskFromPopup('${task.id}')">✅ Hoàn thành</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Render công việc định kỳ
    const recurringTasksHtml = recurringTasks.map(task => {
        const completedThisPeriod = (task.history || []).some(h => h.action === 'completed' && h.period === currentPeriod);
        const frequencyText = task.frequency === 'monthly' ? 'Tháng' : task.frequency === 'quarterly' ? 'Quý' : 'Năm';
        const isRequired = task.required === true;
        
        return `
            <div class="task-card recurring ${completedThisPeriod ? 'completed' : ''}">
                <div class="task-row">
                    <div class="task-info">
                        <span class="task-title">${task.title}</span>
                        <span class="task-badge">🔄 ${frequencyText}</span>
                        ${isRequired ? '<span class="required-badge">📌 Bắt buộc</span>' : ''}
                    </div>
                    ${completedThisPeriod ? '<span class="task-status status-done">✅ Đã xong</span>' : '<span class="task-status status-pending">⏳ Chờ</span>'}
                </div>
                <div class="task-meta">
                    <span>📅 Hạn: ${window.formatDate(task.dueDate)}</span>
                </div>
                <div class="task-actions">
                    ${!completedThisPeriod ? `
                        <button class="btn-sm btn-done" onclick="window.completeRecurringTaskFromPopup('${task.id}')">✅ Xác nhận hoàn thành</button>
                    ` : ''}
                    <button class="btn-sm" onclick="window.viewTaskDetail('${task.id}'); window.closeTaskListModal();">📝 Chi tiết</button>
                </div>
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f2f5; border-radius: 8px;">
                <strong>🏢 ${company.name} (${company.type === 'household' ? 'HKD' : 'CTY'})</strong>
                <span style="float: right;">👤 Phụ trách: ${company.assignedToName || 'Chưa phân công'}</span>
            </div>
            
            <div class="popup-tabs">
                <button class="popup-tab active" onclick="switchPopupTab('normal')">
                    📋 Việc cần làm (${normalTasks.length})
                </button>
                <button class="popup-tab" onclick="switchPopupTab('recurring')">
                    🔄 Việc định kỳ (${recurringTasks.length})
                </button>
            </div>
            
            <div id="popupNormalTasks" class="popup-tab-content active">
                ${normalTasksHtml || '<div class="empty-state">📭 Không có việc cần làm</div>'}
            </div>
            
            <div id="popupRecurringTasks" class="popup-tab-content hidden">
                ${recurringTasksHtml || '<div class="empty-state">📭 Không có việc định kỳ</div>'}
            </div>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="window.closeTaskListModal()">Đóng</button>
        </div>
    `;
    
    document.getElementById('taskModalBody').innerHTML = modalHtml;
    document.getElementById('taskModalTitle').innerHTML = `📊 Quản lý công việc - ${company.name}`;
    document.getElementById('taskModal').classList.remove('hidden');
};

// Chuyển tab trong popup
window.switchPopupTab = function(tab) {
    const btns = document.querySelectorAll('.popup-tab');
    const normalDiv = document.getElementById('popupNormalTasks');
    const recurringDiv = document.getElementById('popupRecurringTasks');
    
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

// Các hàm xử lý từ popup
window.startTaskFromPopup = async function(taskId) {
    await window.updateTaskStatus(taskId, 'processing');
    window.closeTaskListModal();
    await window.renderProgressView();
};

window.completeTaskFromPopup = async function(taskId) {
    if (!confirm('✅ Xác nhận hoàn thành công việc này?')) return;
    await window.updateTaskStatus(taskId, 'done');
    window.closeTaskListModal();
    await window.renderProgressView();
};

window.completeRecurringTaskFromPopup = async function(taskId) {
    const task = window.tasksList.find(t => t.id === taskId);
    const period = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    if (confirm(`✅ Xác nhận hoàn thành "${task.title}" cho ${period}?`)) {
        window.showLoading();
        
        const history = task.history || [];
        history.push({
            action: 'completed',
            period: period,
            by: window.currentUser.uid,
            byName: window.currentUserData?.name,
            at: new Date().toISOString()
        });
        
        await window.firebaseUpdate(window.firebaseRef(window.firebaseDb, `tasks/${taskId}`), { history });
        await window.loadTasks();
        
        window.hideLoading();
        window.closeTaskListModal();
        await window.renderProgressView();
        window.showMessage(`✅ Đã hoàn thành "${task.title}" cho ${period}!`);
    }
};

console.log('Progress module loaded - Staff view with company list!');