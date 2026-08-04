import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// جلب مفاتيح الأمان (في الخفاء)
// ==========================================
let SECURE_API_KEYS = null;
async function getSecureApiKeys() {
    if (SECURE_API_KEYS) return SECURE_API_KEYS; 
    try {
        const docRef = doc(db, "settings", "api_keys");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            SECURE_API_KEYS = docSnap.data();
            return SECURE_API_KEYS;
        } else {
            console.error("لم يتم العثور على مفاتيح الأمان!");
            return null;
        }
    } catch (error) {
        console.error("خطأ:", error);
        return null;
    }
}

// ==========================================
// إرسال واتساب عبر WaPilot بأمان تام
// ==========================================
async function sendWhatsAppToParent(parentPhone, msgText) {
    if(!parentPhone || parentPhone === "غير متوفر") return;
    
    // سحب المفاتيح من الداتا بيز بأمان
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) {
        console.error("مفاتيح WaPilot غير موجودة في قاعدة البيانات!");
        return;
    }

    const instanceId = keys.wapilot_instance; 
    const token = keys.wapilot_token;
    
    // تظبيط رقم التليفون
    let formattedPhone = parentPhone.startsWith('0') ? '2' + parentPhone : parentPhone;
    
    // الرابط اللي إنت حددته لـ WaPilot
    const url = `https://api.wapilot.net/api/v2/${instanceId}/send-message`;
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // أو حسب التوكن المطلوب في منصة WaPilot
            },
            body: JSON.stringify({
                phone: formattedPhone,
                message: msgText
            })
        });
        console.log("تم إرسال رسالة الواتساب لولي الأمر عبر WaPilot بنجاح.");
    } catch(err) { 
        console.error("فشل إرسال الواتساب:", err); 
    }
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
        const securityMessage = document.getElementById('securityMessage');

        // 1. نظام الحماية
        if (!myCourses.includes(courseId)) {
            if(securityOverlay) securityOverlay.style.display = 'flex';
            if(securityMessage) securityMessage.innerHTML = `يجب شراء هذه الحصة أولاً.`;
            return; 
        }
        if(securityOverlay) securityOverlay.style.display = 'none';

        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            
            document.getElementById('courseTitle').textContent = courseData.title || "حصة بدون عنوان";
            document.getElementById('courseInstructor').textContent = courseData.instructor || "أستاذ المادة";
            
            // تفعيل الـ PDF
            if(courseData.pdfUrl && courseData.pdfUrl.trim() !== "") {
                document.getElementById('pdfSection').style.display = 'block';
                document.getElementById('btnDownloadPdf').href = courseData.pdfUrl;
            }

            // 2. فحص الامتحان
            const examOverlay = document.getElementById('examLockOverlay');
            const examArea = document.getElementById('examContentArea');
            const vidContainer = document.getElementById('videoContainer');

            if (courseData.requiredExamId) {
                currentExamId = courseData.requiredExamId;
                
                // البحث في إجابات الطالب السابقة
                const submissionId = `${currentStudentId}_${currentExamId}`;
                const subSnap = await getDoc(doc(db, "exam_submissions", submissionId));
                
                let examStatus = null;
                if(subSnap.exists()) examStatus = subSnap.data().status; // 'passed', 'failed', 'pending'

                if(examStatus === 'passed') {
                    // ناجح: افتح الفيديو
                    examOverlay.style.display = 'none';
                    loadVideoPlayer(courseData.videoUrl);
                } 
                else if(examStatus === 'failed') {
                    // راسب: بلوك
                    examOverlay.style.display = 'flex';
                    vidContainer.style.display = 'none';
                    examArea.innerHTML = `
                        <div class="status-box">
                            <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                            <h2 style="color: #f8fafc;">لقد رسبت في هذا الامتحان</h2>
                            <p style="color: #94a3b8;">درجتك: ${subSnap.data().score}%</p>
                            <p style="color: #cbd5e1; font-weight: 800;">الفيديو مغلق. يرجى مراجعة السكرتارية لإعادة الامتحان.</p>
                        </div>
                    `;
                }
                else if(examStatus === 'pending') {
                    // معلق (مستني تصحيح المقالي)
                    examOverlay.style.display = 'flex';
                    vidContainer.style.display = 'none';
                    examArea.innerHTML = `
                        <div class="status-box">
                            <i class="fas fa-hourglass-half" style="color: #f59e0b;"></i>
                            <h2 style="color: #f8fafc;">جاري تصحيح إجاباتك</h2>
                            <p style="color: #94a3b8;">الامتحان يحتوي على أسئلة مقالية ويتم مراجعتها من قبل المدرس.</p>
                            <p style="color: #cbd5e1; font-weight: 800;">سيتم فتح الحصة تلقائياً عند اجتيازك.</p>
                        </div>
                    `;
                }
                else {
                    // لم يمتحن: هات الامتحان واعرضه
                    examOverlay.style.display = 'flex';
                    vidContainer.style.display = 'none';
                    
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
                // مفيش امتحان شرطي
                examOverlay.style.display = 'none';
                loadVideoPlayer(courseData.videoUrl);
            }

        }
    } catch (error) { console.error("تفاصيل الخطأ:", error); }
}

function renderExamForm(questions, container) {
    let html = `<div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-file-signature" style="font-size:40px; color:#f59e0b; margin-bottom:10px;"></i>
                    <h3 style="color:#f8fafc; margin:0;">امتحان الحصة</h3>
                </div>
                <form id="studentExamForm" class="exam-form-container">`;
                
    questions.forEach((q, index) => {
        html += `<div class="exam-question">
                    <h4 style="color:#cbd5e1; font-size:16px;">سؤال ${index + 1}: ${q.text}</h4>`;
        if(q.imageUrl) html += `<img src="${q.imageUrl}" class="exam-q-img">`;
        
        if (q.type === 'mcq') {
            q.options.forEach((opt, optIndex) => {
                html += `<label class="mcq-option"><input type="radio" name="q_${index}" value="${optIndex}" required> ${opt}</label>`;
            });
        } else {
            html += `<textarea class="essay-input" name="q_${index}" rows="4" placeholder="اكتب إجابتك هنا..." required></textarea>`;
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
    let finalStatus = 'pending'; // لو فيه مقالي هيفضل معلق
    
    if(!hasEssay) {
        finalStatus = score >= 50 ? 'passed' : 'failed';
    }

    // حفظ النتيجة في الداتا بيز
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

    // إرسال واتساب لولي الأمر
    let waMsg = `مرحباً ولي أمر الطالب/ة: ${student.fullName}\n`;
    waMsg += `قام الطالب بأداء امتحان (${examData.title}) لحصة (${course.title}).\n`;
    
    if(finalStatus === 'passed') waMsg += `النتيجة: ناجح ✅ (الدرجة: ${score}%)\nتم فتح الحصة للطالب.`;
    else if(finalStatus === 'failed') waMsg += `النتيجة: راسب ❌ (الدرجة: ${score}%)\nبرجاء متابعة الطالب، تم إغلاق الحصة.`;
    else waMsg += `النتيجة: قيد المراجعة ⏳\nيحتوي الامتحان على أسئلة مقالية سيصححها المدرس قريباً.`;
    
    await sendWhatsAppToParent(student.parentPhone, waMsg);

    // تحديث الصفحة عشان تعرض النتيجة
    location.reload(); 
}

// تشغيل الفيديو 
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
