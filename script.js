// --- CONFIG & AUTH ---
const firebaseConfig = { apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", authDomain: "gadour-pro-free.firebaseapp.com", projectId: "gadour-pro-free", storageBucket: "gadour-pro-free.firebasestorage.app", messagingSenderId: "301548307386", appId: "1:301548307386:web:2a694b5a38aee71dc41383" };
let currentUser = null, db = null;

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

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
} catch(e) { console.error("Firebase Error", e); }

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert(err.message));
}

function logout() { firebase.auth().signOut(); }

// --- NAVIGATION ---
function showSection(id) {
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(event) event.target.classList.add('active');
    if (id === 'facture-view') renderFacture();
}

// --- LOGIQUE CALCUL ---
let projectItems = [];
let globalPrices = { v_ballar: 45 };

function addItem() {
    const name = document.getElementById('p-name').value || "Produit";
    const L = parseFloat(document.getElementById('p-width').value);
    const H = parseFloat(document.getElementById('p-height').value);
    const Q = parseInt(document.getElementById('p-qty').value);
    const serie = document.getElementById('p-serie').value;
    const color = document.getElementById('p-color').value;

    if (!L || !H) { alert("Veuillez saisir L et H"); return; }
    projectItems.push({ id: Date.now(), productName: name, L_cm: L, H_cm: H, Q: Q, serieKey: serie, colorName: color });
    renderItems();
}

function renderItems() {
    const container = document.getElementById('items-list');
    container.innerHTML = "";
    projectItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "window-card";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>#${index+1} - ${item.productName} (x${item.Q})</strong>
                <button onclick="removeItem(${item.id})" style="background:red; color:white; border:none; border-radius:5px; cursor:pointer;">X</button>
            </div>
            <div class="fissala-results">${generateFissalaHTML(item)}</div>
        `;
        container.appendChild(div);
    });
}

function generateFissalaHTML(item) {
    let res = "<ul>";
    if(item.serieKey === "t2_45") {
        res += `<li>Cadre L: ${item.L_cm} (x2) | H: ${item.H_cm} (x2)</li>`;
        res += `<li>Ouvrant L: ${item.L_cm - 4} (x2) | H: ${item.H_cm - 4} (x2)</li>`;
    } else if(item.serieKey === "p92_coul") {
        res += `<li>Rail L: ${item.L_cm} (x2) | Montant H: ${item.H_cm - 3} (x4)</li>`;
    } else {
        res += `<li>Calcul standard pour ${item.serieKey}</li>`;
    }
    return res + "</ul>";
}

function removeItem(id) { projectItems = projectItems.filter(i => i.id !== id); renderItems(); }
function clearProject() { projectItems = []; renderItems(); }

// --- PRICES ---
function loadPrices() {
    if(!db || !currentUser) return;
    db.collection("settings").doc(currentUser.uid).get().then(doc => {
        if(doc.exists) {
            globalPrices = doc.data().prices || globalPrices;
            document.querySelector('.price-input').value = globalPrices.v_ballar;
        }
    });
}

function updatePrice(key, val) { globalPrices[key] = parseFloat(val); }
function savePrices() {
    db.collection("settings").doc(currentUser.uid).set({ prices: globalPrices }, {merge:true}).then(() => alert("Enregistré !"));
}

// --- FACTURE ---
function renderFacture() {
    const tbody = document.querySelector("#facture-table tbody");
    tbody.innerHTML = "";
    let grandTotal = 0;
    projectItems.forEach(item => {
        let area = (item.L_cm * item.H_cm) / 10000;
        let pu = area * globalPrices.v_ballar + 50;
        let total = pu * item.Q;
        grandTotal += total;
        tbody.innerHTML += `<tr><td>${item.productName}</td><td>${item.Q}</td><td>${pu.toFixed(3)}</td><td class="row-total">${total.toFixed(3)}</td></tr>`;
    });
    document.getElementById('facture-total-display').innerText = grandTotal.toFixed(3);
    document.getElementById('factureDate').valueAsDate = new Date();
}

// --- DARK MODE FIX ---
function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('darkModeToggle');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        btn.innerHTML = "☀️ Mode Clair";
        localStorage.setItem('gadour_theme', 'dark');
    } else {
        btn.innerHTML = "🌙 Mode Sombre";
        localStorage.setItem('gadour_theme', 'light');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('gadour_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('darkModeToggle');
        if(btn) btn.innerHTML = "☀️ Mode Clair";
    }
});
