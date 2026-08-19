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

// 🚨🚨 حط هنا رقم الواتساب بتاع المنصة 🚨🚨
const WAPILOT_PLATFORM_NUMBER = "201042650344"; 

// دوال التنبيهات
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}
window.closeAlertModal = () => { document.getElementById('alertModal').classList.remove('active'); };

let generatedOTP = "";
let pendingUserData = {};

// دالة الإرسال لـ WaPilot
async function sendWhatsAppOTP(phone, otpCode) {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;

        const keys = docSnap.data();
        let cleanPhone = phone.replace(/\D/g, ''); 
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        else if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

        let chatId = cleanPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;

        // 🚨 رسالة الـ OTP المطلوبة 🚨
        const msg = `مرحباً بك في منصة Primee Academy 🚀\n\nكود التفعيل الخاص بك هو: *${otpCode}*\n\nيرجى الرجوع لصفحة التسجيل وإدخال الـ OTP لإتمام إنشاء الحساب بنجاح.`;

        const response = await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });

        if (!response.ok) return false; 
        return true; 
    } catch (e) { 
        return false; 
    }
}

// 1. عند الضغط على إنشاء حساب (استكمال التفعيل)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const phone = document.getElementById('studentPhone').value.trim();
    const parentPhone = document.getElementById('parentPhone').value.trim();
    const isTermsChecked = document.getElementById('terms').checked;

    if (!isTermsChecked) return showAlert('تنبيه', 'يجب الموافقة على الشروط والأحكام للمنصة أولاً.');
    if (phone.length < 11 || parentPhone.length < 11) return showAlert('تنبيه', 'رقم الهاتف غير صحيح.');
    
    // 🚨 التأكد إن رقم الطالب وولي الأمر مش متطابقين 🚨
    if (phone === parentPhone) {
        return showAlert('خطأ', 'رقم ولي الأمر لا يمكن أن يكون مطابقاً لرقم الطالب.');
    }

    btn.innerHTML = "جاري التحقق... ⏳"; 
    btn.disabled = true;

    try {
        const q = query(collection(db, "users"), where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            btn.innerHTML = "استكمال تفعيل الحساب (اضغط هنا)"; btn.disabled = false;
            return showAlert('خطأ', 'رقم الهاتف هذا مسجل لدينا بالفعل!');
        }

        pendingUserData = {
            fullName: document.getElementById('fullName').value.trim(),
            studentPhone: phone,
            parentPhone: parentPhone,
            password: document.getElementById('password').value,
            grade: document.getElementById('grade').value,
            governorate: document.getElementById('governorate').value,
            address: document.getElementById('address').value.trim()
        };

        // 🚨 تجهيز لينك الواتس بكلمة "عايز افعل حسابي" 🚨
        const waMsg = encodeURIComponent("عايز افعل حسابي");
        const waLink = `https://wa.me/${WAPILOT_PLATFORM_NUMBER}?text=${waMsg}`;
        
        document.getElementById('waInitActionContainer').innerHTML = `
            <a id="btnSendWaInit" href="${waLink}" target="_blank" style="background: #25d366; color: #fff; padding: 15px; border-radius: 12px; text-decoration: none; font-weight: 800; display: block; font-family: 'Cairo'; transition: 0.3s; box-shadow: 0 10px 20px rgba(37, 211, 102, 0.2);">
                <i class="fab fa-whatsapp" style="margin-left: 5px;"></i> لتفعيل حسابك اضغط هنا
            </a>
            <button onclick="document.getElementById('waInitModal').classList.remove('active')" style="width: 100%; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; font-family: 'Cairo'; margin-top: 15px;">إلغاء</button>
        `;

        document.getElementById('btnSendWaInit').addEventListener('click', startAutoOTPProcess);
        document.getElementById('waInitModal').classList.add('active');

    } catch (error) {
        showAlert('خطأ', 'حدث خطأ، يرجى المحاولة لاحقاً.');
    } finally {
        btn.innerHTML = "استكمال تفعيل الحساب (اضغط هنا)"; btn.disabled = false;
    }
});

