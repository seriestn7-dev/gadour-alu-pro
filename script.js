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

try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    db = firebase.firestore();

    // 1. SURVEILLER L'ETAT DE CONNEXION (CODE MASLA7)
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';

            // --- GESTION POPUP ACCUEIL (ARABE) ---
            if (!sessionStorage.getItem('welcomeShown')) {
                document.getElementById('welcomePopup').style.display = 'flex';
                sessionStorage.setItem('welcomeShown', 'true'); 
            }
            
            // --- FIX: VÉRIFICATION ABONNEMENT DIRECTE DEPUIS FIREBASE ---
            // هوني نعيطو للدالة ديركت باش تثبت من السرفر
            checkSubscriptionFromFirebase(user);

        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
    });

    // --- FONCTION DE VÉRIFICATION FIABLE ---
    function checkSubscriptionFromFirebase(user) {
        const userRef = db.collection('users').doc(user.uid);

        userRef.get().then((doc) => {
            if (doc.exists) {
                // المستخدم موجود، نجيبو وقتاش يوفى الاشتراك
                const data = doc.data();
                let endDate;

                // التثبت من صيغة التاريخ (Timestamp والا String)
                if (data.subscriptionEnd && data.subscriptionEnd.toDate) {
                    endDate = data.subscriptionEnd.toDate(); // كانو Firebase Timestamp
                } else {
                    endDate = new Date(data.subscriptionEnd); // كانو String
                }

                const now = new Date();
                const diffTime = endDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log("Jours restants (Server):", diffDays);

                if (diffDays > 0) {
                    // الاشتراك مازال يمشي
                    isSubscribed = true;
                    updateSubscriptionUI(diffDays, endDate);
                    
                    // نسجلو نسخة في LocalStorage فقط للزينة، موش للحساب
                    localStorage.setItem('gadour_sub_status', JSON.stringify({
                        active: true,
                        end: endDate.toISOString()
                    }));
                } else {
                    // الاشتراك وفى
                    handleExpiredSubscription();
                }

            } else {
                // مستخدم جديد (أول مرة يدخل) -> نعطيوه 30 يوم Test
                const newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + 30);
                
                userRef.set({
                    email: user.email,
                    subscriptionEnd: firebase.firestore.Timestamp.fromDate(newEndDate), // نسجلوه Timestamp
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    isSubscribed = true;
                    updateSubscriptionUI(30, newEndDate);
                });
            }
        }).catch((error) => {
            console.error("Erreur check subscription:", error);
            // في حالة قصت الكونكسيون، وقتها برك نمشيو للـ Cache
            const cachedSub = localStorage.getItem('gadour_sub_status');
            if(cachedSub) {
                const subData = JSON.parse(cachedSub);
                const endDate = new Date(subData.end);
                const now = new Date();
                const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                if(diffDays > 0) updateSubscriptionUI(diffDays, endDate);
            }
        });
    }

    function updateSubscriptionUI(days, dateObj) {
        const dateStr = dateObj.toLocaleDateString('fr-FR');
        if(document.getElementById('sub-days')) document.getElementById('sub-days').innerText = days + " Jours";
        if(document.getElementById('sub-date')) document.getElementById('sub-date').innerText = dateStr;
        
        // تنبيه بالألوان كيف يقرب يوفى
        const statusElem = document.getElementById('sub-status');
        if(statusElem) {
            if (days <= 5) {
                statusElem.style.color = "red";
                statusElem.innerText = "EXPIRATION PROCHE";
            } else {
                statusElem.style.color = "green"; // أو اللون الأصلي
            }
        }
    }

    function handleExpiredSubscription() {
        isSubscribed = false;
        if(document.getElementById('sub-days')) document.getElementById('sub-days').innerText = "0";
        
        // بلوكاج أو مساج
        alert("⚠️ لقد انتهت فترة اشتراكك (Abonnement Expiré). الرجاء التجديد لمواصلة العمل.");
        
        // تنجم تخبي الـ Interface كان تحب
        // document.getElementById('app-screen').innerHTML = "<h1 style='text-align:center; margin-top:50px;'>Abonnement Expiré - Contactez l'administrateur</h1>";
    }

} catch (e) {
    console.error("Firebase Error:", e);
    alert("Erreur de connexion Firebase. Vérifiez votre internet.");
}

// --- LOGIN / LOGOUT ---
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => {
        alert("Erreur de connexion: " + error.message);
    });
}

function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('gadour_sub_status'); // نفسخو الـ Cache عند الخروج
        location.reload();
    });
}

function closeWelcome() {
    document.getElementById('welcomePopup').style.display = 'none';
}

// ============================================================
//  ICI COMMENCE VOTRE CODE DE CALCUL (NE TOUCHEZ PAS CI-DESSOUS)
// ============================================================

// دالة تحديث الفاتورة (موجودة في ملفك الأصلي)
function updateFactureTotal() { 
    let rows = document.querySelectorAll("#facture-table tbody tr");
    let grandTotal = 0;
    rows.forEach(row => {
        const qte = parseFloat(row.cells[1].innerText); 
        const puInput = row.querySelector('.facture-pu');
        
        // تثبت باش ما تصيرش Errors
        if(puInput) {
            const pu = parseFloat(puInput.value);
            const totalCell = row.querySelector('.facture-total');
            let totalLigne = 0;
            if (!isNaN(qte) && !isNaN(pu)) totalLigne = qte * pu;
            if(totalCell) totalCell.innerText = totalLigne.toFixed(3);
            grandTotal += totalLigne;
        }
    });
    
    const totalDisplay = document.getElementById('facture-total-display');
    if(totalDisplay) totalDisplay.innerText = grandTotal.toFixed(3);
}

// دالة الطباعة
function printFacture() {
    if (!isSubscribed) {
        alert("⚠️ النسخة غير مفعلة. لا يمكنك الطباعة.");
        return;
    }
    window.print();
}

// --- (هوني كمل حط باقي الدوال متاعك: updatePrice, calculate, drawWindow... الخ) ---
// بما أني ما نشوفش الكود الكل، تأكد أنك ما تفسخش دوال الحساب (Calcul functions) اللي كانت لوطة.
