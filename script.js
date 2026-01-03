// --- CONFIG & AUTH & ABONNEMENT ---
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
const toulBarra = 650; 
const CUT_MARGIN = 5;
let database = {};

// Default Prices
let defaultDatabase = { 
    "p_67103": 200, "p_67104": 120, "p_67105": 120, "p_67106": 120, "p_Rail": 80, "p_67114": 90, 
    "p_40402": 120, "p_40404": 200, "p_40107": 30, "p_40112": 120, "p_40100": 100, "p_40121": 100, 
    "p_40154": 100, "p_40134": 80, "p_40166": 60, "p_Lame55": 80, "p_Glissiere": 50, "p_Lame_Finale": 60, 
    "p_Axe_Store": 40, "p_Lame39": 65, "p_Caisson_Mono": 55, "p_Axe40": 35, "p_Traverse40104": 120, 
    "a_Gallet": 2, "a_Fermeture": 5, "a_Gache_Fermeture": 2, "a_Kit_Etancheite": 5, "a_Joint_Brosse": 0.500, 
    "a_Paumelle": 2, "a_Cremone": 5, "a_Kit_Cremone": 2.5, "a_Ecer_Danimo_G": 0.050, "a_Ecer_Danimo_P": 0.050, 
    "a_Ecer_Tall_7did": 2, "a_Ecer_67103": 2, "a_Ecer_Font": 2, "a_Joint_Batman": 0.500, "a_Joint_A36": 0.500, 
    "a_Kit_Vero_Semi_Fix": 2.5, "a_Bochon_112": 3, "a_Serrure_Cylindre": 20, "a_Poignee_Beb": 20, 
    "a_Joint_Vitrage_242": 0.500, "a_Angle_Parclose": 0.500, "a_Moteur_Store_40": 120, "a_Moteur_Store_55": 140, 
    "a_Axe_Rallonge": 10, "a_Tirant": 5, "a_Tirant_Mono": 5, "a_Joint_Brosse_5": 0.500, "a_Joint_Brosse_6": 0.500, 
    "a_Bochon_55": 0.500, "a_Bochon_39": 0.500, "a_Kit_Acc_Mono": 25, "a_Cache_Canon": 2.500, "a_Joint_Batman_247": 0.800, 
    "v_ballar": 45 
};

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            const cachedSub = localStorage.getItem('gadour_sub_' + user.uid);
            if(cachedSub) { 
                const subData = JSON.parse(cachedSub); 
                updateSubUI(subData.daysLeft, subData.userName, subData.createdAt); 
                checkSubscription(true); 
            } else { checkSubscription(); }
        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

    window.logout = function() { auth.signOut(); window.location.reload(); };
} catch (e) { console.error(e); }

// --- SUBSCRIPTION & UI LOGIC ---
function checkSubscription(isBackground = false) {
    if(!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        let startDate = new Date(); let userName = currentUser.displayName || "Client";
        if(doc.exists) { 
            const data = doc.data(); 
            if(data.createdAt) startDate = data.createdAt.toDate(); 
            if(data.name) userName = data.name; 
        } else if(!isBackground) { 
            db.collection('users').doc(currentUser.uid).set({ email: currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); 
        }
        const diffDays = Math.ceil(Math.abs(new Date() - startDate) / (1000 * 60 * 60 * 24)); 
        const daysLeft = 30 - diffDays;
        localStorage.setItem('gadour_sub_' + currentUser.uid, JSON.stringify({ daysLeft, userName, createdAt: startDate }));
        updateSubUI(daysLeft, userName, startDate);
    }).catch(e => { if(!isBackground) updateSubUI(30, currentUser.displayName, new Date()); }); 
}

function updateSubUI(daysLeft, userName, startDate) {
    document.getElementById('displayUsername').innerText = "Bienvenue, " + (userName || "Pro");
    document.getElementById('displayEmail').innerText = currentUser.email;
    document.getElementById('memberSince').innerText = new Date(startDate).toLocaleDateString();
    const banner = document.getElementById('sub-banner');

    if (daysLeft > 0) { 
        isSubscribed = true;
        document.getElementById('expiredPopup').style.display = 'none';
        banner.style.display = "block"; banner.style.background = "#28a745"; 
        banner.innerText = `✅ Essai actif: Reste ${daysLeft} jours.`; 
        enableApp(true); loadHistory(); 
    } else { 
        isSubscribed = false;
        document.getElementById('expiredPopup').style.display = 'flex';
        banner.style.display = "block"; banner.className = "expired"; 
        banner.innerText = "⛔ Abonnement expiré !"; 
        enableApp(false); 
    }
}

