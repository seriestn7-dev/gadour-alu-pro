// --- 1. CONFIGURATION & FIREBASE ---
const firebaseConfig = { 
    apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", 
    authDomain: "gadour-pro-free.firebaseapp.com", 
    projectId: "gadour-pro-free", 
    storageBucket: "gadour-pro-free.firebasestorage.app", 
    messagingSenderId: "301548307386", 
    appId: "1:301548307386:web:2a694b5a38aee71dc41383" 
};

// --- 2. GLOBAL VARIABLES ---
let currentUser = null, db = null, isSubscribed = false;
let devis = []; // تعريف واحد فقط
const toulBarra = 650; 
const CUT_MARGIN = 5;
let database = {};

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

// --- 3. FIREBASE INIT ---
try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            checkSubscription();
        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

    window.logout = function() { auth.signOut(); window.location.reload(); };
} catch (e) { console.error("Firebase Error:", e); }

// --- 4. CORE FUNCTIONS (Calculations) ---

function calculateVitrage() {
    let vitrageList = [];
    const EPAISSEUR_TRAVERSE = 4.5;

    for (const it of devis) {
        let finalH = it.H_cm, finalL = it.L_cm;
        
        // 1. حساب بلور الـ Fixe إذا وجد
        if(it.hasFix) {
            let Hv, Lv;
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                Hv = it.fixSize - 2; Lv = it.L_cm - 2;
                finalH = it.H_cm - it.fixSize - EPAISSEUR_TRAVERSE;
            } else {
                Hv = it.H_cm - 2; Lv = it.fixSize - 2;
                finalL = it.L_cm - it.fixSize - EPAISSEUR_TRAVERSE;
            }
            vitrageList.push({ type: `Fixe (${it.productName})`, H: Hv, L: Lv, m2: (Hv * Lv) / 10000, Q: it.Q });
        }

        // 2. حساب بلور الفردات (Vantaux)
        if (it.product === "coulissant") {
            let Hv = (it.H_cm - 6.5) - 8.5; 
            let Lv = ((it.L_cm - 15.5) / 2) - 1;
            vitrageList.push({ type: "Coulissant", H: Hv, L: Lv, m2: (Hv * Lv) / 10000, Q: 2 * it.Q });
        } else if(it.product.includes("ouvrant")) {
            let is2V = it.product.includes("2v");
            let red = it.product.includes("40100") ? 11 : 10;
            let Hv = (finalH - 4.2) - red;
            let Lv = (is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2)) - red;
            vitrageList.push({ type: it.productName, H: Hv, L: Lv, m2: (Hv * Lv) / 10000, Q: is2V ? 2 * it.Q : it.Q });
        }
    }
    return vitrageList;
}

window.calculateTotalDevis = function() {
    if (devis.length === 0) return alert("Panier Vide !");
    
    let cd = generateCutData(); 
    let totalP = 0, totalA = 0, totalV = 0;
    let avgColor = devis.reduce((sum, it) => sum + it.colorFactor, 0) / devis.length;

    // 1. الأليمنيوم
    let html = '<h3>1. Profilés</h3><table><tr><th>Ref</th><th>Métrage</th><th>Barres</th></tr>';
    for(let k in cd) { 
        let cost = cd[k].bars.length * (database[k] || 0) * avgColor;
        totalP += cost;
        html += `<tr><td>${k.replace('p_','')}</td><td>${cd[k].meterage.toFixed(0)}cm</td><td><b>${cd[k].bars.length}</b></td></tr>`;
    }
    html += `<tr style="background:#eee"><td colspan="3">Total Profilés: ${totalP.toFixed(3)} TND</td></tr></table>`;

    // 2. البلور (Vitrage)
    let vData = calculateVitrage();
    html += '<h3>2. Vitrage (البلّور)</h3><table><tr><th>Type</th><th>Dimension</th><th>Qté</th><th>Total</th></tr>';
    vData.forEach(vd => {
        let line = vd.m2 * (database['v_ballar'] || 45) * vd.Q;
        totalV += line;
        html += `<tr><td>${vd.type}</td><td>${vd.H.toFixed(1)}x${vd.L.toFixed(1)}</td><td>${vd.Q}</td><td>${line.toFixed(3)}</td></tr>`;
    });
    html += `<tr style="background:#eee"><td colspan="4">Total Vitrage: ${totalV.toFixed(3)} TND</td></tr></table>`;

    let grandTotal = totalP + totalV;
    html += `<div style="text-align:right; margin-top:15px;"><h2>NET À PAYER: ${grandTotal.toFixed(3)} TND</h2></div>`;
    
    document.getElementById('total-result').innerHTML = html;
};

