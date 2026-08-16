import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAI4YyzFKOYRyceGI1h-sMOt84AFS7L1Do",
    authDomain: "academy-444b6.firebaseapp.com",
    projectId: "academy-444b6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentStudentData = null;
let currentStudentId = null;

// ==========================================
// دالة الواتساب (للطالب وولي الأمر)
// ==========================================
async function sendWhatsAppMessage(phone, msg) {
    if (!phone) return false;
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;
        
        const keys = docSnap.data();
        let formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
        let chatId = formattedPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });
        return true;
    } catch (e) { console.error("WhatsApp Error:", e); return false; }
}

async function notifyBoth(studentMsg, parentMsg) {
    if(currentStudentData.studentPhone) await sendWhatsAppMessage(currentStudentData.studentPhone, studentMsg);
    if(currentStudentData.parentPhone) await sendWhatsAppMessage(currentStudentData.parentPhone, parentMsg);
}

function showFancyAlert(title, message, isError = false) {
    const modal = document.getElementById('fancyAlertModal');
    const titleEl = document.getElementById('alertTitle');
    const msgEl = document.getElementById('alertMessage');
    const iconEl = document.getElementById('alertIcon');
    titleEl.innerText = title;
    msgEl.innerText = message;
    if (isError) {
        iconEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
        titleEl.style.color = '#ef4444';
    } else {
        iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        titleEl.style.color = '#10b981';
    }
    modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const loggedInPhone = localStorage.getItem('studentPhone');
    if (!loggedInPhone) { window.location.replace("login.html"); } 
    else { fetchStudentData(loggedInPhone); }

    // ==========================================
    // عملية الدفع (بدون مراجعة في الواجهة - قبول أو رفض فقط)
    // ==========================================
    document.getElementById('btnConfirmTopupNumber')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return showFancyAlert("خطأ", "يجب كتابة رقم الهاتف (11 رقم) بشكل صحيح!", true);
        }

        window.closeWalletModal();
        const checkingOverlay = document.getElementById('checkingOverlay');
        checkingOverlay.classList.add('active'); // إظهار شاشة التحميل الدوارة

        try {
            // إضافة الطلب للداتا بيز
            const docRef = await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "waiting", 
                date: new Date().toISOString()
            });

            // لو الفلوس مجتش خلال 5 دقايق (300,000 مللي ثانية) هيقلب فاشل لوحده
            const failTimeout = setTimeout(async () => {
                await updateDoc(doc(db, "recharge_requests", docRef.id), { status: "failed" });
                
                checkingOverlay.classList.remove('active');
                showFancyAlert("فشلت العملية ❌", "لم يصل التحويل الخاص بك.", true);
                fetchRechargeHistory(); // تحديث الجدول عشان يعرض "فشل"
                
                // رسائل الواتساب للفشل
                let sMsg = `تنبيه من Primee Academy ⚠️\nفشلت عملية شحن المحفظة من الرقم ${senderPhone} لعدم وصول التحويل.`;
                let pMsg = `إشعار من Primee Academy ⚠️\nالسيد ولي الأمر،\nفشلت محاولة شحن محفظة الطالب/ة (${currentStudentData.fullName}) لعدم وصول التحويل بنجاح.`;
                notifyBoth(sMsg, pMsg);

            }, 300000); 

            // المراقبة اللحظية: لو الماكرو بعت والسيرفر خلاه (ناجح)
            const unsubscribe = onSnapshot(doc(db, "recharge_requests", docRef.id), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.status === "success") {
                        clearTimeout(failTimeout);
                        unsubscribe();
                        
                        checkingOverlay.classList.remove('active');
                        showFancyAlert("عملية ناجحة 🎉", "وصل التحويل وتم إضافة الرصيد لحسابك بنجاح!");
                        fetchRechargeHistory(); // تحديث الجدول عشان يعرض "نجاح"
                        
                        let amount = data.amount || "المُحول";
                        
                        // رسائل الواتساب للنجاح للطالب وولي الأمر
                        let sMsg = `أهلاً بك في Primee Academy 🎉\nتم بنجاح شحن رصيدك بمبلغ ${amount} ج.م من الرقم ${senderPhone}.\nبالتوفيق! 🚀`;
                        let pMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر،\nتم بنجاح شحن محفظة الطالب/ة (${currentStudentData.fullName}) بمبلغ ${amount} ج.م.\nشكراً لثقتكم بنا.`;
                        notifyBoth(sMsg, pMsg);

                        setTimeout(() => window.location.reload(), 3000); 
                    }
                    else if(data.status === "failed") {
                        clearTimeout(failTimeout);
                        unsubscribe();
                        checkingOverlay.classList.remove('active');
                        showFancyAlert("فشلت العملية ❌", "تم رفض العملية لعدم وصول التحويل.", true);
                        fetchRechargeHistory();
                    }
                }
            });

        } catch (error) {
            checkingOverlay.classList.remove('active');
            showFancyAlert("عذراً", "حدث خطأ بالشبكة.", true);
        }
    });
});

async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            currentStudentId = querySnapshot.docs[0].id;
            currentStudentData = querySnapshot.docs[0].data();
            if(document.getElementById('walletBalance')) document.getElementById('walletBalance').textContent = currentStudentData.walletBalance || 0;
            
            fetchMyCoursesSafe(currentStudentData.myCourses);
            renderGradesSafe(currentStudentData.completedExams);
            fetchRechargeHistory(); 
        }
    } catch (error) { console.error(error); }
}

// ==========================================
// تصميم الكورسات الفخم والآمن
// ==========================================
async function fetchMyCoursesSafe(coursesArray) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    if (!coursesArray || !Array.isArray(coursesArray) || coursesArray.length === 0) {
        coursesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed #334155;"><i class="fas fa-folder-open" style="font-size: 50px; color: #334155; margin-bottom: 15px;"></i><h3 style="color: #94a3b8; font-weight: 800;">لم تقم بشراء مواد بعد.</h3></div>`;
        return;
    }
    coursesGrid.innerHTML = ''; 
    for (let item of coursesArray) {
        let courseId = typeof item === 'object' ? (item.courseId || item.id) : item;
        if (!courseId) continue;
        try {
            const courseSnap = await getDoc(doc(db, "courses", courseId));
            if (courseSnap.exists()) {
                const course = courseSnap.data();
                coursesGrid.innerHTML += `
                    <div class="premium-course-card">
                        <img src="${course.image || 'https://via.placeholder.com/400x200/0f172a/ffffff?text=Course'}" class="premium-course-img" alt="Course">
                        <div style="padding: 20px;">
                            <h3 style="color: #f8fafc; font-size: 18px; font-weight: 900; margin: 0 0 15px 0;">${course.title || 'اسم المادة'}</h3>
                            <button onclick="window.location.href='course-details.html?id=${courseId}'" class="btn-play-course">دخول الحصة <i class="fas fa-play-circle"></i></button>
                        </div>
                    </div>`;
            }
        } catch(err) {}
    }
}

