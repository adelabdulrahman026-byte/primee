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
// دالة إرسال الواتساب (مدمجة بالأكواد الخاصة بك - WaPilot)
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

// دالة الكارت الشيك للرسائل
function showFancyAlert(title, message, isError = false) {
    const modal = document.getElementById('fancyAlertModal');
    const titleEl = document.getElementById('alertTitle');
    const msgEl = document.getElementById('alertMessage');
    const iconEl = document.getElementById('alertIcon');

    titleEl.innerText = title;
    msgEl.innerText = message;
    
    if (isError) {
        iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>';
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
    // تقديم طلب الشحن (والمراقبة الأوتوماتيكية)
    // ==========================================
    document.getElementById('btnConfirmTopupNumber')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return showFancyAlert("خطأ", "يجب كتابة الـ 11 رقم المحول منهم بشكل صحيح!", true);
        }

        const btn = document.getElementById('btnConfirmTopupNumber');
        btn.innerHTML = "جاري الإرسال... ⏳"; btn.disabled = true;

        try {
            // 1. إنشاء الطلب بحالة "waiting"
            const docRef = await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "waiting", 
                date: new Date().toISOString()
            });

            window.closeWalletModal();
            showFancyAlert("جاري انتظار التحويل ⏳", "قم بالتحويل الآن. سيتم إضافة الرصيد لحسابك تلقائياً بمجرد وصول الرسالة لنا.");
            fetchRechargeHistory();

            // 2. إرسال واتساب للطالب إن العملية قيد الانتظار
            let waitMsg = `أهلاً بك في Primee Academy ⏳\nتم تسجيل طلب شحن من الرقم: ${senderPhone}\nالطلب الآن قيد الانتظار، سيتم تأكيد العملية وإضافة الرصيد فور وصول التحويل لنا.\nيرجى عدم التحويل من هذا الرقم مرة أخرى حتى تنتهي العملية الحالية.`;
            sendWhatsAppMessage(currentStudentData.studentPhone, waitMsg);
            
            // 3. مؤقت الفشل الأوتوماتيكي (10 دقائق = 600000 مللي ثانية)
            const failTimeout = setTimeout(async () => {
                await updateDoc(doc(db, "recharge_requests", docRef.id), { status: "failed" });
                
                // إرسال واتساب للطالب بالفشل
                let failMsg = `تنبيه من Primee Academy ⚠️\nفشلت عملية الشحن من الرقم ${senderPhone} لعدم وصول التحويل لنا خلال 10 دقائق.\nإذا كنت قد حولت المبلغ بالفعل، يرجى التواصل مع الدعم الفني.`;
                sendWhatsAppMessage(currentStudentData.studentPhone, failMsg);
            }, 600000); 

            // 4. المراقبة اللحظية (عشان الطالب يشوف النجاح أو الفشل في ساعتها)
            const unsubscribe = onSnapshot(doc(db, "recharge_requests", docRef.id), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const currentStatus = data.status;
                    
                    if (currentStatus === "success") {
                        clearTimeout(failTimeout); // نلغي مؤقت الفشل
                        unsubscribe(); // نوقف المراقبة
                        
                        showFancyAlert("عملية ناجحة 🎉", "وصل التحويل وتم إضافة الرصيد لحسابك بنجاح!");
                        fetchRechargeHistory(); 
                        
                        let amount = data.amount || "المُحول"; // بنجيب المبلغ من الداتا بيز اللي السيرفر حطه
                        
                        // رسالة واتساب للنجاح (للطالب)
                        let successMsgStudent = `أهلاً بك في Primee Academy 🎉\nتم بنجاح شحن رصيدك بمبلغ ${amount} ج.م.\nبالتوفيق في دراستك! 🚀`;
                        sendWhatsAppMessage(currentStudentData.studentPhone, successMsgStudent);
                        
                        // رسالة واتساب للنجاح (لولي الأمر) 🚨 الميزة اللي طلبتها
                        if (currentStudentData.parentPhone) {
                            let successMsgParent = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر،\nتم بنجاح شحن محفظة الطالب/ة (${currentStudentData.fullName}) بمبلغ ${amount} ج.م.\nشكراً لثقتكم بنا.`;
                            sendWhatsAppMessage(currentStudentData.parentPhone, successMsgParent);
                        }

                        setTimeout(() => window.location.reload(), 3000); 
                    } 
                    else if (currentStatus === "failed") {
                        clearTimeout(failTimeout);
                        unsubscribe();
                        showFancyAlert("فشلت العملية ❌", "لم يصل التحويل في الوقت المحدد، تم إلغاء الطلب.", true);
                        fetchRechargeHistory();
                    }
                }
            });

        } catch (error) {
            console.error(error);
            showFancyAlert("عذراً", "حدث خطأ، حاول مرة أخرى.", true);
        } finally {
            btn.innerHTML = "إرسال طلب الشحن <i class='fas fa-check'></i>"; 
            btn.disabled = false;
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
            
            if(document.getElementById('walletBalance')) {
                document.getElementById('walletBalance').textContent = currentStudentData.walletBalance || 0;
            }
            
            const myCoursesData = currentStudentData.myCourses || [];
            const completedExamsData = currentStudentData.completedExams || [];

            fetchMyCoursesSafe(myCoursesData);
            renderGradesSafe(completedExamsData);
            fetchRechargeHistory(); 
        }
    } catch (error) { console.error(error); }
}

async function fetchMyCoursesSafe(coursesArray) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    if (!Array.isArray(coursesArray) || coursesArray.length === 0) {
        coursesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 50px 20px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--input-border);"><i class="fas fa-folder-open" style="font-size: 50px; color: var(--input-border); margin-bottom: 15px;"></i><h3 style="color: var(--text-main); font-weight: 900;">لم تقم بشراء أي مواد بعد</h3></div>`;
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
                    <div class="modern-teacher-card" style="height: 100%; display: flex; flex-direction: column;">
                        <div class="card-info-wrapper" style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: var(--text-main); font-weight: 900;">${course.title || 'اسم المادة'}</h3>
                            <button class="btn-modern-view" onclick="window.location.href='course-details.html?id=${courseId}'" style="width: 100%; background: var(--primary-color); color: #fff; border: none; padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer;">دخول الحصة <i class="fas fa-play"></i></button>
                        </div>
                    </div>`;
            }
        } catch(err) { console.error(err); }
    }
}

function renderGradesSafe(examsArray) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    if (!Array.isArray(examsArray) || examsArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">لم تمتحن أي امتحانات حتى الآن.</td></tr>`;
        return;
    }
    tableBody.innerHTML = '';
    examsArray.forEach((exam, index) => {
        let examName = `امتحان رقم ${index + 1}`;
        let score = "تم الحضور";
        if (typeof exam === 'object') {
            examName = exam.examName || exam.title || exam.name || examName;
            score = exam.score || exam.grade || exam.result || score;
        } else if (typeof exam === 'string') {
            examName = `امتحان (ID: ${exam.substring(0, 5)})`;
        }
        tableBody.innerHTML += `<tr><td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #fff; font-weight: 800;">${examName}</td><td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #10b981; font-weight: 900;">${score}</td></tr>`;
    });
}

async function fetchRechargeHistory() {
    const tbody = document.getElementById('rechargeHistoryBody');
    if(!tbody) return;
    try {
        const q = query(collection(db, "recharge_requests"), where("studentId", "==", currentStudentId));
        const snap = await getDocs(q);
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">لا توجد طلبات شحن سابقة.</td></tr>`;
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            let statusHtml = '';
            let dateStr = new Date(data.date).toLocaleDateString('ar-EG');
            if(data.status === 'waiting') statusHtml = `<span class="status-badge status-waiting"><i class="fas fa-spinner fa-spin"></i> جاري الانتظار</span>`;
            else if(data.status === 'success') statusHtml = `<span class="status-badge status-success"><i class="fas fa-check"></i> ناجح</span>`;
            else if(data.status === 'failed') statusHtml = `<span class="status-badge status-failed"><i class="fas fa-times"></i> فشل</span>`;
            tbody.innerHTML += `<tr><td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #fff; font-weight: bold;">${data.senderPhone}</td><td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted);">${dateStr}</td><td style="padding: 15px; border-bottom: 1px solid var(--input-border);">${statusHtml}</td></tr>`;
        });
    } catch (error) { console.error(error); }
}

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
