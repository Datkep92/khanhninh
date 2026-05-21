// ========== COMPONENTS AND UI HELPERS ==========

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

// ========== GLOBAL DATA STORES ==========
window.companiesList = [];
window.tasksList = [];
window.usersList = [];
window.notesList = [];

// ========== REAL-TIME LISTENERS ==========
let companiesListener = null;
let tasksListener = null;
let usersListener = null;

// Khởi tạo realtime listeners
window.initRealtimeListeners = function() {
    if (!window.firebaseDb) {
        console.warn('Firebase not initialized yet');
        return;
    }
    
    console.log('Initializing realtime listeners...');
    
    // Lắng nghe thay đổi trên companies
    const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
    if (companiesListener) companiesRef.off('value', companiesListener);
    
    companiesListener = companiesRef.on('value', async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.companiesList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            window.companiesList = [];
        }
        
        // Cập nhật UI theo view hiện tại
        await window.refreshCurrentView();
    });
    
    // Lắng nghe thay đổi trên tasks
    const tasksRef = window.firebaseRef(window.firebaseDb, 'tasks');
    if (tasksListener) tasksRef.off('value', tasksListener);
    
    tasksListener = tasksRef.on('value', async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.tasksList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            window.tasksList = [];
        }
        
        // Cập nhật badge
        if (window.updateBadges) await window.updateBadges();
        
        // Cập nhật UI theo view hiện tại
        await window.refreshCurrentView();
    });
    
    // Lắng nghe thay đổi trên users
    const usersRef = window.firebaseRef(window.firebaseDb, 'users');
    if (usersListener) usersRef.off('value', usersListener);
    
    usersListener = usersRef.on('value', async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.usersList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            window.usersList = [];
        }
        
        // Cập nhật UI nếu đang ở users view
        if (window.currentView === 'users' && window.renderUsersView) {
            await window.renderUsersView();
        }
    });
    
    console.log('Realtime listeners initialized');
};

// Dừng realtime listeners
window.stopRealtimeListeners = function() {
    if (window.firebaseDb) {
        const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
        const tasksRef = window.firebaseRef(window.firebaseDb, 'tasks');
        const usersRef = window.firebaseRef(window.firebaseDb, 'users');
        
        if (companiesListener) companiesRef.off('value', companiesListener);
        if (tasksListener) tasksRef.off('value', tasksListener);
        if (usersListener) usersRef.off('value', usersListener);
        
        companiesListener = null;
        tasksListener = null;
        usersListener = null;
    }
    console.log('Realtime listeners stopped');
};

// Refresh view hiện tại dựa vào currentView
window.refreshCurrentView = async function() {
    const view = window.currentView;
    
    switch(view) {
        case 'dashboard':
            if (window.renderDashboard) await window.renderDashboard();
            break;
        case 'companies':
            if (window.renderCompanyList) window.renderCompanyList();
            if (window.selectedCompanyId && window.renderCompanyDetail) {
                await window.renderCompanyDetail(window.selectedCompanyId);
            }
            break;
        case 'progress':
            if (window.renderProgressView) await window.renderProgressView();
            break;
        case 'users':
            if (window.renderUsersView) await window.renderUsersView();
            break;
        default:
            console.log('Unknown view for refresh:', view);
    }
};

// ========== LOAD DATA (THỦ CÔNG - DỰ PHÒNG) ==========
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

// ========== HELPER FUNCTIONS ==========
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

// Lấy quý hiện tại
window.getCurrentQuarter = function() {
    const now = new Date();
    const month = now.getMonth();
    if (month >= 0 && month <= 2) return 1;
    if (month >= 3 && month <= 5) return 2;
    if (month >= 6 && month <= 8) return 3;
    return 4;
};

// Thống kê công ty
window.getCompanyStats = function(companyId) {
    const companyTasks = window.getTasksByCompany(companyId);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    let normalTotal = 0;
    let normalPending = 0;
    let normalProcessing = 0;
    let normalDone = 0;
    let normalOverdue = 0;
    let recurringTotal = 0;
    let recurringProcessed = 0;
    
    for (const task of companyTasks) {
        if (!task.isRecurring) {
            normalTotal++;
            if (task.status === 'pending') normalPending++;
            else if (task.status === 'processing') normalProcessing++;
            else if (task.status === 'done') normalDone++;
            
            if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
                normalOverdue++;
            }
        } else {
            recurringTotal++;
            const isProcessed = (task.history || []).some(h => 
                (h.action === 'completed' || h.action === 'skipped') && 
                h.period === currentPeriod
            );
            if (isProcessed) recurringProcessed++;
        }
    }
    
    return {
        total: normalTotal + recurringTotal,
        pending: normalPending + (recurringTotal - recurringProcessed),
        processing: normalProcessing,
        done: normalDone + recurringProcessed,
        overdue: normalOverdue
    };
};

// Thống kê user
window.getUserStats = function(userId) {
    const userTasks = window.getTasksByUser(userId);
    const currentPeriod = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    
    return {
        total: userTasks.length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        processing: userTasks.filter(t => t.status === 'processing').length,
        done: userTasks.filter(t => t.status === 'done').length,
        overdue: userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
        recurringCompleted: userTasks.filter(t => {
            if (!t.isRecurring) return false;
            return (t.history || []).some(h => 
                (h.action === 'completed' || h.action === 'skipped') && 
                h.period === currentPeriod
            );
        }).length
    };
};

// Cập nhật badge
window.updateBadges = async function() {
    if (!window.currentUser) return;
    
    const myTasks = window.getTasksByUser(window.currentUser.uid);
    const pendingSupport = window.tasksList.filter(t => t.assignedTo !== window.currentUser.uid && t.status !== 'done');
    
    const myTasksBadge = document.getElementById('myTasksBadge');
    const supportBadge = document.getElementById('supportBadge');
    const notificationBadge = document.getElementById('notificationBadge');
    
    if (myTasksBadge) myTasksBadge.textContent = myTasks.filter(t => t.status !== 'done').length || '0';
    if (supportBadge) supportBadge.textContent = pendingSupport.length || '0';
    if (notificationBadge) notificationBadge.textContent = window.tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length || '0';
};

// ========== MODAL HANDLERS ==========
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const entityModal = document.getElementById('entityModal');
            const taskModal = document.getElementById('taskModal');
            const noteModal = document.getElementById('noteModal');
            const notificationModal = document.getElementById('notificationModal');
            
            if (entityModal) entityModal.classList.add('hidden');
            if (taskModal) taskModal.classList.add('hidden');
            if (noteModal) noteModal.classList.add('hidden');
            if (notificationModal) notificationModal.classList.add('hidden');
        });
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

console.log('Components loaded with realtime support!');