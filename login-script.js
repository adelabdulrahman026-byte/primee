import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- كود الـ firebaseConfig ---
const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6",
    storageBucket: "academy-444b6.firebasestorage.app",
    messagingSenderId: "1079254330731",
    appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e"
};
// ------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تفعيل الوضع الليلي
const themeBtn = document.getElementById('themeBtn');
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

// دوال إظهار وإخفاء نافذة التنبيهات
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

window.closeAlertModal = function() {
    document.getElementById('alertModal').classList.remove('active');
};

// توليد رقم فريد للجهاز (Token)
function generateDeviceToken() {
    return 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// عملية تسجيل الدخول
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.textContent = 'جاري التحقق... ⏳';
    submitBtn.disabled = true;

    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // 1. البحث عن الطالب برقم الهاتف وكلمة المرور
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone), where("password", "==", password));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showAlert("خطأ في الدخول", "رقم الهاتف أو كلمة المرور غير صحيحة.");
            submitBtn.textContent = 'دخول للمنصة';
            submitBtn.disabled = false;
            return;
        }

        // 2. استخراج بيانات الطالب
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        // 3. فحص الحظر (Block)
        if (userData.isBlocked) {
            showAlert("حساب موقوف", "تم إيقاف حسابك من قبل الإدارة. يرجى مراجعة الدعم.");
            submitBtn.textContent = 'دخول للمنصة';
            submitBtn.disabled = false;
            return;
        }

        // 4. خوارزمية بصمة الجهاز (Device Binding)
        let currentDeviceToken = localStorage.getItem('primeeDeviceToken');

        if (userData.deviceId === "" || userData.deviceId === undefined) {
            // أول مرة يفتح الحساب: نبصم الجهاز
            currentDeviceToken = generateDeviceToken();
            localStorage.setItem('primeeDeviceToken', currentDeviceToken);
            
            // تحديث الداتا بيز بالبصمة الجديدة
            await updateDoc(doc(db, "users", userId), {
                deviceId: currentDeviceToken
            });
            
            // حفظ بيانات الجلسة عشان نستخدمها في باقي الموقع
            localStorage.setItem('loggedInUserId', userId);
            
            // 👇 التعديل: حفظ رقم التليفون عشان لوحة الطالب تتعرف عليه
            localStorage.setItem('studentPhone', phone); 
            
            showAlert("نجاح", "تم تسجيل الدخول وربط الحساب بهذا الجهاز بنجاح! 🚀");
            
            // 👇 التعديل: التوجيه للداش بورد بعد ثانيتين
            setTimeout(() => { window.location.href = "student-dashboard.html"; }, 2000);

        } else {
            // مش أول مرة: نقارن البصمات
            if (currentDeviceToken === userData.deviceId) {
                localStorage.setItem('loggedInUserId', userId);
                
                // 👇 التعديل: حفظ رقم التليفون عشان لوحة الطالب تتعرف عليه
                localStorage.setItem('studentPhone', phone);
                
                showAlert("نجاح", "أهلاً بك مرة أخرى في Primee Academy!");
                
                // 👇 التعديل: التوجيه للداش بورد بعد ثانيتين
                setTimeout(() => { window.location.href = "student-dashboard.html"; }, 2000);
            } else {
                showAlert("تم رفض الدخول ⛔", "هذا الحساب مرتبط بجهاز آخر! لا يمكنك فتحه من هنا. تواصل مع الدعم لإعادة ضبط جهازك.");
            }
        }

    } catch (error) {
        console.error(error);
        showAlert("مشكلة تقنية", "حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    } finally {
        submitBtn.textContent = 'دخول للمنصة';
        submitBtn.disabled = false;
    }
});

// ---------------------------------------------------------
// أكواد تفاعل الباسوورد والـ Lottie
// ---------------------------------------------------------

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('loginPassword');
const loginLottie = document.getElementById('loginLottie');

// 1. كود إظهار وإخفاء الباسوورد لما تدوس على العين
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.textContent = '🙈'; // شكل العين مقفولة
        } else {
            passwordInput.type = 'password';
            togglePassword.textContent = '👁️'; // شكل العين مفتوحة
        }
    });

    // 2. كود تفاعل الـ Lottie (يغمي عينه لما تضغط على خانة الباسوورد)
    passwordInput.addEventListener('focus', () => {
        if (loginLottie) {
            loginLottie.load('https://lottie.host/6bc24f6a-10be-40e0-b7e2-7b0fc44e2512/zP2Kc77nro.lottie.json');
        }
    });

    // 3. لما تخرج من خانة الباسوورد (يرجع للأنيميشن الطبيعي)
    passwordInput.addEventListener('blur', () => {
        if (loginLottie) {
            loginLottie.load('https://assets3.lottiefiles.com/packages/lf20_jcikmacf.json');
        }
    });
}
