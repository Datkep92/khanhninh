// ========== TASK TEMPLATES - ĐƠN GIẢN ==========

// Template công việc định kỳ
window.TASK_TEMPLATES = {
    // Công ty
    company: [
        { id: 'vat_monthly', title: '📊 Kê khai & nộp thuế GTGT', frequency: 'monthly', deadline_days: 20, priority: 'high', required: true },
        { id: 'tncn_monthly', title: '💰 Khấu trừ & kê khai thuế TNCN', frequency: 'monthly', deadline_days: 20, priority: 'high', required: true },
        { id: 'bhxh_monthly', title: '🏥 Nộp BHXH, BHYT, BHTN', frequency: 'monthly', deadline_days: 15, priority: 'high', required: true },
        { id: 'vat_quarterly', title: '📊 Kê khai thuế GTGT (Quý)', frequency: 'quarterly', deadline_days: 30, priority: 'high', required: true },
        { id: 'tndn_quarterly', title: '📈 Tạm nộp thuế TNDN', frequency: 'quarterly', deadline_days: 30, priority: 'high', required: true },
        { id: 'financial_yearly', title: '📊 Báo cáo tài chính năm', frequency: 'yearly', deadline_month: 3, deadline_day: 31, priority: 'high', required: true }
    ],
    // Hộ kinh doanh
    household: [
        { id: 'tax_quarterly', title: '📊 Kê khai thuế GTGT + TNCN (Quý)', frequency: 'quarterly', deadline_days: 30, priority: 'high', required: true },
        { id: 'bhxh_hkd', title: '🏥 Nộp BHXH (nếu có nhân viên)', frequency: 'monthly', deadline_days: 15, priority: 'medium', required: false }
    ]
};

// Tạo công việc định kỳ cho tất cả công ty
window.generateRecurringTasks = async function() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    console.log(`Generating recurring tasks for ${currentMonth + 1}/${currentYear} (Q${currentQuarter})...`);
    
    for (const company of window.companiesList) {
        const templates = company.type === 'company' ? window.TASK_TEMPLATES.company : window.TASK_TEMPLATES.household;
        const existingTasks = window.tasksList.filter(t => t.companyId === company.id);
        
        for (const template of templates) {
            let shouldCreate = false;
            let recurringKey = '';
            let dueDate = null;
            
            if (template.frequency === 'monthly') {
                recurringKey = `${currentYear}-${currentMonth + 1}`;
                dueDate = new Date(currentYear, currentMonth + 1, template.deadline_days);
                const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
                if (!exists) shouldCreate = true;
            } 
            else if (template.frequency === 'quarterly') {
                // TẠO CHO QUÝ HIỆN TẠI (bất kể tháng nào)
                recurringKey = `${currentYear}-Q${currentQuarter}`;
                
                // Tính ngày hạn nộp dựa vào quý
                let deadlineMonth;
                let deadlineYear = currentYear;
                switch(currentQuarter) {
                    case 1: deadlineMonth = 3; break;  // Tháng 4
                    case 2: deadlineMonth = 6; break;  // Tháng 7
                    case 3: deadlineMonth = 9; break;  // Tháng 10
                    case 4: deadlineMonth = 0; deadlineYear++; break; // Tháng 1 năm sau
                    default: deadlineMonth = 3;
                }
                dueDate = new Date(deadlineYear, deadlineMonth, template.deadline_days);
                
                const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
                if (!exists) shouldCreate = true;
            }
            else if (template.frequency === 'yearly') {
                recurringKey = `${currentYear}`;
                dueDate = new Date(currentYear + 1, template.deadline_month - 1, template.deadline_day);
                const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
                if (!exists) shouldCreate = true;
            }
            
            if (shouldCreate && dueDate) {
                await window.createRecurringTask(company, template, dueDate, recurringKey);
                console.log(`Created: ${template.title} for ${company.name} - ${recurringKey}`);
            }
        }
    }
    await window.loadTasks();
    console.log('Recurring tasks generation completed!');
};

