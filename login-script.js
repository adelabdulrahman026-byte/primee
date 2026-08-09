import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}
window.closeAlertModal = () => { document.getElementById('alertModal').classList.remove('active'); };

// إظهار/إخفاء الباسوورد
document.getElementById('togglePassword')?.addEventListener('click', function () {
    const passwordInput = document.getElementById('loginPassword');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;

    btn.innerHTML = "جاري التحقق... ⏳"; btn.disabled = true;

    try {
        // تحويل الرقم لإيميل وهمي للدخول
        const fakeEmail = phone + "@primee.com";
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
        const uid = userCredential.user.uid;

        // جلب بيانات الطالب من الداتا بيز
        const userDoc = await getDoc(doc(db, "users", uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.isBlocked) {
                auth.signOut();
                btn.innerHTML = "دخول للمنصة"; btn.disabled = false;
                return showAlert('عذراً', 'حسابك محظور حالياً، يرجى التواصل مع الإدارة.');
            }

            // حفظ البيانات الأساسية سريعاً للتصفح
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('studentId', uid);
            localStorage.setItem('studentName', userData.fullName);
            localStorage.setItem('studentPhone', userData.studentPhone);
            
            window.location.replace('index.html'); // تحويل للرئيسية
        } else {
            throw new Error("بيانات غير مكتملة");
        }
    } catch (error) {
        showAlert('خطأ', 'رقم الهاتف أو كلمة المرور غير صحيحة.');
        btn.innerHTML = "دخول للمنصة"; btn.disabled = false;
    }
});
