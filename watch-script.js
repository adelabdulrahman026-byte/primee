import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ==========================================
// جلب مفاتيح الأمان
// ==========================================
async function getSecureApiKeys() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (docSnap.exists()) return docSnap.data();
        return null;
    } catch (error) { return null; }
}

// ==========================================
// إرسال واتساب (WaPilot API) الرابط الأصلي
// ==========================================
async function sendWhatsAppToParent(parentPhone, msgText) {
    if(!parentPhone || parentPhone === "غير متوفر") return;
    
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) return;

    const instanceId = keys.wapilot_instance; 
    const token = keys.wapilot_token;
    
    let formattedPhone = parentPhone.startsWith('0') ? '2' + parentPhone : parentPhone;
    
    // الرابط اللي إنت طلبته بالظبط
    var url = "https://api.wapilot.net/api/v2/" + instanceId + "/send-message";
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                phone: formattedPhone,
                message: msgText
            })
        });
        console.log("تم إرسال إشعار الواتساب عبر WaPilot بنجاح.");
    } catch(err) { console.error("فشل إرسال الواتساب:", err); }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id') ? urlParams.get('id').trim() : null;
    const loggedInPhone = localStorage.getItem('studentPhone');

    if (!loggedInPhone || !courseId) return window.location.replace("login.html");
    const watermark = document.getElementById('studentWatermark');
    if (watermark) watermark.textContent = loggedInPhone;

    verifyAccessAndLoadCourse(loggedInPhone, courseId);
});

function extractVimeoID(url) {
    if(!url) return null;
    const regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

let currentExamData = null;
let currentExamId = null;

async function verifyAccessAndLoadCourse(phone, courseId) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return window.location.replace("login.html");

        const studentData = querySnapshot.docs[0].data();
        const currentStudentId = querySnapshot.docs[0].id;
        const myCourses = studentData.myCourses || [];

        const securityOverlay = document.getElementById('securityOverlay');

        if (!myCourses.includes(courseId)) {
            if(securityOverlay) securityOverlay.style.display = 'flex';
            return; 
        }
        if(securityOverlay) securityOverlay.style.display = 'none';

        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            document.getElementById('courseTitle').textContent = courseData.title || "حصة بدون عنوان";
            document.getElementById('courseInstructor').textContent = courseData.instructor || "أستاذ المادة";
            
            if(courseData.pdfUrl && courseData.pdfUrl.trim() !== "") {
                document.getElementById('pdfSection').style.display = 'block';
                document.getElementById('btnDownloadPdf').href = courseData.pdfUrl;
            }

            // فحص الامتحان (الشاشة الكاملة)
            const examOverlay = document.getElementById('examFullscreenOverlay');
            const examArea = document.getElementById('examContentArea');

            if (courseData.requiredExamId) {
                currentExamId = courseData.requiredExamId;
                const submissionId = `${currentStudentId}_${currentExamId}`;
                const subSnap = await getDoc(doc(db, "exam_submissions", submissionId));
                
                let examStatus = null;
                if(subSnap.exists()) examStatus = subSnap.data().status; 

                if(examStatus === 'passed') {
                    examOverlay.style.display = 'none';
                    loadVideoPlayer(courseData.videoUrl);
                } 
                else if(examStatus === 'failed') {
                    examOverlay.style.display = 'flex';
                    examArea.innerHTML = `
                        <div class="status-box">
                            <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                            <h2 style="color: #f8fafc;">لقد رسبت في هذا الامتحان</h2>
                            <p style="color: #94a3b8; font-size: 20px;">درجتك: ${subSnap.data().score}%</p>
                            <p style="color: #cbd5e1; font-weight: 800; margin-top: 20px;">الفيديو مغلق. يرجى مراجعة السكرتارية لإعادة الامتحان.</p>
                            <button onclick="window.location.href='student-dashboard.html'" class="btn-submit-exam" style="background:#3b82f6; width:auto; padding:10px 30px;">العودة للوحة التحكم</button>
                        </div>
                    `;
                }
                else if(examStatus === 'pending') {
                    examOverlay.style.display = 'flex';
                    examArea.innerHTML = `
                        <div class="status-box">
                            <i class="fas fa-hourglass-half" style="color: #f59e0b;"></i>
                            <h2 style="color: #f8fafc;">جاري تصحيح إجاباتك</h2>
                            <p style="color: #94a3b8; font-size: 18px;">الامتحان يحتوي على أسئلة مقالية ويتم مراجعتها من قبل المدرس.</p>
                            <p style="color: #cbd5e1; font-weight: 800; margin-top: 20px;">سيتم فتح الحصة تلقائياً عند اجتيازك.</p>
                            <button onclick="window.location.href='student-dashboard.html'" class="btn-submit-exam" style="background:#3b82f6; width:auto; padding:10px 30px;">العودة للوحة التحكم</button>
                        </div>
                    `;
                }
                else {
                    examOverlay.style.display = 'flex';
                    const examDoc = await getDoc(doc(db, "exams", currentExamId));
                    if(examDoc.exists()) {
                        currentExamData = examDoc.data();
                        renderExamForm(currentExamData.questions, examArea);
                        
                        document.getElementById('studentExamForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            await submitExam(currentExamData, studentData, currentStudentId, courseData, submissionId);
                        });
                    }
                }
            } else {
                examOverlay.style.display = 'none';
                loadVideoPlayer(courseData.videoUrl);
            }
        }
    } catch (error) { console.error("خطأ:", error); }
}

