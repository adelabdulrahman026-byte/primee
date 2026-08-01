import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. إعدادات قاعدة البيانات بتاعتك
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

// 2. نظام الحماية (Route Guard) 🛡️
// بنسأل المتصفح: هل في طالب مسجل دخول دلوقتي؟
const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    // لو مفيش، اطرده لصفحة تسجيل الدخول فوراً
    window.location.replace("login.html");
} else {
    // لو فيه، ابدأ هات بياناته من فايربيز
    fetchStudentData(loggedInPhone);
}

// 3. دالة جلب وعرض بيانات الطالب
async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            // استخراج الاسم الأول بس عشان الترحيب يكون شيك (مثال: أهلاً بك يا أحمد)
            const firstName = userData.fullName.split(" ")[0]; 

            // عرض البيانات في الـ HTML
            document.getElementById('studentNameDisplay').textContent = userData.fullName;
            document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            
            // عرض رصيد المحفظة (لو لسه مفيش حقل محفظة في الداتا بيز هيعرض 0 أوتوماتيك)
            const balance = userData.walletBalance || 0; 
            document.getElementById('walletBalance').textContent = balance;
            
        } else {
            // لو الرقم اتمسح من الداتا بيز لأي سبب، نخرجه
            logoutUser();
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
}

// 4. برمجة زرار تسجيل الخروج 🚪
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
}

function logoutUser() {
    // نمسح بيانات الطالب من الذاكرة
    localStorage.removeItem('studentPhone');
    // نرجعه لصفحة الدخول
    window.location.replace("login.html");
}
