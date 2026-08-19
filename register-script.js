import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6",
    storageBucket: "academy-444b6.firebasestorage.app",
    messagingSenderId: "1079254330731",
    appId: "1:1079254330731:web:5dec7df57b4d3dcca2f02e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🚨 رقم واتساب المنصة المربوط بـ WaPilot (استبدله برقمك) 🚨
const WAPILOT_PLATFORM_NUMBER = "201042650344"; 

// دوال التنبيهات
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}
window.closeAlertModal = () => { document.getElementById('alertModal').classList.remove('active'); };

// توليد OTP وإرساله عبر WaPilot
let generatedOTP = "";
let pendingUserData = {};

async function sendWhatsAppOTP(phone, otpCode) {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) {
            console.error("مفاتيح الـ API غير موجودة في قاعدة البيانات.");
            return false;
        }

        const keys = docSnap.data();
        
        // 🚨 تنظيف الرقم من أي مسافات أو حروف، وإضافة مفتاح مصر 🚨
        let cleanPhone = phone.replace(/\D/g, ''); 
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        else if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

        let chatId = cleanPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;

        const msg = `مرحباً بك في منصة Primee Academy 🚀\n\nكود التأكيد الخاص بك هو: *${otpCode}*\n\nلا تشارك هذا الكود مع أحد حفاظاً على سرية حسابك.`;

        const response = await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("خطأ من WaPilot:", errData);
            return false;
        }
        
        return true;
    } catch (e) { 
        console.error("فشل الاتصال بـ WaPilot:", e);
        return false; 
    }
}

// 1. عند الضغط على إنشاء حساب (نتأكد من الداتا ونفتح نافذة الواتساب)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const phone = document.getElementById('studentPhone').value.trim();
    if (phone.length < 11) return showAlert('تنبيه', 'رقم الهاتف غير صحيح.');

    btn.innerHTML = "جاري التحقق... ⏳"; 
    btn.disabled = true;

    try {
        // التأكد إن الرقم مش مسجل قبل كده
        const q = query(collection(db, "users"), where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            btn.innerHTML = "إنشاء الحساب الآن"; btn.disabled = false;
            return showAlert('خطأ', 'رقم الهاتف هذا مسجل لدينا بالفعل!');
        }

        // تجهيز بيانات الطالب
        pendingUserData = {
            fullName: document.getElementById('fullName').value.trim(),
            studentPhone: phone,
            parentPhone: document.getElementById('parentPhone').value.trim(),
            password: document.getElementById('password').value,
            grade: document.getElementById('grade').value,
            governorate: document.getElementById('governorate').value,
            address: document.getElementById('address').value.trim()
        };

        // 🚨 إخفاء زر طلب الكود وتجهيز لينك الواتساب 🚨
        const btnRequest = document.getElementById('btnRequestOTP');
        if(btnRequest) btnRequest.style.display = 'none';

        const waMsg = encodeURIComponent("طلب تفعيل حسابي في منصة Primee Academy");
        const waLinkBtn = document.getElementById('btnSendWaInit');
        if(waLinkBtn) {
            waLinkBtn.href = `https://wa.me/${WAPILOT_PLATFORM_NUMBER}?text=${waMsg}`;
        }
        
        // فتح نافذة إرسال التفعيل
        document.getElementById('waInitModal').classList.add('active');

    } catch (error) {
        console.error(error);
        showAlert('خطأ', 'حدث خطأ في النظام، يرجى المحاولة لاحقاً.');
    } finally {
        btn.innerHTML = "إنشاء الحساب الآن"; btn.disabled = false;
    }
});

// 2. إظهار زرار "أرسلت الرسالة" بعد ما الطالب يدوس على اللينك
document.getElementById('btnSendWaInit')?.addEventListener('click', () => {
    setTimeout(() => {
        document.getElementById('btnRequestOTP').style.display = 'block';
    }, 2000);
});

// 3. الطالب داس "ابعتلي الكود" (هنا بنولد الـ OTP ونبعت)
document.getElementById('btnRequestOTP')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnRequestOTP');
    const originalText = btn.innerHTML;
    btn.innerHTML = "جاري إرسال الكود... ⏳"; 
    btn.disabled = true;

    try {
        // توليد 4 أرقام عشوائية
        generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

        // إرسال الواتساب
        const isSent = await sendWhatsAppOTP(pendingUserData.studentPhone, generatedOTP);
        
        if (!isSent) {
            showAlert('عذراً', 'فشل إرسال كود التأكيد. يرجى التأكد من إرسال رسالة التفعيل أولاً للمنصة لفتح المحادثة.');
            btn.innerHTML = originalText; btn.disabled = false;
            return;
        }

        // إخفاء نافذة الواتس وفتح نافذة الـ OTP بتاعتك
        document.getElementById('waInitModal').classList.remove('active');
        
        document.getElementById('displayOtpPhone').textContent = pendingUserData.studentPhone;
        document.getElementById('otpModal').classList.add('active');
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();

    } catch (error) {
        showAlert('خطأ', 'حدث خطأ، يرجى المحاولة لاحقاً.');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
});

// 4. عند إدخال الـ OTP والتأكيد (نفس كودك الأصلي)
document.getElementById('btnVerifyOtp').addEventListener('click', async () => {
    const inputOtp = document.getElementById('otpInput').value.trim();
    if (inputOtp !== generatedOTP) {
        document.getElementById('otpInput').style.borderColor = '#ef4444';
        return; 
    }

    const btn = document.getElementById('btnVerifyOtp');
    btn.innerHTML = "جاري تجهيز الحساب... 🚀"; btn.disabled = true;

    try {
        // إنشاء الحساب الرسمي المشفر في Firebase Auth
        const fakeEmail = pendingUserData.studentPhone + "@primee.com";
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pendingUserData.password);
        const user = userCredential.user;

        // حفظ باقي البيانات في Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: pendingUserData.fullName,
            studentPhone: pendingUserData.studentPhone,
            parentPhone: pendingUserData.parentPhone,
            grade: pendingUserData.grade,
            governorate: pendingUserData.governorate,
            address: pendingUserData.address,
            walletBalance: 0,
            isBlocked: false,
            createdAt: new Date().toISOString()
        });

        document.getElementById('otpModal').classList.remove('active');
        document.getElementById('successModal').classList.add('active'); 

    } catch (error) {
        console.error("تفاصيل الخطأ:", error); 
        document.getElementById('otpModal').classList.remove('active');

        let errorMsg = error.message; 

        if (error.code === 'auth/weak-password') {
            errorMsg = "كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف أو أرقام على الأقل.";
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg = "هذا الحساب مسجل لدينا بالفعل.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMsg = "إعدادات الأمان تمنع التسجيل، تواصل مع الإدارة.";
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = "رقم الهاتف غير صحيح.";
        }

        showAlert('خطأ في التسجيل', errorMsg);
    } finally {
        btn.innerHTML = "تأكيد الكود وإنشاء الحساب"; 
        btn.disabled = false;
    }
});
