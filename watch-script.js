import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let courseDataG = null;
let studentDataG = null;
let currentStudentId = null;
let courseIdG = null;
let currentVideoIndex = 0;
let plyrInstance = null;
let currentVideoDuration = 0;
let currentVideoCurrentTime = 0;
let isExitNoticeSent = false;
let currentVideoTitleGlobal = "";

async function getSecureApiKeys() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (docSnap.exists()) return docSnap.data();
        return null;
    } catch (error) { return null; }
}

async function sendWhatsAppToParent(parentPhone, msgText) {
    if (!parentPhone || parentPhone === "غير متوفر" || parentPhone === "-") return;
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) return;

    let cleanPhone = parentPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    let chatId = cleanPhone + "@c.us";
    let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msgText })
        });
    } catch(err) {}
}

function formatSecondsToTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} دقيقة و ${secs} ثانية`;
}

// 🚨 إرسال إشعار الخروج الدقيق لولي الأمر عند إغلاق أو مغادرة الصفحة 🚨
function handleStudentExitNotification() {
    if (isExitNoticeSent || !studentDataG || !studentDataG.parentPhone || currentVideoCurrentTime <= 5) return;
    isExitNoticeSent = true;

    const stoppedAtText = formatSecondsToTime(currentVideoCurrentTime);
    const remainingSeconds = Math.max(0, currentVideoDuration - currentVideoCurrentTime);
    const remainingText = formatSecondsToTime(remainingSeconds);
    const cName = courseDataG ? (courseDataG.title || courseDataG.name) : "الحصة";

    const msg = `إشعار من Primee Academy 🔔\nولي أمر الطالب/ة: *${studentDataG.fullName}*\n\nغادر الطالب حصة (*${cName}*) - مقطع (*${currentVideoTitleGlobal}*).\n⏱️ توقف عند: *${stoppedAtText}*\n⏳ المتبقي من المقطع: *${remainingText}*`;

    // إرسال عبر الواتساب بشكل فوري ومضمون
    getSecureApiKeys().then(keys => {
        if (!keys || !keys.wapilot_instance) return;
        let cleanPhone = studentDataG.parentPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        let chatId = cleanPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;

        const payload = JSON.stringify({ chat_id: chatId, text: msg });
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else {
            fetch(url, { method: "POST", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` }, body: payload, keepalive: true });
        }
    });
}

window.addEventListener('beforeunload', handleStudentExitNotification);
window.addEventListener('pagehide', handleStudentExitNotification);

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    courseIdG = urlParams.get('id') ? urlParams.get('id').trim() : null;
    const loggedInPhone = localStorage.getItem('studentPhone');

    if (!loggedInPhone || !courseIdG) return window.location.replace("login.html");
    
    // تحريك العلامة المائية
    const watermark = document.getElementById('studentWatermark');
    if (watermark) {
        watermark.textContent = loggedInPhone;
        setInterval(() => {
            const container = document.getElementById('vimeoWrapper');
            if(container && watermark) {
                const maxX = container.clientWidth - 150; 
                const maxY = container.clientHeight - 30;
                const randomX = Math.max(0, Math.floor(Math.random() * maxX));
                const randomY = Math.max(0, Math.floor(Math.random() * maxY));
                watermark.style.top = `${randomY}px`;
                watermark.style.left = `${randomX}px`;
            }
        }, 4000);
    }

    verifyAccessAndLoadCourse(loggedInPhone, courseIdG);
});

