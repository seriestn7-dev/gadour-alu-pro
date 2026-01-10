// CLEANED & REFACTORED VERSION
// ----------------------------------------------
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA",
  authDomain: "gadour-pro-free.firebaseapp.com",
  projectId: "gadour-pro-free",
  storageBucket: "gadour-pro-free.firebasestorage.app",
  messagingSenderId: "301548307386",
  appId: "1:301548307386:web:2a694b5a38aee71dc41383"
};

let currentUser = null;
let db = null;
let isSubscribed = false;

//--------------------------------------------------
// Firebase Init + Auth Listener
//--------------------------------------------------
try {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  db = firebase.firestore();

  auth.onAuthStateChanged((user) => {
    if (user) handleLogin(user);
    else handleLogout();
  });

  window.logout = () => auth.signOut().then(() => location.reload());

} catch (e) {
  console.error(e);
}

//--------------------------------------------------
// Auth Handlers
//--------------------------------------------------
function handleLogin(user) {
  currentUser = user;
  toggleScreen(true);

  const cached = localStorage.getItem('gadour_sub_' + user.uid);
  if (cached) {
    const sub = JSON.parse(cached);
    updateSubUI(sub.daysLeft, sub.userName, sub.createdAt);
    checkSubscription(true);
  } else checkSubscription();
}

function handleLogout() {
  currentUser = null;
  toggleScreen(false);
}

function toggleScreen(isLogged) {
  document.getElementById('login-screen').style.display = isLogged ? 'none' : 'flex';
  document.getElementById('app-screen').style.display = isLogged ? 'block' : 'none';
}

//--------------------------------------------------
// Google Login
//--------------------------------------------------
window.loginWithGoogle = function () {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(err => alert("Erreur Google: " + err.message));
};

