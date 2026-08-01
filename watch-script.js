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

// دالة استخراج الـ ID بتاع فيديو ڤيميو من أي رابط
function extractVimeoID(url) {
    const regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const match = url.match(regex);
    return match ? match[1] : null;
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

        if (!myCourses.includes(courseId)) {
            securityOverlay.style.display = 'flex';
            document.getElementById('securityMessage').innerHTML = `يجب شراء هذه الحصة أولاً.<br><br><span style="color:#f59e0b; font-size:12px;">كود تصحيح: الكورس [${courseId}] غير موجود في حسابك.</span>`;
            return; 
        }

        securityOverlay.style.display = 'none';

        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            document.getElementById('courseTitleHeader').textContent = courseData.title;
            document.getElementById('courseTitle').textContent = courseData.title;
            document.getElementById('courseInstructor').textContent = courseData.instructor || "أستاذ المادة";
            
            if (courseData.description) {
                document.getElementById('courseDescription').textContent = courseData.description;
            }

            // التحقق من الامتحان
            if (courseData.requiresExam === true && !completedExams.includes(courseId)) {
                document.getElementById('examLockOverlay').style.display = 'flex';
                document.getElementById('videoContainer').style.display = 'none';
                
                document.getElementById('startExamBtn').onclick = async () => {
                    alert("جارِ التحويل للامتحان...");
                    await updateDoc(doc(db, "users", currentStudentId), {
                        completedExams: arrayUnion(courseId)
                    });
                    alert("نجحت! سيتم فتح الفيديو.");
                    location.reload(); 
                };
                return; 
            }

            // 🎬 سحر مشغل ڤيميو (Vimeo Native API)
            const videoUrl = courseData.videoUrl || "";
            const vimeoID = extractVimeoID(videoUrl);
            const videoContainer = document.getElementById('videoContainer');

           if (vimeoID) {
                // الطريقة الأصح والأكثر استقراراً لدمج ڤيميو مع Plyr
                videoContainer.innerHTML = `
                    <div class="plyr__video-embed" id="player">
                        <iframe
                            src="https://player.vimeo.com/video/${vimeoID}?loop=false&amp;byline=false&amp;portrait=false&amp;title=false&amp;speed=true&amp;transparent=0&amp;gesture=media"
                            allowfullscreen
                            allowtransparency
                            allow="autoplay">
                        </iframe>
                    </div>`;
                
                const player = new Plyr('#player', {
                    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                    i18n: { speed: 'السرعة', normal: 'عادي' }
                });

                player.on('ready', () => {
                    const plyrContainer = document.querySelector('.plyr');
                    if (plyrContainer && watermark) {
                        plyrContainer.appendChild(watermark);
                    }
                });
            } else {
                videoContainer.innerHTML = `<p style="color:#ef4444; padding:20px; text-align:center;">رابط الفيديو غير متوفر أو غير صحيح.</p>`;
            }
