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
const WORKER_URL = "https://ai.adelabdulrahman026.workers.dev";

// 🌗 إدارة المظهر الليلي والنهاري
function setTheme(isDark) {
    if (isDark) { document.body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
    const icon = document.querySelector('#themeToggleBtn i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    setTheme(!isDark);
}
document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
setTheme(localStorage.getItem('theme') === 'dark');

let courseDataG = null;
let studentDataG = null;
let currentStudentId = null;
let courseIdG = null;
let currentVideoIndex = 0;
let lastTrackedSeconds = 0;
let videoDurationSeconds = 0;
let vimeoPlayerInstance = null;

function formatTimeAr(seconds) {
    let s = Math.floor(seconds || 0);
    let m = Math.floor(s / 60);
    let remS = s % 60;
    return `${m} دقيقة و ${remS} ثانية`;
}

// 🚨 إرسال إشعار الخروج لولي الأمر فور مغادرة الصفحة
function sendExitNotification() {
    if (!studentDataG || !studentDataG.parentPhone || videoDurationSeconds === 0) return;
    
    let stoppedAt = lastTrackedSeconds;
    let remaining = Math.max(0, videoDurationSeconds - stoppedAt);

    // يتم الإرسال إذا شاهد الطالب 15 ثانية على الأقل وكان متبقي أكثر من 30 ثانية
    if (stoppedAt >= 15 && remaining > 30) {
        const payload = {
            action: "send_exit_report",
            parentPhone: studentDataG.parentPhone,
            studentName: studentDataG.fullName || "الطالب",
            courseName: courseDataG?.title || courseDataG?.name || "الحصة",
            stoppedAtStr: formatTimeAr(stoppedAt),
            remainingStr: formatTimeAr(remaining)
        };

        // استخدام fetch مع keepalive يضمن إتمام الطلب في الخلفية حتى بعد غلق الصفحة
        fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }
}

window.addEventListener('beforeunload', sendExitNotification);
window.addEventListener('pagehide', sendExitNotification);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        sendExitNotification();
    }
});

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
                const maxX = container.clientWidth - 160; 
                const maxY = container.clientHeight - 35;
                const randomX = Math.max(10, Math.floor(Math.random() * maxX));
                const randomY = Math.max(10, Math.floor(Math.random() * maxY));
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
            document.body.innerHTML = `<div style="text-align:center; padding:80px 20px; font-family:'Cairo';"><h2>غير مصرح لك بالدخول إلى هذه الحصة ❌</h2><p>يرجى الاشتراك أولاً للوصول للمحتوى.</p><a href="student-dashboard.html" style="background:#6366f1; color:#fff; padding:10px 25px; border-radius:10px; text-decoration:none; font-weight:800;">العودة للوحة التحكم</a></div>`;
            return; 
        }

        let courseSnap = await getDoc(doc(db, "courses", courseId));
        if (!courseSnap.exists()) {
            courseSnap = await getDoc(doc(db, "packages", courseId));
        }

        if (courseSnap.exists()) {
            courseDataG = courseSnap.data();
            
            document.getElementById('courseTitle').textContent = courseDataG.title || courseDataG.name || "حصة تعليمية";
            document.getElementById('courseInstructor').textContent = courseDataG.instructor || "أستاذ المادة";
            
            if(courseDataG.pdfUrl && courseDataG.pdfUrl.trim() !== "") {
                const pdfSec = document.getElementById('pdfSection');
                if (pdfSec) {
                    pdfSec.style.display = 'flex';
                    document.getElementById('btnDownloadPdf').href = courseDataG.pdfUrl;
                }
            }

            let studentViewsMap = studentDataG.courseViews || {};
            let myViews = studentViewsMap[courseId] || 0;
            let maxViews = parseInt(courseDataG.maxViews) || 0;
            
            if(maxViews > 0) {
                let left = maxViews - myViews;
                document.getElementById('viewsLeftText').textContent = `${Math.max(0, left)} من ${maxViews}`;
                if(left <= 0) {
                    document.getElementById('vimeoWrapper').innerHTML = `
                        <div class="status-box">
                            <i class="fas fa-eye-slash" style="color:#ef4444;"></i>
                            <h2 style="color:var(--text-main); margin-bottom:8px;">انتهت مشاهداتك المسموحة</h2>
                            <p style="color:var(--text-muted);">لقد استنفذت عدد المشاهدات المخصصة لهذه الحصة بالتنسيق مع المدرس.</p>
                        </div>`;
                    return;
                }
            } else {
                document.getElementById('viewsLeftText').textContent = "مشاهدة غير محدودة";
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
    if (!statsEl) return;
    
    if (ratings.length === 0) {
        statsEl.textContent = "(لم يُقيّم بعد)";
        return;
    }

    let sum = 0;
    let myPreviousRating = 0;

    ratings.forEach(r => {
        sum += r.stars;
        if (r.studentId === currentStudentId) myPreviousRating = r.stars;
    });

    let avg = (sum / ratings.length).toFixed(1);
    statsEl.textContent = `(${avg}/5 من ${ratings.length} طالب)`;

    stars.forEach(s => {
        let val = parseInt(s.getAttribute('data-val'));
        if (val <= myPreviousRating) s.style.color = 'var(--accent-gold)';
        else s.style.color = '#cbd5e1';
    });
};

function setupRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
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

function renderPlaylist(videos) {
    const container = document.getElementById('playlistContainer');
    const badge = document.getElementById('playlistCountBadge');
    if (!container) return;
    
    if (badge) badge.textContent = `${videos.length} مقطع`;
    let html = '';
    
    videos.forEach((vid, i) => {
        let examIdCheck = vid.requiredExamId || courseDataG.requiredExamId;
        let icon = examIdCheck ? '<i class="fas fa-lock" style="color:var(--accent-gold);" title="مربوط بامتحان"></i>' : '<i class="fas fa-play-circle" style="color:var(--primary);"></i>';
        let displayName = vid.title && vid.title.trim() !== "" ? vid.title : `مقطع شرح ${i + 1}`;

        html += `
        <div class="playlist-item" id="playBtn_${i}" onclick="loadVideoIndex(${i})">
            <span class="vid-title-text"><i class="fas fa-video"></i> ${displayName}</span>
            ${icon}
        </div>`;
    });
    container.innerHTML = html;
}

window.loadVideoIndex = async function(index) {
    currentVideoIndex = index;
    let videosList = courseDataG.videos || [{ title: courseDataG.title || "المقطع الرئيسي", url: courseDataG.videoUrl, requiredExamId: courseDataG.requiredExamId }];
    const vidObj = videosList[index];
    
    document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`playBtn_${index}`)?.classList.add('active');

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
                    <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                    <h2 style="color: var(--text-main); margin-bottom:6px;">لم تجتز الامتحان</h2>
                    <p style="color: #ef4444; font-size: 20px; font-weight:900;">درجتك: ${score} من ${totalQs}</p>
                    <p style="color: var(--text-muted); font-weight:700;">هذا المقطع مغلق حتى يتم إعادة الامتحان بالتنسيق مع إدارة المنصة.</p>
                </div>`;
        }
        else if(examStatus === 'pending') {
            examOverlay.style.display = 'flex';
            examArea.innerHTML = `
                <div class="status-box">
                    <i class="fas fa-hourglass-half" style="color: var(--accent-gold);"></i>
                    <h2 style="color: var(--text-main); margin-bottom:6px;">جاري مراجعة إجاباتك</h2>
                    <p style="color: var(--text-muted); font-size: 15px;">يحتوي الامتحان على أسئلة مقالية يتم تصحيحها من أستاذ المادة.</p>
                    <p style="color: var(--primary); font-weight: 800; margin-top: 15px;">سيتم فتح الفيديو تلقائياً فور اعتماد النتيجة.</p>
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
                <i class="fas fa-file-signature" style="font-size:36px; margin-bottom:8px;"></i>
                <h2>${examData.title}</h2>
                <p>يجب اجتياز هذا الامتحان لفتح مقطع الفيديو للمشاهدة</p>
            </div>
            <form id="studentExamForm" style="display: flex; flex-direction: column; height: 100%; flex: 1; overflow: hidden;">
                <div class="exam-body-scroll">`;
                
    questions.forEach((q, index) => {
        html += `<div class="exam-question">
                    <h4 class="exam-q-text">السؤال ${index + 1}: ${q.text}</h4>`;
        if(q.imageUrl) html += `<img src="${q.imageUrl}" class="exam-q-img" style="max-width: 100%; border-radius: 12px; margin-bottom: 15px;">`;
        
        if (q.type === 'mcq') {
            q.options.forEach((opt, optIndex) => {
                html += `<label class="mcq-option"><input type="radio" name="q_${index}" value="${optIndex}" required> ${opt}</label>`;
            });
        } else {
            html += `<textarea class="essay-input" name="q_${index}" rows="4" placeholder="اكتب إجابتك النموذجية هنا بالتفصيل..." required></textarea>`;
        }
        html += `</div>`;
    });
    
    html += `   </div>
                <div class="exam-footer">
                    <button type="submit" class="btn-submit-exam" id="btnSubmitForm">تسليم الإجابات والتحقق <i class="fas fa-check-circle"></i></button>
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

    // إرسال تقرير النتيجة للواتساب
    if (studentDataG.parentPhone) {
        let waMsg = `🔔 تقرير امتحان من Primee Academy:\n\nولي أمر الطالب/ـة: *${studentDataG.fullName}*\nأنهى الطالب اختبار (*${examData.title}*) الخاص بحصة (*${courseDataG.title || courseDataG.name}*).\n`;
        if(finalStatus === 'passed') waMsg += `النتيجة: *ناجح بتفوق ✅*\nالدرجة: *${score} من ${totalQs}*\nتم فتح مقطع الحصة للطالب بنجاح.`;
        else if(finalStatus === 'failed') waMsg += `النتيجة: *راسب ❌*\nالدرجة: *${score} من ${totalQs}*\nتم إغلاق المقطع للمراجعة مع الإدارة.`;
        else waMsg += `النتيجة: *قيد التصحيح ⏳*\nيحتوي الاختبار على أسئلة مقالية جاري مراجعتها.`;
        
        fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "send_exit_report",
                parentPhone: studentDataG.parentPhone,
                studentName: studentDataG.fullName,
                courseName: courseDataG.title || courseDataG.name,
                stoppedAtStr: `درجة الامتحان ${score}/${totalQs}`,
                remainingStr: finalStatus === 'passed' ? 'تم اجتياز الامتحان بنجاح' : 'لم يجتز الامتحان'
            })
        }).catch(() => {});
    }

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

