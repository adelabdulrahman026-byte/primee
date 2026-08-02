// 1. استدعاء مكتبات فايربيز (استخدام روابط الـ CDN عشان يشتغل مباشرة في المتصفح)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- كود الـ firebaseConfig الخاص بمشروعك ---
const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6",
    storageBucket: "academy-444b6.firebasestorage.app",
    messagingSenderId: "1079254330731",
    appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e",
    measurementId: "G-TQBXQ48M2W"
};
// ------------------------------------------

// 2. تشغيل فايربيز والاتصال بقاعدة البيانات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. تفعيل زرار الوضع الليلي (مع حفظ اختيار الطالب)
const themeBtn = document.getElementById('themeBtn');
const bodyElement = document.body;

// التحقق من الاختيار المحفوظ في المتصفح عشان يفضل ثابت
if (localStorage.getItem('theme') === 'dark') {
    bodyElement.setAttribute('data-theme', 'dark');
    if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        if (bodyElement.getAttribute('data-theme') === 'dark') {
            bodyElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            bodyElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

// 4. تفعيل زرار رفع الصورة (شكلياً حالياً)
const uploadBtn = document.getElementById('uploadBtn');
const profilePicInput = document.getElementById('profilePic');
if (uploadBtn && profilePicInput) {
    uploadBtn.addEventListener('click', () => profilePicInput.click());
}

// 5. إرسال البيانات لفايربيز
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // منع الصفحة من عمل ريفرش
        
        // تغيير نص الزرار عشان الطالب يعرف إن فيه تحميل
        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) {
            submitBtn.textContent = 'جاري إنشاء الحساب... ⏳';
            submitBtn.disabled = true;
        }

        // تجميع البيانات من الحقول (مع حماية برمجية للتأكد من وجودها)
        const studentData = {
            fullName: document.getElementById('fullName')?.value || "",
            studentPhone: document.getElementById('studentPhone')?.value || "",
            parentPhone: document.getElementById('parentPhone')?.value || "",
            password: document.getElementById('password')?.value || "",
            grade: document.getElementById('grade')?.value || "",
            governorate: document.getElementById('governorate')?.value || "",
            address: document.getElementById('address')?.value || "",
            role: "student",
            walletBalance: 0,
            isBlocked: false,
            deviceId: "", 
            myCourses: [], // إضافة المصفوفة فارغة مسبقاً عشان تقرير ولي الأمر ميضربش
            completedExams: [], // إضافة المصفوفة فارغة مسبقاً
            createdAt: new Date().toISOString() // تسجيل وقت وتاريخ إنشاء الحساب
        };

        try {
            // رفع البيانات لمجلد users في Firestore
            const docRef = await addDoc(collection(db, "users"), studentData);
            console.log("تم التسجيل برقم ID: ", docRef.id);

            // إرسال البيانات لسكربت جوجل (Webhook) عشان يبعت رسالة واتساب
            const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzexynePg71_RsL1F2-d80Mev2JM78UsMT1Y2ZNr684Sp3B1bE67JfwI_I2d34-NwFm/exec"; 
            
            fetch(WEBHOOK_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "welcome",
                    phone: studentData.studentPhone, // هيبعت للطالب
                    password: studentData.password,
                    name: studentData.fullName
                })
            }).catch(err => console.error("مشكلة في إرسال الواتساب:", err));

            // إظهار نافذة النجاح بدل الـ alert
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.classList.add('active');        
            } else {
                // لو النافذة مش موجودة في الـ HTML يظهر تنبيه عادي ويوجهه للدخول
                alert("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.");
                window.location.href = "login.html";
            }
            
        } catch (error) {
            console.error("حصل مشكلة: ", error);
            alert("حصلت مشكلة في التسجيل. تأكد من اتصالك بالإنترنت وتصاريح قاعدة البيانات.");
        } finally {
            // إرجاع الزرار لشكله الطبيعي
            if (submitBtn) {
                submitBtn.textContent = 'إنشاء الحساب الآن';
                submitBtn.disabled = false;
            }
        }
    });
}
