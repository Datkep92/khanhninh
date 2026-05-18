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
    return {
        total: companyTasks.length,
        pending: companyTasks.filter(t => t.status === 'pending').length,
        processing: companyTasks.filter(t => t.status === 'processing').length,
        done: companyTasks.filter(t => t.status === 'done').length,
        overdue: companyTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
    };
};

window.getUserStats = function(userId) {
    const userTasks = window.getTasksByUser(userId);
    return {
        total: userTasks.length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        processing: userTasks.filter(t => t.status === 'processing').length,
        done: userTasks.filter(t => t.status === 'done').length,
        overdue: userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
    };
};

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

// Khởi tạo dữ liệu mẫu nếu chưa có
window.initDemoData = async function() {
    const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
    const snapshot = await window.firebaseGet(companiesRef);
    
    if (!snapshot.exists()) {
        // Tạo công ty mẫu
        const demoCompanies = [
            { name: "Cửa hàng An Phát", type: "household", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", phone: "0903 123 456", taxCode: "0123456789", assignedTo: null, assignedToName: "Chưa phân công", createdAt: new Date().toISOString() },
            { name: "Cty TNHH Minh Đức", type: "company", address: "45 Lê Lợi, Quận 1, TP.HCM", phone: "028 1234 567", taxCode: "9876543210", assignedTo: null, assignedToName: "Chưa phân công", createdAt: new Date().toISOString() },
            { name: "Quán cà phê Sáng", type: "household", address: "78 Trần Phú, Quận 5, TP.HCM", phone: "0912 345 678", taxCode: "5566778899", assignedTo: null, assignedToName: "Chưa phân công", createdAt: new Date().toISOString() },
            { name: "Cty CP Xây dựng", type: "company", address: "234 Nguyễn Trãi, Quận 1, TP.HCM", phone: "028 9876 543", taxCode: "1122334455", assignedTo: null, assignedToName: "Chưa phân công", createdAt: new Date().toISOString() }
        ];
        
        for (const company of demoCompanies) {
            await window.firebasePush(companiesRef, company);
        }
        console.log('Demo companies created!');
    }
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