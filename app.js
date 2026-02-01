// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyALhUUHcAKx-ImK2-YR5i5Wh9YfR27Ouf0",
    authDomain: "savingmoney-469ba.firebaseapp.com",
    databaseURL: "https://savingmoney-469ba-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "savingmoney-469ba",
    storageBucket: "savingmoney-469ba.firebasestorage.app",
    messagingSenderId: "441156301915",
    appId: "1:441156301915:web:6fa1366e4280aff84a7b7e",
    measurementId: "G-6Z2E0Q1B99"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global Variables
let currentUser = null;
let currentPage = 1;
let studentCurrentPage = 1;
let classChart = null;
let transactions = [];
let students = [];
let users = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('monthFilter').value = today.substring(0, 7);
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainInterface();
    }
    
    // Setup event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Load initial data
    loadUsers();
    loadStudents();
    loadTransactions();
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    $.LoadingOverlay('show');
    
    // Find user in database
    const userRef = database.ref('users');
    userRef.once('value', (snapshot) => {
        const users = snapshot.val() || {};
        let foundUser = null;
        
        for (const key in users) {
            if (users[key].username === username && users[key].password === password) {
                foundUser = { ...users[key], id: key };
                break;
            }
        }
        
        $.LoadingOverlay('hide');
        
        if (foundUser) {
            currentUser = foundUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับ ${foundUser.username}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                showMainInterface();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบล้มเหลว',
                text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }
    });
}

function logout() {
    Swal.fire({
        title: 'ออกจากระบบ',
        text: 'คุณต้องการออกจากระบบหรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            showLoginPage();
        }
    });
}

function showMainInterface() {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('dashboardSection').classList.add('active');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('username').textContent = currentUser.username;
    
    // Show/hide admin features
    if (currentUser.role === 'admin') {
        document.getElementById('usersNavBtn').classList.remove('hidden');
    }
    
    // Show deposit buttons for logged in users
    document.getElementById('depositButtons').classList.remove('hidden');
    document.getElementById('loginPrompt').classList.add('hidden');
    document.getElementById('studentButtons').classList.remove('hidden');
    document.getElementById('studentLoginPrompt').classList.add('hidden');
    
    // Load dashboard data
    loadDashboardData();
}

function showLoginPage() {
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('dashboardSection').classList.remove('active');
    document.getElementById('depositSection').classList.remove('active');
    document.getElementById('studentsSection').classList.remove('active');
    document.getElementById('usersSection').classList.remove('active');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('usersNavBtn').classList.add('hidden');
    
    // Reset form
    document.getElementById('loginForm').reset();
}

// Navigation Functions
function showPage(page) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(page + 'Section').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data based on page
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'deposit':
            loadTransactions();
            break;
        case 'students':
            loadStudents();
            break;
        case 'users':
            if (currentUser.role === 'admin') {
                loadUsers();
            }
            break;
    }
}

// Dashboard Functions
function loadDashboardData() {
    $.LoadingOverlay('show');
    
    const studentsRef = database.ref('students');
    const transactionsRef = database.ref('transactions');
    
    Promise.all([
        studentsRef.once('value'),
        transactionsRef.once('value')
    ]).then(([studentsSnapshot, transactionsSnapshot]) => {
        const students = studentsSnapshot.val() || {};
        const transactions = transactionsSnapshot.val() || {};
        
        // Calculate statistics
        let totalAmount = 0;
        let kindergartenAmount = 0;
        let primaryAmount = 0;
        const classAmounts = {};
        
        // Initialize class amounts
        ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].forEach(className => {
            classAmounts[className] = 0;
        });
        
        // Calculate student balances
        for (const studentId in students) {
            const student = students[studentId];
            const balance = student.balance || 0;
            totalAmount += balance;
            
            if (student.class === 'อนุบาล') {
                kindergartenAmount += balance;
            } else {
                primaryAmount += balance;
            }
            
            if (classAmounts[student.class] !== undefined) {
                classAmounts[student.class] += balance;
            }
        }
        
        // Update UI
        document.getElementById('totalAmount').textContent = `฿${totalAmount.toLocaleString()}`;
        document.getElementById('kindergartenAmount').textContent = `฿${kindergartenAmount.toLocaleString()}`;
        document.getElementById('primaryAmount').textContent = `฿${primaryAmount.toLocaleString()}`;
        document.getElementById('totalStudents').textContent = Object.keys(students).length;
        
        // Update chart
        updateClassChart(classAmounts);
        
        $.LoadingOverlay('hide');
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้'
        });
    });
}