// 🎬 تشغيل الفيديو مع دعم تبديل الجودات الكامل (Vimeo Native Controls & Quality)
async function playVideoAndRecordView(videoUrl) {
    const vidContainer = document.getElementById('videoContainer');
    const vimeoID = extractVimeoID(videoUrl);
    
    if (vimeoID && vidContainer) {
        vidContainer.style.display = 'block';
        vidContainer.style.width = '100%';
        vidContainer.style.height = '100%';
        
        // تضمين المشغل مع معلمات تفعيل قائمة الجودة (Auto, 1080p, 720p, 540p, 360p) والسرعات الكاملة
        vidContainer.innerHTML = `
            <iframe id="vimeoPlayerIframe" 
                src="https://player.vimeo.com/video/${vimeoID}?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479&controls=1&quality_selector=1&speed=1" 
                style="width:100%; height:100%; border:none; position:absolute; top:0; left:0;" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen>
            </iframe>
            
            <div id="resumeCard" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(9,13,22,0.94); z-index:100; justify-content:center; align-items:center; flex-direction:column; backdrop-filter:blur(8px); border-radius:var(--player-radius);">
                <i class="fas fa-history" style="font-size:55px; color:var(--primary); margin-bottom:15px;"></i>
                <h3 style="color:#fff; font-size:22px; margin:0 0 8px 0; font-weight:900;">استكمال المشاهدة</h3>
                <p style="color:#94a3b8; margin-bottom:20px; font-weight:600;">توقفت هنا في زيارتك السابقة، هل ترغب في الاستكمال؟</p>
                <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
                    <button id="btnResumeVid" style="background:#10b981; color:#fff; border:none; padding:12px 26px; border-radius:12px; font-weight:900; font-size:15px; cursor:pointer;"><i class="fas fa-play"></i> استكمال الحصة</button>
                    <button id="btnRestartVid" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid #ef4444; padding:12px 26px; border-radius:12px; font-weight:900; font-size:15px; cursor:pointer;"><i class="fas fa-redo"></i> البدء من الأول</button>
                </div>
            </div>
        `;

        const iframe = document.getElementById('vimeoPlayerIframe');
        vimeoPlayerInstance = new Vimeo.Player(iframe);
        
        const savedTimeKey = `vidTime_${currentStudentId}_${vimeoID}`;
        const savedTime = parseFloat(localStorage.getItem(savedTimeKey)) || 0;
        let isFirstPlay = true;

        vimeoPlayerInstance.getDuration().then(duration => {
            videoDurationSeconds = duration || 0;
        });

        vimeoPlayerInstance.on('loaded', () => {
            if (savedTime > 15 && isFirstPlay) {
                vimeoPlayerInstance.pause();
                const resumeCard = document.getElementById('resumeCard');
                if (resumeCard) resumeCard.style.display = 'flex';

                document.getElementById('btnResumeVid').onclick = () => {
                    vimeoPlayerInstance.setCurrentTime(savedTime);
                    vimeoPlayerInstance.play();
                    resumeCard.style.display = 'none';
                    isFirstPlay = false;
                };

                document.getElementById('btnRestartVid').onclick = () => {
                    vimeoPlayerInstance.setCurrentTime(0);
                    vimeoPlayerInstance.play();
                    resumeCard.style.display = 'none';
                    isFirstPlay = false;
                };
            }
        });

        vimeoPlayerInstance.on('timeupdate', (data) => {
            lastTrackedSeconds = data.seconds;
            videoDurationSeconds = data.duration || videoDurationSeconds;
            
            if(!isFirstPlay || savedTime <= 15) {
                localStorage.setItem(savedTimeKey, data.seconds);
            }
        });

        vimeoPlayerInstance.on('ended', () => {
            localStorage.removeItem(savedTimeKey);
            lastTrackedSeconds = 0;
        });
        
        // تسجيل مشاهدة
        let viewsMap = studentDataG.courseViews || {};
        viewsMap[courseIdG] = (viewsMap[courseIdG] || 0) + 1;
        await updateDoc(doc(db, "users", currentStudentId), { courseViews: viewsMap });
        
    } else {
        vidContainer.style.display = 'flex';
        vidContainer.innerHTML = `<p style="color:#ef4444; font-weight:bold; font-size:18px;">عذراً، رابط الفيديو غير متاح حالياً.</p>`;
    }
}
