// --- Variables globales ---
let currentUser = null;
let stream = null;

// --- Elementos del DOM ---
const loginSection = document.getElementById('login-section');
const attendanceSection = document.getElementById('attendance-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const employeeCodeInput = document.getElementById('employee-code');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const attendanceBtns = document.querySelectorAll('.attendance-btn');
const reportTableBody = document.querySelector('#report-table tbody');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const sidebarAsistencia = document.getElementById('sidebar-asistencia');
const sidebarPersonal = document.getElementById('sidebar-personal');
const loginForm = document.getElementById('login-form');

// --- Funciones de utilidad ---
function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function getTime() {
    const d = new Date();
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function saveAttendance(code, type, photo) {
    const today = getToday();
    let records = JSON.parse(localStorage.getItem('attendances') || '{}');
    if (!records[today]) records[today] = {};
    if (!records[today][code]) records[today][code] = { entrada: null, salida_refrigerio: null, entrada_refrigerio: null, salida: null };
    records[today][code][type] = { time: getTime(), photo };
    localStorage.setItem('attendances', JSON.stringify(records));
}

function getAttendances() {
    return JSON.parse(localStorage.getItem('attendances') || '{}');
}

function showLogin() {
    loginSection.style.display = '';
    attendanceSection.style.display = 'none';
    adminSection.style.display = 'none';
    employeeCodeInput.value = '';
    document.querySelector('.bienvenida').style.display = '';
}

function showAttendance() {
    loginSection.style.display = 'none';
    attendanceSection.style.display = '';
    adminSection.style.display = 'none';
    startCamera();
    document.querySelector('.bienvenida')?.style.display = 'none';
    const trabajadores = getTrabajadores();
    currentUserName = trabajadores[currentUser] || currentUser;
    const mensajeCamara = document.getElementById('mensaje-camara');
    mensajeCamara.textContent = `¡Hola! ${currentUserName} bienvenido, mira la cámara`;
}

function showAdmin() {
    loginSection.style.display = 'none';
    attendanceSection.style.display = 'none';
    adminSection.style.display = '';
    loadReport();
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            video.srcObject = stream;
        })
        .catch(err => {
            alert('No se pudo acceder a la cámara.');
        });
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function takePhoto() {
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

function asistenciaCell(data) {
    return data ? `<div><b>${data.time}</b><br><img class="attendance-photo" src="${data.photo}"/></div>` : '-';
}

function loadReport() {
    reportTableBody.innerHTML = '';
    const records = getAttendances();
    const trabajadores = getTrabajadores();
    Object.keys(records).forEach(date => {
        Object.keys(records[date]).forEach(code => {
            const nombre = trabajadores[code] || '-';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${code}</td>
                <td>${nombre}</td>
                <td>${date}</td>
                <td>${asistenciaCell(records[date][code].entrada)}</td>
                <td>${asistenciaCell(records[date][code].salida_refrigerio)}</td>
                <td>${asistenciaCell(records[date][code].entrada_refrigerio)}</td>
                <td>${asistenciaCell(records[date][code].salida)}</td>
            `;
            reportTableBody.appendChild(row);
        });
    });
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Reporte de Asistencias - JJ GROSS', 14, 14);
    const records = getAttendances();
    let data = [];
    Object.keys(records).forEach(date => {
        Object.keys(records[date]).forEach(code => {
            data.push([
                code,
                date,
                records[date][code].entrada ? records[date][code].entrada.time : '-',
                records[date][code].salida_refrigerio ? records[date][code].salida_refrigerio.time : '-',
                records[date][code].entrada_refrigerio ? records[date][code].entrada_refrigerio.time : '-',
                records[date][code].salida ? records[date][code].salida.time : '-'
            ]);
        });
    });
    doc.autoTable({
        head: [['Código', 'Fecha', 'Entrada', 'Salida a Refrigerio', 'Entrada de Refrigerio', 'Salida']],
        body: data,
        startY: 22,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [191, 161, 74] }
    });
    doc.save('reporte_asistencias_jjgross.pdf');
}

// --- Eventos ---
loginForm.onsubmit = function(e) {
    e.preventDefault();
    const code = employeeCodeInput.value.trim();
    if (!code) {
        alert('Ingrese su código de empleado.');
        return;
    }
    currentUser = code;
    if (code.toLowerCase() === 'admin') {
        showAdmin();
    } else {
        showAttendance();
    }
};

logoutBtn.onclick = () => {
    stopCamera();
    currentUser = null;
    showLogin();
};

adminLogoutBtn.onclick = () => {
    currentUser = null;
    showLogin();
};

attendanceBtns.forEach(btn => {
    btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const photo = takePhoto();
        saveAttendance(currentUser, type, photo);
        let mensaje = '';
        switch(type) {
            case 'entrada': mensaje = '¡Entrada registrada!'; break;
            case 'salida_refrigerio': mensaje = '¡Salida a refrigerio registrada!'; break;
            case 'entrada_refrigerio': mensaje = '¡Entrada de refrigerio registrada!'; break;
            case 'salida': mensaje = '¡Salida registrada!'; break;
            default: mensaje = '¡Asistencia registrada!';
        }
        alert(mensaje);
    };
});

downloadPdfBtn.onclick = generatePDF;

// Sidebar navegación admin
sidebarAsistencia.onclick = () => {
    sidebarAsistencia.classList.add('active');
    sidebarPersonal.classList.remove('active');
    document.getElementById('admin-reporte').style.display = '';
    document.getElementById('admin-trabajadores').style.display = 'none';
};
sidebarPersonal.onclick = () => {
    sidebarPersonal.classList.add('active');
    sidebarAsistencia.classList.remove('active');
    document.getElementById('admin-reporte').style.display = 'none';
    document.getElementById('admin-trabajadores').style.display = '';
};

// --- Inicialización ---
showLogin();



