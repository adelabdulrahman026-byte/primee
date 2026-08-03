import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// تفعيل الوضع الليلي
const themeBtn = document.getElementById('themeBtn');
if(themeBtn) {
    themeBtn.addEventListener('click', () => {
        const body = document.body;
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            themeBtn.textContent = '🌙';
        } else {
            body.setAttribute('data-theme', 'dark');
            themeBtn.textContent = '☀️';
        }
    });
}

// دوال النوافذ المنبثقة
function showAlert(title, message) {
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertModal = document.getElementById('alertModal');
    
    if(alertTitle && alertMessage && alertModal) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.add('active');
    } else {
        alert(title + "\n" + message); // بديل سريع لو نسينا نحط نافذة الـ HTML
    }
}

window.closeAlertModal = function() {
    const alertModal = document.getElementById('alertModal');
    if(alertModal) alertModal.classList.remove('active');
};

// ==========================================
// عملية إنشاء الحساب ومنع التكرار
// ==========================================
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'جاري التحقق... ⏳';
        submitBtn.disabled = true;

        // سحب البيانات بأسماء (IDs) مطابقة لملف الـ HTML بتاعك بالمللي + قص المسافات
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('studentPhone').value.trim();
        const parentPhone = document.getElementById('parentPhone').value.trim();
        const password = document.getElementById('password').value;
        const grade = document.getElementById('grade').value;
        const governorate = document.getElementById('governorate').value;
        const address = document.getElementById('address').value.trim();

        try {
            // 1. فحص هل الرقم ده متسجل قبل كده ولا لأ؟ 🔍
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("studentPhone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // لو الرقم موجود، بنطرد الطلب ونقفل التسجيل
                showAlert("عذراً ⚠️", "رقم الهاتف ده مسجل بيه حساب قبل كده. تقدر تسجل دخول، أو استخدم رقم تاني.");
                submitBtn.textContent = 'إنشاء الحساب الآن';
                submitBtn.disabled = false;
                return; // بتوقف الكود هنا فوراً ومبتكملش
            }

            // 2. الكود عدى والفحص سليم (الرقم جديد) -> هنحفظ الحساب في الداتا بيز
            await addDoc(collection(db, "users"), {
                fullName: fullName,
                studentPhone: phone,
                parentPhone: parentPhone,
                password: password,
                grade: grade,
                governorate: governorate,
                address: address,
                myCourses: [],
                completedExams: [],
                deviceId: "", // بنسيبه فاضي عشان يتبصم لما يعمل تسجيل دخول
                walletBalance: 0,
                isBlocked: false,
                joinDate: new Date().toISOString()
            });

            // 3. إظهار نافذة النجاح الخاصة بك
            const successModal = document.getElementById('successModal');
            if(successModal) {
                successModal.classList.add('active');
            }

        } catch (error) {
            console.error("خطأ:", error);
            showAlert("مشكلة تقنية", "حدث خطأ أثناء الاتصال بقاعدة البيانات.");
            submitBtn.textContent = 'إنشاء الحساب الآن';
            submitBtn.disabled = false;
        }
    });
}