// 2. دالة المراقبة الأوتوماتيكية (Smart Polling)
function startAutoOTPProcess() {
    const container = document.getElementById('waInitActionContainer');
    
    container.innerHTML = `
        <div style="color: #3b82f6; margin: 20px 0;">
            <i class="fas fa-circle-notch fa-spin" style="font-size: 50px; margin-bottom: 15px;"></i>
            <h4 style="color: #f8fafc; margin-bottom: 5px; font-weight: 900;">في انتظار رسالتك...</h4>
            <p style="font-size: 13px; color: #94a3b8; font-weight: 600;">بمجرد إرسالك للرسالة على واتساب، سيظهر الكود هنا تلقائياً.</p>
        </div>
    `;

    generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
    
    let attempts = 0;
    const maxAttempts = 6; // المراقبة بتستمر لمدة 24 ثانية لحد ما الطالب يبعت

    const trySendOTP = async () => {
        attempts++;
        const isSent = await sendWhatsAppOTP(pendingUserData.studentPhone, generatedOTP);
        
        if (isSent) {
            document.getElementById('waInitModal').classList.remove('active');
            document.getElementById('displayOtpPhone').textContent = pendingUserData.studentPhone;
            document.getElementById('otpModal').classList.add('active');
            document.getElementById('otpInput').value = '';
            document.getElementById('otpInput').focus();
        } else {
            if (attempts < maxAttempts) {
                setTimeout(trySendOTP, 4000); 
            } else {
                container.innerHTML = `
                    <div style="color: #ef4444; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 15px;"></i>
                        <h4 style="color: #f8fafc; margin-bottom: 5px; font-weight: 900;">لم نتمكن من إرسال الكود!</h4>
                        <p style="font-size: 13px; color: #94a3b8; font-weight: 600;">يبدو أنك لم ترسل رسالة التفعيل بعد.</p>
                    </div>
                    <button id="btnRetryOTP" style="background: #10b981; color: #fff; border: none; padding: 15px; border-radius: 12px; font-weight: 900; font-family: 'Cairo'; cursor: pointer; width: 100%; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);">
                        <i class="fas fa-sync"></i> حاول مرة أخرى
                    </button>
                    <button onclick="document.getElementById('waInitModal').classList.remove('active')" style="width: 100%; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; font-family: 'Cairo'; margin-top: 10px;">إلغاء</button>
                `;
                document.getElementById('btnRetryOTP').addEventListener('click', startAutoOTPProcess);
            }
        }
    };

    setTimeout(trySendOTP, 5000);
}

// 3. تأكيد وإنشاء الحساب النهائي
document.getElementById('btnVerifyOtp').addEventListener('click', async () => {
    const inputOtp = document.getElementById('otpInput').value.trim();
    if (inputOtp !== generatedOTP) {
        document.getElementById('otpInput').style.borderColor = '#ef4444';
        return; 
    }

    const btn = document.getElementById('btnVerifyOtp');
    btn.innerHTML = "جاري تجهيز الحساب... 🚀"; btn.disabled = true;

    try {
        const fakeEmail = pendingUserData.studentPhone + "@primee.com";
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pendingUserData.password);
        const user = userCredential.user;

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
        document.getElementById('otpModal').classList.remove('active');
        let errorMsg = error.message; 
        if (error.code === 'auth/weak-password') errorMsg = "كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف أو أرقام على الأقل.";
        else if (error.code === 'auth/email-already-in-use') errorMsg = "هذا الحساب مسجل لدينا بالفعل.";
        showAlert('خطأ في التسجيل', errorMsg);
    } finally {
        btn.innerHTML = "تأكيد الكود وإنشاء الحساب"; btn.disabled = false;
    }
});