function extractVimeoID(url) {
    if(!url) return null;
    const regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function verifyAccessAndLoadCourse(phone, courseId) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return window.location.replace("login.html");

        studentDataG = querySnapshot.docs[0].data();
        currentStudentId = querySnapshot.docs[0].id;
        const myCourses = studentDataG.myCourses || [];
        const myPackages = studentDataG.myPackages || [];

        if (!myCourses.includes(courseId) && !myPackages.includes(courseId)) {
            document.body.innerHTML = `<div style="text-align:center; padding:60px 20px; font-family:'Cairo';"><h2>غير مصرح لك بمشاهدة هذه الحصة ❌</h2><p>يرجى الاشتراك أولاً للتمكن من الدخول.</p><a href="student-dashboard.html" style="background:#3b82f6; color:#fff; padding:10px 25px; border-radius:10px; text-decoration:none; font-weight:bold;">العودة للوحة التحكم</a></div>`;
            return; 
        }

        let courseSnap = await getDoc(doc(db, "courses", courseId));
        if (!courseSnap.exists()) {
            courseSnap = await getDoc(doc(db, "packages", courseId));
        }

        if (courseSnap.exists()) {
            courseDataG = courseSnap.data();
            
            document.getElementById('courseTitle').textContent = courseDataG.title || courseDataG.name || "حصة بدون عنوان";
            document.getElementById('courseInstructor').textContent = courseDataG.instructor || "أستاذ المادة";
            
            if(courseDataG.pdfUrl && courseDataG.pdfUrl.trim() !== "") {
                document.getElementById('pdfSection').style.display = 'flex';
                document.getElementById('btnDownloadPdf').href = courseDataG.pdfUrl;
            }

            let studentViewsMap = studentDataG.courseViews || {};
            let myViews = studentViewsMap[courseId] || 0;
            let maxViews = parseInt(courseDataG.maxViews) || 0;
            
            if(maxViews > 0) {
                let left = maxViews - myViews;
                document.getElementById('viewsLeftText').textContent = left > 0 ? left : 0;
                if(left <= 0) {
                    document.getElementById('vimeoWrapper').innerHTML = `<div class="status-box"><i class="fas fa-eye-slash" style="color:#ef4444; font-size:60px; margin-bottom:15px;"></i><h2 style="color:#fff;">انتهت مشاهداتك المسموحة</h2><p style="color:#cbd5e1;">لقد استنفذت عدد المشاهدات المخصصة لهذه الحصة.</p></div>`;
                    return;
                }
            } else {
                document.getElementById('viewsLeftText').textContent = "لا محدود";
            }

            let ratingsArray = courseDataG.ratings || [];
            updateRatingUI(ratingsArray);
            setupRating();

            let videosList = courseDataG.videos || [];
            if(videosList.length === 0 && courseDataG.videoUrl) {
                videosList = [{ title: courseDataG.title || "المقطع الرئيسي", url: courseDataG.videoUrl, requiredExamId: courseDataG.requiredExamId }];
            }
            renderPlaylist(videosList);
            
            if(videosList.length > 0) {
                window.loadVideoIndex(0);
            }
        }
    } catch (error) { console.error(error); }
}

window.updateRatingUI = function(ratings) {
    const statsEl = document.getElementById('ratingStats');
    const stars = document.querySelectorAll('.rating-stars i');
    
    if (!ratings || ratings.length === 0) {
        statsEl.textContent = "(لم يُقيم بعد)";
        return;
    }

    let sum = 0;
    let myPreviousRating = 0;

    ratings.forEach(r => {
        sum += r.stars;
        if (r.studentId === currentStudentId) {
            myPreviousRating = r.stars;
        }
    });

    let avg = (sum / ratings.length).toFixed(1);
    statsEl.textContent = `(${avg}/5 من ${ratings.length} طالب)`;

    stars.forEach(s => {
        let val = parseInt(s.getAttribute('data-val'));
        if (val <= myPreviousRating) s.style.color = '#f59e0b';
        else s.style.color = '#cbd5e1';
    });
}

function setupRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        star.addEventListener('mouseover', (e) => {
            let hoverVal = parseInt(e.target.getAttribute('data-val'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= hoverVal) s.style.color = '#f59e0b';
                else s.style.color = '#cbd5e1';
            });
        });

        star.parentElement.addEventListener('mouseleave', () => {
            let ratingsArray = courseDataG.ratings || [];
            updateRatingUI(ratingsArray);
        });

        star.addEventListener('click', async (e) => {
            const val = parseInt(e.target.getAttribute('data-val'));
            let ratingsArray = courseDataG.ratings || [];
            
            let existingIndex = ratingsArray.findIndex(r => r.studentId === currentStudentId);
            if (existingIndex > -1) ratingsArray[existingIndex].stars = val;
            else ratingsArray.push({ studentId: currentStudentId, stars: val });

            courseDataG.ratings = ratingsArray;
            updateRatingUI(ratingsArray); 

            try { await updateDoc(doc(db, "courses", courseIdG), { ratings: ratingsArray }); } catch(err) {}
        });
    });
}

