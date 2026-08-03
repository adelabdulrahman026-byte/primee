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

function showAlert(title, message) {
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertModal = document.getElementById('alertModal');
    
    if(alertTitle) alertTitle.textContent = title;
    if(alertMessage) alertMessage.textContent = message;
    if(alertModal) alertModal.classList.add('active');
}

window.closeAlertModal = function() {
    const alertModal = document.getElementById('alertModal');
    if(alertModal) alertModal.classList.remove('active');
};

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'جاري التحقق... ⏳';
        submitBtn.disabled = true;

        // استخراج البيانات من الفورم (تأكد إن الأيديهات دي مطابقة للي في الـ HTML بتاعك)
        const phone = document.getElementById('registerPhone').value;
        const fullName = document.getElementById('registerName').value;
        const password = document.getElementById('registerPassword').value;

        try {
            // 1. فحص هل الرقم ده موجود في الداتا بيز ولا لأ؟
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("studentPhone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // لو لقى الرقم موجود، بنوقف التسجيل ونطلع رسالة
                showAlert("عذراً ⚠️", "رقم الهاتف ده مسجل بيه حساب قبل كده. تقدر تسجل دخول، أو استخدم رقم تاني.");
                submitBtn.textContent = 'إنشاء الحساب';
                submitBtn.disabled = false;
                return; // بتوقف الدالة هنا ومبتكملش
            }

            // 2. الكود مش هينزل هنا إلا لو الرقم جديد ومش متسجل قبل كده
            await addDoc(collection(db, "users"), {
                studentPhone: phone,
                fullName: fullName,
                password: password,
                myCourses: [],
                completedExams: [],
                deviceId: "", // بنسيبه فاضي عشان يتبصم أول ما يسجل دخول
                walletBalance: 0,
                isBlocked: false
            });

            showAlert("نجاح", "تم إنشاء الحساب بنجاح! سيتم تحويلك لتسجيل الدخول.");
            setTimeout(() => { window.location.replace("login.html"); }, 2000);

        } catch (error) {
            console.error("خطأ:", error);
            showAlert("مشكلة تقنية", "حدث خطأ أثناء الاتصال بقاعدة البيانات.");
            submitBtn.textContent = 'إنشاء الحساب';
            submitBtn.disabled = false;
        }
    });
}