function enableApp(enabled) { 
    const btns = ['btnAdd', 'btnCalc', 'btnSave'];
    btns.forEach(id => { if(document.getElementById(id)) document.getElementById(id).disabled = !enabled; });
}

// --- CORE CALCULATIONS: CUTTING & GLASS ---

function calculateVitrage() {
    let vitrageList = [];
    const EPAISSEUR_TRAVERSE = 4.5;

    for (const it of devis) {
        const L = it.L_cm; const H = it.H_cm; const Q = it.Q;
        let finalH = H; let finalL = L;

        if(it.hasFix) {
            let Hv, Lv;
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                Hv = it.fixSize - 2; Lv = L - 2;
                finalH = H - it.fixSize - EPAISSEUR_TRAVERSE;
            } else {
                Hv = H - 2; Lv = it.fixSize - 2;
                finalL = L - it.fixSize - EPAISSEUR_TRAVERSE;
            }
            vitrageList.push({ type: `Fixe (${it.productName})`, H_verre: Hv, L_verre: Lv, surface_m2: (Hv * Lv) / 10000, quantity: Q });
        }

        if (it.product === "coulissant") {
            let H_farda = H - 6.5; let L_farda = (L - 15.5) / 2;
            let Hv = H_farda - 8.5; let Lv = L_farda - 1;
            vitrageList.push({ type: "Coulissant", H_verre: Hv, L_verre: Lv, surface_m2: (Hv * Lv) / 10000, quantity: 2 * Q });
        } else if(it.product.includes("ouvrant")) {
            let is2V = it.product.includes("2v");
            let red = it.product.includes("40100") ? 11 : 10;
            let H_farda = finalH - 4.2;
            let L_farda = is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2);
            vitrageList.push({ type: it.productName, H_verre: H_farda - red, L_verre: L_farda - red, surface_m2: ((H_farda - red) * (L_farda - red)) / 10000, quantity: is2V ? (2 * Q) : Q });
        }
    }
    return vitrageList;
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
        const EPAISSEUR_TRAVERSE = 4.5, Q_TRAVERSE = 5.9; 
        let finalH = H, finalL = L;

        if(it.hasFix) {
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                finalH = H - it.fixSize - EPAISSEUR_TRAVERSE;
                addPiece("p_Traverse40104", L - Q_TRAVERSE, 1 * Q);
                addPiece("p_40166", it.fixSize - 2, 2 * Q); addPiece("p_40166", L - 2, 2 * Q);
            } else {
                finalL = L - it.fixSize - EPAISSEUR_TRAVERSE;
                addPiece("p_Traverse40104", H - Q_TRAVERSE, 1 * Q);
                addPiece("p_40166", it.fixSize - 2, 2 * Q); addPiece("p_40166", H - 2, 2 * Q);
            }
        }

        if (it.product === "coulissant") {
            addPiece("p_67103", H+7, 2*Q); addPiece("p_67103", L+7, 2*Q);
            addPiece("p_67104", H-6.5, 2*Q); addPiece("p_67105", H-6.5, 2*Q);
            addPiece("p_67106", (L-15.5)/2, 4*Q); addPiece("p_Rail", L-8, 2*Q);
        } else if(it.product.includes("ouvrant")) {
            let prof = it.product.includes("40100") ? "p_40100" : "p_40404";
            let is2V = it.product.includes("2v");
            addPiece("p_40402", H+7, 2*Q); addPiece("p_40402", L+7, 2*Q);
            addPiece(prof, finalH - 4.2, (is2V ? 4 : 2) * Q);
            addPiece(prof, is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2), (is2V ? 4 : 2) * Q);
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
        result[ref] = { cuts: piecesNeeded[ref], bars, meterage: meterage[ref] };
    }
    return result;
}