// --- 5. OTHER ORIGINAL FUNCTIONS ---
window.addItemToDevis = function() {
    const p = document.getElementById('productType');
    const l = parseFloat(document.getElementById('largeur').value);
    const h = parseFloat(document.getElementById('hauteur').value);
    const q = parseInt(document.getElementById('quantite').value);
    const c = document.getElementById('couleur');
    if(isNaN(l) || isNaN(h)) return alert("Vérifier Dimensions!");

    devis.push({
        product: p.value, productName: p.options[p.selectedIndex].text,
        L_cm: l, H_cm: h, Q: q,
        colorFactor: parseFloat(c.value), colorName: c.options[c.selectedIndex].text,
        hasFix: document.getElementById('hasFix').checked,
        fixSize: parseFloat(document.getElementById('fixSize').value || 0),
        fixPos: document.getElementById('fixPosition').value
    });
    updateUI();
};

function updateUI() {
    let tb = document.querySelector("#devis-items tbody"); if(!tb) return;
    tb.innerHTML = "";
    devis.forEach((it, i) => {
        tb.innerHTML += `<tr><td>${it.Q}</td><td>${it.productName}</td><td>${it.colorName}</td><td>${it.L_cm}x${it.H_cm}</td><td><button onclick="devis.splice(${i},1);updateUI()">X</button></td></tr>`;
    });
}

function generateCutData() {
    let piecesNeeded = {}; let meterage = {}; 
    const addPiece = (ref, len, q=1) => { 
        if(!piecesNeeded[ref]) piecesNeeded[ref] = [];
        if(!meterage[ref]) meterage[ref] = 0;
        for(let i=0; i<q; i++) { piecesNeeded[ref].push(len); meterage[ref] += len; }
    };
    
    for (const it of devis) {
        const L = it.L_cm, H = it.H_cm, Q = it.Q;
        // حسبة تقريبية للتقطيع
        if (it.product === "coulissant") {
            addPiece("p_67103", H+7, 2*Q); addPiece("p_67103", L+7, 2*Q);
            addPiece("p_67104", H-6.5, 2*Q); addPiece("p_67106", (L-15.5)/2, 4*Q);
        } else {
            addPiece("p_40402", H+7, 2*Q); addPiece("p_40402", L+7, 2*Q);
        }
    }

    let result = {};
    for (let ref in piecesNeeded) {
        let cuts = piecesNeeded[ref].sort((a,b) => b-a);
        let bars = [];
        cuts.forEach(c => {
            let placed = false;
            for(let b of bars) { if(b.rem >= (c + CUT_MARGIN)) { b.cuts.push(c); b.rem -= (c + CUT_MARGIN); placed = true; break; } }
            if(!placed) bars.push({rem: toulBarra - (c + CUT_MARGIN), cuts: [c]});
        });
        result[ref] = { meterage: meterage[ref], bars: bars };
    }
    return result;
}

function loadPrices() { 
    const s = localStorage.getItem('gadourAluPrices'); 
    database = s ? {...defaultDatabase, ...JSON.parse(s)} : {...defaultDatabase}; 
}

window.switchMode = function(m) {
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    let target = document.getElementById(m + '-view');
    if(target) target.classList.add('active');
};

function checkSubscription() {
    // Logic للـ Firebase متاعك
    isSubscribed = true; // للتجربة
    loadPrices();
}

document.addEventListener('DOMContentLoaded', () => { loadPrices(); });