// ==========================================
// الامتحانات بتظهر بشكل قاطع وآمن
// ==========================================
function renderGradesSafe(examsArray) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    if (!examsArray || !Array.isArray(examsArray) || examsArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #64748b;">لم يتم تسجيل امتحانات بعد.</td></tr>`;
        return;
    }
    tableBody.innerHTML = '';
    examsArray.forEach((exam, index) => {
        let examName = `امتحان ${index + 1}`;
        let score = "تم الحضور";
        if (typeof exam === 'object' && exam !== null) {
            examName = exam.examName || exam.title || exam.name || examName;
            score = exam.score || exam.grade || exam.result || score;
        } else if (typeof exam === 'string') {
            examName = `امتحان ${exam}`; // هيعرض الكلمة كاملة بدل ما يقصها
        }
        tableBody.innerHTML += `<tr><td>${examName}</td><td style="color: #10b981; font-weight: 900;">${score}</td></tr>`;
    });
}

// ==========================================
// سجل الشحن (بدون قيد المراجعة - يعرض نجاح أو فشل فقط)
// ==========================================
async function fetchRechargeHistory() {
    const tbody = document.getElementById('rechargeHistoryBody');
    if(!tbody) return;
    try {
        const q = query(collection(db, "recharge_requests"), where("studentId", "==", currentStudentId));
        const snap = await getDocs(q);
        
        let hasCompleted = false;
        tbody.innerHTML = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            let statusHtml = '';
            let dateStr = new Date(data.date).toLocaleDateString('ar-EG');
            
            // يعرض اللي خلص بس (نجاح أو فشل)
            if(data.status === 'success') {
                statusHtml = `<span class="status-badge status-success"><i class="fas fa-check"></i> نجاح</span>`;
                hasCompleted = true;
            } else if(data.status === 'failed') {
                statusHtml = `<span class="status-badge status-failed"><i class="fas fa-times"></i> فشل</span>`;
                hasCompleted = true;
            }

            if (statusHtml !== '') {
                tbody.innerHTML += `<tr><td>${data.senderPhone}</td><td>${dateStr}</td><td>${statusHtml}</td></tr>`;
            }
        });

        if (!hasCompleted) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b;">لا توجد عمليات مكتملة.</td></tr>`;
        }
    } catch (error) { console.error(error); }
}

// شحن الكود
document.getElementById('redeemCodeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById('chargeCodeInput').value.trim().toUpperCase();
    const btn = document.getElementById('btnRedeem');
    if(!codeInput) return;
    btn.innerHTML = "جاري الفحص... ⏳"; btn.disabled = true;
    try {
        const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
        const codeSnap = await getDocs(codesQ);
        if(codeSnap.empty) return showFancyAlert("عذراً", "الكود غير صحيح.", true);
        const codeDoc = codeSnap.docs[0];
        const codeData = codeDoc.data();
        if(codeData.isUsed) return showFancyAlert("تنبيه", "هذا الكود تم شحنه مسبقاً.", true);
        const newBalance = (currentStudentData.walletBalance || 0) + codeData.value;
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        await updateDoc(doc(db, "charge_codes", codeDoc.id), { isUsed: true, usedAt: new Date().toISOString() });
        showFancyAlert("عملية ناجحة 🎉", `تم شحن ${codeData.value} ج.م بنجاح.`);
        document.getElementById('redeemCodeForm').reset();
        setTimeout(() => { window.location.reload(); }, 2500);
    } catch (error) {
        showFancyAlert("خطأ", "حدث خطأ بالخادم.", true);
    } finally {
        btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; btn.disabled = false;
    }
});
