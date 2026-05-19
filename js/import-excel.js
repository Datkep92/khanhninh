// ========== IMPORT EXCEL - DANH SÁCH HKD/CÔNG TY ==========

// Thêm thư viện XLSX
function loadXLSXLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Mở modal import Excel (cho phép tất cả user import)
window.showImportExcelModal = async function() {
    await loadXLSXLibrary();
    await window.loadUsers();
    
    const html = `
        <div style="padding: 20px;">
            <div class="import-info" style="margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-radius: 8px;">
                <i class="fas fa-info-circle"></i> 
                <strong>Hướng dẫn:</strong> File Excel cần có các cột: 
                <strong>STT, MST, TÊN, DOANH THU, nhân viên, MÔ HÌNH</strong>
                <br><span style="color: #ff9800;">⚠️ Dữ liệu thiếu thông tin vẫn được import, có thể cập nhật thủ công sau.</span>
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-file-excel"></i> Chọn file Excel (.xlsx, .xls)</label>
                <input type="file" id="excelFile" accept=".xlsx, .xls, .csv" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; width: 100%;">
            </div>
            
            <!-- Thanh tiến trình -->
            <div id="importProgress" style="display: none; margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><i class="fas fa-spinner fa-pulse"></i> Đang xử lý...</span>
                    <span id="progressPercent">0%</span>
                </div>
                <div class="progress-bar" style="height: 10px;">
                    <div id="progressBarFill" class="progress-fill" style="width: 0%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                </div>
                <div id="progressDetail" style="font-size: 12px; color: #666; margin-top: 5px;"></div>
            </div>
            
            <div id="importPreview" style="max-height: 300px; overflow-y: auto; margin-top: 15px; display: none;">
                <h4>📋 Xem trước dữ liệu (<span id="previewCount">0</span> dòng):</h4>
                <table class="data-table" style="font-size: 12px;">
                    <thead>
                        <tr><th>Tên</th><th>MST</th><th>Nhân viên</th><th>Doanh thu</th><th>Cảnh báo</th></tr>
                    </thead>
                    <tbody id="previewTableBody"></tbody>
                </table>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="confirmImportBtn" class="btn btn-primary" disabled>
                    <i class="fas fa-cloud-upload-alt"></i> Import tất cả
                </button>
                <button class="btn btn-secondary" onclick="closeModal('entityModal')">Hủy</button>
            </div>
        </div>
    `;
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-file-import"></i> Import danh sách HKD/Công ty';
    document.getElementById('entityModal').classList.remove('hidden');
    
    const fileInput = document.getElementById('excelFile');
    const previewDiv = document.getElementById('importPreview');
    const previewBody = document.getElementById('previewTableBody');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const previewCount = document.getElementById('previewCount');
    const progressDiv = document.getElementById('importProgress');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressDetail = document.getElementById('progressDetail');
    
    let importedData = [];
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        window.showLoading();
        
        try {
            const data = await readExcelFile(file);
            importedData = parseExcelData(data, window.usersList);
            
            // Hiển thị preview
            if (importedData.length > 0) {
                previewCount.textContent = importedData.length;
                previewBody.innerHTML = importedData.map(item => {
                    let warnings = [];
                    if (!item.name) warnings.push('Thiếu tên');
                    if (!item.assignedToEmail) warnings.push('Chưa gán nhân viên');
                    if (item.assignedToEmail && !item.userFound) warnings.push('Email không tồn tại');
                    
                    let warningHtml = '';
                    if (warnings.length > 0) {
                        warningHtml = `<span style="color: #ff9800;">⚠️ ${warnings.join(', ')}</span>`;
                    } else {
                        warningHtml = '<span style="color: #4caf50;">✅ OK</span>';
                    }
                    
                    return `
                        <tr>
                            <td>${escapeHtml(item.name) || '-'}</td>
                            <td>${escapeHtml(item.taxCode) || '-'}</td>
                            <td>${escapeHtml(item.assignedToEmail) || 'Chưa phân công'}</td>
                            <td>${escapeHtml(item.revenue) || '-'}</td>
                            <td>${warningHtml}</td>
                        </tr>
                    `;
                }).join('');
                previewDiv.style.display = 'block';
                confirmBtn.disabled = false;
            } else {
                previewDiv.style.display = 'block';
                previewBody.innerHTML = `<tr><td colspan="5" class="empty-state">📭 Không có dữ liệu hợp lệ. Kiểm tra lại file Excel.<li>`;
                confirmBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error reading file:', error);
            window.showMessage('Lỗi đọc file: ' + error.message);
        } finally {
            window.hideLoading();
        }
    });
    
    // Xác nhận import
    confirmBtn.addEventListener('click', async () => {
        if (importedData.length === 0) {
            window.showMessage('Không có dữ liệu để import!');
            return;
        }
        
        if (!confirm(`⚠️ Bạn có chắc muốn import ${importedData.length} HKD/Công ty?\n\nCác dòng thiếu thông tin vẫn được import và có thể cập nhật sau.`)) {
            return;
        }
        
        // Hiển thị thanh tiến trình
        progressDiv.style.display = 'block';
        confirmBtn.disabled = true;
        fileInput.disabled = true;
        
        let successCount = 0;
        let errorCount = 0;
        let warningCount = 0;
        let errorList = [];
        
        for (let i = 0; i < importedData.length; i++) {
            const item = importedData[i];
            const percent = Math.round(((i + 1) / importedData.length) * 100);
            progressBarFill.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
            progressDetail.textContent = `Đang xử lý: ${i + 1}/${importedData.length} - ${escapeHtml(item.name) || 'Chưa có tên'}`;
            
            try {
                // Không chặn import nếu thiếu thông tin, chỉ cảnh báo
                if (!item.name) {
                    warningCount++;
                    errorList.push(`Dòng ${i + 1}: Thiếu tên - bỏ qua`);
                    continue;
                }
                
                let assignedTo = null;
                let assignedToName = 'Chưa phân công';
                
                if (item.assignedToEmail && item.userFound) {
                    const user = window.usersList.find(u => u.email === item.assignedToEmail);
                    if (user) {
                        assignedTo = user.uid;
                        assignedToName = user.name || user.email;
                    }
                } else if (item.assignedToEmail && !item.userFound) {
                    warningCount++;
                    errorList.push(`${item.name}: Email "${item.assignedToEmail}" không tồn tại - sẽ để trống nhân viên`);
                }
                
                // Kiểm tra trùng lặp theo tên
                const exists = window.companiesList.some(c => c.name === item.name);
                if (exists) {
                    warningCount++;
                    errorList.push(`${item.name}: Đã tồn tại trong hệ thống - bỏ qua`);
                    continue;
                }
                
                const newCompany = {
                    name: item.name,
                    type: 'household',
                    address: '',
                    phone: '',
                    taxCode: item.taxCode || '',
                    assignedTo: assignedTo,
                    assignedToName: assignedToName,
                    revenue: item.revenue || '',
                    note: item.note || '',
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid,
                    createdByName: window.currentUserData?.name
                };
                
                await window.firebasePush(window.firebaseRef(window.firebaseDb, 'companies'), newCompany);
                successCount++;
                
                await new Promise(r => setTimeout(r, 30));
                
            } catch (error) {
                errorCount++;
                errorList.push(`${item.name || 'Không xác định'}: ${error.message}`);
            }
        }
        
        await window.loadCompanies();
        window.renderCompanyList();
        
        progressDetail.innerHTML = '<i class="fas fa-check"></i> Hoàn tất! Đang cập nhật giao diện...';
        
        setTimeout(() => {
            progressDiv.style.display = 'none';
            closeModal('entityModal');
            
            let message = `✅ Import thành công: ${successCount} công ty`;
            if (warningCount > 0) {
                message += `\n⚠️ Cảnh báo: ${warningCount} dòng (cần cập nhật thủ công)`;
            }
            if (errorCount > 0) {
                message += `\n❌ Lỗi: ${errorCount} dòng`;
            }
            if (errorList.length > 0) {
                message += `\n\nChi tiết:\n${errorList.slice(0, 5).join('\n')}`;
                if (errorList.length > 5) message += `\n... và ${errorList.length - 5} lỗi khác`;
            }
            window.showMessage(message);
            
            fileInput.disabled = false;
        }, 500);
    });
};