// 🚨 عرض أسماء المقاطع الحقيقية المكتوبة في لوحة التحكم 🚨
function renderPlaylist(videos) {
    const container = document.getElementById('playlistContainer');
    let html = '';
    videos.forEach((vid, i) => {
        let examIdCheck = vid.requiredExamId || courseDataG.requiredExamId;
        let icon = examIdCheck ? '<i class="fas fa-lock" style="color:#f59e0b;"></i>' : '<i class="fas fa-play-circle" style="color:#10b981;"></i>';
        let vTitle = vid.title && vid.title.trim() !== "" ? vid.title : `مقطع ${i + 1}`;
        
        html += `
        <div class="playlist-item" id="playBtn_${i}" onclick="loadVideoIndex(${i})">
            <div class="vid-title-text">
                <i class="fas fa-video" style="color: var(--primary-color);"></i>
                <span>${vTitle}</span>
            </div>
            ${icon}
        </div>`;
    });
    container.innerHTML = html;
}

window.loadVideoIndex = async function(index) {
    currentVideoIndex = index;
    isExitNoticeSent = false;
    let videosList = courseDataG.videos || [{ title: courseDataG.title || "المقطع الرئيسي", url: courseDataG.videoUrl, requiredExamId: courseDataG.requiredExamId }];
    const vidObj = videosList[index];
    currentVideoTitleGlobal = vidObj.title || `مقطع ${index + 1}`;
    
    document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById(`playBtn_${index}`);
    if (activeBtn) activeBtn.classList.add('active');

    const examOverlay = document.getElementById('examFullscreenOverlay');
    const examArea = document.getElementById('examContentArea');
    let examId = vidObj.requiredExamId || courseDataG.requiredExamId;

    if (examId && examId.trim() !== "") {
        const submissionId = `${currentStudentId}_${examId}`;
        const subSnap = await getDoc(doc(db, "exam_submissions", submissionId));
        
        let examStatus = null;
        let score = 0;
        let totalQs = 0;
        
        if(subSnap.exists()) {
            examStatus = subSnap.data().status; 
            score = subSnap.data().score || 0;
            totalQs = subSnap.data().totalQuestions || 10;
        }

        if(examStatus === 'passed') {
            examOverlay.style.display = 'none';
            playVideoAndRecordView(vidObj.url);
        } 
        else if(examStatus === 'failed') {
            examOverlay.style.display = 'flex';
            examArea.innerHTML = `
                <div class="status-box">
                    <i class="fas fa-times-circle" style="color: #ef4444; font-size: 70px; margin-bottom: 20px;"></i>
                    <h2 style="color: #f8fafc; font-size: 26px;">لم تجتز الامتحان بنجاح</h2>
                    <p style="color: #94a3b8; font-size: 20px; font-weight:800;">درجتك: ${score} من ${totalQs}</p>
                    <p style="color: #cbd5e1; font-weight: 800; margin-top: 15px;">الفيديو مغلق. يرجى التواصل مع أستاذ المادة للمساعدة.</p>
                </div>`;
        }
        else if(examStatus === 'pending') {
            examOverlay.style.display = 'flex';
            examArea.innerHTML = `
                <div class="status-box">
                    <i class="fas fa-hourglass-half" style="color: #f59e0b; font-size: 70px; margin-bottom: 20px;"></i>
                    <h2 style="color: #f8fafc; font-size: 26px;">إجاباتك قيد التصحيح والمراجعة</h2>
                    <p style="color: #94a3b8; font-size: 16px;">يحتوي الامتحان على أسئلة مقالية يراجعها المدرس حالياً.</p>
                    <p style="color: #10b981; font-weight: 800; margin-top: 15px;">سيتم فتح الحصة تلقائياً فور اعتماد النتيجة.</p>
                </div>`;
        }
        else {
            examOverlay.style.display = 'flex';
            const examDoc = await getDoc(doc(db, "exams", examId));
            if(examDoc.exists()) {
                const examData = examDoc.data();
                renderExamForm(examData, examId, submissionId, examArea);
            }
        }
    } else {
        examOverlay.style.display = 'none';
        playVideoAndRecordView(vidObj.url);
    }
};

