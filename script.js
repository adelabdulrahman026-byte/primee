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
/* ==================== اللوجو المتحرك (عشان نلم حجمه) ==================== */
.animated-logo-container {
    position: relative;
    width: 100%;
    max-width: 350px;
    height: 350px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
}
.main-animated-logo {
    width: 100%;
    max-width: 280px; /* ده اللي هيلم اللوجو وميخليهوش يضرب في الشاشة */
    height: auto;
    filter: drop-shadow(0 20px 30px rgba(91, 33, 182, 0.2));
    animation: smoothFloat 4s ease-in-out infinite alternate;
}
@keyframes smoothFloat {
    0% { transform: translateY(0px) scale(1); }
    100% { transform: translateY(-20px) scale(1.02); }
}

/* ==================== القائمة الجانبية الشيك ==================== */
.side-drawer {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(15px);
    border-left: 1px solid rgba(255,255,255,0.5);
    transition: 0.5s cubic-bezier(0.77, 0, 0.175, 1) !important;
}
[data-theme="dark"] .side-drawer {
    background: rgba(30, 41, 59, 0.95) !important;
    border-left: 1px solid rgba(255,255,255,0.1);
}

/* ==================== كروت المدرسين الأنيقة ==================== */
.modern-teachers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    width: 100%;
}
.modern-teacher-card {
    background: var(--bg-card);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 15px 35px rgba(0,0,0,0.05);
    transition: 0.4s ease;
    border: 1px solid var(--input-border);
    display: flex;
    flex-direction: column;
}
.modern-teacher-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 25px 45px rgba(91, 33, 182, 0.1);
}
.card-image-wrapper {
    position: relative;
    height: 220px;
    overflow: hidden;
    background: #f8fafc;
}
.card-image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: 0.5s ease;
}
.modern-teacher-card:hover .card-image-wrapper img {
    transform: scale(1.1);
}
.card-overlay {
    position: absolute;
    bottom: 0; left: 0; width: 100%; height: 50%;
    background: linear-gradient(to top, var(--bg-card), transparent);
}
.teacher-subject-badge {
    position: absolute;
    top: 20px; right: 20px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--primary-color);
    padding: 8px 15px;
    border-radius: 30px;
    font-weight: 800;
    font-size: 13px;
    backdrop-filter: blur(5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    z-index: 5;
}
[data-theme="dark"] .teacher-subject-badge { background: rgba(15, 23, 42, 0.9); }
.card-info-wrapper {
    padding: 0 25px 30px 25px;
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    flex-direction: column;
}
.card-info-wrapper h3 {
    margin: 0 0 10px 0;
    font-size: 22px;
    color: var(--text-main);
}
.teacher-desc {
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 25px;
    flex: 1;
}
.btn-modern-view {
    width: 100%;
    background: var(--input-bg);
    color: var(--primary-color);
    border: 1px solid var(--input-border);
    padding: 14px;
    border-radius: 14px;
    font-weight: 800;
    font-family: 'Cairo';
    cursor: pointer;
    transition: 0.3s;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: auto;
}
.btn-modern-view:hover {
    background: var(--primary-color);
    color: #fff;
    border-color: var(--primary-color);
}

/* ==================== كروت الباقات ==================== */
.packages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; }
.package-card { background: linear-gradient(145deg, var(--bg-card), var(--input-bg)); border-radius: 24px; padding: 30px; border: 1px solid var(--input-border); box-shadow: 0 15px 35px rgba(0,0,0,0.04); position: relative; transition: 0.3s; }
.package-card:hover { transform: translateY(-5px); border-color: #f59e0b; }
.package-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; }
.package-badge { align-self: flex-start; background: #fef3c7; color: #d97706; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; }
.package-header h3 { margin: 0; font-size: 22px; color: var(--text-main); }
.package-teachers { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed var(--input-border); }
.avatar-group { display: flex; }
.avatar-group img { width: 45px; height: 45px; border-radius: 50%; border: 3px solid var(--bg-card); margin-left: -15px; object-fit: cover; }
.avatar-group img:first-child { margin-left: 0; }
.teachers-count { font-weight: 800; color: var(--primary-color); font-size: 14px; }
.package-features { list-style: none; padding: 0; margin: 0 0 30px 0; display: flex; flex-direction: column; gap: 12px; }
.package-features li { display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 15px; font-weight: 600; }
.package-features li i { color: #10b981; }
.package-price { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.old-price { text-decoration: line-through; color: var(--text-muted); font-size: 16px; }
.new-price { font-size: 28px; font-weight: 900; color: var(--text-main); }
.btn-package-subscribe { width: 100%; background: #f59e0b; color: #fff; border: none; padding: 15px; border-radius: 14px; font-weight: 800; font-family: 'Cairo'; cursor: pointer; transition: 0.3s; font-size: 16px; box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2); }
.btn-package-subscribe:hover { background: #d97706; transform: translateY(-2px); }

/* ==================== الفوتر الحديث ==================== */
.modern-footer-container { max-width: 1200px; margin: 80px auto 30px; padding: 0 20px; }
.footer-card { background: var(--bg-card); border-radius: 30px; padding: 50px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid var(--input-border); }
.footer-logo { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.footer-logo img { width: 50px; }
.footer-logo h3 { margin: 0; font-size: 28px; font-weight: 900; color: var(--primary-color); }
.footer-desc { color: var(--text-muted); max-width: 500px; line-height: 1.8; margin-bottom: 30px; }
.footer-contact-info { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-bottom: 35px; }
.contact-item { background: var(--input-bg); padding: 10px 20px; border-radius: 20px; color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 10px; border: 1px solid var(--input-border); }
.contact-item i { color: var(--primary-color); }
.social-links { display: flex; gap: 15px; }
.social-btn { width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 20px; text-decoration: none; transition: 0.3s; }
.social-btn.facebook { background: #1877f2; }
.social-btn.whatsapp { background: #25d366; }
.social-btn.youtube { background: #ff0000; }
.social-btn.instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
.social-btn:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
.footer-bottom { text-align: center; margin-top: 30px; color: var(--text-muted); font-weight: 600; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 0 20px; }
@media (max-width: 768px) { .animated-logo-container { max-width: 250px; height: 250px; } .footer-card { padding: 30px 20px; } .footer-contact-info { flex-direction: column; width: 100%; } .footer-bottom { flex-direction: column; justify-content: center; } }
