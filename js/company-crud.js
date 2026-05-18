// ========== CRUD CÔNG TY/HKD ==========

// Đóng modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// Thêm công ty
window.showAddCompanyModal = function() {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    
    window.loadUsers().then(() => {
        const staffOptions = isAdmin ? `
            <option value="">-- Chưa phân công --</option>
            ${window.usersList.filter(u => u.role === 'staff').map(u => `<option value="${u.uid}">${u.name}</option>`).join('')}
        ` : `<input type="hidden" name="assignedTo" value="${window.currentUser.uid}">`;
        
        const html = `
            <form id="addCompanyForm">
                <div class="form-group">
                    <label>Tên công ty/HKD *</label>
                    <input type="text" name="name" required placeholder="Ví dụ: Cửa hàng An Phát">
                </div>
                <div class="form-group">
                    <label>Loại hình</label>
                    <select name="type">
                        <option value="household">🏪 Hộ kinh doanh (HKD)</option>
                        <option value="company">🏭 Công ty</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" placeholder="Số nhà, đường, quận, TP">
                </div>
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" placeholder="0903 xxx xxx">
                </div>
                <div class="form-group">
                    <label>Mã số thuế</label>
                    <input type="text" name="taxCode" placeholder="0123456789">
                </div>
                ${isAdmin ? `
                    <div class="form-group">
                        <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                        <select name="assignedTo">${staffOptions}</select>
                    </div>
                ` : `
                    <div class="form-group">
                        <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                        <div class="info-box">👤 ${window.currentUserData?.name || window.currentUser?.email} (bạn sẽ phụ trách)</div>
                        ${staffOptions}
                    </div>
                `}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('entityModal')">Hủy</button>
                </div>
            </form>
        `;
        
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Thêm HKD/Công ty';
        document.getElementById('entityModal').classList.remove('hidden');
        
        document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            window.showLoading();
            
            const formData = new FormData(e.target);
            let assignedTo = formData.get('assignedTo');
            let assignedToName = '';
            
            if (isAdmin) {
                const u = window.usersList.find(u => u.uid === assignedTo);
                assignedToName = u?.name || 'Chưa phân công';
            } else {
                assignedTo = window.currentUser.uid;
                assignedToName = window.currentUserData?.name;
            }
            
            const newCompany = {
                name: formData.get('name'),
                type: formData.get('type'),
                address: formData.get('address') || '',
                phone: formData.get('phone') || '',
                taxCode: formData.get('taxCode') || '',
                assignedTo: assignedTo || null,
                assignedToName: assignedToName || 'Chưa phân công',
                createdAt: new Date().toISOString()
            };
            
            // 1. Thêm công ty vào Firebase
            const companiesRef = window.firebaseRef(window.firebaseDb, 'companies');
            const newCompanyRef = await window.firebasePush(companiesRef, newCompany);
            const newCompanyId = newCompanyRef.key;
            
            // 2. Cập nhật danh sách công ty ngay lập tức
            await window.loadCompanies();
            
            // 3. Tạo công việc định kỳ cho công ty mới (đợi 500ms để Firebase sync)
            setTimeout(async () => {
                // Tìm công ty vừa thêm
                const addedCompany = window.companiesList.find(c => c.id === newCompanyId);
                if (addedCompany && window.generateTasksForCompany) {
                    await window.generateTasksForCompany(newCompanyId);
                }
                
                // 4. Cập nhật lại UI
                await window.loadAllData();
                window.renderCompanyList();
                
                if (window.selectedCompanyId === newCompanyId && window.renderCompanyDetail) {
                    await window.renderCompanyDetail(newCompanyId);
                }
                
                window.hideLoading();
                closeModal('entityModal');
                window.selectCompany(newCompanyId);
                window.showMessage('✅ Thêm công ty thành công! Công việc định kỳ đã được tạo.');
            }, 500);
        });
    });
};

