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

// دوال التنبيهات
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}
window.closeAlertModal = () => { document.getElementById('alertModal').classList.remove('active'); };

// دالة الرفع على Cloudflare R2
async function uploadImageToR2(file) {
    const formData = new FormData();
    formData.append("image", file);
    try {
        const response = await fetch("https://primee-api.adelabdulrahman026.workers.dev/upload-image", {
            method: "POST", body: formData
        });
        const data = await response.json();
        if (data.success) return data.url;
        throw new Error(data.error);
    } catch (error) {
        throw new Error("فشل رفع الصورة، تأكد من اتصالك بالإنترنت.");
    }
}

// توليد OTP وإرساله عبر WaPilot
let generatedOTP = "";
let pendingUserData = {};

async function sendWhatsAppOTP(phone, otpCode) {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;
        
        const keys = docSnap.data();
        let formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
        let chatId = formattedPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        
        const msg = `مرحباً بك في منصة Primee Academy 🚀\n\nكود التأكيد الخاص بك هو: *${otpCode}*\n\nلا تشارك هذا الكود مع أحد حفاظاً على سرية حسابك.`;
        
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });
        return true;
    } catch (e) { return false; }
}

// 1. عند الضغط على إنشاء حساب (نرسل الـ OTP أولاً)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    const imageFile = document.getElementById('profilePic').files[0];
    if (!imageFile) return showAlert('تنبيه', 'يجب رفع الصورة الشخصية لإتمام التسجيل.');

    const phone = document.getElementById('studentPhone').value.trim();
    if (phone.length < 11) return showAlert('تنبيه', 'رقم الهاتف غير صحيح.');

    btn.innerHTML = "جاري التحقق... ⏳"; btn.disabled = true;

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
            address: document.getElementById('address').value.trim(),
            file: imageFile
        };

        // توليد 4 أرقام عشوائية
        generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
        
        // إرسال الواتساب
        await sendWhatsAppOTP(phone, generatedOTP);
        
        // فتح نافذة الـ OTP
        document.getElementById('displayOtpPhone').textContent = phone;
        document.getElementById('otpModal').classList.add('active');
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();

    } catch (error) {
        showAlert('خطأ', 'حدث خطأ، يرجى المحاولة لاحقاً.');
    } finally {
        btn.innerHTML = "إنشاء الحساب الآن"; btn.disabled = false;
    }
});

// 2. عند إدخال الـ OTP والتأكيد
document.getElementById('btnVerifyOtp').addEventListener('click', async () => {
    const inputOtp = document.getElementById('otpInput').value;
    if (inputOtp !== generatedOTP) {
        document.getElementById('otpInput').style.borderColor = '#ef4444';
        return; // الكود غلط
    }

    const btn = document.getElementById('btnVerifyOtp');
    btn.innerHTML = "جاري تجهيز الحساب... 🚀"; btn.disabled = true;

    try {
        // 1. رفع الصورة على Cloudflare R2
        const profilePicUrl = await uploadImageToR2(pendingUserData.file);

        // 2. إنشاء الحساب الرسمي المشفر في Firebase Auth
        const fakeEmail = pendingUserData.studentPhone + "@primee.com";
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pendingUserData.password);
        const user = userCredential.user;

        // 3. حفظ باقي البيانات في Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: pendingUserData.fullName,
            studentPhone: pendingUserData.studentPhone,
            parentPhone: pendingUserData.parentPhone,
            grade: pendingUserData.grade,
            governorate: pendingUserData.governorate,
            address: pendingUserData.address,
            profilePicUrl: profilePicUrl,
            walletBalance: 0,
            isBlocked: false,
            createdAt: new Date().toISOString()
        });

        document.getElementById('otpModal').classList.remove('active');
        document.getElementById('successModal').classList.add('active'); // إظهار النجاح

    } catch (error) {
        document.getElementById('otpModal').classList.remove('active');
        showAlert('خطأ', 'حدث خطأ أثناء إنشاء الحساب، ربما تم التسجيل من قبل.');
    } finally {
        btn.innerHTML = "تأكيد الكود وإنشاء الحساب"; btn.disabled = false;
    }
});