// Đọc file Excel
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Parse dữ liệu từ Excel
function parseExcelData(data, usersList) {
    if (!data || data.length < 2) return [];
    
    // Tìm dòng header
    let headerRow = null;
    let headerIndex = -1;
    const userEmails = usersList.map(u => u.email);
    
    for (let i = 0; i < Math.min(data.length, 10); i++) {
        const row = data[i];
        if (row && row.length > 0) {
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('stt') || rowStr.includes('mst')) {
                headerRow = row;
                headerIndex = i;
                break;
            }
        }
    }
    
    if (!headerRow) {
        headerRow = ['STT', 'MST', 'TÊN', 'DOANH THU', 'nhân viên', 'MÔ HÌNH'];
        headerIndex = 0;
    }
    
    // Xác định vị trí các cột
    const colIndex = {
        stt: -1,
        mst: -1,
        name: -1,
        revenue: -1,
        staff: -1,
        model: -1
    };
    
    for (let i = 0; i < headerRow.length; i++) {
        const cell = String(headerRow[i] || '').toLowerCase();
        if (cell.includes('stt')) colIndex.stt = i;
        else if (cell.includes('mst') || cell.includes('mã số')) colIndex.mst = i;
        else if (cell.includes('tên') || cell.includes('tên') || cell.includes('hộ')) colIndex.name = i;
        else if (cell.includes('doanh thu')) colIndex.revenue = i;
        else if (cell.includes('nhân viên') || cell.includes('email')) colIndex.staff = i;
        else if (cell.includes('mô hình')) colIndex.model = i;
    }
    
    if (colIndex.name === -1) colIndex.name = 2;
    if (colIndex.mst === -1) colIndex.mst = 1;
    
    const result = [];
    const seenNames = new Set();
    
    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        let name = row[colIndex.name] ? String(row[colIndex.name]).trim() : '';
        
        // Làm sạch tên
        name = name.replace(/^HỘ KINH DOANH\s*/i, '').replace(/^HKD\s*/i, '').trim();
        
        // Bỏ qua dòng không có tên hoặc tên quá ngắn
        if (!name || name === '' || name === 'null' || name === 'undefined') continue;
        if (name.toLowerCase().includes('tổng') || name.toLowerCase().includes('sum')) continue;
        if (name.length < 3) continue;
        
        // Bỏ qua trùng tên trong cùng file
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        
        const taxCode = colIndex.mst !== -1 && row[colIndex.mst] ? String(row[colIndex.mst]).trim() : '';
        const revenue = colIndex.revenue !== -1 && row[colIndex.revenue] ? String(row[colIndex.revenue]).trim() : '';
        let staffEmail = colIndex.staff !== -1 && row[colIndex.staff] ? String(row[colIndex.staff]).trim().toLowerCase() : '';
        
        // Xử lý email
        if (staffEmail && !staffEmail.includes('@')) {
            staffEmail = staffEmail + '@khanhninh.com';
        }
        
        // Kiểm tra user có tồn tại không
        let userFound = false;
        if (staffEmail) {
            userFound = userEmails.includes(staffEmail);
        }
        
        // Làm sạch MST
        let cleanTaxCode = taxCode;
        if (cleanTaxCode && (cleanTaxCode.length < 5 || cleanTaxCode.includes('khoản') || cleanTaxCode.includes('định'))) {
            cleanTaxCode = '';
        }
        
        result.push({
            name: name,
            taxCode: cleanTaxCode,
            revenue: revenue,
            assignedToEmail: staffEmail || null,
            userFound: userFound,
            note: ''
        });
    }
    
    return result;
}

// Hàm thoát HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Hàm đóng modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

console.log('Import Excel module loaded - Allow all users, accept missing data!');