// --- DISPLAY & TOTALS ---
window.calculateTotalDevis = function() {
    if (devis.length === 0) return alert("Panier Vide !");
    let cd = generateCutData(); 
    let html = '<h3>1. Profilés</h3><table><tr><th>Ref</th><th>Métrage</th><th>Barres</th></tr>';
    let totalP = 0, totalA = 0, totalV = 0;
    let avgColor = devis.reduce((sum, it) => sum + it.colorFactor, 0) / devis.length;

    for(let k in cd) { 
        let cost = cd[k].bars.length * (database[k] || 0) * avgColor;
        totalP += cost;
        html += `<tr><td>${k.replace('p_','')}</td><td>${cd[k].meterage.toFixed(0)}cm</td><td><b>${cd[k].bars.length}</b></td></tr>`;
    }
    html += `<tr><td colspan="3" style="background:#eee; text-align:right;">Total: ${totalP.toFixed(3)} TND</td></tr></table>`;

    // Glass Section
    let vData = calculateVitrage();
    html += '<h3>2. Vitrage (البلّور)</h3><table><tr><th>Type</th><th>Dim</th><th>Qté</th><th>Total</th></tr>';
    vData.forEach(vd => {
        let line = vd.surface_m2 * (database['v_ballar'] || 45) * vd.quantity;
        totalV += line;
        html += `<tr><td>${vd.type}</td><td>${vd.H_verre.toFixed(1)}x${vd.L_verre.toFixed(1)}</td><td>${vd.quantity}</td><td>${line.toFixed(3)}</td></tr>`;
    });
    html += `<tr><td colspan="4" style="background:#eee; text-align:right;">Total البلّور: ${totalV.toFixed(3)} TND</td></tr></table>`;

    let grandTotal = totalP + totalV; // Simplified for this example
    html += `<div style="text-align:right; margin-top:15px;"><h2>NET À PAYER: ${grandTotal.toFixed(3)} TND</h2></div>`;
    
    document.getElementById('total-result').innerHTML = html;
};

// --- UTILS ---
window.addItemToDevis = function() {
    const p = document.getElementById('productType');
    const l = parseFloat(document.getElementById('largeur').value);
    const h = parseFloat(document.getElementById('hauteur').value);
    const q = parseInt(document.getElementById('quantite').value);
    const c = document.getElementById('couleur');
    if(isNaN(l) || isNaN(h)) return alert("Vérifier Dim!");

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
    let tb = document.querySelector("#devis-items tbody"); tb.innerHTML = "";
    devis.forEach((it, i) => {
        tb.innerHTML += `<tr><td>${it.Q}</td><td>${it.productName}</td><td>${it.colorName}</td><td>${it.L_cm}x${it.H_cm}</td><td><button onclick="devis.splice(${i},1);updateUI()">X</button></td></tr>`;
    });
}

function loadPrices() { 
    const s = localStorage.getItem('gadourAluPrices'); 
    database = s ? {...defaultDatabase, ...JSON.parse(s)} : {...defaultDatabase}; 
}

document.addEventListener('DOMContentLoaded', () => { loadPrices(); });// --- CONFIG & AUTH & ABONNEMENT ---
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
const toulBarra = 650; 
const CUT_MARGIN = 5;
let database = {};

// Default Prices
let defaultDatabase = { 
    "p_67103": 200, "p_67104": 120, "p_67105": 120, "p_67106": 120, "p_Rail": 80, "p_67114": 90, 
    "p_40402": 120, "p_40404": 200, "p_40107": 30, "p_40112": 120, "p_40100": 100, "p_40121": 100, 
    "p_40154": 100, "p_40134": 80, "p_40166": 60, "p_Lame55": 80, "p_Glissiere": 50, "p_Lame_Finale": 60, 
    "p_Axe_Store": 40, "p_Lame39": 65, "p_Caisson_Mono": 55, "p_Axe40": 35, "p_Traverse40104": 120, 
    "a_Gallet": 2, "a_Fermeture": 5, "a_Gache_Fermeture": 2, "a_Kit_Etancheite": 5, "a_Joint_Brosse": 0.500, 
    "a_Paumelle": 2, "a_Cremone": 5, "a_Kit_Cremone": 2.5, "a_Ecer_Danimo_G": 0.050, "a_Ecer_Danimo_P": 0.050, 
    "a_Ecer_Tall_7did": 2, "a_Ecer_67103": 2, "a_Ecer_Font": 2, "a_Joint_Batman": 0.500, "a_Joint_A36": 0.500, 
    "a_Kit_Vero_Semi_Fix": 2.5, "a_Bochon_112": 3, "a_Serrure_Cylindre": 20, "a_Poignee_Beb": 20, 
    "a_Joint_Vitrage_242": 0.500, "a_Angle_Parclose": 0.500, "a_Moteur_Store_40": 120, "a_Moteur_Store_55": 140, 
    "a_Axe_Rallonge": 10, "a_Tirant": 5, "a_Tirant_Mono": 5, "a_Joint_Brosse_5": 0.500, "a_Joint_Brosse_6": 0.500, 
    "a_Bochon_55": 0.500, "a_Bochon_39": 0.500, "a_Kit_Acc_Mono": 25, "a_Cache_Canon": 2.500, "a_Joint_Batman_247": 0.800, 
    "v_ballar": 45 
};

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            const cachedSub = localStorage.getItem('gadour_sub_' + user.uid);
            if(cachedSub) { 
                const subData = JSON.parse(cachedSub); 
                updateSubUI(subData.daysLeft, subData.userName, subData.createdAt); 
                checkSubscription(true); 
            } else { checkSubscription(); }
        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

    window.logout = function() { auth.signOut(); window.location.reload(); };
} catch (e) { console.error(e); }

