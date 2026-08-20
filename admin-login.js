import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6",
    storageBucket: "academy-444b6.firebasestorage.app",
    messagingSenderId: "1079254330731",
    appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnAdminSubmit');
    const user = document.getElementById('adminUsername').value.trim();
    const pass = document.getElementById('adminPassword').value.trim();

    btn.innerHTML = "جاري التحقق... ⏳"; btn.disabled = true;

    try {
        // دخول السوبر أدمن (أنت)
        if (user === "superadmin" && pass === "primee@2026") {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('role', 'superadmin');
            localStorage.setItem('astName', 'المدير العام');
            window.location.replace('admin-dashboard.html');
            return;
        }

        // دخول المساعدين
        const q = query(collection(db, "assistants"), where("username", "==", user), where("password", "==", pass));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const astData = querySnapshot.docs[0].data();
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('role', 'assistant');
            localStorage.setItem('astName', astData.name);
            localStorage.setItem('astTeacher', astData.targetTeacher || '');
            localStorage.setItem('astPerms', JSON.stringify(astData.permissions || []));
            window.location.replace('admin-dashboard.html');
        } else {
            showAlert('مرفوض', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    } catch (error) {
        showAlert('خطأ', 'حدث خطأ في الاتصال بقاعدة البيانات.');
    } finally {
        btn.innerHTML = "تسجيل الدخول"; btn.disabled = false;
    }
});