function renderExamForm(examData, examId, submissionId, container) {
    let questions = examData.questions || [];
    let html = `
        <div class="exam-form-container">
            <div class="exam-header-title">
                <h2>${examData.title}</h2>
                <p>يجب اجتياز الامتحان لتتمكن من فتح ومشاهدة هذا المقطع 🎯</p>
            </div>
            <form id="studentExamForm" style="display: flex; flex-direction: column; height: 100%; flex: 1; overflow: hidden;">
                <div class="exam-body-scroll">`;
                
    questions.forEach((q, index) => {
        html += `<div class="exam-question">
                    <h4 style="font-size: 18px; margin-bottom: 15px; color: var(--text-main);">س ${index + 1}: ${q.text}</h4>`;
        if(q.imageUrl) html += `<img src="${q.imageUrl}" style="max-width: 100%; border-radius: 12px; margin-bottom: 15px;">`;
        
        if (q.type === 'mcq') {
            q.options.forEach((opt, optIndex) => {
                html += `<label class="mcq-option"><input type="radio" name="q_${index}" value="${optIndex}" required style="margin-left: 12px; transform: scale(1.3);"> ${opt}</label>`;
            });
        } else {
            html += `<textarea class="essay-input" name="q_${index}" rows="4" placeholder="اكتب إجابتك النموذجية هنا..." required></textarea>`;
        }
        html += `</div>`;
    });
    
    html += `   </div>
                <div style="padding: 20px 35px; background: var(--bg-card); border-top: 1px solid var(--input-border);">
                    <button type="submit" class="btn-submit-exam" id="btnSubmitForm">تسليم الامتحان <i class="fas fa-paper-plane"></i></button>
                </div>
            </form>
        </div>`;
    container.innerHTML = html;

    document.getElementById('studentExamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitExam(examData, examId, submissionId);
    });
}

async function submitExam(examData, examId, submissionId) {
    const btn = document.getElementById('btnSubmitForm');
    btn.innerHTML = "جاري التصحيح واعتماد النتيجة... <i class='fas fa-spinner fa-spin'></i>";
    btn.disabled = true;

    let totalQs = examData.questions.length;
    let correctCount = 0;
    let hasEssay = false;
    let studentAnswers = [];

    examData.questions.forEach((q, index) => {
        if(q.type === 'mcq') {
            const selected = document.querySelector(`input[name="q_${index}"]:checked`).value;
            studentAnswers.push({ qText: q.text, type: 'mcq', answer: selected, correct: q.correctIndex });
            if(parseInt(selected) === q.correctIndex) correctCount++;
        } else {
            hasEssay = true;
            const answer = document.querySelector(`textarea[name="q_${index}"]`).value;
            studentAnswers.push({ qText: q.text, type: 'essay', answer: answer });
        }
    });

    let score = correctCount; 
    let finalStatus = 'pending'; 
    
    if(!hasEssay) {
        finalStatus = score >= (totalQs / 2) ? 'passed' : 'failed';
    }

    await setDoc(doc(db, "exam_submissions", submissionId), {
        studentId: currentStudentId,
        studentName: studentDataG.fullName,
        studentPhone: studentDataG.studentPhone,
        parentPhone: studentDataG.parentPhone || "غير متوفر",
        examId: examId,
        examTitle: examData.title,
        courseId: courseIdG,
        courseTitle: courseDataG.title || courseDataG.name,
        instructor: courseDataG.instructor,
        answers: studentAnswers,
        score: score,
        totalQuestions: totalQs,
        status: finalStatus,
        hasEssay: hasEssay,
        submittedAt: new Date().toISOString()
    });

    let waMsg = `مرحباً ولي أمر الطالب/ة: *${studentDataG.fullName}*\nأنهى الطالب امتحان (${examData.title}) لحصة (${courseDataG.title || courseDataG.name}).\n`;
    if(finalStatus === 'passed') waMsg += `النتيجة: ناجح ✅\nالدرجة: ${score} من ${totalQs}\nتم فتح الحصة للطالب.`;
    else if(finalStatus === 'failed') waMsg += `النتيجة: راسب ❌\nالدرجة: ${score} من ${totalQs}\nتم إغلاق الحصة، يرجى المتابعة.`;
    else waMsg += `النتيجة: قيد المراجعة ⏳\nيحتوي الامتحان على أسئلة مقالية سيصححها المدرس.`;
    
    await sendWhatsAppToParent(studentDataG.parentPhone, waMsg);

    if(score === totalQs && !hasEssay) {
        document.getElementById('examFullscreenOverlay').style.display = 'none';
        document.getElementById('certStudentName').innerText = studentDataG.fullName;
        document.getElementById('certInstructorName').innerText = courseDataG.instructor;
        document.getElementById('certDate').innerText = new Date().toLocaleDateString('ar-EG');
        document.getElementById('certificateModal').classList.add('active');
        
        let videosList = courseDataG.videos || [{ url: courseDataG.videoUrl }];
        playVideoAndRecordView(videosList[currentVideoIndex].url);
    } else {
        location.reload(); 
    }
}

