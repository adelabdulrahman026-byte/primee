import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- كود الربط بقاعدة بياناتك ---
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

// دوال إظهار وإخفاء نافذة التنبيهات
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

window.closeAlertModal = function() {
    document.getElementById('alertModal').classList.remove('active');
};

// عملية البحث عن الرقم في فايربيز
const forgotForm = document.getElementById('forgotForm');
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.querySelector('.btn-submit');
    btn.textContent = "جاري البحث... ⏳";
    btn.disabled = true;

    const phone = document.getElementById('resetPhone').value;

    try {
        // البحث عن الرقم في مجلد users
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // لو الرقم مش متسجل في المنصة
            showAlert("رقم غير مسجل ⛔", "هذا الرقم غير مسجل لدينا في المنصة. تأكد من الرقم أو قم بإنشاء حساب جديد.");
        } else {
            // لو الرقم موجود، هنستخرج الباسوورد والاسم
            const userData = querySnapshot.docs[0].data();
            const studentPassword = userData.password;
            const studentName = userData.fullName;

            console.log("اسم الطالب:", studentName);
            console.log("كلمة المرور المستخرجة:", studentPassword);
            
// ---------------------------------------------------------
            // كود إرسال الباسوورد على الواتساب (Google Webhook)
            // ---------------------------------------------------------
            const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxCMHB0UUnuBIVgQqIViu_ENLpL6OpDSBFAx7vzNc4KQmoNe3E-dlyD7ZZs4T_Wfn5w/exec";
            
            fetch(WEBHOOK_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "forgot_password",
                    phone: phone, // الرقم اللي الطالب دخله في الفورم
                    password: studentPassword, // الباسوورد اللي طلعناه من الداتا بيز
                    name: studentName // اسم الطالب
                })
            }).catch(err => console.error("مشكلة في إرسال الواتساب:", err));
            // ---------------------------------------------------------            
            showAlert("تم بنجاح! ✅", "تم العثور على حسابك. (في الخطوة القادمة سيتم إرسال الباسوورد لرقمك على الواتساب).");
            
            forgotForm.reset();
        }
    } catch (error) {
        console.error("خطأ:", error);
        showAlert("مشكلة تقنية", "حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى التأكد من الإنترنت.");
    } finally {
        // إرجاع الزرار لشكله الطبيعي
        btn.textContent = "إرسال عبر الواتساب";
        btn.disabled = false;
    }
});
