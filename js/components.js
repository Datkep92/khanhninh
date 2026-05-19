// Components and UI helpers

function showLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
}

function hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
}

function showMessage(message, type = 'info') {
    alert(message);
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'done': 'Hoàn thành'
    };
    return statusMap[status] || status;
}

function getPriorityIcon(priority) {
    const icons = {
        'high': '🔴 Cao',
        'medium': '🟡 Trung',
        'low': '🟢 Thấp'
    };
    return icons[priority] || priority;
}

// Global functions
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showMessage = showMessage;
window.formatDate = formatDate;
window.getStatusText = getStatusText;
window.getPriorityIcon = getPriorityIcon;

// ========== FIREBASE HELPER FUNCTIONS ==========
window.firebaseRef = function(db, path) {
    return db.ref(path);
};
window.firebaseSet = function(ref, value) {
    return ref.set(value);
};
window.firebasePush = function(ref, value) {
    return ref.push(value);
};
window.firebaseUpdate = function(ref, value) {
    return ref.update(value);
};
window.firebaseRemove = function(ref) {
    return ref.remove();
};
window.firebaseGet = async function(ref) {
    const snapshot = await ref.once('value');
    return snapshot;
};

// ========== FIREBASE DATA LOADING ==========
window.companiesList = [];
window.tasksList = [];
window.usersList = [];
window.notesList = [];

// Load tất cả dữ liệu từ Firebase
window.loadAllData = async function() {
    await window.loadCompanies();
    await window.loadTasks();
    await window.loadUsers();
    await window.loadNotes();
};

window.loadCompanies = async function() {
    const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
    const snapshot = await window.firebaseGet(companiesRef);
    window.companiesList = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        window.companiesList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return window.companiesList;
};

window.loadTasks = async function() {
    const tasksRef = window.firebaseRef(window.firebaseDb, 'tasks');
    const snapshot = await window.firebaseGet(tasksRef);
    window.tasksList = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        window.tasksList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return window.tasksList;
};

window.loadUsers = async function() {
    const usersRef = window.firebaseRef(window.firebaseDb, 'users');
    const snapshot = await window.firebaseGet(usersRef);
    window.usersList = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        window.usersList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return window.usersList;
};

window.loadNotes = async function() {
    const notesRef = window.firebaseRef(window.firebaseDb, 'notes');
    const snapshot = await window.firebaseGet(notesRef);
    window.notesList = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        window.notesList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return window.notesList;
};

// Helper functions
window.getCompanyById = function(id) {
    return window.companiesList.find(c => c.id === id);
};

window.getTasksByCompany = function(companyId) {
    return window.tasksList.filter(t => t.companyId === companyId);
};

window.getTasksByUser = function(userId) {
    return window.tasksList.filter(t => t.assignedTo === userId);
};

window.getNotesByTask = function(taskId) {
    return window.notesList.filter(n => n.taskId === taskId);
};

window.getCompanyStats = function(companyId) {
    const companyTasks = window.getTasksByCompany(companyId);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    // Đếm công việc thường
    let normalTotal = 0;
    let normalPending = 0;
    let normalProcessing = 0;
    let normalDone = 0;
    let normalOverdue = 0;
    
    // Đếm công việc định kỳ
    let recurringTotal = 0;
    let recurringProcessed = 0; // Đã hoàn thành hoặc bỏ qua trong kỳ này
    
    for (const task of companyTasks) {
        if (!task.isRecurring) {
            // Công việc thường
            normalTotal++;
            if (task.status === 'pending') normalPending++;
            else if (task.status === 'processing') normalProcessing++;
            else if (task.status === 'done') normalDone++;
            
            if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
                normalOverdue++;
            }
        } else {
            // Công việc định kỳ
            recurringTotal++;
            const isProcessed = (task.history || []).some(h => 
                (h.action === 'completed' || h.action === 'skipped') && 
                h.period === currentPeriod
            );
            if (isProcessed) {
                recurringProcessed++;
            }
        }
    }
    
    // Tổng hợp
    const total = normalTotal + recurringTotal;
    const pending = normalPending + (recurringTotal - recurringProcessed); // Công việc định kỳ chưa xử lý
    const processing = normalProcessing;
    const done = normalDone + recurringProcessed; // Công việc định kỳ đã xử lý
    const overdue = normalOverdue; // Chỉ công việc thường mới tính quá hạn
    
    return {
        total: total,
        pending: pending,
        processing: processing,
        done: done,
        overdue: overdue
    };
};

// Trong components.js, cập nhật hàm getUserStats và calculateQuarterlyProgress

window.getUserStats = function(userId) {
    const userTasks = window.getTasksByUser(userId);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    return {
        total: userTasks.length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        processing: userTasks.filter(t => t.status === 'processing').length,
        done: userTasks.filter(t => t.status === 'done').length,
        overdue: userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
        // Thêm thống kê cho công việc định kỳ đã hoàn thành (bao gồm cả bỏ qua)
        recurringCompleted: userTasks.filter(t => {
            if (!t.isRecurring) return false;
            return (t.history || []).some(h => 
                (h.action === 'completed' || h.action === 'skipped') && 
                h.period === currentPeriod
            );
        }).length
    };
};

// Tính % hoàn thành công việc trong quý (tính cả bỏ qua)
function calculateQuarterlyProgress(companyId) {
    const companyTasks = window.getTasksByCompany(companyId);
    const currentQuarter = getCurrentQuarter();
    const currentYear = new Date().getFullYear();
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    // Lọc công việc định kỳ
    const recurringTasks = companyTasks.filter(t => t.isRecurring === true);
    
    // Đếm số lượng hoàn thành trong kỳ (bao gồm completed và skipped)
    const completedInPeriod = recurringTasks.filter(task => {
        const history = task.history || [];
        return history.some(h => 
            (h.action === 'completed' || h.action === 'skipped') && 
            h.period === currentPeriod
        );
    }).length;
    
    const total = recurringTasks.length;
    const done = completedInPeriod;
    
    if (total === 0) return 100;
    return Math.round((done / total) * 100);
}

// Cập nhật badge
window.updateBadges = async function() {
    if (!window.currentUser) return;
    
    await window.loadTasks();
    const myTasks = window.getTasksByUser(window.currentUser.uid);
    const pendingSupport = window.tasksList.filter(t => t.assignedTo !== window.currentUser.uid && t.status !== 'done');
    
    const myTasksBadge = document.getElementById('myTasksBadge');
    const supportBadge = document.getElementById('supportBadge');
    const notificationBadge = document.getElementById('notificationBadge');
    
    if (myTasksBadge) myTasksBadge.textContent = myTasks.filter(t => t.status !== 'done').length || '0';
    if (supportBadge) supportBadge.textContent = pendingSupport.length || '0';
    if (notificationBadge) notificationBadge.textContent = window.tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length || '0';
};



// Close modal handlers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const entityModal = document.getElementById('entityModal');
            const taskModal = document.getElementById('taskModal');
            const noteModal = document.getElementById('noteModal');
            
            if (entityModal) entityModal.classList.add('hidden');
            if (taskModal) taskModal.classList.add('hidden');
            if (noteModal) noteModal.classList.add('hidden');
        });
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

console.log('Components loaded!');