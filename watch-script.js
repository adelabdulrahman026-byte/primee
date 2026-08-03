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
import { onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// طرد الطالب فوراً لو تم حظره من الأدمن
const loggedInUserId = localStorage.getItem('loggedInUserId');
if (loggedInUserId) {
    onSnapshot(doc(db, "users", loggedInUserId), (docSnap) => {
        if (docSnap.exists() && docSnap.data().isBlocked === true) {
            localStorage.clear();
            alert("⚠️ تم إيقاف حسابك بواسطة الإدارة وسيتم تسجيل خروجك الآن.");
            window.location.replace("login.html");
        }
    });
}
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تأكد إن السكريبت بيشتغل بعد تحميل الـ HTML عشان ميضربش Error
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id') ? urlParams.get('id').trim() : null;
    const loggedInPhone = localStorage.getItem('studentPhone');

    if (!loggedInPhone || !courseId) {
        window.location.replace("login.html");
        return;
    }

    const watermark = document.getElementById('studentWatermark');
    if (watermark) {
        watermark.textContent = loggedInPhone;
    }

    verifyAccessAndLoadCourse(loggedInPhone, courseId);
});

function extractVimeoID(url) {
    if(!url) return null;
    const regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function verifyAccessAndLoadCourse(phone, courseId) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            window.location.replace("login.html");
            return;
        }

        const studentData = querySnapshot.docs[0].data();
        const currentStudentId = querySnapshot.docs[0].id;
        const myCourses = studentData.myCourses || [];
        const completedExams = studentData.completedExams || []; 

        const securityOverlay = document.getElementById('securityOverlay');
        const securityMessage = document.getElementById('securityMessage');

        // 1. نظام الحماية
        if (!myCourses.includes(courseId)) {
            if(securityOverlay) securityOverlay.style.display = 'flex';
            if(securityMessage) securityMessage.innerHTML = `يجب شراء هذه الحصة أولاً.<br><br><span style="color:#f59e0b; font-size:12px;">كود تصحيح: الكورس [${courseId}] غير موجود في حسابك.</span>`;
            return; 
        }

        if(securityOverlay) securityOverlay.style.display = 'none';

        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            // حقن البيانات بأمان
            const cTitleHeader = document.getElementById('courseTitleHeader');
            const cTitle = document.getElementById('courseTitle');
            const cInstructor = document.getElementById('courseInstructor');
            const cDesc = document.getElementById('courseDescription');

            if(cTitleHeader) cTitleHeader.textContent = courseData.title || "حصة بدون عنوان";
            if(cTitle) cTitle.textContent = courseData.title || "حصة بدون عنوان";
            if(cInstructor) cInstructor.textContent = courseData.instructor || "أستاذ المادة";
            if(cDesc && courseData.description) cDesc.textContent = courseData.description;

            // 2. نظام قفل الامتحان
            const examOverlay = document.getElementById('examLockOverlay');
            const vidContainer = document.getElementById('videoContainer');
            
            if (courseData.requiresExam === true && !completedExams.includes(courseId)) {
                if(examOverlay) examOverlay.style.display = 'flex';
                if(vidContainer) vidContainer.style.display = 'none';
                
                const startBtn = document.getElementById('startExamBtn');
                if(startBtn) {
                    startBtn.onclick = async () => {
                        alert("جارِ التحويل للامتحان...");
                        await updateDoc(doc(db, "users", currentStudentId), {
                            completedExams: arrayUnion(courseId)
                        });
                        alert("نجحت! سيتم فتح الفيديو.");
                        location.reload(); 
                    };
                }
                return;
            }

            // 3. مشغل Plyr مع Vimeo
            const videoUrl = courseData.videoUrl || "";
            const vimeoID = extractVimeoID(videoUrl);
            const watermarkElem = document.getElementById('studentWatermark'); 

            if (vimeoID && vidContainer) {
                vidContainer.innerHTML = `
                    <div class="plyr__video-embed" id="player">
                        <iframe
                            src="https://player.vimeo.com/video/${vimeoID}?loop=false&amp;byline=false&amp;portrait=false&amp;title=false&amp;speed=true&amp;transparent=0&amp;gesture=media"
                            allowfullscreen
                            allowtransparency
                            allow="autoplay">
                        </iframe>
                    </div>`;
                
                // تشغيل Plyr بعد ما الـ iframe يترسم بثانية عشان ميضربش
                setTimeout(() => {
                    const player = new Plyr('#player', {
                        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                        i18n: { speed: 'السرعة', normal: 'عادي' }
                    });

                    player.on('ready', () => {
                        const plyrContainer = document.querySelector('.plyr');
                        if (plyrContainer && watermarkElem) {
                            plyrContainer.appendChild(watermarkElem);
                        }
                    });
                }, 100);
            } else if(vidContainer) {
                vidContainer.innerHTML = `<p style="color:#ef4444; padding:30px; text-align:center; font-weight: 800;">رابط الفيديو غير متوفر أو غير صحيح.</p>`;
            }

        } else {
            alert("عذراً، هذه الحصة غير موجودة في قاعدة البيانات.");
            window.location.replace("student-dashboard.html");
        }

    } catch (error) {
        console.error("تفاصيل الخطأ:", error);
        alert("حدث خطأ في تحميل الحصة، يرجى تحديث الصفحة.");
    }
}