function updateClassChart(classAmounts) {
    const ctx = document.getElementById('classChart').getContext('2d');
    
    if (classChart) {
        classChart.destroy();
    }
    
    classChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(classAmounts),
            datasets: [{
                label: 'ยอดเงินรวม',
                data: Object.values(classAmounts),
                backgroundColor: [
                    'rgba(255, 154, 86, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 154, 86, 1)',
                    'rgba(255, 107, 107, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(236, 72, 153, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '฿' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '฿' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function filterDashboard(filter) {
    // Update button styles
    const buttons = document.querySelectorAll('[onclick^="filterDashboard"]');
    buttons.forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    if (filter === 'all') {
        buttons[0].classList.remove('bg-gray-200', 'text-gray-700');
        buttons[0].classList.add('bg-orange-500', 'text-white');
        loadDashboardData();
    } else if (filter === 'monthly') {
        buttons[1].classList.remove('bg-gray-200', 'text-gray-700');
        buttons[1].classList.add('bg-orange-500', 'text-white');
        loadMonthlyDashboardData();
    }
}

function loadMonthlyDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกเดือน',
            text: 'กรุณาเลือกเดือนที่ต้องการดูข้อมูล'
        });
        return;
    }
    
    $.LoadingOverlay('show');
    
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const transactionsRef = database.ref('transactions');
    transactionsRef.once('value', (snapshot) => {
        const transactions = snapshot.val() || {};
        let monthlyTotal = 0;
        const classMonthlyAmounts = {};
        
        // Initialize class amounts
        ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].forEach(className => {
            classMonthlyAmounts[className] = 0;
        });
        
        // Calculate monthly totals
        for (const transactionId in transactions) {
            const transaction = transactions[transactionId];
            const transactionDate = new Date(transaction.date);
            
            if (transactionDate >= startDate && transactionDate <= endDate) {
                const amount = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
                monthlyTotal += amount;
                
                if (classMonthlyAmounts[transaction.studentClass] !== undefined) {
                    classMonthlyAmounts[transaction.studentClass] += amount;
                }
            }
        }
        
        // Update UI with monthly data
        document.getElementById('totalAmount').textContent = `฿${monthlyTotal.toLocaleString()}`;
        
        let kindergartenMonthly = classMonthlyAmounts['อนุบาล'] || 0;
        let primaryMonthly = 0;
        for (let i = 1; i <= 6; i++) {
            primaryMonthly += classMonthlyAmounts[`ป.${i}`] || 0;
        }
        
        document.getElementById('kindergartenAmount').textContent = `฿${kindergartenMonthly.toLocaleString()}`;
        document.getElementById('primaryAmount').textContent = `฿${primaryMonthly.toLocaleString()}`;
        
        // Update chart with monthly data
        updateClassChart(classMonthlyAmounts);
        
        $.LoadingOverlay('hide');
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดข้อมูลรายเดือนได้'
        });
    });
}

// Transaction Functions
function loadTransactions() {
    $.LoadingOverlay('show');
    
    const transactionsRef = database.ref('transactions');
    transactionsRef.once('value', (snapshot) => {
        transactions = snapshot.val() || {};
        displayTransactions();
        $.LoadingOverlay('hide');
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดรายการฝาก-ถอนได้'
        });
    });
}

function displayTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';
    
    const transactionArray = Object.values(transactions);
    const startIndex = (currentPage - 1) * 20;
    const endIndex = startIndex + 20;
    const pageTransactions = transactionArray.slice(startIndex, endIndex);
    
    pageTransactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3">${startIndex + index + 1}</td>
            <td class="px-4 py-3">${formatDate(transaction.date)}</td>
            <td class="px-4 py-3">${transaction.studentName}</td>
            <td class="px-4 py-3">${transaction.studentClass}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded-full ${
                    transaction.type === 'deposit' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }">
                    ${transaction.type === 'deposit' ? 'ฝาก' : 'ถอน'}
                </span>
            </td>
            <td class="px-4 py-3 font-semibold">
                ${transaction.type === 'deposit' ? '+' : '-'}฿${transaction.amount.toLocaleString()}
            </td>
            <td class="px-4 py-3">
                <button onclick="editTransaction('${transaction.id}')" class="text-blue-600 hover:text-blue-800 mr-2">
                    แก้ไข
                </button>
                <button onclick="deleteTransaction('${transaction.id}')" class="text-red-600 hover:text-red-800">
                    ลบ
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update pagination
    const totalPages = Math.ceil(transactionArray.length / 20);
    document.getElementById('pageInfo').textContent = `หน้า ${currentPage} จาก ${totalPages}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist year
    return `${day} ${month} ${year}`;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayTransactions();
    }
}

function nextPage() {
    const totalPages = Math.ceil(Object.keys(transactions).length / 20);
    if (currentPage < totalPages) {
        currentPage++;
        displayTransactions();
    }
}

// Student Functions
function loadStudents() {
    $.LoadingOverlay('show');
    
    const studentsRef = database.ref('students');
    studentsRef.once('value', (snapshot) => {
        students = snapshot.val() || {};
        displayStudents();
        $.LoadingOverlay('hide');
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดรายชื่อนักเรียนได้'
        });
    });
}

function displayStudents() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';
    
    let studentArray = Object.values(students);
    
    // Filter by class if user is a teacher
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    const startIndex = (studentCurrentPage - 1) * 20;
    const endIndex = startIndex + 20;
    const pageStudents = studentArray.slice(startIndex, endIndex);
    
    pageStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3">${startIndex + index + 1}</td>
            <td class="px-4 py-3">${student.name}</td>
            <td class="px-4 py-3">${student.class}</td>
            <td class="px-4 py-3 font-semibold">฿${(student.balance || 0).toLocaleString()}</td>
            <td class="px-4 py-3">
                <button onclick="editStudent('${student.id}')" class="text-blue-600 hover:text-blue-800 mr-2">
                    แก้ไข
                </button>
                <button onclick="deleteStudent('${student.id}')" class="text-red-600 hover:text-red-800">
                    ลบ
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update pagination
    const totalPages = Math.ceil(studentArray.length / 20);
    document.getElementById('studentPageInfo').textContent = `หน้า ${studentCurrentPage} จาก ${totalPages}`;
}

function previousStudentPage() {
    if (studentCurrentPage > 1) {
        studentCurrentPage--;
        displayStudents();
    }
}

function nextStudentPage() {
    const totalPages = Math.ceil(Object.keys(students).length / 20);
    if (studentCurrentPage < totalPages) {
        studentCurrentPage++;
        displayStudents();
    }
}

// User Management Functions
function loadUsers() {
    $.LoadingOverlay('show');
    
    const usersRef = database.ref('users');
    usersRef.once('value', (snapshot) => {
        users = snapshot.val() || {};
        displayUsers();
        $.LoadingOverlay('hide');
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'
        });
    });
}

function displayUsers() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    for (const userId in users) {
        const user = users[userId];
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3">${user.username}</td>
            <td class="px-4 py-3">${user.role === 'admin' ? 'Admin' : `ครูประจำชั้น ${user.class || ''}`}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    ใช้งาน
                </span>
            </td>
            <td class="px-4 py-3">
                <button onclick="editUser('${userId}')" class="text-blue-600 hover:text-blue-800 mr-2">
                    แก้ไข
                </button>
                <button onclick="deleteUser('${userId}')" class="text-red-600 hover:text-red-800">
                    ลบ
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

// Modal Functions
function showDepositModal() {
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบก่อนทำรายการฝากเงิน'
        });
        return;
    }
    
    const modal = document.getElementById('depositModal');
    modal.classList.add('show');
    
    // Set today's date
    document.getElementById('depositDate').value = new Date().toISOString().split('T')[0];
    
    // Load students for deposit
    loadStudentsForDeposit();
}

function showWithdrawModal() {
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบก่อนทำรายการถอนเงิน'
        });
        return;
    }
    
    const modal = document.getElementById('withdrawModal');
    modal.classList.add('show');
    
    // Set today's date
    document.getElementById('withdrawDate').value = new Date().toISOString().split('T')[0];
    
    // Load students for withdraw
    loadStudentsForWithdraw();
}

function showInitialDepositModal() {
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบก่อนทำรายการยกมา'
        });
        return;
    }
    
    const modal = document.getElementById('initialDepositModal');
    modal.classList.add('show');
    
    // Set today's date
    document.getElementById('initialDate').value = new Date().toISOString().split('T')[0];
    
    // Load students for initial deposit
    loadStudentsForInitialDeposit();
}

function showAddStudentModal() {
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบก่อนเพิ่มนักเรียน'
        });
        return;
    }
    
    const modal = document.getElementById('addStudentModal');
    modal.classList.add('show');
    
    // Generate 10 student forms
    generateStudentForms();
}

function showAddUserModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์',
            text: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มผู้ใช้ได้'
        });
        return;
    }
    
    const modal = document.getElementById('addUserModal');
    modal.classList.add('show');
    
    // Setup role change listener
    document.getElementById('newUserRole').addEventListener('change', function() {
        const classSelection = document.getElementById('classSelection');
        if (this.value === 'teacher') {
            classSelection.classList.remove('hidden');
        } else {
            classSelection.classList.add('hidden');
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

// Load Students for Modals
function loadStudentsForDeposit() {
    const tbody = document.getElementById('depositStudentList');
    tbody.innerHTML = '';
    
    let studentArray = Object.values(students);
    
    // Filter by class if user is a teacher
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3">${student.name}</td>
            <td class="px-4 py-3">${student.class}</td>
            <td class="px-4 py-3">
                <input type="number" id="deposit_${student.id}" min="0" step="0.01" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                       placeholder="0.00">
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadStudentsForWithdraw() {
    const tbody = document.getElementById('withdrawStudentList');
    tbody.innerHTML = '';
    
    let studentArray = Object.values(students);
    
    // Filter by class if user is a teacher
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3">${student.name}</td>
            <td class="px-4 py-3">${student.class}</td>
            <td class="px-4 py-3 font-semibold">฿${(student.balance || 0).toLocaleString()}</td>
            <td class="px-4 py-3">
                <input type="number" id="withdraw_${student.id}" min="0" max="${student.balance || 0}" step="0.01"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                       placeholder="0.00">
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadStudentsForInitialDeposit() {
    const tbody = document.getElementById('initialStudentList');
    tbody.innerHTML = '';
    
    let studentArray = Object.values(students);
    
    // Filter by class if user is a teacher
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3">${student.name}</td>
            <td class="px-4 py-3">${student.class}</td>
            <td class="px-4 py-3">
                <input type="number" id="initial_${student.id}" min="0" step="0.01"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                       placeholder="0.00">
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Save Functions
function saveDeposit() {
    const date = document.getElementById('depositDate').value;
    const deposits = [];
    
    let studentArray = Object.values(students);
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const amount = parseFloat(document.getElementById(`deposit_${student.id}`).value) || 0;
        if (amount > 0) {
            deposits.push({
                studentId: student.id,
                studentName: student.name,
                studentClass: student.class,
                amount: amount,
                date: date,
                type: 'deposit'
            });
        }
    });
    
    if (deposits.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีรายการ',
            text: 'กรุณากรอกจำนวนเงินอย่างน้อย 1 รายการ'
        });
        return;
    }
    
    $.LoadingOverlay('show');
    
    // Save transactions and update student balances
    const transactionsRef = database.ref('transactions');
    const studentsRef = database.ref('students');
    
    Promise.all(deposits.map(deposit => {
        // Save transaction
        const transactionRef = transactionsRef.push();
        const transactionPromise = transactionRef.set(deposit);
        
        // Update student balance
        const studentRef = studentsRef.child(deposit.studentId);
        const studentPromise = studentRef.once('value').then(snapshot => {
            const student = snapshot.val() || {};
            const newBalance = (student.balance || 0) + deposit.amount;
            return studentRef.update({ balance: newBalance });
        });
        
        return Promise.all([transactionPromise, studentPromise]);
    })).then(() => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: `บันทึกรายการฝากเงิน ${deposits.length} รายการเรียบร้อย`
        }).then(() => {
            closeModal('depositModal');
            loadTransactions();
            loadStudents();
            loadDashboardData();
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถบันทึกรายการฝากเงินได้'
        });
    });
}

function saveWithdraw() {
    const date = document.getElementById('withdrawDate').value;
    const withdrawals = [];
    
    let studentArray = Object.values(students);
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const amount = parseFloat(document.getElementById(`withdraw_${student.id}`).value) || 0;
        if (amount > 0) {
            withdrawals.push({
                studentId: student.id,
                studentName: student.name,
                studentClass: student.class,
                amount: amount,
                date: date,
                type: 'withdraw'
            });
        }
    });
    
    if (withdrawals.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีรายการ',
            text: 'กรุณากรอกจำนวนเงินอย่างน้อย 1 รายการ'
        });
        return;
    }
    
    $.LoadingOverlay('show');
    
    // Save transactions and update student balances
    const transactionsRef = database.ref('transactions');
    const studentsRef = database.ref('students');
    
    Promise.all(withdrawals.map(withdrawal => {
        // Save transaction
        const transactionRef = transactionsRef.push();
        const transactionPromise = transactionRef.set(withdrawal);
        
        // Update student balance
        const studentRef = studentsRef.child(withdrawal.studentId);
        const studentPromise = studentRef.once('value').then(snapshot => {
            const student = snapshot.val() || {};
            const newBalance = (student.balance || 0) - withdrawal.amount;
            return studentRef.update({ balance: newBalance });
        });
        
        return Promise.all([transactionPromise, studentPromise]);
    })).then(() => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: `บันทึกรายการถอนเงิน ${withdrawals.length} รายการเรียบร้อย`
        }).then(() => {
            closeModal('withdrawModal');
            loadTransactions();
            loadStudents();
            loadDashboardData();
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถบันทึกรายการถอนเงินได้'
        });
    });
}

function saveInitialDeposit() {
    const date = document.getElementById('initialDate').value;
    const initialDeposits = [];
    
    let studentArray = Object.values(students);
    if (currentUser.role === 'teacher' && currentUser.class) {
        studentArray = studentArray.filter(student => student.class === currentUser.class);
    }
    
    studentArray.forEach(student => {
        const amount = parseFloat(document.getElementById(`initial_${student.id}`).value) || 0;
        if (amount > 0) {
            initialDeposits.push({
                studentId: student.id,
                studentName: student.name,
                studentClass: student.class,
                amount: amount,
                date: date,
                type: 'initial'
            });
        }
    });
    
    if (initialDeposits.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีรายการ',
            text: 'กรุณากรอกจำนวนเงินอย่างน้อย 1 รายการ'
        });
        return;
    }
    
    $.LoadingOverlay('show');
    
    // Save transactions and update student balances
    const transactionsRef = database.ref('transactions');
    const studentsRef = database.ref('students');
    
    Promise.all(initialDeposits.map(deposit => {
        // Save transaction
        const transactionRef = transactionsRef.push();
        const transactionPromise = transactionRef.set(deposit);
        
        // Update student balance
        const studentRef = studentsRef.child(deposit.studentId);
        const studentPromise = studentRef.update({ balance: deposit.amount });
        
        return Promise.all([transactionPromise, studentPromise]);
    })).then(() => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: `บันทึกรายการยกมา ${initialDeposits.length} รายการเรียบร้อย`
        }).then(() => {
            closeModal('initialDepositModal');
            loadTransactions();
            loadStudents();
            loadDashboardData();
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถบันทึกรายการยกมาได้'
        });
    });
}

// Student Management Functions
function generateStudentForms() {
    const container = document.getElementById('studentFormContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const form = document.createElement('div');
        form.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg';
        form.innerHTML = `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ลำดับ ${i}</label>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
                <input type="text" id="studentName${i}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ชั้น</label>
                <select id="studentClass${i}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                    <option value="">เลือกชั้น</option>
                    <option value="อนุบาล">อนุบาล</option>
                    <option value="ป.1">ป.1</option>
                    <option value="ป.2">ป.2</option>
                    <option value="ป.3">ป.3</option>
                    <option value="ป.4">ป.4</option>
                    <option value="ป.5">ป.5</option>
                    <option value="ป.6">ป.6</option>
                </select>
            </div>
        `;
        container.appendChild(form);
    }
}

function saveStudents() {
    const newStudents = [];
    
    for (let i = 1; i <= 10; i++) {
        const name = document.getElementById(`studentName${i}`).value.trim();
        const studentClass = document.getElementById(`studentClass${i}`).value;
        
        if (name && studentClass) {
            // Check if teacher can add to this class
            if (currentUser.role === 'teacher' && currentUser.class !== studentClass) {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่มีสิทธิ์',
                    text: `คุณไม่สามารถเพิ่มนักเรียนในชั้น ${studentClass} ได้`
                });
                return;
            }
            
            newStudents.push({
                name: name,
                class: studentClass,
                balance: 0
            });
        }
    }
    
    if (newStudents.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีรายการ',
            text: 'กรุณากรอกข้อมูลนักเรียนอย่างน้อย 1 คน'
        });
        return;
    }
    
    $.LoadingOverlay('show');
    
    const studentsRef = database.ref('students');
    
    Promise.all(newStudents.map(student => {
        return studentsRef.push(student);
    })).then(() => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: `เพิ่มนักเรียน ${newStudents.length} คนเรียบร้อย`
        }).then(() => {
            closeModal('addStudentModal');
            loadStudents();
            loadDashboardData();
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเพิ่มนักเรียนได้'
        });
    });
}

function editStudent(studentId) {
    const student = students[studentId];
    
    // Check permissions
    if (currentUser.role === 'teacher' && currentUser.class !== student.class) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์',
            text: 'คุณไม่สามารถแก้ไขนักเรียนในชั้นนี้ได้'
        });
        return;
    }
    
    document.getElementById('editStudentId').value = studentId;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentClass').value = student.class;
    
    const modal = document.getElementById('editStudentModal');
    modal.classList.add('show');
    
    // Setup form submission
    document.getElementById('editStudentForm').onsubmit = function(e) {
        e.preventDefault();
        
        const updatedStudent = {
            name: document.getElementById('editStudentName').value,
            class: document.getElementById('editStudentClass').value
        };
        
        // Check permissions again
        if (currentUser.role === 'teacher' && currentUser.class !== updatedStudent.class) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์',
                text: 'คุณไม่สามารถย้ายนักเรียนไปชั้นอื่นได้'
            });
            return;
        }
        
        $.LoadingOverlay('show');
        
        const studentRef = database.ref('students').child(studentId);
        studentRef.update(updatedStudent).then(() => {
            $.LoadingOverlay('hide');
            Swal.fire({
                icon: 'success',
                title: 'แก้ไขสำเร็จ',
                text: 'แก้ไขข้อมูลนักเรียนเรียบร้อย'
            }).then(() => {
                closeModal('editStudentModal');
                loadStudents();
                loadDashboardData();
            });
        }).catch(error => {
            $.LoadingOverlay('hide');
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถแก้ไขข้อมูลนักเรียนได้'
            });
        });
    };
}

function deleteStudent(studentId) {
    const student = students[studentId];
    
    // Check permissions
    if (currentUser.role === 'teacher' && currentUser.class !== student.class) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์',
            text: 'คุณไม่สามารถลบนักเรียนในชั้นนี้ได้'
        });
        return;
    }
    
    Swal.fire({
        title: 'ยืนยันการลบ',
        text: `คุณต้องการลบนักเรียน "${student.name}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            $.LoadingOverlay('show');
            
            const studentRef = database.ref('students').child(studentId);
            studentRef.remove().then(() => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'success',
                    title: 'ลบสำเร็จ',
                    text: 'ลบนักเรียนเรียบร้อย'
                }).then(() => {
                    loadStudents();
                    loadDashboardData();
                });
            }).catch(error => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถลบนักเรียนได้'
                });
            });
        }
    });
}

