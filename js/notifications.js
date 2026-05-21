// ========== HỆ THỐNG THÔNG BÁO ==========

let notificationListener = null;
let notificationSound = null;
let notificationsList = [];

// Load thông báo - LUÔN LẤY FRESH TỪ FIREBASE
window.loadUserNotifications = async function() {
    if (!window.currentUser) return [];
    
    const notificationsRef = window.firebaseRef(window.firebaseDb, 'notifications');
    const snapshot = await window.firebaseGet(notificationsRef);
    notificationsList = [];
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        notificationsList = Object.keys(data)
            .map(key => ({
    firebaseKey: key,
    ...data[key]
}))
            .filter(n => n.userId === window.currentUser.uid)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    updateNotificationBadge();
    return notificationsList;
};

// Cập nhật badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const unreadCount = notificationsList.filter(n => !n.isRead).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

// Đánh dấu đã đọc - KHẮC PHỤC LỖI KHÔNG CẬP NHẬT
window.markNotificationAsRead = async function(notificationId) {
    try {
        const notificationRef = window.firebaseRef(window.firebaseDb, `notifications/${notificationId}`);
        await window.firebaseUpdate(notificationRef, { isRead: true });
        
        // Cập nhật local ngay lập tức
        const notif = notificationsList.find(n => n.firebaseKey === notificationId);
        if (notif) {
            notif.isRead = true;
        }
        
        // Cập nhật badge
        updateNotificationBadge();
        
        // Render lại modal nếu đang mở
        const modal = document.getElementById('notificationModal');
        if (modal && !modal.classList.contains('hidden')) {
            await renderNotificationModal();
        }
        
        console.log('Marked as read:', notificationId);
    } catch (e) {
        console.error("Mark read error:", e);
    }
};

// Xóa thông báo - KHẮC PHỤC LỖI KHÔNG CẬP NHẬT
window.deleteNotification = async function(notificationId) {
    try {
        const notificationRef = window.firebaseRef(window.firebaseDb, `notifications/${notificationId}`);
        await window.firebaseRemove(notificationRef);
        
        // Cập nhật local
        notificationsList = notificationsList.filter(n => n.firebaseKey !== notificationId);
        
        // Cập nhật badge
        updateNotificationBadge();
        
        // Render lại modal nếu đang mở
        const modal = document.getElementById('notificationModal');
        if (modal && !modal.classList.contains('hidden')) {
            await renderNotificationModal();
        }
        
        console.log('Deleted notification:', notificationId);
    } catch (e) {
        console.error("Delete error:", e);
    }
};

// Đánh dấu tất cả đã đọc
window.markAllNotificationsAsRead = async function() {
    for (const notification of notificationsList) {
        if (!notification.isRead) {
            const notificationRef = window.firebaseRef(window.firebaseDb, `notifications/${notification.firebaseKey}`);
            await window.firebaseUpdate(notificationRef, { isRead: true });
            notification.isRead = true;
        }
    }
    updateNotificationBadge();
    await renderNotificationModal();
};

// Xóa tất cả thông báo
window.clearAllNotifications = async function() {
    for (const notification of notificationsList) {
        const notificationRef = window.firebaseRef(window.firebaseDb, `notifications/${notification.firebaseKey}`);
        await window.firebaseRemove(notificationRef);
    }
    notificationsList = [];
    updateNotificationBadge();
    await renderNotificationModal();
};

// Lắng nghe realtime
window.listenForNotifications = function() {
    if (notificationListener) return;
    
    const notificationsRef = window.firebaseRef(window.firebaseDb, 'notifications');
    
    notificationListener = notificationsRef.on('value', async () => {
        await window.loadUserNotifications();
        
        // Nếu modal đang mở, render lại
        const modal = document.getElementById('notificationModal');
        if (modal && !modal.classList.contains('hidden')) {
            await renderNotificationModal();
        }
    });
};

// Dừng lắng nghe
window.stopListeningNotifications = function() {
    if (notificationListener && window.firebaseDb) {
        const notificationsRef = window.firebaseRef(window.firebaseDb, 'notifications');
        notificationsRef.off('value', notificationListener);
        notificationListener = null;
    }
};

