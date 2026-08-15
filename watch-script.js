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

async function getSecureApiKeys() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (docSnap.exists()) return docSnap.data();
        return null;
    } catch (error) { return null; }
}

async function sendWhatsAppToParent(parentPhone, msgText) {
    if(!parentPhone || parentPhone === "غير متوفر") return;
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) return;

    let formattedPhone = parentPhone.startsWith('0') ? '2' + parentPhone : parentPhone;
    let chatId = formattedPhone + "@c.us";
    var url = "https://api.wapilot.net/api/v2/" + keys.wapilot_instance + "/send-message";
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msgText })
        });
    } catch(err) {}
}

let courseDataG = null;
let studentDataG = null;
let currentStudentId = null;
let courseIdG = null;
let currentVideoIndex = 0;

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

        if (!myCourses.includes(courseId)) {
            document.body.innerHTML = `<div style="text-align:center; padding:50px; font-family:'Cairo';"><h2>غير مصرح لك بالدخول ❌</h2><a href="student-dashboard.html">عودة</a></div>`;
            return; 
        }

        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (courseSnap.exists()) {
            courseDataG = courseSnap.data();
            
            document.getElementById('courseTitle').textContent = courseDataG.title || "حصة بدون عنوان";
            document.getElementById('courseInstructor').textContent = courseDataG.instructor || "أستاذ المادة";
            
            if(courseDataG.pdfUrl && courseDataG.pdfUrl.trim() !== "") {
                document.getElementById('pdfSection').style.display = 'flex';
                document.getElementById('btnDownloadPdf').href = courseDataG.pdfUrl;
            }

            // فحص المشاهدات
            let studentViewsMap = studentDataG.courseViews || {};
            let myViews = studentViewsMap[courseId] || 0;
            let maxViews = parseInt(courseDataG.maxViews) || 0;
            
            if(maxViews > 0) {
                let left = maxViews - myViews;
                document.getElementById('viewsLeftText').textContent = left > 0 ? left : 0;
                if(left <= 0) {
                    document.getElementById('vimeoWrapper').innerHTML = `<div class="status-box"><i class="fas fa-eye-slash" style="color:#ef4444;"></i><h2 style="color:#fff;">انتهت مشاهداتك المسموحة</h2><p style="color:#cbd5e1;">لقد استنفذت عدد المشاهدات المخصصة لهذه الحصة.</p></div>`;
                    return;
                }
            } else {
                document.getElementById('viewsLeftText').textContent = "لا محدود";
            }

            // 🚨 تحديث وتشغيل التقييمات 🚨
            let ratingsArray = courseDataG.ratings || [];
            updateRatingUI(ratingsArray);
            setupRating();

            // بناء القائمة (Playlist)
            let videosList = courseDataG.videos || [];
            if(videosList.length === 0 && courseDataG.videoUrl) {
                videosList = [{ url: courseDataG.videoUrl, requiredExamId: courseDataG.requiredExamId }];
            }
            renderPlaylist(videosList);
            
            if(videosList.length > 0) {
                window.loadVideoIndex(0);
            }
        }
    } catch (error) { console.error(error); }
}

// 🚨 دوال التقييم الاحترافية 🚨
window.updateRatingUI = function(ratings) {
    const statsEl = document.getElementById('ratingStats');
    const stars = document.querySelectorAll('.rating-stars i');
    
    if (ratings.length === 0) {
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

    // تلوين النجوم بناءً على تقييم الطالب السابق
    stars.forEach(s => {
        let val = parseInt(s.getAttribute('data-val'));
        if (val <= myPreviousRating) {
            s.style.color = '#f59e0b';
        } else {
            s.style.color = '#cbd5e1';
        }
    });
}

function setupRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        // تأثير الهوفر
        star.addEventListener('mouseover', (e) => {
            let hoverVal = parseInt(e.target.getAttribute('data-val'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= hoverVal) s.style.color = '#f59e0b';
                else s.style.color = '#cbd5e1';
            });
        });

        // لما يبعد الماوس يرجع للتقييم المحفوظ
        star.parentElement.addEventListener('mouseleave', () => {
            let ratingsArray = courseDataG.ratings || [];
            updateRatingUI(ratingsArray);
        });

        // عند الضغط للحفظ
        star.addEventListener('click', async (e) => {
            const val = parseInt(e.target.getAttribute('data-val'));
            let ratingsArray = courseDataG.ratings || [];
            
            let existingIndex = ratingsArray.findIndex(r => r.studentId === currentStudentId);
            if (existingIndex > -1) {
                ratingsArray[existingIndex].stars = val; // تعديل التقييم
            } else {
                ratingsArray.push({ studentId: currentStudentId, stars: val }); // تقييم جديد
            }

            courseDataG.ratings = ratingsArray;
            updateRatingUI(ratingsArray); // تحديث الواجهة فوراً

            try {
                await updateDoc(doc(db, "courses", courseIdG), { ratings: ratingsArray });
            } catch(err) { console.error(err); }
        });
    });
}
// 🚨 انتهاء دوال التقييم 🚨

