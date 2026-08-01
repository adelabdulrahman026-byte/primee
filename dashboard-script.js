import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentStudentData = null;
let currentStudentId = null;

const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    window.location.replace("login.html");
} else {
    fetchStudentData(loggedInPhone);
}

async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            currentStudentId = querySnapshot.docs[0].id;
            currentStudentData = querySnapshot.docs[0].data();
            
            if (!currentStudentData.myCourses) currentStudentData.myCourses = [];
            if (!currentStudentData.completedExams) currentStudentData.completedExams = [];

            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            document.getElementById('studentNameDisplay').textContent = fullName;
            document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            document.getElementById('walletBalance').textContent = currentStudentData.walletBalance || 0;
            
            // تحديث الإحصائيات
            document.getElementById('statCoursesCount').textContent = currentStudentData.myCourses.length;
            document.getElementById('statExamsCount').textContent = currentStudentData.completedExams.length;

            // جلب موادي الدراسية فقط
            fetchMyCourses(currentStudentData.myCourses);
            
            // جلب الدرجات (لو فيه درجات متسجلة، لو مفيش هنحط رسالة وهمية مؤقتاً)
            renderGrades(currentStudentData.completedExams);

        } else {
            window.location.replace("login.html");
        }
    } catch (error) {
        console.error("خطأ:", error);
    }
}

async function fetchMyCourses(myCourseIds) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    
    if (myCourseIds.length === 0) {
        coursesGrid.innerHTML = `
            <div style="text-align:center; width:100%; padding: 40px; background: #fff; border-radius: 16px;">
                <i class="fas fa-folder-open" style="font-size: 40px; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #64748b; margin:0;">لم تقم بشراء أي مواد بعد</h3>
                <p style="color: #94a3b8; font-size: 14px;">تصفح الصفحة الرئيسية لشراء الحصص الجديدة.</p>
            </div>`;
        return;
    }

    coursesGrid.innerHTML = '<p style="text-align:center; width:100%;">جاري تحميل موادك... ⏳</p>';

    try {
        coursesGrid.innerHTML = ''; 
        
        // جلب تفاصيل كل كورس الطالب اشتراه
        for (const courseId of myCourseIds) {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            
            if (courseSnap.exists()) {
                const course = courseSnap.data();
                const courseCard = `
                    <div class="modern-course-card">
                        <div class="card-img" style="background-image: url('${course.image || ''}'); background-size: cover; background-position: center;">
                            <span class="badge owned-badge">مملوك</span>
                        </div>
                        <div class="card-body">
                            <h4>${course.title || 'اسم المادة'}</h4>
                            <p class="instructor"><i class="fas fa-chalkboard-teacher"></i> ${course.instructor || 'أستاذ المادة'}</p>
                            <div class="card-footer">
                                <button class="btn-enter-course btn-owned" onclick="window.location.href='course-details.html?id=${courseId}'">
                                    دخول الحصة 🚀
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                coursesGrid.innerHTML += courseCard;
            }
        }
    } catch (error) {
        console.error("خطأ في جلب كورساتي:", error);
    }
}

// دالة عرض تقرير الدرجات
function renderGrades(completedExams) {
    const tableBody = document.getElementById('gradesTableBody');
    
    if (completedExams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">لم تجتز أي امتحانات حتى الآن.</td></tr>`;
        return;
    }

    // لأننا لسه مبرمجناش نظام الامتحانات الفعلي، هنعمل محاكاة للدرجات بناءً على الكورسات اللي امتحنها
    tableBody.innerHTML = '';
    completedExams.forEach((examId, index) => {
        // دي داتا مؤقتة لحد ما نبرمج صفحة الامتحان الفعلي
        const score = Math.floor(Math.random() * (100 - 60 + 1)) + 60; // رقم عشوائي بين 60 و 100
        const statusClass = score >= 50 ? 'status-pass' : 'status-fail';
        const statusText = score >= 50 ? 'ناجح' : 'راسب';
        
        tableBody.innerHTML += `
            <tr>
                <td><strong>امتحان حصة رقم ${examId.substring(0,4)}</strong></td>
                <td>اليوم</td>
                <td style="color: var(--primary-color); font-weight: 800;">${score}%</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.replace("login.html");
    });
}
