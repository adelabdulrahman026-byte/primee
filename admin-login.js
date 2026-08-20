import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6",
    storageBucket: "academy-444b6.firebasestorage.app",
    messagingSenderId: "1079254330731",
    appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function showAlert(title, message) {
    alert(`${title}: ${message}`);
}

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnAdminSubmit');
    const user = document.getElementById('adminUsername').value.trim().toLowerCase();
    const pass = document.getElementById('adminPassword').value.trim();

    btn.innerHTML = "جاري التحقق المشفر... ⏳"; 
    btn.disabled = true;

    try {
        // تحويل اسم المستخدم لإيميل رسمي على نطاق المنصة
        let email = user.includes('@') ? user : `${user}@primeeacademy.com`;

        // 🚨 1. تسجيل الدخول الرسمي المشفر في Firebase Auth 🚨
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const uid = userCredential.user.uid;

        // التحقق إذا كان سوبر أدمن
        if (email === "superadmin@primeeacademy.com") {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('role', 'superadmin');
            localStorage.setItem('astName', 'المدير العام');
            window.location.replace('admin-dashboard.html');
            return;
        }

        // 🚨 2. التحقق من صلاحيات المساعد من خلال الـ UID المشفر 🚨
        const astDoc = await getDoc(doc(db, "assistants", uid));
        if (astDoc.exists()) {
            const astData = astDoc.data();
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('role', 'assistant');
            localStorage.setItem('astName', astData.name);
            localStorage.setItem('astTeacher', astData.targetTeacher || '');
            localStorage.setItem('astPerms', JSON.stringify(astData.permissions || []));
            window.location.replace('admin-dashboard.html');
        } else {
            showAlert('خطأ في الصلاحيات', 'هذا الحساب غير مسجل كمساعد مصرح له في النظام.');
        }

    } catch (error) {
        console.error("Login Error:", error);
        let msg = "اسم المستخدم أو كلمة المرور غير صحيحة.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = "بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور.";
        }
        showAlert('فشل الدخول', msg);
    } finally {
        btn.innerHTML = "تسجيل الدخول"; 
        btn.disabled = false;
    }
});
