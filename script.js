// ===============================
// CONFIG & AUTH & ABONNEMENT
// ===============================
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

// ===============================
// FIREBASE INIT (STABLE)
// ===============================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
db = firebase.firestore();

// ===============================
// AUTH STATE
// ===============================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';

        if (!sessionStorage.getItem('welcomeShown')) {
            document.getElementById('welcomePopup').style.display = 'flex';
            sessionStorage.setItem('welcomeShown', 'true');
        }

        const cachedSub = localStorage.getItem('gadour_sub_' + user.uid);
        if (cachedSub) {
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

window.loginWithGoogle = function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(err => alert("Erreur Google: " + err.message));
};

window.logout = function () {
    auth.signOut().then(() => location.reload());
};

// ===============================
// DATA (مرة وحدة فقط)
// ===============================
const toulBarra = 650;
const CUT_MARGIN = 5;
let devis = [];

// ===============================
// PRICES DATABASE
// ===============================
let defaultDatabase = {
    "p_67103": 200, "p_67104": 120, "p_67105": 120, "p_67106": 120,
    "p_Rail": 80, "p_67114": 90, "p_40402": 120, "p_40404": 200,
    "p_40107": 30, "p_40112": 120, "p_40100": 100, "p_40121": 100,
    "p_40154": 100, "p_40134": 80, "p_40166": 60,
    "p_Lame55": 80, "p_Glissiere": 50, "p_Lame_Finale": 60,
    "p_Axe_Store": 40, "p_Lame39": 65, "p_Caisson_Mono": 55,
    "p_Axe40": 35, "p_Traverse40104": 120,
    "a_Gallet": 2, "a_Fermeture": 5, "a_Gache_Fermeture": 2,
    "a_Kit_Etancheite": 5, "a_Joint_Brosse": 0.5,
    "a_Paumelle": 2, "a_Cremone": 5, "a_Kit_Cremone": 2.5,
    "a_Ecer_Danimo_G": 0.05, "a_Ecer_Danimo_P": 0.05,
    "a_Ecer_Tall_7did": 2, "a_Ecer_67103": 2,
    "a_Ecer_Font": 2, "a_Joint_Batman": 0.5,
    "a_Joint_A36": 0.5, "a_Kit_Vero_Semi_Fix": 2.5,
    "a_Bochon_112": 3, "a_Serrure_Cylindre": 20,
    "a_Poignee_Beb": 20, "a_Joint_Vitrage_242": 0.5,
    "a_Angle_Parclose": 0.5, "a_Moteur_Store_40": 120,
    "a_Moteur_Store_55": 140, "a_Axe_Rallonge": 10,
    "a_Tirant": 5, "a_Tirant_Mono": 5,
    "a_Joint_Brosse_5": 0.5, "a_Joint_Brosse_6": 0.5,
    "a_Bochon_55": 0.5, "a_Bochon_39": 0.5,
    "a_Kit_Acc_Mono": 25, "a_Cache_Canon": 2.5,
    "a_Joint_Batman_247": 0.8, "v_ballar": 45
};

let database = {};

// ===============================
// LOAD PRICES
// ===============================
function loadPrices() {
    const saved = localStorage.getItem('gadourAluPrices');
    database = saved ? { ...defaultDatabase, ...JSON.parse(saved) } : { ...defaultDatabase };
    renderPricesTable();
}

// ===============================
// UI INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    loadPrices();
    updateUI();
});