// User Management Functions
document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newUser = {
        username: document.getElementById('newUsername').value,
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newUserRole').value
    };
    
    if (newUser.role === 'teacher') {
        newUser.class = document.getElementById('newUserClass').value;
    }
    
    $.LoadingOverlay('show');
    
    const usersRef = database.ref('users');
    usersRef.push(newUser).then(() => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'success',
            title: 'เพิ่มผู้ใช้สำเร็จ',
            text: 'เพิ่มผู้ใช้ใหม่เรียบร้อย'
        }).then(() => {
            closeModal('addUserModal');
            loadUsers();
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเพิ่มผู้ใช้ได้'
        });
    });
});

function editUser(userId) {
    // Implementation for editing user
    Swal.fire({
        icon: 'info',
        title: 'ฟังก์ชันนี้ยังไม่พร้อมใช้งาน',
        text: 'กำลังพัฒนาฟังก์ชันแก้ไขผู้ใช้'
    });
}

function deleteUser(userId) {
    const user = users[userId];
    
    if (user.username === 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถลบ',
            text: 'ไม่สามารถลบผู้ใช้ admin ได้'
        });
        return;
    }
    
    Swal.fire({
        title: 'ยืนยันการลบ',
        text: `คุณต้องการลบผู้ใช้ "${user.username}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            $.LoadingOverlay('show');
            
            const userRef = database.ref('users').child(userId);
            userRef.remove().then(() => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'success',
                    title: 'ลบสำเร็จ',
                    text: 'ลบผู้ใช้เรียบร้อย'
                }).then(() => {
                    loadUsers();
                });
            }).catch(error => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถลบผู้ใช้ได้'
                });
            });
        }
    });
}

// Transaction Management Functions
function editTransaction(transactionId) {
    // Implementation for editing transaction
    Swal.fire({
        icon: 'info',
        title: 'ฟังก์ชันนี้ยังไม่พร้อมใช้งาน',
        text: 'กำลังพัฒนาฟังก์ชันแก้ไขรายการ'
    });
}

function deleteTransaction(transactionId) {
    const transaction = transactions[transactionId];
    
    Swal.fire({
        title: 'ยืนยันการลบ',
        text: `คุณต้องการลบรายการ "${transaction.type === 'deposit' ? 'ฝาก' : 'ถอน'}" ของ ${transaction.studentName} หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            $.LoadingOverlay('show');
            
            // Delete transaction and update student balance
            const transactionRef = database.ref('transactions').child(transactionId);
            const studentsRef = database.ref('students').child(transaction.studentId);
            
            Promise.all([
                transactionRef.remove(),
                studentsRef.once('value').then(snapshot => {
                    const student = snapshot.val() || {};
                    const balanceChange = transaction.type === 'deposit' ? -transaction.amount : transaction.amount;
                    const newBalance = (student.balance || 0) + balanceChange;
                    return studentsRef.update({ balance: newBalance });
                })
            ]).then(() => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'success',
                    title: 'ลบสำเร็จ',
                    text: 'ลบรายการเรียบร้อย'
                }).then(() => {
                    loadTransactions();
                    loadStudents();
                    loadDashboardData();
                });
            }).catch(error => {
                $.LoadingOverlay('hide');
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถลบรายการได้'
                });
            });
        }
    });
}

