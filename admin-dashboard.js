import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 1. حماية لوحة الأدمن (ممنوع الدخول بدون تسجيل)
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.replace('admin-login.html');
}

// زرار تسجيل الخروج
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminId');
    window.location.replace('admin-login.html');
});

// 2. إعدادات الصوت (صوت كاشير/تنبيه شيك)
// لينك لصوت إشعار خفيف واحترافي
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// تفعيل الصوت بضغطة زر (لتخطي حظر المتصفح)
document.getElementById('enableSoundBtn').addEventListener('click', function() {
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        this.innerHTML = '<i class="fas fa-check-circle"></i> تم تفعيل الصوت';
        this.style.background = 'rgba(16, 185, 129, 0.1)';
        this.style.color = '#10b981';
    }).catch(err => console.log("مشكلة في تفعيل الصوت:", err));
});

// دالة إظهار التنبيه الأخضر المنبثق
function showLiveToast(studentName) {
    const toast = document.getElementById('liveToast');
    document.getElementById('toastMessage').textContent = `الطالب: ${studentName}`;
    toast.classList.add('show');
    
    // إخفاء التنبيه بعد 4 ثواني
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// 3. المراقبة اللحظية (Real-time Listener) للطلاب
let isInitialLoad = true; // متغير عشان نعرف إن دي أول مرة الصفحة بتحمل
let totalStudents = 0;

const usersRef = collection(db, "users");
// بنرتب الطلاب بالأحدث (عشان كده يفضل تضيف حقل joinDate في إنشاء الحساب)
const q = query(usersRef); 

onSnapshot(q, (snapshot) => {
    // تحديث إجمالي الطلاب
    totalStudents = snapshot.size;
    document.getElementById('totalStudentsCount').textContent = totalStudents;

    // استخراج التغييرات اللي حصلت
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const student = change.doc.data();
            
            // لو دي مش أول تحميل للصفحة (يعني طالب جديد دخل بجد دلوقتي)
            if (!isInitialLoad) {
                // اضرب الصوت 🔔
                notificationSound.play().catch(e => console.log("الصوت محتاج تفعيل من الزرار"));
                // طلع الإشعار
                showLiveToast(student.fullName || "طالب جديد");
            }
        }
    });

    // تحديث جدول أحدث الطلاب (هنجيب آخر 10 طلاب مثلاً نعرضهم)
    // عشان نعرضهم صح بنحول الـ Docs لـ Array ونعكسه عشان الجديد يبان فوق
    const studentsArray = [];
    snapshot.forEach((doc) => { studentsArray.push(doc.data()); });
    
    const tableBody = document.getElementById('recentStudentsTable');
    tableBody.innerHTML = '';
    
    // نعرض آخر 10 طلاب انضموا
    studentsArray.reverse().slice(0, 10).forEach(student => {
        const tr = document.createElement('tr');
        // تنسيق حالة المحفظة
        const walletText = student.walletBalance > 0 ? `<span style="color:#10b981;">${student.walletBalance} ج.م</span>` : `0 ج.م`;
        
        // ترجمة المرحلة
        let gradeAr = student.grade;
        if(student.grade === 'sec3') gradeAr = 'الثالث الثانوي';
        else if(student.grade === 'prep3') gradeAr = 'الثالث الإعدادي';
        
        tr.innerHTML = `
            <td><strong>${student.fullName || 'غير محدد'}</strong></td>
            <td style="color: #f59e0b;">${student.studentPhone || '-'}</td>
            <td>${gradeAr || '-'}</td>
            <td>${walletText}</td>
            <td style="color: #94a3b8; font-size: 13px;">الآن</td>
        `;
        tableBody.appendChild(tr);
    });

    // بعد ما نعالج كل الداتا القديمة، بنقوله إن التحميل الأولي خلص
    isInitialLoad = false;
});