// Tạo công việc định kỳ cho 1 công ty cụ thể
window.generateTasksForCompany = async function(companyId) {
    const company = window.companiesList.find(c => c.id === companyId);
    if (!company) return;
    
    const isCompany = company.type === 'company';
    const templates = isCompany ? window.TASK_TEMPLATES.company : window.TASK_TEMPLATES.household;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    await window.loadTasks();
    const existingTasks = window.tasksList.filter(t => t.companyId === companyId);
    let created = 0;
    
    for (const template of templates) {
        let shouldCreate = false;
        let recurringKey = '';
        let dueDate = null;
        
        if (template.frequency === 'monthly') {
            recurringKey = `${currentYear}-${currentMonth + 1}`;
            dueDate = new Date(currentYear, currentMonth + 1, template.deadline_days);
            const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
            if (!exists) shouldCreate = true;
        } 
        else if (template.frequency === 'quarterly') {
            // TẠO CHO QUÝ HIỆN TẠI
            recurringKey = `${currentYear}-Q${currentQuarter}`;
            
            let deadlineMonth;
            let deadlineYear = currentYear;
            switch(currentQuarter) {
                case 1: deadlineMonth = 3; break;  // Tháng 4
                case 2: deadlineMonth = 6; break;  // Tháng 7
                case 3: deadlineMonth = 9; break;  // Tháng 10
                case 4: deadlineMonth = 0; deadlineYear++; break; // Tháng 1 năm sau
                default: deadlineMonth = 3;
            }
            dueDate = new Date(deadlineYear, deadlineMonth, template.deadline_days);
            
            const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
            if (!exists) shouldCreate = true;
        }
        else if (template.frequency === 'yearly') {
            recurringKey = `${currentYear}`;
            dueDate = new Date(currentYear + 1, template.deadline_month - 1, template.deadline_day);
            const exists = existingTasks.some(t => t.templateId === template.id && t.recurringKey === recurringKey);
            if (!exists) shouldCreate = true;
        }
        
        if (shouldCreate && dueDate && window.createRecurringTask) {
            await window.createRecurringTask(company, template, dueDate, recurringKey);
            created++;
        }
    }
    
    await window.loadAllData();
    if (window.selectedCompanyId === companyId && window.renderCompanyDetail) {
        await window.renderCompanyDetail(companyId);
    }
    if (window.renderCompanyList) window.renderCompanyList();
    
    return created;
};

// Tạo task từ template
window.createRecurringTask = async function(company, template, dueDate, recurringKey) {
    const assignedUser = company.assignedTo ? window.usersList.find(u => u.uid === company.assignedTo) : null;
    const now = new Date().toISOString();
    
    const newTask = {
        title: template.title,
        description: template.description || '',
        companyId: company.id,
        companyName: company.name,
        assignedTo: company.assignedTo || null,
        assignedToName: assignedUser?.name || company.assignedToName || 'Chưa phân công',
        priority: template.priority,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        isRecurring: true,
        required: template.required || false,
        templateId: template.id,
        recurringKey: recurringKey,
        frequency: template.frequency,
        createdBy: 'system',
        createdByName: 'Hệ thống',
        createdAt: now,
        updatedAt: now,
        history: [{
            action: 'created',
            title: '✨ Tạo công việc định kỳ',
            description: `Công việc "${template.title}" được hệ thống tự động tạo ${template.frequency === 'monthly' ? 'hàng tháng' : template.frequency === 'quarterly' ? 'hàng quý' : 'hàng năm'}`,
            by: 'system',
            byName: 'Hệ thống',
            at: now,
            timestamp: now
        }]
    };
    
    const tasksRef = window.firebaseRef(window.firebaseDb, 'tasks');
    await window.firebasePush(tasksRef, newTask);
    console.log(`Created recurring task: ${template.title} for ${company.name}, due: ${newTask.dueDate}, key: ${recurringKey}`);
};

console.log('Task Templates simplified with quarterly fix!');


console.log('Task Templates simplified!');