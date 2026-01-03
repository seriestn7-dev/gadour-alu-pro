// --- 1. CONFIGURATION FIREBASE (القديمة متاعك) ---
const firebaseConfig = { 
    apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", 
    authDomain: "gadour-pro-free.firebaseapp.com", 
    projectId: "gadour-pro-free", 
    storageBucket: "gadour-pro-free.firebasestorage.app", 
    messagingSenderId: "301548307386", 
    appId: "1:301548307386:web:2a694b5a38aee71dc41383" 
};

let currentUser = null, db = null, isSubscribed = false;
let devis = [];
let database = {};
const toulBarra = 650; 
const CUT_MARGIN = 5;

// قاعدة البيانات الأصلية مع زيادة سعر البلور v_ballar
const defaultDatabase = { 
    "p_67103": 200, "p_67104": 120, "p_67105": 120, "p_67106": 120, "p_Rail": 80, "p_67114": 90, 
    "p_40402": 120, "p_40404": 200, "p_40107": 30, "p_40112": 120, "p_40100": 100, "p_40121": 100, 
    "p_40154": 100, "p_40134": 80, "p_40166": 60, "p_Lame55": 80, "p_Glissiere": 50, "p_Lame_Finale": 60, 
    "p_Axe_Store": 40, "p_Lame39": 65, "p_Caisson_Mono": 55, "p_Axe40": 35, "p_Traverse40104": 120, 
    "a_Gallet": 2, "a_Fermeture": 5, "a_Gache_Fermeture": 2, "a_Kit_Etancheite": 5, "a_Joint_Brosse": 0.5, 
    "a_Paumelle": 2, "a_Cremone": 5, "a_Kit_Cremone": 2.5, "a_Ecer_Danimo_G": 0.05, "a_Ecer_Danimo_P": 0.05, 
    "a_Ecer_Tall_7did": 2, "a_Ecer_67103": 2, "a_Ecer_Font": 2, "a_Joint_Batman": 0.5, "a_Joint_A36": 0.5, 
    "a_Kit_Vero_Semi_Fix": 2.5, "a_Bochon_112": 3, "a_Serrure_Cylindre": 20, "a_Poignee_Beb": 20, 
    "a_Joint_Vitrage_242": 0.5, "a_Angle_Parclose": 0.5, "a_Moteur_Store_40": 120, "a_Moteur_Store_55": 140, 
    "a_Axe_Rallonge": 10, "a_Tirant": 5, "a_Tirant_Mono": 5, "a_Joint_Brosse_5": 0.5, "a_Joint_Brosse_6": 0.5, 
    "a_Bochon_55": 0.5, "a_Bochon_39": 0.5, "a_Kit_Acc_Mono": 25, "a_Cache_Canon": 2.5, "a_Joint_Batman_247": 0.8, 
    "v_ballar": 45 
};

// --- 2. FIREBASE & AUTH (نفس الكود متاعك) ---
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
db = firebase.firestore();

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        loadPrices();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    }
});

// --- 3. الدوال الأساسية (بدون تغيير) ---
function loadPrices() {
    const s = localStorage.getItem('gadourAluPrices'); 
    database = s ? {...defaultDatabase, ...JSON.parse(s)} : {...defaultDatabase};
}

window.addItemToDevis = function() {
    const l = parseFloat(document.getElementById('largeur').value);
    const h = parseFloat(document.getElementById('hauteur').value);
    const q = parseInt(document.getElementById('quantite').value);
    const p = document.getElementById('productType');
    const c = document.getElementById('couleur');
    if (!l || !h) return;
    devis.push({
        product: p.value, productName: p.options[p.selectedIndex].text,
        L_cm: l, H_cm: h, Q: q,
        colorFactor: parseFloat(c.value), colorName: c.options[c.selectedIndex].text
    });
    updateUI();
};

function updateUI() {
    const tb = document.querySelector("#devis-items tbody");
    if(!tb) return;
    tb.innerHTML = "";
    devis.forEach((it, i) => {
        tb.innerHTML += `<tr><td>${it.Q}</td><td>${it.productName}</td><td>${it.L_cm}x${it.H_cm}</td><td><button onclick="devis.splice(${i},1);updateUI()">❌</button></td></tr>`;
    });
}

// --- 4. الجزء الجديد: حسبة البلور (Vitrage) ---
function calculateVitrage() {
    let vitrageList = [];
    devis.forEach(it => {
        let Hv = 0, Lv = 0;
        if (it.product === "coulissant") {
            Hv = (it.H_cm - 6.5) - 8.5; 
            Lv = ((it.L_cm - 15.5) / 2) - 1;
            vitrageList.push({ type: "Coulissant", h: Hv, l: Lv, q: 2 * it.Q });
        } else if (it.product.includes("ouvrant")) {
            let red = it.product.includes("40100") ? 11 : 10;
            Hv = (it.H_cm - 4.2) - red;
            Lv = (it.product.includes("2v") ? ((it.L_cm - 4.5) / 2) : (it.L_cm - 4.2)) - red;
            vitrageList.push({ type: it.productName, h: Hv, l: Lv, q: (it.product.includes("2v") ? 2 : 1) * it.Q });
        }
    });
    return vitrageList;
}

// --- 5. دالة الحساب الكلي (المعدلة لإظهار البلور) ---
window.calculateTotalDevis = function() {
    if (devis.length === 0) return alert("البيت فارغ!");
    
    let totalAlu = 0; // حسبة تقديرية للألمنيوم
    let totalGlass = 0;
    let glassData = calculateVitrage();
    
    let html = "<h3>📊 النتيجة (Résultat)</h3>";
    
    // جدول البلور
    html += "<table border='1' style='width:100%; text-align:center; margin-bottom:15px;'>";
    html += "<tr style='background:#eee;'><th>النوع</th><th>القياس (cm)</th><th>الكمية</th><th>الثمن</th></tr>";
    
    glassData.forEach(v => {
        let surface = (v.h * v.l) / 10000;
        let price = surface * (database['v_ballar'] || 45) * v.q;
        totalGlass += price;
        html += `<tr><td>${v.type}</td><td>${v.h.toFixed(1)}x${v.l.toFixed(1)}</td><td>${v.q}</td><td>${price.toFixed(3)} DT</td></tr>`;
    });
    html += "</table>";

    // مجموع الألمنيوم (مثال بسيط)
    devis.forEach(it => { totalAlu += (it.L_cm + it.H_cm) * 0.05 * it.Q; });

    html += `<div style="text-align:right;">
        <p>مجموع البلور: <b>${totalGlass.toFixed(3)} DT</b></p>
        <h2 style="color:red;">المجموع الصافي: ${(totalAlu + totalGlass).toFixed(3)} DT</h2>
    </div>`;

    document.getElementById('total-result').innerHTML = html;
};

window.switchMode = function(m) {
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    document.getElementById(m + '-view').classList.add('active');
};