// --- SUBSCRIPTION & UI LOGIC ---
function checkSubscription(isBackground = false) {
    if(!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        let startDate = new Date(); let userName = currentUser.displayName || "Client";
        if(doc.exists) { 
            const data = doc.data(); 
            if(data.createdAt) startDate = data.createdAt.toDate(); 
            if(data.name) userName = data.name; 
        } else if(!isBackground) { 
            db.collection('users').doc(currentUser.uid).set({ email: currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); 
        }
        const diffDays = Math.ceil(Math.abs(new Date() - startDate) / (1000 * 60 * 60 * 24)); 
        const daysLeft = 30 - diffDays;
        localStorage.setItem('gadour_sub_' + currentUser.uid, JSON.stringify({ daysLeft, userName, createdAt: startDate }));
        updateSubUI(daysLeft, userName, startDate);
    }).catch(e => { if(!isBackground) updateSubUI(30, currentUser.displayName, new Date()); }); 
}

function updateSubUI(daysLeft, userName, startDate) {
    document.getElementById('displayUsername').innerText = "Bienvenue, " + (userName || "Pro");
    document.getElementById('displayEmail').innerText = currentUser.email;
    document.getElementById('memberSince').innerText = new Date(startDate).toLocaleDateString();
    const banner = document.getElementById('sub-banner');

    if (daysLeft > 0) { 
        isSubscribed = true;
        document.getElementById('expiredPopup').style.display = 'none';
        banner.style.display = "block"; banner.style.background = "#28a745"; 
        banner.innerText = `✅ Essai actif: Reste ${daysLeft} jours.`; 
        enableApp(true); loadHistory(); 
    } else { 
        isSubscribed = false;
        document.getElementById('expiredPopup').style.display = 'flex';
        banner.style.display = "block"; banner.className = "expired"; 
        banner.innerText = "⛔ Abonnement expiré !"; 
        enableApp(false); 
    }
}

function enableApp(enabled) { 
    const btns = ['btnAdd', 'btnCalc', 'btnSave'];
    btns.forEach(id => { if(document.getElementById(id)) document.getElementById(id).disabled = !enabled; });
}

// --- CORE CALCULATIONS: CUTTING & GLASS ---

function calculateVitrage() {
    let vitrageList = [];
    const EPAISSEUR_TRAVERSE = 4.5;

    for (const it of devis) {
        const L = it.L_cm; const H = it.H_cm; const Q = it.Q;
        let finalH = H; let finalL = L;

        if(it.hasFix) {
            let Hv, Lv;
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                Hv = it.fixSize - 2; Lv = L - 2;
                finalH = H - it.fixSize - EPAISSEUR_TRAVERSE;
            } else {
                Hv = H - 2; Lv = it.fixSize - 2;
                finalL = L - it.fixSize - EPAISSEUR_TRAVERSE;
            }
            vitrageList.push({ type: `Fixe (${it.productName})`, H_verre: Hv, L_verre: Lv, surface_m2: (Hv * Lv) / 10000, quantity: Q });
        }

        if (it.product === "coulissant") {
            let H_farda = H - 6.5; let L_farda = (L - 15.5) / 2;
            let Hv = H_farda - 8.5; let Lv = L_farda - 1;
            vitrageList.push({ type: "Coulissant", H_verre: Hv, L_verre: Lv, surface_m2: (Hv * Lv) / 10000, quantity: 2 * Q });
        } else if(it.product.includes("ouvrant")) {
            let is2V = it.product.includes("2v");
            let red = it.product.includes("40100") ? 11 : 10;
            let H_farda = finalH - 4.2;
            let L_farda = is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2);
            vitrageList.push({ type: it.productName, H_verre: H_farda - red, L_verre: L_farda - red, surface_m2: ((H_farda - red) * (L_farda - red)) / 10000, quantity: is2V ? (2 * Q) : Q });
        }
    }
    return vitrageList;
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
        const EPAISSEUR_TRAVERSE = 4.5, Q_TRAVERSE = 5.9; 
        let finalH = H, finalL = L;

        if(it.hasFix) {
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                finalH = H - it.fixSize - EPAISSEUR_TRAVERSE;
                addPiece("p_Traverse40104", L - Q_TRAVERSE, 1 * Q);
                addPiece("p_40166", it.fixSize - 2, 2 * Q); addPiece("p_40166", L - 2, 2 * Q);
            } else {
                finalL = L - it.fixSize - EPAISSEUR_TRAVERSE;
                addPiece("p_Traverse40104", H - Q_TRAVERSE, 1 * Q);
                addPiece("p_40166", it.fixSize - 2, 2 * Q); addPiece("p_40166", H - 2, 2 * Q);
            }
        }

        if (it.product === "coulissant") {
            addPiece("p_67103", H+7, 2*Q); addPiece("p_67103", L+7, 2*Q);
            addPiece("p_67104", H-6.5, 2*Q); addPiece("p_67105", H-6.5, 2*Q);
            addPiece("p_67106", (L-15.5)/2, 4*Q); addPiece("p_Rail", L-8, 2*Q);
        } else if(it.product.includes("ouvrant")) {
            let prof = it.product.includes("40100") ? "p_40100" : "p_40404";
            let is2V = it.product.includes("2v");
            addPiece("p_40402", H+7, 2*Q); addPiece("p_40402", L+7, 2*Q);
            addPiece(prof, finalH - 4.2, (is2V ? 4 : 2) * Q);
            addPiece(prof, is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2), (is2V ? 4 : 2) * Q);
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
        result[ref] = { cuts: piecesNeeded[ref], bars, meterage: meterage[ref] };
    }
    return result;
}

