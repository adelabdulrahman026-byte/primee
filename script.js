// 1. استدعاء مكتبات فايربيز
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
  authDomain: "academy-444b6.firebaseapp.com",
  projectId: "academy-444b6",
  storageBucket: "academy-444b6.firebasestorage.app",
  messagingSenderId: "1079254330731",
  appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e",
  measurementId: "G-TQBXQ48M2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
        
        alert("تم إنشاء الحساب بنجاح في الأكاديمية! 🚀");
        registerForm.reset(); // تفريغ الخانات بعد النجاح
        
    } catch (error) {
        console.error("حصل مشكلة: ", error);
        alert("حصلت مشكلة في التسجيل. تأكد من اتصالك بالإنترنت وتصاريح قاعدة البيانات.");
    } finally {
        // إرجاع الزرار لشكله الطبيعي
        submitBtn.textContent = 'إنشاء الحساب الآن';
        submitBtn.disabled = false;
    }
});