// Sửa công ty
window.showEditCompanyModal = function(companyId) {
    const isAdmin = window.currentUserRole === 'admin' || window.currentUserData?.role === 'admin';
    if (!isAdmin) {
        window.showMessage('🔒 Chỉ Admin mới được sửa!');
        return;
    }
    
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    window.loadUsers().then(() => {
        const staffOptions = window.usersList
            .filter(u => u.role === 'staff')
            .map(u => `<option value="${u.uid}" ${company.assignedTo === u.uid ? 'selected' : ''}>${u.name}</option>`)
            .join('');
        
        const html = `
            <form id="editCompanyForm">
                <div class="form-group">
                    <label>Tên công ty/HKD *</label>
                    <input type="text" name="name" value="${(company.name || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="form-group">
                    <label>Loại hình</label>
                    <select name="type">
                        <option value="household" ${company.type === 'household' ? 'selected' : ''}>🏪 Hộ kinh doanh (HKD)</option>
                        <option value="company" ${company.type === 'company' ? 'selected' : ''}>🏭 Công ty</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" value="${(company.address || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" value="${(company.phone || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>Mã số thuế</label>
                    <input type="text" name="taxCode" value="${(company.taxCode || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-tie"></i> Nhân viên phụ trách</label>
                    <select name="assignedTo">
                        <option value="">-- Chưa phân công --</option>
                        ${staffOptions}
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập nhật</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('entityModal')">Hủy</button>
                </div>
            </form>
        `;
        
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa HKD/Công ty';
        document.getElementById('entityModal').classList.remove('hidden');
        
        document.getElementById('editCompanyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            window.showLoading();
            
            const formData = new FormData(e.target);
            const assignedTo = formData.get('assignedTo');
            const assignedUser = window.usersList.find(u => u.uid === assignedTo);
            
            await window.firebaseUpdate(window.firebaseRef(window.firebaseDb, `companies/${companyId}`), {
                name: formData.get('name'),
                type: formData.get('type'),
                address: formData.get('address') || '',
                phone: formData.get('phone') || '',
                taxCode: formData.get('taxCode') || '',
                assignedTo: assignedTo || null,
                assignedToName: assignedUser?.name || 'Chưa phân công',
                updatedAt: new Date().toISOString()
            });
            
            window.hideLoading();
            closeModal('entityModal');
            await window.loadCompanies();
            window.renderCompanyList();
            await window.renderCompanyDetail(companyId);
            window.showMessage('✅ Cập nhật thành công!');
        });
    });
};

// Xóa công ty
window.deleteCompany = async function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const taskCount = window.getTasksByCompany(companyId).length;
    const confirmMsg = taskCount > 0 
        ? `⚠️ Công ty "${company.name}" có ${taskCount} công việc.\n\nXóa sẽ mất tất cả! Bạn chắc chắn?`
        : `❓ Xóa công ty "${company.name}"?`;
    
    if (!confirm(confirmMsg)) return;
    
    window.showLoading();
    
    // Xóa công ty
    await window.firebaseRemove(window.firebaseRef(window.firebaseDb, `companies/${companyId}`));
    
    // Xóa các công việc liên quan
    const tasksToDelete = window.tasksList.filter(t => t.companyId === companyId);
    for (const task of tasksToDelete) {
        await window.firebaseRemove(window.firebaseRef(window.firebaseDb, `tasks/${task.id}`));
    }
    
    await window.loadAllData();
    window.hideLoading();
    
    if (window.selectedCompanyId === companyId) {
        window.selectedCompanyId = null;
        const detailPanel = document.getElementById('companyDetailPanel');
        if (detailPanel) {
            detailPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building" style="font-size: 48px;"></i>
                    <p>🏢 Chọn một công ty/HKD để xem chi tiết</p>
                </div>
            `;
        }
    }
    
    window.renderCompanyList();
    if (window.renderDashboard) await window.renderDashboard();
    window.showMessage(`✅ Đã xóa công ty "${company.name}"!`);
};

console.log('Company CRUD module loaded!');