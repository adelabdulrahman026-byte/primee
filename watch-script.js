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
const courseId = urlParams.get('id');

const loggedInPhone = localStorage.getItem('studentPhone');
const securityOverlay = document.getElementById('securityOverlay');

let currentStudentId = null;

if (!loggedInPhone || !courseId) {
    window.location.replace("login.html");
} else {
    // تشغيل العلامة المائية برقم الموبايل
    document.getElementById('studentWatermark').textContent = loggedInPhone;
    verifyAccessAndLoadCourse();
}

async function verifyAccessAndLoadCourse() {
    try {
        // 1. جلب بيانات الطالب
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
        const completedExams = studentData.completedExams || []; // الامتحانات اللي الطالب حلها

        // التأكد من امتلاك الحصة
        if (!myCourses.includes(courseId)) {
            securityOverlay.style.display = 'flex';
            return; 
        }

        securityOverlay.style.display = 'none';

        // 2. جلب بيانات الحصة
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

            // 🧠 3. التحقق من الامتحان الإجباري
            if (courseData.requiresExam === true && !completedExams.includes(courseId)) {
                // لو فيه امتحان والطالب لسه مخلصوش، نظهر شاشة القفل ونخفي الفيديو
                document.getElementById('examLockOverlay').style.display = 'flex';
                document.getElementById('videoContainer').style.display = 'none';
                
                // برمجة زرار بدء الامتحان (مؤقتاً بيعمل محاكاة للنجاح)
                document.getElementById('startExamBtn').onclick = async () => {
                    // هنا المفروض نحوله لصفحة الامتحان (مثال: window.location.href = `exam.html?id=${courseId}`)
                    // بس حالياً هنعمله ينجح أوتوماتيك عشان تجرب النظام
                    alert("سيتم تحويلك لصفحة الامتحان... (تخيل إنك حليته ونجحت! 🥳)");
                    
                    await updateDoc(doc(db, "users", currentStudentId), {
                        completedExams: arrayUnion(courseId)
                    });
                    
                    alert("تم اجتياز الامتحان بنجاح! سيتم فتح الفيديو الآن.");
                    location.reload(); // بنعمل ريفريش عشان الفيديو يفتح
                };
                return; // بنوقف الكود هنا عشان الفيديو ميشتغلش
            }

            // 🎬 4. تركيب مشغل الفيديو الاحترافي (Plyr)
         // 🎬 4. تركيب مشغل الفيديو الذكي (يوتيوب، ڤيميو، MP4، درايف)
            const videoUrl = courseData.videoUrl || "";
            const videoContainer = document.getElementById('videoContainer');
            const watermark = document.getElementById('studentWatermark');

            let isPlyr = false;

            if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
                // مشغل يوتيوب
                videoContainer.innerHTML = `<div id="player" data-plyr-provider="youtube" data-plyr-embed-id="${videoUrl}"></div>`;
                isPlyr = true;
            } else if (videoUrl.includes("vimeo.com")) {
                // مشغل ڤيميو
                videoContainer.innerHTML = `<div id="player" data-plyr-provider="vimeo" data-plyr-embed-id="${videoUrl}"></div>`;
                isPlyr = true;
            } else if (videoUrl.endsWith(".mp4") || videoUrl.includes("firebasestorage")) {
                // مشغل الفيديوهات المباشرة
                videoContainer.innerHTML = `
                    <video id="player" playsinline controls>
                        <source src="${videoUrl}" type="video/mp4" />
                    </video>`;
                isPlyr = true;
            } else if (videoUrl !== "") {
                // أي رابط تاني زي جوجل درايف (Embed)
                videoContainer.innerHTML = `<iframe src="${videoUrl}" allowfullscreen allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>`;
            } else {
                videoContainer.innerHTML = "لا يوجد رابط فيديو مسجل لهذه الحصة.";
            }

            // تفعيل Plyr وزرع العلامة المائية جواه عشان تظهر في الشاشة الكاملة
            if (isPlyr) {
                const player = new Plyr('#player', {
                    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                    i18n: { speed: 'السرعة', normal: 'عادي' }
                });

                // السحر هنا: بننقل العلامة المائية جوه المشغل نفسه بعد ما يحمل
                player.on('ready', () => {
                    const plyrContainer = document.querySelector('.plyr');
                    if (plyrContainer && watermark) {
                        plyrContainer.appendChild(watermark);
                    }
                });
            }