// Render modal thông báo (async để đảm bảo dữ liệu mới)
async function renderNotificationModal() {
    // Đảm bảo dữ liệu mới nhất
    await window.loadUserNotifications();
    
    const unreadCount = notificationsList.filter(n => !n.isRead).length;
    
    const html = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                <h4 style="margin: 0;">
                    <i class="fas fa-bell"></i> Thông báo 
                    ${unreadCount > 0 ? `<span class="badge" style="background: #f44336; margin-left: 8px;">${unreadCount} mới</span>` : ''}
                </h4>
                <div style="display: flex; gap: 8px;">
                    ${unreadCount > 0 ? `<button class="btn-sm btn-outline" onclick="window.markAllNotificationsAsRead()">Đọc tất cả</button>` : ''}
                    ${notificationsList.length > 0 ? `<button class="btn-sm btn-danger" onclick="window.clearAllNotifications()">Xóa tất cả</button>` : ''}
                </div>
            </div>
            <div id="notificationsList">
                ${notificationsList.length === 0 ? 
                    '<div class="empty-state" style="padding: 40px;"><i class="fas fa-bell-slash"></i><p>Không có thông báo nào</p></div>' : 
                    notificationsList.map(n => {
                        let icon = '📋';
                        let bgColor = '#f0f2f5';
                        if (n.type === 'urgent') { icon = '🔥'; bgColor = '#ffebee'; }
                        else if (n.type === 'overdue') { icon = '🔴'; bgColor = '#ffebee'; }
                        else if (n.type === 'upcoming') { icon = '⚠️'; bgColor = '#fff3e0'; }
                        else if (n.type === 'new_task') { icon = '✨'; bgColor = '#e8f5e9'; }
                        else if (n.type === 'completed') { icon = '✅'; bgColor = '#e8f5e9'; }
                        
                        // Xác định trạng thái đã đọc
                        const isRead = n.isRead === true;
                        
                        return `
                            <div class="notification-item ${!isRead ? 'unread' : ''}" 
                                 style="background: ${bgColor}; padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; border-left: 4px solid ${isRead ? '#4caf50' : '#667eea'};"
                                 onclick="window.handleNotificationClick('${n.firebaseKey}', '${n.taskId || ''}', '${n.companyId || ''}')">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="font-weight: bold;">${icon} ${n.title}</span>
                                    <span style="font-size: 11px; color: #999;">${new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                                </div>
                                <div style="font-size: 13px; color: #555;">${n.message}</div>
                                <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                                    ${!isRead ? 
                                        `<button class="btn-sm btn-outline" onclick="event.stopPropagation(); window.markNotificationAsRead('${n.firebaseKey}')">Đánh dấu đã đọc</button>` : 
                                        '<span style="color: #4caf50; font-size: 13px;"><i class="fas fa-check-circle"></i> Đã đọc</span>'
                                    }
                                    <button class="btn-sm btn-danger" onclick="event.stopPropagation(); window.deleteNotification('${n.firebaseKey}')">Xóa</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-secondary" onclick="window.closeNotificationModal()">Đóng</button>
        </div>
    `;
    
    const modalBody = document.getElementById('notificationModalBody');
    if (modalBody) modalBody.innerHTML = html;
}

// Mở modal thông báo
window.openNotificationModal = async function() {
    await renderNotificationModal();
    document.getElementById('notificationModal').classList.remove('hidden');
};

// Đóng modal thông báo
window.closeNotificationModal = function() {
    document.getElementById('notificationModal').classList.add('hidden');
};

// Xử lý click vào thông báo
window.handleNotificationClick = async function(notificationId, taskId, companyId) {
    // Đánh dấu đã đọc ngay lập tức
    await window.markNotificationAsRead(notificationId);
    
    // Đóng modal
    window.closeNotificationModal();
    
    // Chuyển đến nội dung liên quan
    if (taskId) {
        if (window.viewTaskDetail) {
            await window.viewTaskDetail(taskId);
        }
    } else if (companyId) {
        window.switchView('companies');
        setTimeout(() => {
            if (window.selectCompany) window.selectCompany(companyId);
        }, 300);
    }
};

// Tạo thông báo
window.createNotification = async function(userId, title, message, type, taskId = null, companyId = null) {
    const notification = {
        userId: userId,
        title: title,
        message: message,
        type: type,
        taskId: taskId,
        companyId: companyId,
        isRead: false,
        createdAt: new Date().toISOString()
    };
    
    const notificationsRef = window.firebaseRef(window.firebaseDb, 'notifications');
    await window.firebasePush(notificationsRef, notification);
};

// Kiểm tra và tạo thông báo
window.checkAndCreateNotifications = async function() {
    if (!window.currentUser) return;
    
    await window.loadTasks();
    
    const tasks = window.getTasksByUser(window.currentUser.uid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const task of tasks) {
        if (task.status === 'done') continue;
        
        let notificationType = null;
        let title = '';
        let message = '';
        
        if (task.isUrgent === true) {
            notificationType = 'urgent';
            title = '🔥 Công việc khẩn cấp';
            message = `"${task.title}" cần xử lý ngay! Hạn: ${window.formatDate(task.dueDate)}`;
        }
        else if (task.dueDate && new Date(task.dueDate) < today) {
            const daysOverdue = Math.ceil((today - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));
            notificationType = 'overdue';
            title = '🔴 Công việc quá hạn';
            message = `"${task.title}" đã quá hạn ${daysOverdue} ngày!`;
        }
        else if (task.dueDate) {
            const daysLeft = Math.ceil((new Date(task.dueDate) - today) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3 && daysLeft >= 0) {
                notificationType = 'upcoming';
                title = '⚠️ Công việc sắp đến hạn';
                message = `"${task.title}" còn ${daysLeft} ngày. Hạn: ${window.formatDate(task.dueDate)}`;
            }
        }
        
        if (notificationType) {
            // Kiểm tra đã có thông báo trong 24h chưa
            const existingNotif = notificationsList.find(n => n.taskId === task.id && n.type === notificationType);
            const shouldCreate = !existingNotif || (new Date() - new Date(existingNotif.createdAt)) > 24 * 60 * 60 * 1000;
            
            if (shouldCreate) {
                await window.createNotification(
                    window.currentUser.uid,
                    title,
                    message,
                    notificationType,
                    task.id,
                    task.companyId
                );
            }
        }
    }
    
    await window.loadUserNotifications();
};

// Kiểm tra định kỳ mỗi 5 phút
let notificationInterval = null;

window.startNotificationChecker = function() {
    if (notificationInterval) clearInterval(notificationInterval);
    
    setTimeout(() => {
        window.checkAndCreateNotifications();
    }, 3000);
    
    notificationInterval = setInterval(() => {
        window.checkAndCreateNotifications();
    }, 5 * 60 * 1000);
};

window.stopNotificationChecker = function() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
};

// Xin phép thông báo trình duyệt
window.requestNotificationPermission = function() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
};

// Khởi tạo âm thanh
function initNotificationSound() {
    try {
        notificationSound = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
        notificationSound.volume = 0.5;
    } catch (e) {
        console.log('Sound not supported');
    }
}
initNotificationSound();

console.log('Notifications module loaded!');