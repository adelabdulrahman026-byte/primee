import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// استخراج رقم الكورس من الرابط (مثال: course-details.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

const loggedInPhone = localStorage.getItem('studentPhone');
const securityOverlay = document.getElementById('securityOverlay');

if (!loggedInPhone || !courseId) {
    // لو مش مسجل دخول أو مفيش كورس في الرابط
    window.location.replace("login.html");
} else {
    verifyAccessAndLoadCourse();
}

async function verifyAccessAndLoadCourse() {
    try {
        // 1. جلب بيانات الطالب للتحقق من الملكية
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", loggedInPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            window.location.replace("login.html");
            return;
        }

        const studentData = querySnapshot.docs[0].data();
        const myCourses = studentData.myCourses || [];

        // 🧠 نظام الحماية الأهم: التأكد إن الكورس ده موجود في قائمة ممتلكاته
        if (!myCourses.includes(courseId)) {
            // لو مش معاه الكورس، نظهر شاشة الحماية الحمرا (غير مصرح)
            securityOverlay.style.display = 'flex';
            return; 
        }

        // لو معاه الكورس، نخفي شاشة الحماية ونجيب الداتا
        securityOverlay.style.display = 'none';

        // 2. جلب بيانات الكورس من قاعدة البيانات
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            // تعبئة البيانات في الصفحة
            document.getElementById('courseTitleHeader').textContent = courseData.title;
            document.getElementById('courseTitle').textContent = courseData.title;
            document.getElementById('courseInstructor').innerHTML = `<i class="fas fa-chalkboard-teacher"></i> ${courseData.instructor}`;
            
            if (courseData.description) {
                document.getElementById('courseDescription').textContent = courseData.description;
            }

            // تضمين الفيديو (iframe)
            if (courseData.videoUrl) {
                document.getElementById('videoContainer').innerHTML = `<iframe src="${courseData.videoUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
            } else {
                document.getElementById('videoContainer').innerHTML = "لا يوجد رابط فيديو مسجل لهذه الحصة.";
            }

        } else {
            alert("هذه الحصة لم تعد موجودة.");
            window.location.replace("student-dashboard.html");
        }

    } catch (error) {
        console.error("خطأ:", error);
        alert("حدث خطأ في تحميل بيانات الحصة.");
    }
}