// Excel Export Functions
function exportData() {
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบก่อนส่งออกข้อมูล'
        });
        return;
    }
    
    Swal.fire({
        title: 'เลือกช่วงวันที่',
        html: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">จากวันที่</label>
                    <input type="date" id="startDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">ถึงวันที่</label>
                    <input type="date" id="endDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'แสดงตัวอย่าง',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (!startDate || !endDate) {
                Swal.showValidationMessage('กรุณาเลือกช่วงวันที่ให้ครบถ้วน');
                return false;
            }
            
            return { startDate, endDate };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            showExportPreview(result.value.startDate, result.value.endDate);
        }
    });
}

function showExportPreview(startDate, endDate) {
    $.LoadingOverlay('show');
    
    const transactionsRef = database.ref('transactions');
    const studentsRef = database.ref('students');
    
    Promise.all([
        transactionsRef.once('value'),
        studentsRef.once('value')
    ]).then(([transactionsSnapshot, studentsSnapshot]) => {
        const transactions = transactionsSnapshot.val() || {};
        const students = studentsSnapshot.val() || {};
        
        // Filter transactions by date range
        const filteredTransactions = {};
        for (const transactionId in transactions) {
            const transaction = transactions[transactionId];
            const transactionDate = new Date(transaction.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (transactionDate >= start && transactionDate <= end) {
                // Filter by class if user is teacher
                if (currentUser.role === 'teacher' && currentUser.class) {
                    if (transaction.studentClass === currentUser.class) {
                        filteredTransactions[transactionId] = transaction;
                    }
                } else {
                    filteredTransactions[transactionId] = transaction;
                }
            }
        }
        
        // Group transactions by student and date
        const exportData = {};
        const dateRange = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Generate date range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dateRange.push(dateStr);
        }
        
        // Process transactions
        for (const transactionId in filteredTransactions) {
            const transaction = filteredTransactions[transactionId];
            const studentId = transaction.studentId;
            const date = transaction.date;
            const amount = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
            
            if (!exportData[studentId]) {
                exportData[studentId] = {
                    name: transaction.studentName,
                    class: transaction.studentClass,
                    dailyAmounts: {}
                };
            }
            
            if (!exportData[studentId].dailyAmounts[date]) {
                exportData[studentId].dailyAmounts[date] = 0;
            }
            
            exportData[studentId].dailyAmounts[date] += amount;
        }
        
        // Generate preview table
        let previewHtml = `
            <div class="max-h-96 overflow-auto">
                <table class="w-full border-collapse border border-gray-300">
                    <thead class="bg-orange-50">
                        <tr>
                            <th class="border border-gray-300 px-4 py-2 text-left">ชื่อ</th>
        `;
        
        // Add date columns
        dateRange.forEach(date => {
            const formattedDate = formatDateThai(date);
            previewHtml += `<th class="border border-gray-300 px-4 py-2 text-center">${formattedDate}</th>`;
        });
        
        previewHtml += `
                            <th class="border border-gray-300 px-4 py-2 text-center">ยอดรวมตามช่วงวันที่</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let grandTotal = 0;
        const classTotals = {};
        
        // Add student rows
        for (const studentId in exportData) {
            const student = exportData[studentId];
            let studentTotal = 0;
            
            previewHtml += `
                <tr>
                    <td class="border border-gray-300 px-4 py-2">${student.name}</td>
            `;
            
            dateRange.forEach(date => {
                const amount = student.dailyAmounts[date] || 0;
                studentTotal += amount;
                previewHtml += `<td class="border border-gray-300 px-4 py-2 text-right">${amount > 0 ? '+' : ''}${amount.toLocaleString()}</td>`;
            });
            
            previewHtml += `<td class="border border-gray-300 px-4 py-2 text-right font-semibold">${studentTotal > 0 ? '+' : ''}${studentTotal.toLocaleString()}</td></tr>`;
            
            grandTotal += studentTotal;
            
            // Add to class totals
            if (!classTotals[student.class]) {
                classTotals[student.class] = 0;
            }
            classTotals[student.class] += studentTotal;
        }
        
        // Add class summary rows (for admin)
        if (currentUser.role === 'admin') {
            const classes = ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
            classes.forEach(className => {
                if (classTotals[className]) {
                    previewHtml += `
                        <tr class="bg-gray-100">
                            <td class="border border-gray-300 px-4 py-2 font-semibold">รวมชั้น ${className}</td>
                    `;
                    
                    dateRange.forEach(() => {
                        previewHtml += `<td class="border border-gray-300 px-4 py-2 text-center">-</td>`;
                    });
                    
                    previewHtml += `<td class="border border-gray-300 px-4 py-2 text-right font-bold">${classTotals[className] > 0 ? '+' : ''}${classTotals[className].toLocaleString()}</td></tr>`;
                }
            });
        }
        
        // Add grand total row
        previewHtml += `
                <tr class="bg-orange-100 font-bold">
                    <td class="border border-gray-300 px-4 py-2">รวมทั้งสิ้น</td>
        `;
        
        dateRange.forEach(() => {
            previewHtml += `<td class="border border-gray-300 px-4 py-2 text-center">-</td>`;
        });
        
        previewHtml += `<td class="border border-gray-300 px-4 py-2 text-right">${grandTotal > 0 ? '+' : ''}${grandTotal.toLocaleString()}</td></tr>`;
        
        previewHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        $.LoadingOverlay('hide');
        
        Swal.fire({
            title: 'ตัวอย่างข้อมูลที่จะส่งออก',
            html: previewHtml,
            width: '90%',
            showCancelButton: true,
            confirmButtonText: 'ส่งออก Excel',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                return { startDate, endDate, exportData, dateRange, classTotals, grandTotal };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                generateExcelFile(result.value);
            }
        });
    }).catch(error => {
        $.LoadingOverlay('hide');
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดข้อมูลสำหรับส่งออกได้'
        });
    });
}

function formatDateThai(dateString) {
    const date = new Date(dateString);
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

function generateExcelFile(data) {
    const { startDate, endDate, exportData, dateRange, classTotals, grandTotal } = data;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const wsData = [];
    
    // Add header with school info and date range
    wsData.push(['โรงเรียนบ้านกิ่วพร้าว']);
    wsData.push(['ระบบออมทรัพย์นักเรียน']);
    wsData.push([`รายงานยอดเงินออมทรัพย์ วันที่ ${formatDateThai(startDate)} ถึง ${formatDateThai(endDate)}`]);
    wsData.push([]); // Empty row
    
    // Add table headers
    const headers = ['ชื่อนักเรียน'];
    dateRange.forEach(date => {
        headers.push(formatDateThai(date));
    });
    headers.push('ยอดรวมตามช่วงวันที่');
    headers.push('ยอดเงินทั้งหมด');
    wsData.push(headers);
    
    // Add student data
    for (const studentId in exportData) {
        const student = exportData[studentId];
        const row = [student.name];
        let studentTotal = 0;
        
        dateRange.forEach(date => {
            const amount = student.dailyAmounts[date] || 0;
            studentTotal += amount;
            row.push(amount);
        });
        
        row.push(studentTotal);
        row.push(studentTotal); // Total amount is the same for now
        wsData.push(row);
    }
    
    // Add class summaries (for admin)
    if (currentUser.role === 'admin') {
        wsData.push([]); // Empty row
        wsData.push(['สรุปรายชั้น']);
        
        const classes = ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
        classes.forEach(className => {
            if (classTotals[className]) {
                const row = [`รวมชั้น ${className}`];
                dateRange.forEach(() => row.push(''));
                row.push(classTotals[className]);
                row.push(classTotals[className]);
                wsData.push(row);
            }
        });
    }
    
    // Add grand total
    wsData.push([]); // Empty row
    wsData.push(['รวมทั้งสิ้น']);
    const totalRow = [''];
    dateRange.forEach(() => totalRow.push(''));
    totalRow.push(grandTotal);
    totalRow.push(grandTotal);
    wsData.push(totalRow);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [{ wch: 25 }]; // Name column
    dateRange.forEach(() => colWidths.push({ wch: 12 })); // Date columns
    colWidths.push({ wch: 20 }, { wch: 20 }); // Total columns
    ws['!cols'] = colWidths;
    
    // Apply styling (basic styling for headers)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 4, c: C }); // Header row
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, sz: 16, name: 'TH Sarabun New' },
            alignment: { horizontal: 'center' },
            fill: { fgColor: { rgb: 'FFFFCC' } }
        };
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'รายการออมทรัพย์');
    
    // Generate filename
    const startFormatted = startDate.replace(/-/g, '');
    const endFormatted = endDate.replace(/-/g, '');
    const filename = `รายงานออมทรัพย์_${startFormatted}_${endFormatted}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    Swal.fire({
        icon: 'success',
        title: 'ส่งออกข้อมูลสำเร็จ',
        text: `บันทึกไฟล์ ${filename} เรียบร้อย`
    });
}

// Initialize default users if they don't exist
function initializeDefaultUsers() {
    const defaultUsers = [
        { username: 'P1', password: 'p1123456', role: 'teacher', class: 'ป.1' },
        { username: 'P2', password: 'p2123456', role: 'teacher', class: 'ป.2' },
        { username: 'P3', password: 'p3123456', role: 'teacher', class: 'ป.3' },
        { username: 'P4', password: 'p4123456', role: 'teacher', class: 'ป.4' },
        { username: 'P5', password: 'p5123456', role: 'teacher', class: 'ป.5' },
        { username: 'P6', password: 'p6123456', role: 'teacher', class: 'ป.6' },
        { username: 'K123', password: 'k123123456', role: 'teacher', class: 'อนุบาล' },
        { username: 'admin', password: 'admin57030010', role: 'admin' }
    ];
    
    const usersRef = database.ref('users');
    usersRef.once('value', (snapshot) => {
        const existingUsers = snapshot.val() || {};
        
        if (Object.keys(existingUsers).length === 0) {
            // Add default users
            defaultUsers.forEach(user => {
                usersRef.push(user);
            });
        }
    });
}

// Call this function when the app starts
initializeDefaultUsers();