function renderExamForm(questions, container) {
    let html = `
        <div class="exam-header-title">
            <i class="fas fa-clipboard-list"></i>
            <h2>امتحان الحصة</h2>
            <p>يجب اجتياز الامتحان لتتمكن من مشاهدة الفيديو</p>
        </div>
        <form id="studentExamForm" class="exam-form-container">`;
                
    questions.forEach((q, index) => {
        html += `<div class="exam-question">
                    <h4 class="exam-q-text">السؤال ${index + 1}: ${q.text}</h4>`;
        if(q.imageUrl) html += `<img src="${q.imageUrl}" class="exam-q-img">`;
        
        if (q.type === 'mcq') {
            q.options.forEach((opt, optIndex) => {
                html += `<label class="mcq-option"><input type="radio" name="q_${index}" value="${optIndex}" required> ${opt}</label>`;
            });
        } else {
            html += `<textarea class="essay-input" name="q_${index}" rows="5" placeholder="اكتب إجابتك النموذجية هنا..." required></textarea>`;
        }
        html += `</div>`;
    });
    
    html += `<button type="submit" class="btn-submit-exam" id="btnSubmitForm">تسليم الامتحان <i class="fas fa-paper-plane"></i></button></form>`;
    container.innerHTML = html;
}

async function submitExam(examData, student, studentId, course, submissionId) {
    document.getElementById('btnSubmitForm').innerText = "جاري التصحيح والتسجيل... ⏳";
    document.getElementById('btnSubmitForm').disabled = true;

    let mcqTotal = 0;
    let correctCount = 0;
    let hasEssay = false;
    let studentAnswers = [];

    examData.questions.forEach((q, index) => {
        if(q.type === 'mcq') {
            mcqTotal++;
            const selected = document.querySelector(`input[name="q_${index}"]:checked`).value;
            studentAnswers.push({ qText: q.text, type: 'mcq', answer: selected, correct: q.correctIndex });
            if(parseInt(selected) === q.correctIndex) correctCount++;
        } else {
            hasEssay = true;
            const answer = document.querySelector(`textarea[name="q_${index}"]`).value;
            studentAnswers.push({ qText: q.text, type: 'essay', answer: answer });
        }
    });

    let score = mcqTotal > 0 ? Math.round((correctCount / mcqTotal) * 100) : 0;
    let finalStatus = 'pending'; 
    
    if(!hasEssay) {
        finalStatus = score >= 50 ? 'passed' : 'failed';
    }

    // حفظ النتيجة وتحديث المشاهدات
    await setDoc(doc(db, "exam_submissions", submissionId), {
        studentId: studentId,
        studentName: student.fullName,
        studentPhone: student.studentPhone,
        parentPhone: student.parentPhone || "غير متوفر",
        examId: currentExamId,
        examTitle: examData.title,
        courseId: course.courseId || "unknown",
        courseTitle: course.title,
        instructor: course.instructor,
        answers: studentAnswers,
        score: score,
        status: finalStatus,
        hasEssay: hasEssay,
        submittedAt: new Date().toISOString()
    });

    let waMsg = `مرحباً ولي أمر الطالب/ة: ${student.fullName}\nقام الطالب بأداء امتحان (${examData.title}) لحصة (${course.title}).\n`;
    if(finalStatus === 'passed') waMsg += `النتيجة: ناجح ✅ (الدرجة: ${score}%)\nتم فتح الحصة للطالب.`;
    else if(finalStatus === 'failed') waMsg += `النتيجة: راسب ❌ (الدرجة: ${score}%)\nتم إغلاق الحصة، يرجى المتابعة.`;
    else waMsg += `النتيجة: قيد المراجعة ⏳\nيحتوي الامتحان على أسئلة مقالية سيصححها المدرس.`;
    
    await sendWhatsAppToParent(student.parentPhone, waMsg);

    location.reload(); 
}

function loadVideoPlayer(videoUrl) {
    const vidContainer = document.getElementById('videoContainer');
    const vimeoID = extractVimeoID(videoUrl);
    if (vimeoID && vidContainer) {
        vidContainer.innerHTML = `<div class="plyr__video-embed" id="player"><iframe src="https://player.vimeo.com/video/${vimeoID}?loop=false&amp;byline=false&amp;portrait=false&amp;title=false&amp;speed=true&amp;transparent=0&amp;gesture=media" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`;
        setTimeout(() => { new Plyr('#player', { speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }}); }, 100);
    } else {
        vidContainer.innerHTML = `<p style="color:#ef4444; padding:30px; text-align:center;">رابط الفيديو غير متوفر.</p>`;
    }
}
