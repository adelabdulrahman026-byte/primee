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

const adminLoginForm = document.getElementById('adminLoginForm');

if(adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('btnAdminSubmit');
        submitBtn.textContent = 'جاري التحقق... ⏳';
        submitBtn.disabled = true;

        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        try {
            // بنبحث في جدول الـ admins 
            const adminsRef = collection(db, "admins");
            const q = query(adminsRef, where("username", "==", username), where("password", "==", password));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // مفيش أدمن بالبيانات دي
                showAlert("مرفوض ⛔", "بيانات الدخول غير صحيحة أو ليس لديك صلاحية.");
                submitBtn.textContent = 'تسجيل الدخول';
                submitBtn.disabled = false;
                return;
            }

            // لو البيانات صح
            const adminDoc = querySnapshot.docs[0];
            const adminId = adminDoc.id;

            // بنخزن في المتصفح إن الأدمن ده دخل
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminId', adminId);

            submitBtn.textContent = 'تم تسجيل الدخول ✔️';
            submitBtn.style.background = '#10b981';
            
            // تحويل للوحة التحكم بتاعة الأدمن
            setTimeout(() => {
                window.location.replace("admin-dashboard.html");
            }, 1000);

        } catch (error) {
            console.error(error);
            showAlert("مشكلة تقنية", "فشل الاتصال بقاعدة البيانات.");
            submitBtn.textContent = 'تسجيل الدخول';
            submitBtn.disabled = false;
        }
    });
}