//--------------------------------------------------
// Subscription Check
//--------------------------------------------------
function checkSubscription(isBackground = false) {
  if (!currentUser) return;

  db.collection('users').doc(currentUser.uid).get().then(doc => {
    let start = new Date();
    let userName = currentUser.displayName || "Client";

    if (doc.exists) {
      const d = doc.data();
      if (d.createdAt) start = d.createdAt.toDate();
      if (d.name) userName = d.name;
    } else if (!isBackground) {
      db.collection('users').doc(currentUser.uid).set({
        email: currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    const diff = Math.ceil((Date.now() - start) / 86400000);
    const daysLeft = 30 - diff;

    localStorage.setItem('gadour_sub_' + currentUser.uid, JSON.stringify({
      daysLeft,
      userName,
      createdAt: start
    }));

    updateSubUI(daysLeft, userName, start);
  });
}

//--------------------------------------------------
// UI Subscription Update
//--------------------------------------------------
function updateSubUI(daysLeft, userName, createdAt) {
  document.getElementById('displayUsername').innerText = "Bienvenue, " + userName;
  document.getElementById('displayEmail').innerText = currentUser.email;
  document.getElementById('memberSince').innerText = new Date(createdAt).toLocaleDateString();

  const banner = document.getElementById('sub-banner');
  const expiredPopup = document.getElementById('expiredPopup');
  const welcomePopup = document.getElementById('welcomePopup');

  if (daysLeft > 0) {
    isSubscribed = true;
    expiredPopup.style.display = 'none';

    if (!sessionStorage.getItem('welcomeShown')) {
      welcomePopup.style.display = 'flex';
      sessionStorage.setItem('welcomeShown', 'true');
    }

    banner.style.display = 'block';
    banner.style.background = '#28a745';
    banner.style.color = 'white';
    banner.innerText = `✅ Essai actif: Reste ${daysLeft} jours.`;

    document.getElementById('subStatusBadge').innerText = "Actif";
    document.getElementById('daysRemaining').innerText = `Expire dans ${daysLeft} jours`;

    enableApp(true);
    loadHistory();

  } else {
    isSubscribed = false;
    expiredPopup.style.display = 'flex';
    welcomePopup.style.display = 'none';

    banner.style.display = 'block';
    banner.className = 'expired';
    banner.innerText = "⛔ Abonnement expiré !";

    document.getElementById('subStatusBadge').innerText = "Expiré";
    document.getElementById('daysRemaining').innerText = "Veuillez payer.";

    enableApp(false);
  }
}

//--------------------------------------------------
// App Enable / Disable
//--------------------------------------------------
function enableApp(enabled) {
  ['btnAdd', 'btnCalc', 'btnSave'].forEach(id => {
    document.getElementById(id).disabled = !enabled;
  });
}

//--------------------------------------------------
// History
//--------------------------------------------------
function loadHistory() {
  if (!isSubscribed) return;

  const div = document.getElementById('history-list');
  div.innerHTML = "<p style='text-align:center;color:#777;'>Chargement...</p>";

  db.collection("historique")
    .where("uid", "==", currentUser.uid)
    .limit(20)
    .get()
    .then(snap => {
      const proj = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      proj.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

      if (proj.length === 0) {
        div.innerHTML = "<p style='text-align:center;color:#999;'>Aucun projet trouvé.</p>";
        return;
      }

      div.innerHTML = proj.map(p => renderHistoryItem(p)).join('');
    });
}

function renderHistoryItem(d) {
  const dateStr = d.date?.seconds ? new Date(d.date.seconds * 1000).toLocaleDateString('fr-FR') : 'Date inconnue';
  const count = d.items?.length || 0;

  return `
  <div class="history-card">
    <div style="text-align:left;">
      <h4 style="margin:0;color:#004085;font-size:16px;">👤 ${d.client || "Client Inconnu"}</h4>
      <small style="color:#777;font-size:12px;">📅 ${dateStr} | ${count} éléments</small>
    </div>
    <div style="display:flex;gap:5px;">
      <button class="btn-load" onclick="restoreDevis('${d.id}')">📂</button>
      <button class="btn-delete" onclick="deleteHistory('${d.id}')">🗑️</button>
    </div>
  </div>`;
}

//--------------------------------------------------
// History Actions
//--------------------------------------------------
window.saveCurrentDevis = function () {
  if (!isSubscribed) return alert("Expiré");
  if (devis.length === 0) return alert("Vide");

  const name = prompt("Client?");
  if (!name) return;

  db.collection("historique").add({
    uid: currentUser.uid,
    client: name,
    date: firebase.firestore.FieldValue.serverTimestamp(),
    items: devis
  }).then(() => {
    alert("Sauvegardé");
    loadHistory();
  });
};

window.restoreDevis = function (id) {
  if (!isSubscribed) return;

  db.collection("historique").doc(id).get().then(doc => {
    if (doc.exists) {
      devis = doc.data().items;
      updateUI();
      calculateTotalDevis();
      switchMode('calc');
    }
  });
};

window.deleteHistory = function (id) {
  if (confirm("Supprimer ?"))
    db.collection("historique").doc(id).delete().then(loadHistory);
};

//--------------------------------------------------
// Logo Upload
//--------------------------------------------------
function loadLogo(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('logoImage').src = e.target.result;
    document.getElementById('logoImage').style.display = 'block';
    document.getElementById('logoText').style.display = 'none';
  };

  reader.readAsDataURL(file);
}

//--------------------------------------------------
// DATABASE & PRICING
//--------------------------------------------------
let defaultDatabase = { /* ... ORIGINAL VALUES ... */ };
let database = {};
const toulBarra = 650;
const CUT_MARGIN = 5;
let devis = [];

function loadPrices() {
  const s = localStorage.getItem('gadourAluPrices');
  database = s ? { ...defaultDatabase, ...JSON.parse(s) } : { ...defaultDatabase };
  renderPricesTable();
}

function savePrices() {
  localStorage.setItem('gadourAluPrices', JSON.stringify(database));
}

window.updatePrice = (k, v) => {
  database[k] = parseFloat(v);
  savePrices();
};

//--------------------------------------------------
// Render Prices
//--------------------------------------------------
function renderPricesTable() {
  let hp = ''; let ha = '';

  for (let k in database) {
    if (k === 'v_ballar') {
      document.querySelector('[data-price-key="v_ballar"]').value = database[k];
      continue;
    }

    const html = `
      <div class="price-input-container">
        <span class="ref-label">${k.replace('p_', '').replace('a_', '')}:</span>
        <input type="number" class="price-input" data-price-key="${k}" value="${database[k]}" step="0.001" onchange="updatePrice(this.dataset.priceKey, this.value)"> Dt
      </div>`;

    if (k.startsWith('p_')) hp += html;
    else ha += html;
  }

  document.getElementById('table-prices-profiles').innerHTML = hp;
  document.getElementById('table-prices-accessoires').innerHTML = ha;
}

//--------------------------------------------------
// UI Switch Mode
//--------------------------------------------------
window.switchMode = function (m) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));

  const modes = {
    calc: ['calc-view', 1],
    debit: ['debit-view', 2],
    facture: ['facture-view', 
