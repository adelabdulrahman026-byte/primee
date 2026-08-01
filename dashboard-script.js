import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. إعدادات قاعدة البيانات الخاصة بك
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

// 2. نظام الحماية (Route Guard)
const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    console.log("لا يوجد رقم مسجل، جاري التحويل لصفحة الدخول...");
    window.location.replace("login.html");
} else {
    console.log("الرقم المسجل حالياً هو: ", loggedInPhone);
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
            console.log("تم جلب البيانات بنجاح: ", userData); // للتأكد من البيانات
            
            // استخراج الاسم
            const fullName = userData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            // عرض البيانات
            document.getElementById('studentNameDisplay').textContent = fullName;
            document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            
            // عرض المحفظة
            const balance = userData.walletBalance || 0; 
            document.getElementById('walletBalance').textContent = balance;
            
        } else {
            console.log("لم يتم العثور على بيانات هذا الرقم في القاعدة.");
            document.getElementById('studentNameDisplay').textContent = "حساب غير معروف";
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات من فايربيز:", error);
        document.getElementById('studentNameDisplay').textContent = "خطأ في الاتصال";
    }
}

// 4. برمجة زرار تسجيل الخروج
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('studentPhone');
        localStorage.removeItem('primeeDeviceToken');
        localStorage.removeItem('loggedInUserId');
        window.location.replace("login.html");
    });
}
