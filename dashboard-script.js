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

// 2. نظام الحماية (Route Guard) وتشغيل الدوال
const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    console.log("لا يوجد رقم مسجل، جاري التحويل لصفحة الدخول...");
    window.location.replace("login.html");
} else {
    console.log("الرقم المسجل حالياً هو: ", loggedInPhone);
    // جلب بيانات الطالب
    fetchStudentData(loggedInPhone);
    // 👇 ده السطر اللي ضفناه عشان يجيب الكورسات أول ما الصفحة تفتح
    fetchCourses(); 
}

// 3. دالة جلب وعرض بيانات الطالب
async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log("تم جلب البيانات بنجاح: ", userData); 
            
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

// 4. دالة جلب الكورسات من قاعدة البيانات
async function fetchCourses() {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">جاري تحميل المواد... ⏳</p>';

    try {
        const coursesRef = collection(db, "courses");
        const querySnapshot = await getDocs(coursesRef);

        if (querySnapshot.empty) {
            coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">لا توجد مواد متاحة حالياً.</p>';
            return;
        }

        coursesGrid.innerHTML = ''; // تفريغ رسالة التحميل

        querySnapshot.forEach((doc) => {
            const course = doc.data();
            const courseId = doc.id;

            const courseCard = `
                <div class="modern-course-card">
                    <div class="card-img" style="background-image: url('${course.image || ''}'); background-size: cover; background-position: center; background-color: #e2e8f0;">
                        <span class="badge">${course.badge || 'جديد'}</span>
                    </div>
                    <div class="card-body">
                        <h4>${course.title || 'اسم المادة'}</h4>
                        <p class="instructor"><i class="fas fa-chalkboard-teacher"></i> ${course.instructor || 'أستاذ المادة'}</p>
                        <div class="card-footer">
                            <button class="btn-enter-course" onclick="enterCourse('${courseId}')">دخول الحصة</button>
                        </div>
                    </div>
                </div>
            `;
            coursesGrid.innerHTML += courseCard;
        });

    } catch (error) {
        console.error("خطأ في جلب الكورسات:", error);
        coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:red;">حدث خطأ أثناء تحميل المواد.</p>';
    }
}

// دالة تجريبية لزرار دخول الحصة
window.enterCourse = function(courseId) {
    alert("سيتم توجيهك لصفحة الحصة رقم: " + courseId);
};

// 5. برمجة زرار تسجيل الخروج
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // بنمسح بيانات الجلسة بس
        localStorage.removeItem('studentPhone');
        localStorage.removeItem('loggedInUserId');
        
        // مش بنمسح بصمة الجهاز (primeeDeviceToken) عشان يفضل مسجل
        
        window.location.replace("login.html");
    });
}
