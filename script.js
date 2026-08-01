// 1. استدعاء مكتبات فايربيز (استخدام روابط الـ CDN عشان يشتغل مباشرة في المتصفح)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- كود الـ firebaseConfig الخاص بمشروعك (تم التحديث بنجاح) ---
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

// 3. تفعيل زرار الوضع الليلي
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

// 4. تفعيل زرار رفع الصورة (شكلياً حالياً)
const uploadBtn = document.getElementById('uploadBtn');
const profilePicInput = document.getElementById('profilePic');
uploadBtn.addEventListener('click', () => profilePicInput.click());

// 5. إرسال البيانات لفايربيز
const registerForm = document.getElementById('registerForm');
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الصفحة من عمل ريفرش
    
    // تغيير نص الزرار عشان الطالب يعرف إن فيه تحميل
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.textContent = 'جاري إنشاء الحساب... ⏳';
    submitBtn.disabled = true;

    // تجميع البيانات من الحقول
    const studentData = {
        fullName: document.getElementById('fullName').value,
        studentPhone: document.getElementById('studentPhone').value,
        parentPhone: document.getElementById('parentPhone').value,
        password: document.getElementById('password').value,
        grade: document.getElementById('grade').value,
        governorate: document.getElementById('governorate').value,
        address: document.getElementById('address').value,
        role: "student",
        walletBalance: 0,
        isBlocked: false,
        deviceId: "", 
        createdAt: new Date().toISOString() // تسجيل وقت وتاريخ إنشاء الحساب
    };

    try {
        // رفع البيانات لمجلد users في Firestore
        const docRef = await addDoc(collection(db, "users"), studentData);
        console.log("تم التسجيل برقم ID: ", docRef.id);

      const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzexynePg71_RsL1F2-d80Mev2JM78UsMT1Y2ZNr684Sp3B1bE67JfwI_I2d34-NwFm/exec"; 
        
        fetch(WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "welcome",
                phone: studentData.studentPhone, // هيبعت للطالب (ممكن تخليها parentPhone لو عايز ولي الأمر)
                password: studentData.password,
                name: studentData.fullName
            })
        }).catch(err => console.error("مشكلة في إرسال الواتساب:", err));
// إظهار نافذة النجاح بدل الـ alert
        const successModal = document.getElementById('successModal');
        successModal.classList.add('active');        
    } catch (error) {
        console.error("حصل مشكلة: ", error);
        alert("حصلت مشكلة في التسجيل. تأكد من اتصالك بالإنترنت وتصاريح قاعدة البيانات.");
    } finally {
        // إرجاع الزرار لشكله الطبيعي
        submitBtn.textContent = 'إنشاء الحساب الآن';
        submitBtn.disabled = false;
    }
});
