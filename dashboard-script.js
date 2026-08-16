import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// دالة إرسال رسائل الواتساب (باستخدام API)
// ==========================================
async function sendWhatsAppMessage(phone, message) {
    // 🚨 ضع هنا إعدادات الـ API الخاص بك (مثال: UltraMsg أو GreenAPI)
    // لو معندكش API حالياً، الدالة دي مش هتوقف الموقع، هتطبع في الكونسول بس لحد ما تركب الـ API
    const instanceId = "YOUR_INSTANCE_ID"; 
    const token = "YOUR_TOKEN"; 
    
    try {
        /* مثال كود الإرسال الفعلي (فك التعليق لما تحط بياناتك):
        await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                token: token,
                to: phone,
                body: message
            })
        });
        */
        console.log(`تم إرسال واتساب لـ ${phone}: ${message}`);
    } catch (error) {
        console.error("خطأ في إرسال الواتساب:", error);
    }
}

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
    // تقديم طلب الشحن (حفظ في قاعدة البيانات)
    // ==========================================
    document.getElementById('btnConfirmTopupNumber')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return showFancyAlert("خطأ", "يجب كتابة الـ 11 رقم المحول منهم بشكل صحيح!", true);
        }

        const btn = document.getElementById('btnConfirmTopupNumber');
        btn.innerHTML = "جاري الإرسال... ⏳"; btn.disabled = true;

        try {
            // إضافة الطلب في كولكشن منفصل لتتبع الحالات
            await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "pending", // قيد المراجعة
                date: new Date().toISOString()
            });

            // إرسال واتساب للطالب إن طلبه قيد المراجعة
            const waMsg = `أهلاً بك في منصة Primee 🚀\n\nتم استلام طلب شحن رصيد من الرقم: ${senderPhone}\nحالة الطلب: ⏳ قيد المراجعة.\n\nسيتم إضافة الرصيد لحسابك تلقائياً فور وصول التحويل.`;
            sendWhatsAppMessage(currentStudentData.studentPhone, waMsg);

            window.closeWalletModal();
            showFancyAlert("تم استلام طلبك!", "طلبك الآن (قيد المراجعة)، سيتم إضافة الرصيد تلقائياً بمجرد وصول التحويل.");
            
            // تحديث جدول العمليات
            fetchRechargeHistory();

        } catch (error) {
            console.error(error);
            showFancyAlert("عذراً", "حدث خطأ، حاول مرة أخرى.", true);
        } finally {
            btn.innerHTML = "إرسال طلب المراجعة <i class='fas fa-check'></i>"; btn.disabled = false;
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
            
            fetchRechargeHistory(); // جلب سجل الطلبات
            renderGradesSafe(currentStudentData.completedExams); // جلب الامتحانات بطريقة آمنة
            
        }
    } catch (error) { console.error(error); }
}

// ==========================================
// جلب سجل عمليات الشحن الخاص بالطالب
// ==========================================
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

            if(data.status === 'pending') statusHtml = `<span class="status-badge status-pending"><i class="fas fa-clock"></i> قيد المراجعة</span>`;
            else if(data.status === 'success') statusHtml = `<span class="status-badge status-success"><i class="fas fa-check"></i> ناجح</span>`;
            else if(data.status === 'failed') statusHtml = `<span class="status-badge status-failed"><i class="fas fa-times"></i> فاشل</span>`;

            tbody.innerHTML += `
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #fff; font-weight: bold;">${data.senderPhone}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted);">${dateStr}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border);">${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

// ==========================================
// إصلاح مشكلة الامتحانات نهائياً
// ==========================================
function renderGradesSafe(examsArray) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    
    // لو المصفوفة فاضية أو مش موجودة
    if (!examsArray || !Array.isArray(examsArray) || examsArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">لم تمتحن أي امتحانات حتى الآن.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    examsArray.forEach((exam, index) => {
        let examName = `امتحان رقم ${index + 1}`;
        let score = "تم الحضور";

        // استخراج البيانات مهما كان شكلها في الداتا بيز
        if (typeof exam === 'object') {
            examName = exam.examName || exam.title || exam.name || examName;
            score = exam.score || exam.grade || exam.result || score;
        } else if (typeof exam === 'string') {
            examName = `امتحان ${exam.substring(0, 5)}...`;
        }

        tableBody.innerHTML += `
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #fff; font-weight: 800;">${examName}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: #10b981; font-weight: 900;">${score}</td>
            </tr>
        `;
    });
}
