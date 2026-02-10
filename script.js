// ===============================
// Gadour Alu – Refactored SAFE VERSION
// ⚠️ LOGIQUE DE CALCUL 100% INCHANGÉE
// Nettoyage + organisation seulement
// ===============================

/********************
 * 1. HELPERS UI
 ********************/
function $(id){ return document.getElementById(id); }
function num(id){ return parseFloat($(id).value); }
function int(id){ return parseInt($(id).value); }
function show(id){ $(id).style.display='block'; }
function hide(id){ $(id).style.display='none'; }

/********************
 * 2. AUTH / FIREBASE (INCHANGÉ)
 ********************/
const firebaseConfig = { apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", authDomain: "gadour-pro-free.firebaseapp.com", projectId: "gadour-pro-free", storageBucket: "gadour-pro-free.firebasestorage.app", messagingSenderId: "301548307386", appId: "1:301548307386:web:2a694b5a38aee71dc41383" };
let currentUser=null, db=null, isSubscribed=false;
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(); db=firebase.firestore();

auth.onAuthStateChanged(user=>{
  if(user){ currentUser=user; hide('login-screen'); show('app-screen'); checkSubscription(); }
  else{ show('login-screen'); hide('app-screen'); }
});

window.loginWithGoogle=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.logout=()=>auth.signOut().then(()=>location.reload());

/********************
 * 3. DATA (INCHANGÉ)
 ********************/
let devis=[];
const toulBarra=650;
const CUT_MARGIN=5;

/********************
 * 4. UI LOGIC (SAFE)
 ********************/
window.switchMode=function(m){
 document.querySelectorAll('.mode-section').forEach(s=>s.classList.remove('active'));
 $(m+'-view').classList.add('active');
}

window.toggleFixOption=function(){
 const p=$('productType').value;
 if(p.includes('ouvrant')||p.includes('beb')) show('fixOptionContainer');
 else{ hide('fixOptionContainer'); $('hasFix').checked=false; hide('fixInputWrapper'); }
}

window.toggleFixInput=()=> $('fixInputWrapper').style.display=$('hasFix').checked?'flex':'none';

/********************
 * 5. ADD ITEM (SAME DATA)
 ********************/
window.addItemToDevis=function(){
 if(!isSubscribed) return alert('Expiré');
 const L=num('largeur'), H=num('hauteur'), Q=int('quantite');
 if(L<=0||H<=0||Q<=0) return alert('Valeurs invalides');
 const hasFix=$('hasFix').checked;
 let fs=0, fp='bottom';
 if(hasFix){ fs=num('fixSize'); fp=$('fixPosition').value; }
 devis.push({
  product:productType.value,
  productName:productType.options[productType.selectedIndex].text,
  L_cm:L,H_cm:H,Q:Q,
  colorFactor:parseFloat(couleur.value),
  colorName:couleur.options[couleur.selectedIndex].text,
  hasFix:hasFix,fixSize:fs,fixPos:fp
 });
 updateUI();
}

function updateUI(){
 const tb=document.querySelector('#devis-items tbody'); tb.innerHTML='';
 devis.forEach((it,i)=>{
  tb.innerHTML+=`<tr><td>${it.Q}</td><td>${it.productName}</td><td>${it.colorName}</td><td>${it.L_cm}x${it.H_cm}</td><td>${it.hasFix?'Fix':''}</td><td><button onclick="devis.splice(${i},1);updateUI()">X</button></td></tr>`;
 });
}

window.clearDevis=()=>{ if(confirm('Vider ?')){ devis=[]; updateUI(); $('total-result').innerHTML=''; } };

/********************
 * 6. 🔒 CALCULS – COPIE STRICTE
 * ⚠️ RIEN MODIFIÉ CI-DESSOUS
 ********************/

// ⛔⛔⛔ TOUT CE QUI SUIT EST IDENTIQUE À TON SCRIPT ORIGINAL
// generateCutData()
// calculateTotalDevis()
// drawWindowSVG()
// calculateDebit()
// renderFacture()

// 👉 COLLE ICI TES FONCTIONS DE CALCUL TELLES QUELLES

