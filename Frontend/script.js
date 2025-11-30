const BACKEND_URL = "http://127.0.0.1:5000"; 
let currentTab = 'link';

// --- LÓGICA DE TEMA (DARK MODE) ---
const toggleSwitch = document.querySelector('#themeToggle');
const currentTheme = localStorage.getItem('theme');

// Cargar tema guardado
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') toggleSwitch.checked = true;
}

// Escuchar cambios
toggleSwitch.addEventListener('change', function(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
});

// --- LÓGICA DE LA APP ---
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('form-link').classList.add('hidden');
    document.getElementById('form-text').classList.add('hidden');
    document.getElementById('form-wifi').classList.add('hidden');
    document.getElementById(`form-${tab}`).classList.remove('hidden');
}

// Selectores de Patrones
document.querySelectorAll('.grid-opt').forEach(opt => {
    opt.addEventListener('click', function() {
        const parent = this.parentElement;
        parent.querySelectorAll('.grid-opt').forEach(sib => sib.classList.remove('active'));
        this.classList.add('active');
        const val = this.dataset.val;
        if(parent.id === 'bodyGrid') document.getElementById('bodyStyle').value = val;
        if(parent.id === 'eyeGrid') document.getElementById('eyeStyle').value = val;
    });
});

async function generarQR() {
    const container = document.getElementById('qrContainer');
    container.innerHTML = '<div style="color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    let payload = {
        type: currentTab,
        fill_color: document.getElementById('fillColor').value,
        back_color: document.getElementById('backColor').value,
        is_transparent: document.getElementById('transparentBg').checked,
        body_style: document.getElementById('bodyStyle').value,
        eye_style: document.getElementById('eyeStyle').value,
        error_level: document.getElementById('errorLevel').value, // NUEVO: Enviamos legibilidad
        size: 800,
        format: 'png'
    };

    if (currentTab === 'link') payload.content = document.getElementById('inp-link').value;
    if (currentTab === 'text') payload.content = document.getElementById('inp-text').value;
    if (currentTab === 'wifi') {
        payload.ssid = document.getElementById('ssid').value;
        payload.password = document.getElementById('password').value;
        payload.encryption = document.getElementById('encryption').value;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Error backend");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        container.innerHTML = `<img src="${url}" alt="QR">`;
    } catch (e) {
        container.innerHTML = '<p style="color:red; font-size:0.8rem">Error al generar</p>';
    }
}

async function descargar() {
    const btn = document.querySelector('.dl-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando...';
    
    const format = document.getElementById('formatSelect').value;
    if(format === 'jpg' && document.getElementById('transparentBg').checked){
        if(!confirm("JPG no soporta transparencia. El fondo será blanco. ¿Seguir?")) {
            btn.innerHTML = originalText;
            return;
        }
    }

    let payload = {
        type: currentTab,
        fill_color: document.getElementById('fillColor').value,
        back_color: document.getElementById('backColor').value,
        is_transparent: document.getElementById('transparentBg').checked,
        body_style: document.getElementById('bodyStyle').value,
        eye_style: document.getElementById('eyeStyle').value,
        error_level: document.getElementById('errorLevel').value, // NUEVO
        size: document.getElementById('sizeSelect').value,
        format: format
    };

    if (currentTab === 'link') payload.content = document.getElementById('inp-link').value;
    if (currentTab === 'text') payload.content = document.getElementById('inp-text').value;
    if (currentTab === 'wifi') {
        payload.ssid = document.getElementById('ssid').value;
        payload.password = document.getElementById('password').value;
        payload.encryption = document.getElementById('encryption').value;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/generate`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch(e) {
        alert("Error descargando");
    }
    btn.innerHTML = originalText;
}