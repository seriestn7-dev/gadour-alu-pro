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

    // 1. SURVEILLER L'ETAT DE CONNEXION (FIXED)
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';

            if (!sessionStorage.getItem('welcomeShown')) {
                document.getElementById('welcomePopup').style.display = 'flex';
                sessionStorage.setItem('welcomeShown', 'true'); 
            }
            
            // FIX: نلوجو في الـ Firebase ديراكت موش في الـ LocalStorage
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    let endDate;
                    
                    // تحويل التاريخ مهما كان نوعو (Timestamp أو String)
                    if (data.subscriptionEnd && data.subscriptionEnd.toDate) {
                        endDate = data.subscriptionEnd.toDate();
                    } else {
                        endDate = new Date(data.subscriptionEnd);
                    }

                    const now = new Date();
                    const diffTime = endDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 0) {
                        isSubscribed = true;
                        document.getElementById('sub-days').innerText = diffDays + " Jours";
                        document.getElementById('sub-date').innerText = endDate.toLocaleDateString('fr-FR');
                    } else {
                        isSubscribed = false;
                        document.getElementById('sub-days').innerText = "0";
                        alert("⚠️ Votre abonnement est terminé. Contactez Gadour Alu.");
                    }
                } else {
                    // مستخدم جديد: نعطيوه 30 يوم
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

// كمل خلي بقية الكود متاعك (loginWithGoogle, logout, calculate...) كيف ما هوما بالضبط
