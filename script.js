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

            const cachedSub = localStorage.getItem('gadour_sub_' + user.uid);
            if(cachedSub) { 
                const subData = JSON.parse(cachedSub); 
                updateSubUI(subData.daysLeft, subData.userName, subData.createdAt); 
                checkSubscription(true); 
            } else { 
                checkSubscription(); 
            }
        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

    window.logout = function() { auth.signOut(); window.location.reload(); };

} catch (e) { console.error(e); }

/* --- GOOGLE LOGIN --- */
window.loginWithGoogle = function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
    .then((result) => { console.log("Google OK"); })
    .catch((error) => { alert("Erreur Google: " + error.message); });
}

/* --- POPUPS --- */
window.closeWelcomePopup = function() {
    document.getElementById('welcomePopup').style.display = 'none';
}

window.goToPricesAndClose = function() {
    closeWelcomePopup(); 
    switchMode('prices'); 
}

/* --- LOGIQUE METIER & ABONNEMENT --- */

function checkSubscription(isBackground = false) {
    if(!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        let startDate = new Date(); let userName = currentUser.displayName || "Client";
        if(doc.exists) { const data = doc.data(); if(data.createdAt) startDate = data.createdAt.toDate(); if(data.name) userName = data.name; }
        else if(!isBackground) { db.collection('users').doc(currentUser.uid).set({ email: currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
        const diffDays = Math.ceil(Math.abs(new Date() - startDate) / (1000 * 60 * 60 * 24)); 
        const daysLeft = 30 - diffDays;
        localStorage.setItem('gadour_sub_' + currentUser.uid, JSON.stringify({ daysLeft: daysLeft, userName: userName, createdAt: startDate }));
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
        
        if (!sessionStorage.getItem('welcomeShown')) {
            document.getElementById('welcomePopup').style.display = 'flex';
            sessionStorage.setItem('welcomeShown', 'true'); 
        }

        banner.style.display = "block"; banner.style.background = "#28a745"; banner.style.color = "white"; 
        banner.innerText = `✅ Essai actif: Reste ${daysLeft} jours.`; 
        document.getElementById('subStatusBadge').innerText = "Actif"; 
        document.getElementById('daysRemaining').innerText = `Expire dans ${daysLeft} jours`; 
        enableApp(true); 
        loadHistory(); 
    } 
    else { 
        isSubscribed = false;
        document.getElementById('expiredPopup').style.display = 'flex';
        document.getElementById('welcomePopup').style.display = 'none';

        banner.style.display = "block"; banner.className = "expired"; 
        banner.innerText = "⛔ Abonnement expiré !"; 
        document.getElementById('subStatusBadge').innerText = "Expiré"; 
        document.getElementById('daysRemaining').innerText = "Veuillez payer."; 
        enableApp(false); 
    }
}

function enableApp(enabled) { document.getElementById('btnAdd').disabled = !enabled; document.getElementById('btnCalc').disabled = !enabled; document.getElementById('btnSave').disabled = !enabled; }

/* --- LOAD HISTORY --- */
function loadHistory() {
    if(!isSubscribed) return;
    const div = document.getElementById('history-list');
    div.innerHTML = "<p style='text-align:center; color:#777;'>Chargement en cours...</p>";

    db.collection("historique")
      .where("uid", "==", currentUser.uid)
      .limit(20)
      .get()
      .then((snap) => {
          div.innerHTML = ""; 
          let projects = [];
          snap.forEach((doc) => { projects.push({ id: doc.id, ...doc.data() }); });
          projects.sort((a, b) => {
              let dateA = a.date ? a.date.seconds : 0;
              let dateB = b.date ? b.date.seconds : 0;
              return dateB - dateA;
          });
          if(projects.length === 0) { div.innerHTML = "<p style='text-align:center; color:#999;'>Aucun projet trouvé.</p>"; return; }
          projects.forEach((d) => {
              let dateStr = "Date inconnue";
              if(d.date && d.date.seconds) { dateStr = new Date(d.date.seconds * 1000).toLocaleDateString('fr-FR'); }
              div.innerHTML += `
              <div class="history-card">
                  <div style="text-align:left;">
                      <h4 style="margin:0; color:#004085; font-size:16px;">👤 ${d.client || "Client Inconnu"}</h4>
                      <small style="color:#777; font-size:12px;">📅 ${dateStr} | ${d.items ? d.items.length : 0} éléments</small>
                  </div>
                  <div style="display:flex; gap:5px;">
                      <button class="btn-load" onclick="restoreDevis('${d.id}')" title="Ouvrir">📂</button>
                      <button class="btn-delete" onclick="deleteHistory('${d.id}')" title="Supprimer">🗑️</button>
                  </div>
              </div>`;
          });
      })
      .catch((error) => { div.innerHTML = "<p style='color:red; text-align:center;'>Erreur: " + error.message + "</p>"; });
}

window.saveCurrentDevis = function() { if(!isSubscribed) return alert("Expiré"); if(devis.length===0) return alert("Vide"); const name = prompt("Client?"); if(!name) return; db.collection("historique").add({ uid: currentUser.uid, client: name, date: firebase.firestore.FieldValue.serverTimestamp(), items: devis }).then(() => { alert("Sauvegardé"); loadHistory(); }); };
window.restoreDevis = function(id) { if(!isSubscribed) return; db.collection("historique").doc(id).get().then(doc => { if(doc.exists) { devis = doc.data().items; updateUI(); calculateTotalDevis(); switchMode('calc'); } }); };
window.deleteHistory = function(id) { if(confirm("Supprimer ?")) db.collection("historique").doc(id).delete().then(()=>loadHistory()); };

function loadLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logoImage').src = e.target.result;
            document.getElementById('logoImage').style.display = 'block';
            document.getElementById('logoText').style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

// === DATABASE ===
let defaultDatabase = { "p_67103": 200, "p_67104": 120, "p_67105": 120, "p_67106": 120, "p_Rail": 80, "p_67114": 90, "p_40402": 120, "p_40404": 200, "p_40107": 30, "p_40112": 120, "p_40100": 100, "p_40121": 100, "p_40154": 100, "p_40134": 80, "p_40166": 60, "p_Lame55": 80, "p_Glissiere": 50, "p_Lame_Finale": 60, "p_Axe_Store": 40, "p_Lame39": 65, "p_Caisson_Mono": 55, "p_Axe40": 35, "p_Traverse40104": 120, "a_Gallet": 2, "a_Fermeture": 5, "a_Gache_Fermeture": 2, "a_Kit_Etancheite": 5, "a_Joint_Brosse": 0.500, "a_Paumelle": 2, "a_Cremone": 5, "a_Kit_Cremone": 2.5, "a_Ecer_Danimo_G": 0.050, "a_Ecer_Danimo_P": 0.050, "a_Ecer_Tall_7did": 2, "a_Ecer_67103": 2, "a_Ecer_Font": 2, "a_Joint_Batman": 0.500, "a_Joint_A36": 0.500, "a_Kit_Vero_Semi_Fix": 2.5, "a_Bochon_112": 3, "a_Serrure_Cylindre": 20, "a_Poignee_Beb": 20, "a_Joint_Vitrage_242": 0.500, "a_Angle_Parclose": 0.500, "a_Moteur_Store_40": 120, "a_Moteur_Store_55": 140, "a_Axe_Rallonge": 10, "a_Tirant": 5, "a_Tirant_Mono": 5, "a_Joint_Brosse_5": 0.500, "a_Joint_Brosse_6": 0.500, "a_Bochon_55": 0.500, "a_Bochon_39": 0.500, "a_Kit_Acc_Mono": 25, "a_Cache_Canon": 2.500, "a_Joint_Batman_247": 0.800, "v_ballar": 45 };
let database = {}; const toulBarra = 650; const CUT_MARGIN = 5; let devis = [];

function loadPrices() { const s=localStorage.getItem('gadourAluPrices'); database=s?{...defaultDatabase,...JSON.parse(s)}:{...defaultDatabase}; renderPricesTable(); }
function savePrices() { localStorage.setItem('gadourAluPrices', JSON.stringify(database)); }
window.updatePrice = function(k,v) { database[k]=parseFloat(v); savePrices(); }

function renderPricesTable() {
    let hp='', ha='';
    for(let k in database) {
        if(k=='v_ballar') { document.querySelector('[data-price-key="v_ballar"]').value=database[k]; continue; }
        let h=`<div class="price-input-container"><span class="ref-label">${k.replace('p_','').replace('a_','')}:</span><input type="number" class="price-input" data-price-key="${k}" value="${database[k]}" step="0.001" onchange="updatePrice(this.dataset.priceKey, this.value)"> Dt</div>`;
        if(k.startsWith('p_')) hp+=h; else ha+=h;
    }
    document.getElementById('table-prices-profiles').innerHTML=hp; document.getElementById('table-prices-accessoires').innerHTML=ha;
}

window.switchMode = function(m) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    if(m=='calc') { document.querySelector('.nav-btn:nth-child(1)').classList.add('active'); document.getElementById('calc-view').classList.add('active'); }
    else if(m=='debit') { document.querySelector('.nav-btn:nth-child(2)').classList.add('active'); document.getElementById('debit-view').classList.add('active'); calculateDebit(); }
    else if(m=='facture') { document.querySelector('.nav-btn:nth-child(3)').classList.add('active'); document.getElementById('facture-view').classList.add('active'); renderFacture(); }
    else if(m=='profile') { document.querySelector('.nav-btn:nth-child(4)').classList.add('active'); document.getElementById('profile-view').classList.add('active'); loadHistory(); }
    else { document.querySelector('.nav-btn:nth-child(5)').classList.add('active'); document.getElementById('prices-view').classList.add('active'); renderPricesTable(); }
}

window.toggleFixOption = function() {
    const p = document.getElementById('productType').value;
    const container = document.getElementById('fixOptionContainer');
    if (p.includes('ouvrant') || p.includes('beb')) { container.style.display = 'flex'; } 
    else { container.style.display = 'none'; document.getElementById('hasFix').checked = false; toggleFixInput(); }
}
window.toggleFixInput = function() { document.getElementById('fixInputWrapper').style.display = document.getElementById('hasFix').checked ? 'flex' : 'none'; }

window.addItemToDevis = function() {
    if(!isSubscribed) return alert("Abonnement expiré !");
    const p = document.getElementById('productType');
    const l = parseFloat(document.getElementById('largeur').value);
    const h = parseFloat(document.getElementById('hauteur').value);
    const q = parseInt(document.getElementById('quantite').value);
    const c = document.getElementById('couleur');
    const hasFix = document.getElementById('hasFix').checked;
    let fs = 0, fp = 'bottom';
    if(hasFix) {
        fs = parseFloat(document.getElementById('fixSize').value);
        fp = document.getElementById('fixPosition').value;
    }
    if (isNaN(l) || isNaN(h) || isNaN(q)) return;
    if (hasFix) {
        if ((fp === 'top' || fp === 'bottom') && fs >= h) { alert("Erreur: Fixe > Hauteur"); return; }
        if ((fp === 'left' || fp === 'right') && fs >= l) { alert("Erreur: Fixe > Largeur"); return; }
    }
    devis.push({ product: p.value, productName: p.options[p.selectedIndex].text, L_cm: l, H_cm: h, Q: q, colorFactor: parseFloat(c.value), colorName: c.options[c.selectedIndex].text, hasFix: hasFix, fixSize: fs, fixPos: fp });
    updateUI();
}

function updateUI() {
    let tb = document.querySelector("#devis-items tbody"); tb.innerHTML = "";
    devis.forEach((item, i) => {
        let fix = item.hasFix ? `Fixe ${item.fixPos} (${item.fixSize})` : '-';
        tb.innerHTML += `<tr><td>${item.Q}</td><td>${item.productName}</td><td>${item.colorName}</td><td>${item.L_cm}x${item.H_cm}</td><td>${fix}</td><td><button onclick="devis.splice(${i},1);updateUI()" style="color:red">X</button></td></tr>`;
    });
}
window.clearDevis = function() { if(confirm("Vider?")) { devis = []; updateUI(); document.getElementById('total-result').innerHTML=''; } }

function generateCutData(calculateMetersOnly = false) {
    let piecesNeeded = {}; let meterage = {}; 
    const addPiece = (ref, len, q=1) => { 
        if(!piecesNeeded[ref]) piecesNeeded[ref] = [];
        if(!meterage[ref]) meterage[ref] = 0;
        for(let i=0; i<q; i++) { piecesNeeded[ref].push(len); meterage[ref] += len; }
    };
    
    for (const it of devis) {
        const L = it.L_cm; const H = it.H_cm; const Q = it.Q;
        const EPAISSEUR_TRAVERSE = 4.5; const Q_TRAVERSE = 5.9; 
        let finalH = H; let finalL = L;

        if(it.hasFix) {
            if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                finalH = H - it.fixSize - EPAISSEUR_TRAVERSE; 
                addPiece("p_Traverse40104", L - Q_TRAVERSE, 1 * Q); 
                addPiece("p_40166", it.fixSize - 2, 2 * Q); 
                addPiece("p_40166", L - 2, 2 * Q); 
            } else {
                finalL = L - it.fixSize - EPAISSEUR_TRAVERSE; 
                addPiece("p_Traverse40104", H - Q_TRAVERSE, 1 * Q); 
                addPiece("p_40166", it.fixSize - 2, 2 * Q); 
                addPiece("p_40166", H - 2, 2 * Q); 
            }
        }

        if (it.product === "monobloc") {
            addPiece("p_Caisson_Mono", L - 1.2, 1 * Q);
            addPiece("p_Axe40", L - 4, 1 * Q);
            addPiece("p_Glissiere", H - 15.5, 2 * Q);
            const nbLames = Math.ceil((H - 10) / 3.9);
            addPiece("p_Lame39", L - 7, nbLames * Q);
            addPiece("p_Lame39", L - 7, 1 * Q);
        }
        else if(it.product === "coulissant") {
            addPiece("p_67103", H+7, 2*Q); addPiece("p_67103", L+7, 2*Q);
            addPiece("p_67104", H-6.5, 2*Q); addPiece("p_67105", H-6.5, 2*Q);
            addPiece("p_67106", (L-15.5)/2, 4*Q); addPiece("p_Rail", L-8, 2*Q);
            addPiece("p_67114", (H-6.5)-11, 4*Q); addPiece("p_67114", ((L-15.5)/2)-1, 4*Q);
        } 
        else if(it.product.includes("ouvrant")) {
            addPiece("p_40402", H+7, 2*Q); addPiece("p_40402", L+7, 2*Q);
            let profilOuvrant = (it.product.includes("40100")) ? "p_40100" : "p_40404";
            let is2V = it.product.includes("2v");
            let hFarda = finalH - 4.2;
            let wFarda = is2V ? ((finalL - 4.5) / 2) : (finalL - 4.2);
            addPiece(profilOuvrant, hFarda, (is2V ? 4 : 2) * Q); 
            addPiece(profilOuvrant, wFarda, (is2V ? 4 : 2) * Q);
            if (is2V) addPiece("p_40112", finalH - 11, 1 * Q); 
            let needParclose = true;
            if (!is2V && profilOuvrant === "p_40404") needParclose = false; 
            if (needParclose) {
                let hPar = hFarda - 11;
                let wPar = wFarda - 11;
                addPiece("p_40166", hPar, (is2V ? 4 : 2) * Q);
                addPiece("p_40166", wPar, (is2V ? 4 : 2) * Q);
            }
            if (!is2V) {
                let trangelLen = (hFarda - 29.2) / 2;
                addPiece("p_40107", trangelLen, 2 * Q);
            }
        } 
        else if(it.product === "beb1v") {
            addPiece("p_40402", H+7, 2*Q); addPiece("p_40402", L+7, 1*Q);
            addPiece("p_40100", finalH-2.5, 2*Q); addPiece("p_40100", finalL-4.2, 1*Q);
            addPiece("p_40166", finalL-11, 4*Q); 
            addPiece("p_40166", ((finalH-2.5)-12.5)/2-4, 4*Q);
            addPiece("p_40121", finalL-9.8, 1*Q); addPiece("p_40154", finalL-9.8, 1*Q);
        } else if(it.product.includes("store")) {
            let w = (it.product==="store_apparent") ? L-3 : L+5;
            addPiece("p_Glissiere", H+5, 2*Q);
            addPiece("p_Lame55", w, Math.floor(H/5.5)*Q);
            addPiece("p_Lame_Finale", w, 1*Q); addPiece("p_Axe_Store", w, 1*Q);
        }
    }
    if (calculateMetersOnly) return meterage;
    let result = {};
    for (let ref in piecesNeeded) {
        let cuts = piecesNeeded[ref].sort((a,b) => b-a);
        let bars = [];
        cuts.forEach(c => {
            let placed = false;
            for(let b of bars) { if(b.rem >= (c + CUT_MARGIN)) { b.cuts.push(c); b.rem -= (c + CUT_MARGIN); placed = true; break; } }
            if(!placed) bars.push({rem: toulBarra - (c + CUT_MARGIN), cuts: [c]});
        });
        result[ref] = { cuts: piecesNeeded[ref], bars: bars, meterage: meterage[ref] || 0 };
    }
    return result;
}

window.calculateTotalDevis = function() {
    if (devis.length === 0) { alert("Panier Vide !"); return; }
    if(!isSubscribed) return alert("Abonnement expiré !");

    let cd = generateCutData(); 
    let html = '<h3>1. Profilés</h3><table><tr><th>Ref</th><th>Métrage Total</th><th>Barres</th></tr>';
    let totalProfiles = 0; let totalAccessoires = 0; let totalVitrage = 0; let tot_surf = 0; 
    let avgColor = devis.reduce((sum, item) => sum + item.colorFactor, 0) / devis.length;

    for(let k in cd) { 
        const meter = cd[k].meterage; const barres = cd[k].bars.length;
        if(meter > 0) {
            let price = database[k] || 0; let cost = barres * price * avgColor; 
            totalProfiles += cost;
            html += `<tr><td>${k.replace('p_','')}</td><td>${meter.toFixed(1)} cm</td><td><b>${barres}</b></td></tr>`;
        }
    }
    html += `<tr><td colspan="3" style="text-align:right; font-weight:bold; color:#005a9c; background:#e9ecef;">Total Profilés: ${totalProfiles.toFixed(3)} TND</td></tr>`;
    html += "</tbody></table>";

    let mat = {}; let v_html = ""; const EPAISSEUR_TRAVERSE = 4.5;
    for(let key in database) { if(key.startsWith('a_')) mat[key] = 0; }

    for (const it of devis) {
        const L = it.L_cm; const H = it.H_cm; const Q = it.Q;
        let workingH = H; let workingL = L;

        if(it.hasFix) {
             if(it.fixPos === 'top' || it.fixPos === 'bottom') {
                 workingH = H - it.fixSize - EPAISSEUR_TRAVERSE;
                 let surfFix = ((L-2) * (it.fixSize-2) * Q) / 10000; tot_surf += surfFix;
                 v_html += `<tr><td>Vitrage Fixe (H)</td><td>${Q}</td><td>${(it.fixSize-2).toFixed(1)}x${(L-2).toFixed(1)}</td><td>${surfFix.toFixed(2)}</td></tr>`;
                 mat.a_Joint_Vitrage_242 += (((L + it.fixSize)*2)/100) * Q;
             } else {
                 workingL = L - it.fixSize - EPAISSEUR_TRAVERSE;
                 let surfFix = ((it.fixSize-2) * (H-2) * Q) / 10000; tot_surf += surfFix;
                 v_html += `<tr><td>Vitrage Fixe (V)</td><td>${Q}</td><td>${(H-2).toFixed(1)}x${(it.fixSize-2).toFixed(1)}</td><td>${surfFix.toFixed(2)}</td></tr>`;
                 mat.a_Joint_Vitrage_242 += (((H + it.fixSize)*2)/100) * Q;
             }
        }

        if (it.product === "monobloc") {
            let nbLames = Math.ceil((H - 10) / 3.9);
            mat.a_Moteur_Store_40 += 1 * Q;
            mat.a_Tirant_Mono += (L > 120 ? 3 : 2) * Q; 
            mat.a_Bochon_39 += Math.ceil(nbLames / 2) * 2 * Q; 
            mat.a_Joint_Brosse_5 += (L / 100) * Q; 
            mat.a_Joint_Brosse_6 += ((H - 15.5) * 2 / 100) * Q; 
            mat.a_Kit_Acc_Mono += 1 * Q; 
        }
        else if (it.product.includes("store")) {
            let nbLames = Math.floor(H / 5.5);
            mat.a_Moteur_Store_55 += 1 * Q;
            mat.a_Tirant += (L > 120 ? 3 : 2) * Q;
            mat.a_Bochon_55 += Math.ceil(nbLames / 2) * 2 * Q;
            mat.a_Axe_Rallonge += 1 * Q; 
            mat.a_Joint_Brosse_5 += (L / 100) * Q;
            mat.a_Joint_Brosse_6 += (H * 2 / 100) * Q; 
        }
        else if (it.product === "coulissant") {
            mat.a_Gallet += 4*Q; 
            mat.a_Fermeture += 2*Q; 
            mat.a_Gache_Fermeture += 2*Q; 
            mat.a_Kit_Etancheite += 1*Q;
            mat.a_Joint_Brosse += ((((workingH-6.5)*2) + (workingH-6.5) + (((L-15.5)/2)*2)) / 100) * Q;
            mat.a_Ecer_67103 += 4*Q; 
            let gh = (workingH - 6.5) - 8.5; let gw = ((L - 15.5) / 2) - 1;
            let surf = (gh * gw * 2 * Q) / 10000; tot_surf += surf;
            v_html += `<tr><td>Fenêtre Coulissante</td><td>${2*Q}</td><td>${gh.toFixed(1)}x${gw.toFixed(1)}</td><td>${surf.toFixed(2)}</td></tr>`;
        }
        else if (it.product.includes("ouvrant")) {
            let is2V = it.product.includes("2v");
            
            // Zhez (Dormant) => 4 P Model
            mat.a_Ecer_Danimo_P += 4 * Q;

            if (is2V) {
                mat.a_Paumelle += 4 * Q; 
                mat.a_Cremone += 1 * Q; 
                mat.a_Kit_Cremone += 1 * Q;
                mat.a_Ecer_Danimo_G += 8 * Q; // 2 Fardas * 4 (G Model)
                mat.a_Ecer_Font += 4 * Q;
                mat.a_Ecer_Tall_7did += 4 * Q;
                mat.a_Angle_Parclose += 8 * Q;
                mat.a_Bochon_112 += 2 * Q;
                mat.a_Kit_Vero_Semi_Fix += 1 * Q;
                mat.a_Joint_Batman += ((H + L) * 2 / 100) * Q;
                mat.a_Joint_Vitrage_242 += ((workingH + workingL) * 4 / 100) * Q;
            } else {
                mat.a_Paumelle += 2 * Q; 
                mat.a_Cremone += 1 * Q;
                mat.a_Kit_Cremone += 1 * Q;
                mat.a_Ecer_Font += 2 * Q; mat.a_Ecer_Tall_7did += 2 * Q;
                mat.a_Ecer_Danimo_G += 4 * Q; // 1 Farda * 4 (G Model)
                mat.a_Joint_Batman += ((H + L) * 2 / 100) * Q;
            }

            let gw = is2V ? ((workingL-4.5)/2)-10 : (workingL-4.2)-10;
            let gh = (workingH-4.2)-10;
            let surf = (gh*gw*(is2V?2:1)*Q)/10000; tot_surf += surf;
            v_html += `<tr><td>${it.productName}</td><td>${(is2V?2:1)*Q}</td><td>${gh.toFixed(1)}x${gw.toFixed(1)}</td><td>${surf.toFixed(2)}</td></tr>`;
        }
        else if (it.product === "beb1v") {
            mat.a_Paumelle += 4 * Q; 
            mat.a_Serrure_Cylindre += 1 * Q; 
            mat.a_Poignee_Beb += 1 * Q;
            mat.a_Cache_Canon += 2 * Q;
            mat.a_Ecer_Font += 2 * Q; 
            mat.a_Ecer_Tall_7did += 2 * Q;
            mat.a_Ecer_Danimo_G += 2 * Q; 
            mat.a_Ecer_Danimo_P += 2 * Q;
            mat.a_Joint_Batman_247 += ((H + L) * 2 / 100) * Q;
            mat.a_Joint_Vitrage_242 += ((H + L) * 4 / 100) * Q; 
        }
    }

    html += "<h3>2. Accessoires</h3><table><thead><tr><th>Ref</th><th>Qte</th><th>Prix Total</th></tr></thead><tbody>";
    for(let k in mat) {
        if(mat[k]>0) {
            let price = database[k] || 0;
            let cost = mat[k] * price; 
            totalAccessoires += cost;
            html += `<tr><td>${k.replace('a_','')}</td><td>${mat[k].toFixed(2)}</td><td>${cost.toFixed(3)}</td></tr>`;
        }
    }
    html += `<tr><td colspan="3" style="text-align:right; font-weight:bold; color:#005a9c; background:#e9ecef;">Total Accessoires: ${totalAccessoires.toFixed(3)} TND</td></tr>`;
    html += "</tbody></table>";

    let gCost = tot_surf * (database['v_ballar'] || 45); 
    if(tot_surf > 0) {
        totalVitrage = gCost;
        html += `<h3>3. Vitrage</h3><table><thead><tr><th>Type</th><th>Nbr</th><th>Mesure</th><th>Surf</th></tr></thead><tbody>${v_html}</tbody><tfoot><tr><td colspan='3'>Total Surface: ${tot_surf.toFixed(2)} m²</td><td></td></tr><tr><td colspan='3' style="text-align:right; font-weight:bold; color:#005a9c; background:#e9ecef;">Total Vitrage: ${totalVitrage.toFixed(3)} TND</td><td></td></tr></tfoot></table>`;
    }

    let grandTotal = totalProfiles + totalAccessoires + totalVitrage;
    let margePercent = parseFloat(document.getElementById('margePercent').value) || 0;
    let finalTotal = grandTotal * (1 + margePercent/100);

    html += `<div style="text-align:right; margin-top:20px;">`;
    html += `<h2 style="color:#d32f2f; border-top:2px solid #333; padding-top:10px;">TOTAL NET: ${grandTotal.toFixed(3)} TND</h2>`;
    if(margePercent > 0) {
        html += `<h2 style="color:#28a745;">TOTAL AVEC MARGE (+${margePercent}%): ${finalTotal.toFixed(3)} TND</h2>`;
    }
    html += `</div>`;

    document.getElementById('total-result').innerHTML = html; 
    document.getElementById('printBtn').style.display = 'block';
}

function drawWindowSVG(item, index) {
    const L = item.L_cm; const H = item.H_cm; const type = item.product;
    const maxS = 200; 
    const scale = Math.min(maxS / L, maxS / H);
    const w = L * scale; const h = H * scale;
    let svgContent = "";
    svgContent += `<rect x="10" y="10" width="${w}" height="${h}" stroke="#005a9c" stroke-width="3" fill="none" />`;
    let yStart = 10, xStart = 10;
    let hOuv = h, wOuv = w;
    if(item.hasFix) {
        let fixS = item.fixSize * scale;
        if (item.fixPos === 'top') {
            svgContent += `<line x1="10" y1="${10+fixS}" x2="${10+w}" y2="${10+fixS}" stroke="#005a9c" stroke-width="3" />`;
            svgContent += `<text x="${10+w/2}" y="${10+fixS/2}" text-anchor="middle" fill="#555" font-size="10">FIX (${item.fixSize})</text>`;
            yStart = 10 + fixS; hOuv = h - fixS;
        } else if (item.fixPos === 'bottom') {
            svgContent += `<line x1="10" y1="${10+h-fixS}" x2="${10+w}" y2="${10+h-fixS}" stroke="#005a9c" stroke-width="3" />`;
            svgContent += `<text x="${10+w/2}" y="${10+h-fixS/2}" text-anchor="middle" fill="#555" font-size="10">FIX (${item.fixSize})</text>`;
            hOuv = h - fixS;
        }
    }
    if (type === 'monobloc') {
        svgContent += `<rect x="10" y="5" width="${w}" height="15" fill="#333" />`;
        for(let i=25; i<h; i+=10) svgContent += `<line x1="10" y1="${i}" x2="${10+w}" y2="${i}" stroke="#ccc" />`;
    }
    else if (type.includes('beb')) {
        svgContent += `<rect x="${10+5}" y="${yStart+5}" width="${w-10}" height="${hOuv-10}" stroke="#28a745" fill="none" />`;
        svgContent += `<circle cx="${10+20}" cy="${yStart+hOuv/2}" r="4" fill="black" />`; 
        svgContent += `<rect x="${10+5}" y="${yStart+hOuv-30}" width="${w-10}" height="25" fill="#eee" stroke="#28a745" />`;
    }
    else if (type.includes('ouvrant')) {
        let inset = 5; 
        svgContent += `<rect x="${10+inset}" y="${yStart+inset}" width="${w-(inset*2)}" height="${hOuv-(inset*2)}" stroke="#28a745" stroke-width="2" fill="none" stroke-dasharray="5,5" />`;
        if(type.includes('2v')) svgContent += `<line x1="${10+w/2}" y1="${yStart}" x2="${10+w/2}" y2="${yStart+hOuv}" stroke="#28a745" stroke-width="2" />`;
    }
    else if (type === 'coulissant') {
        let w_op = (w / 2) + 5; 
        svgContent += `<rect x="${15}" y="${yStart+5}" width="${w_op}" height="${hOuv-10}" stroke="#28a745" stroke-width="2" fill="rgba(40, 167, 69, 0.1)" />`;
        svgContent += `<rect x="${10 + w - w_op - 5}" y="${yStart+5}" width="${w_op}" height="${hOuv-10}" stroke="#28a745" stroke-width="2" fill="rgba(40, 167, 69, 0.1)" />`;
    }
    svgContent += `<text x="${10 + w/2}" y="25" text-anchor="middle" class="dim-text" fill="#005a9c">L: ${L}</text>`;
    svgContent += `<text x="15" y="${10 + h/2}" transform="rotate(-90 15,${10 + h/2})" text-anchor="middle" class="dim-text" fill="#005a9c">H: ${H}</text>`;
    return `<div class="window-card"><h4 style="margin:0 0 5px 0;">${item.productName} (x${item.Q})</h4><svg width="${w+20}" height="${h+20}" class="window-svg">${svgContent}</svg></div>`;
}

function calculateDebit() {
    if(devis.length==0) return alert("Panier vide!");
    let visualHTML = "";
    devis.forEach((item, index) => visualHTML += drawWindowSVG(item, index));
    document.getElementById('visual-drawings').innerHTML = visualHTML;
    const cutData = generateCutData();
    let output = "";
    for (let ref in cutData) {
        const data = cutData[ref];
        let totalPieces = data.cuts.length;
        output += `<div class="bar-container"><div class="bar-title"><span>${ref.replace('p_','')} (${data.bars.length} Barres)</span><span style="color:#d63384;">Total: ${totalPieces} pcs</span></div>`;
        data.bars.forEach((b, idx) => {
            output += `<div class="bar-visual">`;
            b.cuts.forEach(c => { output += `<div class="cut-piece" style="width:${(c/toulBarra)*100}%">${c.toFixed(1)}</div>`; });
            if(b.rem > 0) output += `<div class="waste-piece" style="width:${(b.rem/toulBarra)*100}%" title="Restant: ${b.rem.toFixed(1)}"></div>`;
            output += `</div><div style="font-size:12px; text-align:right; color:red;">Chute Net: ${b.rem.toFixed(1)} cm</div>`;
        });
        output += `</div>`;
    }
    document.getElementById('debit-result').innerHTML = output;
}

function renderFacture() { 
    let tb = document.querySelector("#facture-table tbody"); 
    tb.innerHTML = "";
    let marge = parseFloat(document.getElementById('margePercent').value) || 0;
    let multiplier = 1 + (marge / 100);
    devis.forEach(item => {
        let prixUnit = (100 + (item.L_cm * item.H_cm * 0.08)) * multiplier; 
        let totalLigne = prixUnit * item.Q;
        tb.innerHTML += `<tr><td style="text-align:left; font-weight:bold;">${item.productName} <br><span style="font-size:12px; color:#666;">Dim: ${item.L_cm} x ${item.H_cm} | Coul: ${item.colorName}</span></td><td>${item.Q}</td><td><input type="number" class="facture-pu" value="${prixUnit.toFixed(3)}" style="width:100%; border:none; text-align:center;" onchange="updateFactureTotal()"></td><td class="facture-total">${totalLigne.toFixed(3)}</td></tr>`;
    });
    updateFactureTotal();
    document.getElementById('factureDate').valueAsDate = new Date();
}

function updateFactureTotal() { 
    let rows = document.querySelectorAll("#facture-table tbody tr");
    let grandTotal = 0;
    rows.forEach(row => {
        const qte = parseFloat(row.cells[1].innerText); const puInput = row.querySelector('.facture-pu');
        const pu = parseFloat(puInput.value); const totalCell = row.querySelector('.facture-total');
        let totalLigne = 0; if (!isNaN(qte) && !isNaN(pu)) totalLigne = qte * pu;
        totalCell.innerText = totalLigne.toFixed(3); grandTotal += totalLigne;
    });
    document.getElementById('facture-total-display').innerText = grandTotal.toFixed(3);
}

document.addEventListener('DOMContentLoaded', () => { loadPrices(); updateUI(); });