function renderPlaylist(videos) {
    const container = document.getElementById('playlistContainer');
    let html = '';
    videos.forEach((vid, i) => {
        let icon = vid.requiredExamId ? '<i class="fas fa-lock status-icon"></i>' : '<i class="fas fa-play-circle status-icon"></i>';
        html += `<div class="playlist-item" id="playBtn_${i}" onclick="loadVideoIndex(${i})">
            <span>مقطع ${i + 1}</span>
            ${icon}
        </div>`;
    });
    container.innerHTML = html;
}

window.loadVideoIndex = async function(index) {
    currentVideoIndex = index;
    let videosList = courseDataG.videos || [{ url: courseDataG.videoUrl, requiredExamId: courseDataG.requiredExamId }];
    const vidObj = videosList[index];
    
    document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`playBtn_${index}`).classList.add('active');

    const examOverlay = document.getElementById('examFullscreenOverlay');
    const examArea = document.getElementById('examContentArea');

    if (vidObj.requiredExamId) {
        let examId = vidObj.requiredExamId;
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
                    <h2 style="color: #f8fafc;">لقد رسبت في الامتحان</h2>
                    <p style="color: #94a3b8; font-size: 20px; font-weight:800;">الدرجة: ${score} من ${totalQs}</p>
                    <p style="color: #cbd5e1; font-weight: 800; margin-top: 20px;">الفيديو مغلق. يرجى مراجعة الإدارة.</p>
                </div>`;
        }
        else if(examStatus === 'pending') {
            examOverlay.style.display = 'flex';
            examArea.innerHTML = `
                <div class="status-box">
                    <i class="fas fa-hourglass-half" style="color: #f59e0b;"></i>
                    <h2 style="color: #f8fafc;">جاري تصحيح إجاباتك</h2>
                    <p style="color: #94a3b8; font-size: 18px;">الامتحان يحتوي على أسئلة مقالية ويتم مراجعتها من قبل المدرس.</p>
                    <p style="color: #cbd5e1; font-weight: 800; margin-top: 20px;">سيتم فتح الحصة تلقائياً فور نجاحك.</p>
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
}

function renderExamForm(examData, examId, submissionId, container) {
    let questions = examData.questions || [];
    let html = `
        <div class="exam-form-container">
        <div class="exam-header-title">
            <i class="fas fa-file-signature"></i>
            <h2>${examData.title}</h2>
            <p>يجب اجتياز الامتحان لتتمكن من مشاهدة الفيديو</p>
        </div>
        <form id="studentExamForm">`;
                
    questions.forEach((q, index) => {
        html += `<div class="exam-question">
                    <h4 class="exam-q-text">س ${index + 1}: ${q.text}</h4>`;
        if(q.imageUrl) html += `<img src="${q.imageUrl}" class="exam-q-img" style="max-width: 100%; border-radius: 10px;">`;
        
        if (q.type === 'mcq') {
            q.options.forEach((opt, optIndex) => {
                html += `<label class="mcq-option"><input type="radio" name="q_${index}" value="${optIndex}" required> ${opt}</label>`;
            });
        } else {
            html += `<textarea class="essay-input" name="q_${index}" rows="4" placeholder="اكتب إجابتك النموذجية هنا..." required></textarea>`;
        }
        html += `</div>`;
    });
    
    html += `<button type="submit" class="btn-submit-exam" id="btnSubmitForm">تسليم الامتحان <i class="fas fa-check-circle"></i></button></form></div>`;
    container.innerHTML = html;

    document.getElementById('studentExamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitExam(examData, examId, submissionId);
    });
}

async function submitExam(examData, examId, submissionId) {
    const btn = document.getElementById('btnSubmitForm');
    btn.innerHTML = "جاري التصحيح والتسجيل... <i class='fas fa-spinner fa-spin'></i>";
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
        courseTitle: courseDataG.title,
        instructor: courseDataG.instructor,
        answers: studentAnswers,
        score: score,
        totalQuestions: totalQs,
        status: finalStatus,
        hasEssay: hasEssay,
        submittedAt: new Date().toISOString()
    });

    let waMsg = `مرحباً ولي أمر الطالب/ة: ${studentDataG.fullName}\nأنهى الطالب امتحان (${examData.title}) لحصة (${courseDataG.title}).\n`;
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

async function playVideoAndRecordView(videoUrl) {
    const vidContainer = document.getElementById('videoContainer');
    const vimeoID = extractVimeoID(videoUrl);
    
    if (vimeoID && vidContainer) {
        vidContainer.style.display = 'block';
        vidContainer.style.width = '100%';
        vidContainer.style.height = '100%';
        
        vidContainer.innerHTML = `<div class="plyr__video-embed" id="player"><iframe src="https://player.vimeo.com/video/${vimeoID}?loop=false&amp;byline=false&amp;portrait=false&amp;title=false&amp;speed=true&amp;transparent=0&amp;gesture=media" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`;
        setTimeout(() => { new Plyr('#player', { speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }}); }, 100);
        
        let viewsMap = studentDataG.courseViews || {};
        viewsMap[courseIdG] = (viewsMap[courseIdG] || 0) + 1;
        await updateDoc(doc(db, "users", currentStudentId), { courseViews: viewsMap });
        
    } else {
        vidContainer.style.display = 'flex';
        vidContainer.innerHTML = `<p style="color:#ef4444; font-weight:bold; font-size:20px;">رابط الفيديو غير متوفر.</p>`;
    }
}
