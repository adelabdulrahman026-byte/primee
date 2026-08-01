import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id') ? urlParams.get('id').trim() : null;

const loggedInPhone = localStorage.getItem('studentPhone');
const securityOverlay = document.getElementById('securityOverlay');

let currentStudentId = null;

if (!loggedInPhone || !courseId) {
    window.location.replace("login.html");
} else {
    document.getElementById('studentWatermark').textContent = loggedInPhone;
    verifyAccessAndLoadCourse();
}

async function verifyAccessAndLoadCourse() {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", loggedInPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            window.location.replace("login.html");
            return;
        }

        const studentData = querySnapshot.docs[0].data();
        currentStudentId = querySnapshot.docs[0].id;
        const myCourses = studentData.myCourses || [];
        const completedExams = studentData.completedExams || []; 

        // التحقق من امتلاك الكورس مع عرض كود التصحيح لو حصلت مشكلة
        if (!myCourses.includes(courseId)) {
            securityOverlay.style.display = 'flex';
            
            document.querySelector('.security-box p').innerHTML = 
                `يجب شراء هذه الحصة أولاً.<br><br>
                <span style="color:#f59e0b; font-size:14px; display:block; margin-top:15px; direction:ltr;">
                <strong>Debug Info:</strong><br>
                Requested Course: [${courseId}]<br>
                Your Courses: [${myCourses.join(", ")}]
                </span>`;
            return; 
        }

        securityOverlay.style.display = 'none';

        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            document.getElementById('courseTitleHeader').textContent = courseData.title;
            document.getElementById('courseTitle').textContent = courseData.title;
            document.getElementById('courseInstructor').innerHTML = `<i class="fas fa-chalkboard-teacher"></i> ${courseData.instructor}`;
            
            if (courseData.description) {
                document.getElementById('courseDescription').textContent = courseData.description;
            }

            // التحقق من الامتحان الإجباري
            if (courseData.requiresExam === true && !completedExams.includes(courseId)) {
                document.getElementById('examLockOverlay').style.display = 'flex';
                document.getElementById('videoContainer').style.display = 'none';
                
                document.getElementById('startExamBtn').onclick = async () => {
                    alert("سيتم تحويلك لصفحة الامتحان... (تخيل إنك حليته ونجحت! 🥳)");
                    
                    await updateDoc(doc(db, "users", currentStudentId), {
                        completedExams: arrayUnion(courseId)
                    });
                    
                    alert("تم اجتياز الامتحان بنجاح! سيتم فتح الفيديو الآن.");
                    location.reload(); 
                };
                return; 
            }

            const videoUrl = courseData.videoUrl || "";
            const videoContainer = document.getElementById('videoContainer');
            const watermark = document.getElementById('studentWatermark');

            let isPlyr = false;

            // 🧠 التعديل الذكي: أي رابط فيديو هيشتغل جوه البلاير الشيك من غير مشاكل
            if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
                videoContainer.innerHTML = `<div id="player" data-plyr-provider="youtube" data-plyr-embed-id="${videoUrl}"></div>`;
                isPlyr = true;
            } else if (videoUrl.includes("vimeo.com")) {
                videoContainer.innerHTML = `<div id="player" data-plyr-provider="vimeo" data-plyr-embed-id="${videoUrl}"></div>`;
                isPlyr = true;
            } else if (videoUrl !== "") {
                // أي رابط مباشر أو رابط مخزن هيشتغل باحترافية جوه Plyr
                videoContainer.innerHTML = `
                    <video id="player" playsinline controls>
                        <source src="${videoUrl}" type="video/mp4" />
                    </video>`;
                isPlyr = true;
            } else {
                videoContainer.innerHTML = "لا يوجد رابط فيديو مسجل لهذه الحصة.";
            }

            // تفعيل Plyr والإعدادات الصارمة لمنع اليوتيوب والدعامات
            if (isPlyr) {
                const player = new Plyr('#player', {
                    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                    i18n: { speed: 'السرعة', normal: 'عادي' },
                    youtube: { 
                        noCookie: true, 
                        rel: 0, 
                        showinfo: 0, 
                        modestbranding: 1,
                        iv_load_policy: 3
                    }
                });

                // بعد ما المشغل يجهز، هنزرع العلامة المائية والدرع الشفاف لليوتيوب
                player.on('ready', () => {
                    const plyrContainer = document.querySelector('.plyr');
                    if (plyrContainer) {
                        // 1. إضافة العلامة المائية جوا البلاير عشان تظهر في الشاشة الكاملة
                        if (watermark) {
                            plyrContainer.appendChild(watermark);
                        }
                        
                        // 2. الدرع الشفاف لمنع النقر على عنوان اليوتيوب
                        const ytShield = document.createElement('div');
                        ytShield.style.position = 'absolute';
                        ytShield.style.top = '0';
                        ytShield.style.left = '0';
                        ytShield.style.width = '100%';
                        ytShield.style.height = '80px';
                        ytShield.style.zIndex = '50'; 
                        plyrContainer.appendChild(ytShield);
                    }
                });
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