// --- DISPLAY & TOTALS ---
window.calculateTotalDevis = function() {
    if (devis.length === 0) return alert("Panier Vide !");
    let cd = generateCutData(); 
    let html = '<h3>1. Profilés</h3><table><tr><th>Ref</th><th>Métrage</th><th>Barres</th></tr>';
    let totalP = 0, totalA = 0, totalV = 0;
    let avgColor = devis.reduce((sum, it) => sum + it.colorFactor, 0) / devis.length;

    for(let k in cd) { 
        let cost = cd[k].bars.length * (database[k] || 0) * avgColor;
        totalP += cost;
        html += `<tr><td>${k.replace('p_','')}</td><td>${cd[k].meterage.toFixed(0)}cm</td><td><b>${cd[k].bars.length}</b></td></tr>`;
    }
    html += `<tr><td colspan="3" style="background:#eee; text-align:right;">Total: ${totalP.toFixed(3)} TND</td></tr></table>`;

    // Glass Section
    let vData = calculateVitrage();
    html += '<h3>2. Vitrage (البلّور)</h3><table><tr><th>Type</th><th>Dim</th><th>Qté</th><th>Total</th></tr>';
    vData.forEach(vd => {
        let line = vd.surface_m2 * (database['v_ballar'] || 45) * vd.quantity;
        totalV += line;
        html += `<tr><td>${vd.type}</td><td>${vd.H_verre.toFixed(1)}x${vd.L_verre.toFixed(1)}</td><td>${vd.quantity}</td><td>${line.toFixed(3)}</td></tr>`;
    });
    html += `<tr><td colspan="4" style="background:#eee; text-align:right;">Total البلّور: ${totalV.toFixed(3)} TND</td></tr></table>`;

    let grandTotal = totalP + totalV; // Simplified for this example
    html += `<div style="text-align:right; margin-top:15px;"><h2>NET À PAYER: ${grandTotal.toFixed(3)} TND</h2></div>`;
    
    document.getElementById('total-result').innerHTML = html;
};

// --- UTILS ---
window.addItemToDevis = function() {
    const p = document.getElementById('productType');
    const l = parseFloat(document.getElementById('largeur').value);
    const h = parseFloat(document.getElementById('hauteur').value);
    const q = parseInt(document.getElementById('quantite').value);
    const c = document.getElementById('couleur');
    if(isNaN(l) || isNaN(h)) return alert("Vérifier Dim!");

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
    let tb = document.querySelector("#devis-items tbody"); tb.innerHTML = "";
    devis.forEach((it, i) => {
        tb.innerHTML += `<tr><td>${it.Q}</td><td>${it.productName}</td><td>${it.colorName}</td><td>${it.L_cm}x${it.H_cm}</td><td><button onclick="devis.splice(${i},1);updateUI()">X</button></td></tr>`;
    });
}

function loadPrices() { 
    const s = localStorage.getItem('gadourAluPrices'); 
    database = s ? {...defaultDatabase, ...JSON.parse(s)} : {...defaultDatabase}; 
}

document.addEventListener('DOMContentLoaded', () => { loadPrices(); });
