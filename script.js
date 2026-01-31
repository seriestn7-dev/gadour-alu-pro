// --- CONFIG & AUTH & ABONNEMENT ---
const firebaseConfig = { 
    apiKey: "AIzaSyBbxD-oDHcEzyXarmkykTfAclEaXeNidMA", 
    authDomain: "gadour-pro-free.firebaseapp.com", 
    projectId: "gadour-pro-free", 
    storageBucket: "gadour-pro-free.firebasestorage.app", 
    messagingSenderId: "301548307386", 
    appId: "1:301548307386:web:2a694b5a38aee71dc41383" 
};

// !!! حط إيميلك هنا باش تظهرلك لوحة الأدمن !!!
const ADMIN_EMAIL = "seriestn7@gmail.com"; 

let currentUser = null, db = null, isSubscribed = false;

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    // 1. مراقبة حالة الاتصال والاشتراك
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';

            if (!sessionStorage.getItem('welcomeShown')) {
                document.getElementById('welcomePopup').style.display = 'flex';
                sessionStorage.setItem('welcomeShown', 'true'); 
            }
            
            // إظهار لوحة التحكم للأدمن فقط
            if (user.email === ADMIN_EMAIL) {
                document.getElementById('admin-panel').style.display = 'block';
                loadUsersForAdmin();
            }

            // التثبت من الاشتراك من Firebase مباشرة (بدون كاش)
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    let endDate = (data.subscriptionEnd && data.subscriptionEnd.toDate) ? 
                                   data.subscriptionEnd.toDate() : new Date(data.subscriptionEnd);
                    
                    const now = new Date();
                    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

                    if (diffDays > 0) {
                        isSubscribed = true;
                        document.getElementById('sub-days').innerText = diffDays + " Jours";
                        document.getElementById('sub-date').innerText = endDate.toLocaleDateString('fr-FR');
                    } else {
                        isSubscribed = false;
                        document.getElementById('sub-days').innerText = "0";
                        alert("⚠️ Abonnement terminé. Contactez Gadour Alu.");
                    }
                } else {
                    // مستخدم جديد: نعطيه 30 يوم تجريبي
                    const initialEnd = new Date();
                    initialEnd.setDate(initialEnd.getDate() + 30);
                    db.collection('users').doc(user.uid).set({
                        email: user.email,
                        subscriptionEnd: firebase.firestore.Timestamp.fromDate(initialEnd),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => location.reload());
                }
            });

        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

} catch (e) {
    console.error("Firebase Init Error:", e);
}

// --- وظائف الأدمن ---
function loadUsersForAdmin() {
    const listDiv = document.getElementById('users-list');
    db.collection('users').get().then((querySnapshot) => {
        let html = '<table style="width:100%; border-collapse: collapse; margin-top:10px; font-size:14px;">';
        html += '<tr style="background:#003366; color:white; text-align:left;"><th>Email</th><th>Expire</th><th>Action</th></tr>';
        
        querySnapshot.forEach((doc) => {
            const u = doc.data();
            const d = (u.subscriptionEnd && u.subscriptionEnd.toDate) ? 
                       u.subscriptionEnd.toDate().toLocaleDateString() : u.subscriptionEnd;
            html += `<tr style="border-bottom:1px solid #ddd; height:45px;">
                <td>${u.email}</td>
                <td><b style="color:#d63384;">${d}</b></td>
                <td><button onclick="add30Days('${doc.id}')" style="background:#28a745; color:white; border:none; padding:8px; cursor:pointer; border-radius:5px; font-weight:bold;">+30 يوم</button></td>
            </tr>`;
        });
        html += '</table>';
        listDiv.innerHTML = html;
    });
}

window.add30Days = function(uid) {
    const ref = db.collection('users').doc(uid);
    ref.get().then(doc => {
        let current = new Date();
        if (doc.exists && doc.data().subscriptionEnd) {
            let oldDate = doc.data().subscriptionEnd.toDate ? doc.data().subscriptionEnd.toDate() : new Date(doc.data().subscriptionEnd);
            current = oldDate > new Date() ? oldDate : new Date();
        }
        current.setDate(current.getDate() + 30);
        ref.update({ subscriptionEnd: firebase.firestore.Timestamp.fromDate(current) })
           .then(() => { alert("تم التجديد بنجاح!"); loadUsersForAdmin(); });
    });
}

// --- LOGIN / LOGOUT ---
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => alert(error.message));
}

function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.clear();
        location.reload();
    });
}

function closeWelcome() {
    document.getElementById('welcomePopup').style.display = 'none';
}

// ==========================================
// بقية دوال الحساب والفيصالة (خليتهم كيف ما هوما)
// ==========================================

function updatePrice(key, val) {
    if (!currentUser) return;
    db.collection('settings').doc('prices').set({ [key]: parseFloat(val) }, { merge: true });
}

function updateFactureTotal() { 
    let rows = document.querySelectorAll("#facture-table tbody tr");
    let grandTotal = 0;
    rows.forEach(row => {
        const qte = parseFloat(row.cells[1].innerText); 
        const puInput = row.querySelector('.facture-pu');
        if(puInput) {
            const pu = parseFloat(puInput.value);
            const totalCell = row.querySelector('.facture-total');
            let totalLigne = (isNaN(qte) || isNaN(pu)) ? 0 : qte * pu;
            totalCell.innerText = totalLigne.toFixed(3);
            grandTotal += totalLigne;
        }
    });
    const totalDisplay = document.getElementById('facture-total-display');
    if(totalDisplay) totalDisplay.innerText = grandTotal.toFixed(3);
}

function printFacture() {
    if (!isSubscribed) {
        alert("⚠️ النسخة غير مفعلة. لا يمكنك الطباعة.");
        return;
    }
    window.print();
}

// استكمل بقية الدوال الخاصة بك هنا (calculate, drawWindow, etc.)

