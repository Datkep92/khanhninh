// ========== DANH SÁCH CÔNG TY/HKD (SIDEBAR) ==========
window.selectedCompanyId = null;

// Hàm tính số ngày còn lại
function getDaysLeft(dueDate) {
    if (!dueDate) return 999;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); 
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// Đếm số lượng công ty theo nhân viên
function getStaffCompanyStats() {
    const stats = {};
    
    for (const company of window.companiesList) {
        const staffName = company.assignedToName || 'Chưa phân công';
        if (!stats[staffName]) {
            stats[staffName] = {
                total: 0,
                companies: []
            };
        }
        stats[staffName].total++;
        stats[staffName].companies.push(company);
    }
    
    return stats;
}

// Render bộ lọc nhân viên kèm số lượng
function renderStaffFilter() {
    const staffStats = getStaffCompanyStats();
    const filterSelect = document.getElementById('filterStaff');
    if (!filterSelect) return;
    
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const currentUserName = window.currentUserData?.name || window.currentUser?.email;
    
    let options = '<option value="all">👥 Tất cả nhân viên</option>';
    
    const sortedStaff = Object.keys(staffStats).sort();
    
    // Nếu là nhân viên, thêm option "Của tôi" lên đầu
    if (!isAdmin) {
        options = `<option value="${currentUserName}" selected>👤 Của tôi (${staffStats[currentUserName]?.total || 0})</option>`;
        options += '<option value="all">👥 Tất cả nhân viên</option>';
    }
    
    for (const staffName of sortedStaff) {
        if (!isAdmin && staffName === currentUserName) continue; // Đã có ở trên
        const count = staffStats[staffName].total;
        options += `<option value="${staffName}">👤 ${staffName} (${count} công ty)</option>`;
    }
    
    filterSelect.innerHTML = options;
    
    // Mặc định chọn "Của tôi" cho nhân viên
    if (!isAdmin) {
        filterSelect.value = currentUserName;
    }
}

// Lấy thông tin công ty (bao gồm việc khẩn cấp)
function getCompanyDisplayInfo(companyId) {
    const stats = window.getCompanyStats(companyId);
    const tasks = window.getTasksByCompany(companyId);
    
    // Tìm công việc khẩn cấp (làm ngay) chưa hoàn thành
    const urgentTasks = tasks.filter(t => t.isUrgent === true && t.status !== 'done');
    const hasUrgent = urgentTasks.length > 0;
    
    // Tìm công việc sắp đến hạn nhất
    let nearestDueDate = null;
    let nearestTask = null;
    
    for (const task of tasks) {
        if (task.status !== 'done' && task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (!nearestDueDate || dueDate < nearestDueDate) {
                nearestDueDate = dueDate;
                nearestTask = task;
            }
        }
    }
    
    // Tính cảnh báo
    let warningText = '';
    let warningClass = '';
    if (hasUrgent) {
        warningText = `🔥 ${urgentTasks.length} việc LÀM NGAY`;
        warningClass = 'urgent-warning';
    } else if (nearestTask && nearestTask.dueDate) {
        const daysLeft = getDaysLeft(nearestTask.dueDate);
        if (daysLeft < 0) {
            warningText = `🔴 Quá hạn ${Math.abs(daysLeft)} ngày`;
            warningClass = 'overdue-warning';
        } else if (daysLeft <= 7) {
            warningText = `⚠️ Còn ${daysLeft} ngày`;
            warningClass = 'upcoming-warning';
        }
    }
    
    // Tính % hoàn thành cho nhân viên
    let staffProgress = '';
    if (stats.total > 0) {
        const percent = Math.round((stats.done / stats.total) * 100);
        staffProgress = `${stats.done}/${stats.total} (${percent}%)`;
    } else {
        staffProgress = 'Chưa có việc';
    }
    
    return {
        stats,
        warningText,
        warningClass,
        staffProgress,
        nearestTask,
        hasUrgent,
        urgentCount: urgentTasks.length
    };
}