// 🚨 تشغيل الفيديو مع إعدادات الجودة وقائمة التحكم الحديثة 🚨
async function playVideoAndRecordView(videoUrl) {
    const vidContainer = document.getElementById('videoContainer');
    const vimeoID = extractVimeoID(videoUrl);
    
    if (vimeoID && vidContainer) {
        vidContainer.style.display = 'block';
        vidContainer.style.width = '100%';
        vidContainer.style.height = '100%';
        
        vidContainer.innerHTML = `
            <div class="plyr__video-embed" id="player">
                <iframe src="https://player.vimeo.com/video/${vimeoID}?loop=false&amp;byline=false&amp;portrait=false&amp;title=false&amp;speed=true&amp;transparent=0&amp;gesture=media" allowfullscreen allowtransparency allow="autoplay"></iframe>
            </div>
            <div id="resumeCard" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.92); z-index:100; justify-content:center; align-items:center; flex-direction:column; backdrop-filter:blur(8px); border-radius:24px;">
                <i class="fas fa-history" style="font-size:55px; color:#3b82f6; margin-bottom:15px;"></i>
                <h3 style="color:#fff; font-size:24px; margin:0 0 10px 0; font-weight:900;">استكمال الحصة من حيث توقفت</h3>
                <p style="color:#cbd5e1; margin-bottom:25px; font-weight:600;">هل تود استكمال الحصة من آخر دقيقة أم البدء من جديد؟</p>
                <div style="display:flex; gap:15px; flex-wrap:wrap; justify-content:center;">
                    <button id="btnResumeVid" style="background:#10b981; color:#fff; border:none; padding:12px 28px; border-radius:12px; font-weight:900; font-size:16px; cursor:pointer;"><i class="fas fa-play"></i> استكمال المشاهدة</button>
                    <button id="btnRestartVid" style="background:#ef4444; color:#fff; border:none; padding:12px 28px; border-radius:12px; font-weight:900; font-size:16px; cursor:pointer;"><i class="fas fa-redo"></i> البدء من الأول</button>
                </div>
            </div>
        `;

        setTimeout(() => { 
            // تهيئة Plyr مع دعم الجودة والسرعات والتحكم الأنيق
            plyrInstance = new Plyr('#player', {
                controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                settings: ['quality', 'speed', 'loop'],
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
                quality: { default: 'auto', options: ['auto', 1080, 720, 540, 360], forced: true, onChange: (q) => console.log(q) },
                i18n: {
                    speed: 'السرعة',
                    normal: 'عادي',
                    quality: 'الجودة',
                    auto: 'تلقائي (Auto)'
                }
            }); 
            
            const savedTimeKey = `vidTime_${currentStudentId}_${vimeoID}`;
            const savedTime = parseFloat(localStorage.getItem(savedTimeKey)) || 0;
            let isFirstPlay = true;

            plyrInstance.on('ready', () => {
                currentVideoDuration = plyrInstance.duration || 0;
                if (savedTime > 10 && isFirstPlay) {
                    const resumeCard = document.getElementById('resumeCard');
                    resumeCard.style.display = 'flex';

                    document.getElementById('btnResumeVid').onclick = () => {
                        plyrInstance.currentTime = savedTime;
                        plyrInstance.play();
                        resumeCard.style.display = 'none';
                        isFirstPlay = false;
                    };

                    document.getElementById('btnRestartVid').onclick = () => {
                        plyrInstance.currentTime = 0;
                        plyrInstance.play();
                        resumeCard.style.display = 'none';
                        isFirstPlay = false;
                    };
                }
            });

            plyrInstance.on('timeupdate', () => {
                currentVideoCurrentTime = plyrInstance.currentTime || 0;
                currentVideoDuration = plyrInstance.duration || currentVideoDuration;
                if(!isFirstPlay || savedTime <= 10) {
                    localStorage.setItem(savedTimeKey, currentVideoCurrentTime);
                }
            });

            plyrInstance.on('ended', () => {
                localStorage.removeItem(savedTimeKey);
            });

        }, 150);
        
        let viewsMap = studentDataG.courseViews || {};
        viewsMap[courseIdG] = (viewsMap[courseIdG] || 0) + 1;
        await updateDoc(doc(db, "users", currentStudentId), { courseViews: viewsMap });
        
    } else {
        vidContainer.style.display = 'flex';
        vidContainer.innerHTML = `<p style="color:#ef4444; font-weight:bold; font-size:20px;">رابط الفيديو غير متوفر.</p>`;
    }
}
