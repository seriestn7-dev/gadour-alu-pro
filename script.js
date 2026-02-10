// --- CONFIG & AUTH & ABONNEMENT ---
const firebaseConfig = { apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", authDomain: "gadour-pro-free.firebaseapp.com", projectId: "gadour-pro-free", storageBucket: "gadour-pro-free.firebasestorage.app", messagingSenderId: "301548307386", appId: "1:301548307386:web:2a694b5a38aee71dc41383" };
let currentUser = null, db = null, isSubscribed = false;

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    // 1. SURVEILLER L'ETAT DE CONNEXION
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';

            if (!sessionStorage.getItem('welcomeShown')) {
                document.getElementById('welcomePopup').style.display = 'flex';
                sessionStorage.setItem('welcomeShown', 'true'); 
            }
            
            loadPrices();
        } else {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });
} catch(e) { console.error("Firebase Init Error", e); }

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => {
        document.getElementById('login-status').innerText = "خطأ في الاتصال: " + error.message;
    });
}

function logout() { firebase.auth().signOut(); }

// --- UI NAVIGATION ---
function showSection(id) {
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.target.classList.add('active');
    if (id === 'facture-view') renderFacture();
}

// --- CORE LOGIC (CALCULS) ---
let projectItems = [];
let globalPrices = { v_ballar: 45 };

function addItem() {
    const name = document.getElementById('p-name').value || "Produit sans nom";
    const L = parseFloat(document.getElementById('p-width').value);
    const H = parseFloat(document.getElementById('p-height').value);
    const Q = parseInt(document.getElementById('p-qty').value);
    const serie = document.getElementById('p-serie').value;
    const color = document.getElementById('p-color').value;

    if (!L || !H) { alert("يرجى إدخال القياسات"); return; }

    const item = { id: Date.now(), productName: name, L_cm: L, H_cm: H, Q: Q, serieKey: serie, colorName: color };
    projectItems.push(item);
    renderItems();
}

function renderItems() {
    const container = document.getElementById('items-list');
    container.innerHTML = "";
    projectItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "window-card";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>#${index+1} - ${item.productName} (${item.Q} unités)</strong>
                <button class="btn" style="background:red; padding:5px 10px;" onclick="removeItem(${item.id})">X</button>
            </div>
            <p style="font-size:14px; color:#555;">Série: ${item.serieKey} | Couleur: ${item.colorName} | Dim: ${item.L_cm} x ${item.H_cm} cm</p>
            <div class="fissala-results">
                ${generateFissalaHTML(item)}
            </div>
        `;
        container.appendChild(div);
    });
}

function generateFissalaHTML(item) {
    let html = "<ul>";
    if(item.serieKey === "t2_45") {
        html += `<li>Cadre L: ${(item.L_cm).toFixed(1)} cm (x2)</li>`;
        html += `<li>Cadre H: ${(item.H_cm).toFixed(1)} cm (x2)</li>`;
        html += `<li>Ouvrant L: ${(item.L_cm - 4).toFixed(1)} cm (x2)</li>`;
        html += `<li>Ouvrant H: ${(item.H_cm - 4).toFixed(1)} cm (x2)</li>`;
    } else if(item.serieKey === "p92_coul") {
        html += `<li>Rail L: ${(item.L_cm).toFixed(1)} cm (x2)</li>`;
        html += `<li>Montant H: ${(item.H_cm - 3).toFixed(1)} cm (x4)</li>`;
        html += `<li>Chicane L: ${(item.L_cm / 2 + 1).toFixed(1)} cm (x4)</li>`;
    } else {
        html += `<li>Format standard pour ${item.serieKey}</li>`;
    }
    html += "</ul>";
    return html;
}

function removeItem(id) {
    projectItems = projectItems.filter(i => i.id !== id);
    renderItems();
}

function clearProject() { projectItems = []; renderItems(); }

// --- PRICES CLOUD ---
function loadPrices() {
    if(!db || !currentUser) return;
    db.collection("settings").doc(currentUser.uid).get().then(doc => {
        if(doc.exists) {
            globalPrices = doc.data().prices || globalPrices;
            document.querySelectorAll('.price-input').forEach(input => {
                const key = input.dataset.priceKey;
                if(globalPrices[key]) input.value = globalPrices[key];
            });
        }
    });
}

function updatePrice(key, val) { globalPrices[key] = parseFloat(val); }

function savePrices() {
    if(!db || !currentUser) return;
    db.collection("settings").doc(currentUser.uid).set({ prices: globalPrices }, {merge:true})
      .then(() => alert("تم حفظ الأسعار بنجاح"));
}

// --- FACTURE RENDERING ---
function renderFacture() {
    const tbody = document.querySelector("#facture-table tbody");
    tbody.innerHTML = "";
    projectItems.forEach(item => {
        let area = (item.L_cm * item.H_cm) / 10000;
        let prixUnit = area * globalPrices.v_ballar + 50; // Simple simulation
        let totalLigne = prixUnit * item.Q;
        tbody.innerHTML += `
            <tr>
                <td style="text-align:left; font-weight:bold;">
                    ${item.productName} <br>
                    <span style="font-size:12px; color:#666;">Dim: ${item.L_cm} x ${item.H_cm} | Coul: ${item.colorName}</span>
                </td>
                <td>${item.Q}</td>
                <td><input type="number" class="facture-pu" value="${prixUnit.toFixed(3)}" style="width:100%; border:none; text-align:center;" onchange="updateFactureTotal()"></td>
                <td class="facture-total">${totalLigne.toFixed(3)}</td>
            </tr>
        `;
    });
    updateFactureTotal();
    document.getElementById('factureDate').valueAsDate = new Date();
}

function updateFactureTotal() { 
    let rows = document.querySelectorAll("#facture-table tbody tr");
    let grandTotal = 0;
    rows.forEach(row => {
        const qte = parseFloat(row.cells[1].innerText);
        const puInput = row.querySelector('.facture-pu');
        const pu = parseFloat(puInput.value);
        const totalCell = row.querySelector('.facture-total');
        let totalLigne = 0;
        if (!isNaN(qte) && !isNaN(pu)) totalLigne = qte * pu;
        totalCell.innerText = totalLigne.toFixed(3);
        grandTotal += totalLigne;
    });
    document.getElementById('facture-total-display').innerText = grandTotal.toFixed(3);
}

// --- DARK MODE LOGIC (NEW) ---
function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('darkModeToggle');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        btn.innerHTML = "☀️ Mode Clair";
        localStorage.setItem('theme', 'dark');
    } else {
        btn.innerHTML = "🌙 Mode Sombre";
        localStorage.setItem('theme', 'light');
    }
}

// Load theme preference on start
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('darkModeToggle');
        if(btn) btn.innerHTML = "☀️ Mode Clair";
    }
});