// Render danh sách công ty - GIAO DIỆN 2 DÒNG
window.renderCompanyList = function() {
    if (!window.companiesList) return;
    
    const searchTerm = document.getElementById('searchCompany')?.value.toLowerCase() || '';
    const staffFilter = document.getElementById('filterStaff')?.value || 'all';
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    const currentUserName = window.currentUserData?.name || window.currentUser?.email;
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    let filtered = window.companiesList.filter(c => c.name.toLowerCase().includes(searchTerm));
    
    if (staffFilter !== 'all') {
        filtered = filtered.filter(c => (c.assignedToName || 'Chưa phân công') === staffFilter);
    }
    
    const container = document.getElementById('companyList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">🏢 Không có công ty nào</div>';
        return;
    }
    
    container.innerHTML = filtered.map(company => {
        const stats = window.getCompanyStats(company.id);
        const tasks = window.getTasksByCompany(company.id);
        const isActive = window.selectedCompanyId === company.id;
        const isMyCompany = !isAdmin && company.assignedToName === currentUserName;
        
        // Tìm công việc khẩn cấp / cảnh báo
        const urgentTasks = tasks.filter(t => t.isUrgent === true && t.status !== 'done');
        const hasUrgent = urgentTasks.length > 0;
        
        let statusIcon = '';
        let statusText = '';
        let statusColor = '';
        
        if (hasUrgent) {
            statusIcon = '🔥';
            statusText = 'Khẩn cấp';
            statusColor = '#f44336';
        } else if (stats.overdue > 0) {
            statusIcon = '🔴';
            statusText = 'Quá hạn';
            statusColor = '#f44336';
        } else if (stats.pending > 0) {
            statusIcon = '⚠️';
            statusText = 'Đang xử lý';
            statusColor = '#ff9800';
        } else if (stats.total === 0 && tasks.filter(t => t.isRecurring).length === 0) {
            statusIcon = '✅';
            statusText = 'Chưa có việc';
            statusColor = '#4caf50';
        } else {
            statusIcon = '✅';
            statusText = 'Hoàn thành';
            statusColor = '#4caf50';
        }
        
        // ===== TÍNH % HOÀN THÀNH (BAO GỒM CẢ CÔNG VIỆC ĐỊNH KỲ) =====
        let totalTasks = stats.total; // Công việc thường
        let completedTasks = stats.done; // Công việc thường đã hoàn thành
        
        // Cộng thêm công việc định kỳ
        for (const task of tasks) {
            if (task.isRecurring === true) {
                totalTasks++;
                const isProcessed = (task.history || []).some(h => 
                    (h.action === 'completed' || h.action === 'skipped') && 
                    h.period === currentPeriod
                );
                if (isProcessed) {
                    completedTasks++;
                }
            }
        }
        
        const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const badgeClass = company.type === 'household' ? 'badge-hkd' : 'badge-company';
        const badgeText = company.type === 'household' ? 'HKD' : 'CTY';
        
        return `
            <div class="company-card-simple ${isActive ? 'active' : ''}" onclick="window.selectCompany('${company.id}')">
                <!-- Dòng 1: Cảnh báo + Loại hình + Tên -->
                <div class="company-row">
                    <div class="company-status-badge" style="background: ${statusColor}20; color: ${statusColor};">
                        ${statusIcon} ${statusText}
                    </div>
                    <span class="company-badge ${badgeClass}">${badgeText}</span>
                    <span class="company-name">${escapeHtml(company.name)}</span>
                </div>
                
                <!-- Dòng 2: Tên quản lý + Thanh tiến trình -->
                <div class="company-row">
                    <div class="company-staff">
                        <i class="fas fa-user"></i> ${escapeHtml(company.assignedToName) || 'Chưa phân công'}
                    </div>
                    <div class="company-progress-mini">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${percent}%"></div>
                        </div>
                        <span>${percent}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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

// Hàm chọn công ty
window.selectCompany = function(companyId) {
    console.log('selectCompany called:', companyId);
    window.selectedCompanyId = companyId;
    window.renderCompanyList();
    if (window.renderCompanyDetail) {
        window.renderCompanyDetail(companyId);
    }
};

// Render toàn bộ view companies
window.renderCompaniesView = async function() {
    console.log('renderCompaniesView called');
    
    await window.loadCompanies();
    await window.loadUsers();
    
    const canAddCompany = window.currentUser != null;
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    const html = `
        <div class="two-columns">
            <!-- Sidebar trái: Danh sách công ty -->
            <div class="company-list-panel">
                <div class="close-sidebar-btn" onclick="window.closeCompanyList()">
                    <i class="fas fa-times"></i> Đóng
                </div>
                <div class="card">
                    <div class="card-title">
                        <span><i class="fas fa-list"></i> Danh sách HKD/Công ty</span>
                        <div style="display: flex; gap: 8px;">
                            ${canAddCompany ? '<button class="btn btn-primary btn-sm" onclick="window.showAddCompanyModal()"><i class="fas fa-plus"></i> Thêm</button>' : ''}
                            ${canAddCompany ? '<button class="btn btn-outline btn-sm" onclick="window.showImportExcelModal()"><i class="fas fa-file-import"></i> Import</button>' : ''}
                        </div>
                    </div>
                    <div class="search-box">
                        <input type="text" id="searchCompany" placeholder="🔍 Tìm kiếm công ty/HKD...">
                    </div>
                    <div class="filter-group">
                        <select class="filter-select" id="filterStaff">
                            <option value="all">👥 Đang tải...</option>
                        </select>
                    </div>
                    <div class="company-items" id="companyList"></div>
                </div>
            </div>
            
            <!-- Chi tiết công ty bên phải -->
            <div class="company-detail-panel" id="companyDetailPanel">
                <div class="empty-state">
                    <i class="fas fa-building" style="font-size: 48px;"></i>
                    <p>🏢 Chọn một công ty/HKD để xem chi tiết</p>
                </div>
            </div>
        </div>
    `;
    
    const companiesView = document.getElementById('companiesView');
    if (companiesView) companiesView.innerHTML = html;
    
    renderStaffFilter();
    
    const searchInput = document.getElementById('searchCompany');
    const staffFilter = document.getElementById('filterStaff');
    
    if (searchInput) searchInput.addEventListener('input', () => window.renderCompanyList());
    if (staffFilter) staffFilter.addEventListener('change', () => window.renderCompanyList());
    
    window.renderCompanyList();
    
    // Chọn công ty đầu tiên trong danh sách hiển thị
    const staffFilterValue = staffFilter?.value;
    let firstCompany = null;
    
    if (staffFilterValue === 'all') {
        firstCompany = window.companiesList[0];
    } else if (staffFilterValue && staffFilterValue !== 'all') {
        firstCompany = window.companiesList.find(c => c.assignedToName === staffFilterValue);
        if (!firstCompany) firstCompany = window.companiesList[0];
    } else {
        firstCompany = window.companiesList[0];
    }
    
    if (firstCompany && !window.selectedCompanyId) {
        window.selectCompany(firstCompany.id);
    } else if (window.selectedCompanyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(window.selectedCompanyId);
    }
};

console.log('Company list module loaded!');

// ========== MOBILE FUNCTIONS ==========
// Biến lưu trạng thái danh sách có đang mở không
let isCompanyListOpen = false;

// Mở danh sách công ty trên mobile
window.openCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.add('open');
        isCompanyListOpen = true;
    }
};

// Đóng danh sách công ty trên mobile
window.closeCompanyList = function() {
    const sidebar = document.querySelector('.company-list-panel');
    if (sidebar) {
        sidebar.classList.remove('open');
        isCompanyListOpen = false;
    }
};

// Toggle danh sách công ty
window.toggleCompanyList = function() {
    if (isCompanyListOpen) {
        window.closeCompanyList();
    } else {
        window.openCompanyList();
    }
};

// Quay lại danh sách (từ chi tiết công ty) - ĐÃ THÊM HÀM NÀY
window.backToCompanyList = function() {
    window.openCompanyList();
    // Cuộn lên đầu trang detail
    const detailPanel = document.querySelector('.company-detail-panel');
    if (detailPanel) {
        detailPanel.scrollTop = 0;
    }
};

// Ghi đè hàm selectCompany để tự động đóng sidebar trên mobile
const originalSelectCompany = window.selectCompany;
window.selectCompany = function(companyId) {
    console.log('selectCompany called:', companyId);
    window.selectedCompanyId = companyId;
    window.renderCompanyList();
    if (window.renderCompanyDetail) {
        window.renderCompanyDetail(companyId);
    }
    // Trên mobile, tự động đóng sidebar sau khi chọn công ty
    if (window.innerWidth <= 768) {
        window.closeCompanyList();
    }
};

console.log('Mobile functions loaded!');