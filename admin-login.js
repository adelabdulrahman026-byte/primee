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

// دالة التنبيهات (لو معندكش دالة showAlert في الـ HTML، دي هتشغل الـ Alert العادي كبديل آمن)
function showAlert(title, message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(title, message);
    } else {
        alert(title + "\n" + message);
    }
}

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
            // 1. الفحص الأول: نبحث في جدول الـ (admins) الأساسي 
            const adminsRef = collection(db, "admins");
            const qAdmin = query(adminsRef, where("username", "==", username), where("password", "==", password));
            const querySnapshot = await getDocs(qAdmin);

            if (!querySnapshot.empty) {
                // ده الأدمن الكبير (المدير)
                const adminDoc = querySnapshot.docs[0];
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminId', adminDoc.id);
                localStorage.setItem('role', 'superadmin'); // نديله الصلاحية الكاملة

                submitBtn.textContent = 'دخول كمدير نظام ✔️';
                submitBtn.style.background = '#10b981';
                setTimeout(() => { window.location.replace("admin-dashboard.html"); }, 1000);
                return; // نوقف الكود هنا
            }

            // 2. الفحص الثاني: لو مش مدير، نبحث في جدول المساعدين (assistants)
            const astRef = collection(db, "assistants");
            const qAst = query(astRef, where("username", "==", username), where("password", "==", password));
            const astSnapshot = await getDocs(qAst);

            if (!astSnapshot.empty) {
                // ده مساعد (سكرتير)
                const astDoc = astSnapshot.docs[0];
                const astData = astDoc.data();

                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminId', astDoc.id);
                localStorage.setItem('role', 'assistant'); // نديله صلاحية مساعد
                localStorage.setItem('astTeacher', astData.targetTeacher || ""); // المدرس التابع ليه
                localStorage.setItem('astPerms', JSON.stringify(astData.permissions || [])); // الصلاحيات اللي اخترناها

                submitBtn.textContent = 'دخول كمساعد ✔️';
                submitBtn.style.background = '#3b82f6'; // لون أزرق لتمييز المساعد
                setTimeout(() => { window.location.replace("admin-dashboard.html"); }, 1000);
                return; // نوقف الكود هنا
            }

            // 3. لو ملقاهوش لا مدير ولا مساعد
            showAlert("مرفوض ⛔", "بيانات الدخول غير صحيحة أو ليس لديك صلاحية.");
            submitBtn.textContent = 'تسجيل الدخول';
            submitBtn.disabled = false;

        } catch (error) {
            console.error(error);
            showAlert("مشكلة تقنية", "فشل الاتصال بقاعدة البيانات.");
            submitBtn.textContent = 'تسجيل الدخول';
            submitBtn.disabled = false;
        }
    });
}
