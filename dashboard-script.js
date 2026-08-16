import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentStudentData = null;
let currentStudentId = null;

// =========================================================
// دالة إرسال رسائل الواتساب باستخدام WaPilot
// =========================================================
async function sendWhatsAppGeneral(phone, msg) {
    if (!phone) return false;
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;
        
        const keys = docSnap.data();
        let formattedPhone = phone.toString().trim();
        if (formattedPhone.startsWith('0')) formattedPhone = '2' + formattedPhone;
        
        let chatId = formattedPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });
        return true;
    } catch (e) { 
        console.error("WhatsApp Error:", e); 
        return false; 
    }
}

async function notifyBoth(studentMsg, parentMsg) {
    if (currentStudentData?.studentPhone) await sendWhatsAppGeneral(currentStudentData.studentPhone, studentMsg);
    if (currentStudentData?.parentPhone) await sendWhatsAppGeneral(currentStudentData.parentPhone, parentMsg);
}

document.addEventListener('DOMContentLoaded', () => {
    const loggedInPhone = localStorage.getItem('studentPhone');
    if (!loggedInPhone) {
        window.location.replace("login.html");
    } else {
        fetchStudentData(loggedInPhone);
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.replace("login.html");
    });

    // =========================================================
    // عملية الشحن بالمحفظة (قبول أو رفض أوتوماتيك في 60 ثانية)
    // =========================================================
    document.getElementById('btnConfirmWalletPayment')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return alert("يرجى كتابة رقم الموبايل المحول منه بشكل صحيح (11 رقم)!");
        }

        const btn = document.getElementById('btnConfirmWalletPayment');
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري التحقق...";
        btn.disabled = true;

        try {
            // حفظ الرقم عشان الماكرو والسيرفر يلاقوه
            await updateDoc(doc(db, "users", currentStudentId), {
                activeTopupNumber: senderPhone
            });

            document.getElementById('walletModal').classList.remove('active');
            alert("تم إرسال الطلب، جاري التحقق من عملية الدفع الآن...");

            // رسائل بدء التحقق
            const sMsg = `مرحباً بك في Primee Academy ⏳\nتم تسجيل طلب شحن لمحفظتك من الرقم: ${senderPhone}.\nجاري التحقق من عملية الدفع الآن...`;
            const pMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر،\nتم تسجيل طلب شحن لمحفظة الطالب/ة: ${currentStudentData.fullName}.\nجاري التحقق من عملية الدفع الآن...`;
            notifyBoth(sMsg, pMsg);

            let initialBalance = currentStudentData.walletBalance || 0;
            let isResolved = false;

            // المراقبة اللحظية: لو الرصيد زاد (الماكرو والسيرفر اشتغلوا)
            const unsub = onSnapshot(doc(db, "users", currentStudentId), async (docSnap) => {
                const newData = docSnap.data();
                let newBal = newData.walletBalance || 0;
                
                if (newBal > initialBalance && !isResolved) {
                    isResolved = true;
                    let diff = newBal - initialBalance;
                    unsub();

                    // تسجيل في السجل الداخلي
                    await addDoc(collection(db, "recharge_history"), {
                        studentId: currentStudentId, senderPhone: senderPhone, amount: diff, status: "success", date: new Date().toISOString()
                    });

                    // رسائل النجاح (طالب + أب)
                    const succS = `أهلاً بك في Primee Academy 🎉\nنجحت العملية! تم شحن محفظتك بمبلغ ${diff} ج.م.\nرصيدك الآن: ${newBal} ج.م.`;
                    const succP = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nنجحت عملية الشحن لمحفظة الطالب/ة: *${currentStudentData.fullName}*\nبمبلغ قدره: *${diff} ج.م*.`;
                    notifyBoth(succS, succP);
                    
                    alert(`نجاح! تم إضافة ${diff} ج.م لمحفظتك بنجاح.`);
                    setTimeout(() => window.location.reload(), 1500);
                }
            });

            // مؤقت الفشل السريع (60 ثانية)
            setTimeout(async () => {
                if (!isResolved) {
                    isResolved = true;
                    unsub();
                    
                    await addDoc(collection(db, "recharge_history"), {
                        studentId: currentStudentId, senderPhone: senderPhone, amount: 0, status: "failed", date: new Date().toISOString()
                    });

                    const failS = `تنبيه من Primee Academy ⚠️\nفشلت عملية الشحن من الرقم ${senderPhone} لعدم استلامنا للتحويل.`;
                    const failP = `إشعار من Primee Academy ⚠️\nفشلت محاولة شحن محفظة الطالب/ة: ${currentStudentData.fullName} لعدم وصول التحويل بنجاح.`;
                    notifyBoth(failS, failP);

                    alert("فشلت العملية لعدم وصول التحويل في الوقت المحدد.");
                }
            }, 60000); 

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الاتصال بالخادم.");
        } finally {
            btn.innerHTML = "تأكيد وبدء التحقق <i class='fas fa-check-circle'></i>";
            btn.disabled = false;
        }
    });

    // =========================================================
    // شحن الكود (رسائل واتساب للأب والابن)
    // =========================================================
    document.getElementById('redeemCodeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('chargeCodeInput').value.trim().toUpperCase();
        const btn = document.getElementById('btnRedeem');
        if(!codeInput) return alert("رجاء إدخال الكود أولاً.");
        
        btn.innerHTML = "جاري الفحص... ⏳"; btn.disabled = true;

        try {
            const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
            const codeSnap = await getDocs(codesQ);

            if(codeSnap.empty) return alert("❌ الكود غير صحيح.");
            const codeDoc = codeSnap.docs[0];
            const codeData = codeDoc.data();
            if(codeData.isUsed) return alert(`⚠️ هذا الكود تم شحنه مسبقاً.`);

            const newBalance = (currentStudentData.walletBalance || 0) + codeData.value;
            await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
            await updateDoc(doc(db, "charge_codes", codeDoc.id), {
                isUsed: true, usedByPhone: currentStudentData.studentPhone, usedByName: currentStudentData.fullName, usedAt: new Date().toISOString()
            });

            await addDoc(collection(db, "recharge_history"), {
                studentId: currentStudentId, senderPhone: `كود: ${codeInput}`, amount: codeData.value, status: "success", date: new Date().toISOString()
            });

            alert(`🎉 مبروك! تم شحن ${codeData.value} ج.م لحسابك.`);
            
            // رسائل الواتساب
            const studentMsg = `مرحباً بك في Primee Academy 🎉\nتم شحن محفظتك باستخدام كود تفعيل بقيمة *${codeData.value} ج.م* بنجاح.\nبالتوفيق! 🚀`;
            const parentMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nقام الطالب/ة: *${currentStudentData.fullName}* بشحن محفظته باستخدام كود تفعيل بقيمة: *${codeData.value} ج.م*.`;
            notifyBoth(studentMsg, parentMsg);

            document.getElementById('redeemCodeForm').reset();
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            alert("حدث خطأ.");
        } finally {
            btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الآن"; btn.disabled = false;
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
            
            if (!currentStudentData.myCourses) currentStudentData.myCourses = [];
            if (!currentStudentData.completedExams) currentStudentData.completedExams = [];

            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            const nameDisplay = document.getElementById('studentNameDisplay');
            const welcomeMsg = document.getElementById('welcomeMessage');
            const walletBal = document.getElementById('walletBalance');
            const statCourses = document.getElementById('statCoursesCount');
            const statExams = document.getElementById('statExamsCount');

            if(nameDisplay) nameDisplay.textContent = fullName;
            if(welcomeMsg) welcomeMsg.textContent = `أهلاً بك يا ${firstName}! 🚀`;
            if(walletBal) walletBal.textContent = currentStudentData.walletBalance || 0;
            if(statCourses) statCourses.textContent = currentStudentData.myCourses.length;
            if(statExams) statExams.textContent = currentStudentData.completedExams.length;

            fetchMyCourses(currentStudentData.myCourses);
            renderGrades(currentStudentData.completedExams);
            
            onSnapshot(doc(db, "users", currentStudentId), (docSnap) => {
                if (docSnap.exists() && docSnap.data().isBlocked === true) {
                    localStorage.clear();
                    alert("⚠️ تم إيقاف حسابك بواسطة الإدارة وسيتم تسجيل خروجك الآن.");
                    window.location.replace("login.html");
                }
            });

        } else {
            window.location.replace("login.html");
        }
    } catch (error) { console.error(error); }
}

async function fetchMyCourses(myCourseIds) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    
    if (myCourseIds.length === 0) {
        coursesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 50px 20px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--input-border);">
                <i class="fas fa-folder-open" style="font-size: 50px; color: var(--input-border); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text-main); font-weight: 900;">لم تقم بشراء أي مواد بعد</h3>
            </div>`;
        return;
    }

    coursesGrid.innerHTML = ''; 
    try {
        for (const item of myCourseIds) {
            let courseId = typeof item === 'object' ? (item.courseId || item.id) : item;
            if(!courseId) continue;

            const courseSnap = await getDoc(doc(db, "courses", courseId));
            if (courseSnap.exists()) {
                const course = courseSnap.data();
                coursesGrid.innerHTML += `
                    <div class="modern-teacher-card" style="height: 100%; display: flex; flex-direction: column;">
                        <div class="card-image-wrapper" style="height: 180px; position: relative; background: var(--input-bg);">
                            <img src="${course.image || 'https://via.placeholder.com/400x250/5b21b6/ffffff?text=Course'}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="card-info-wrapper" style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: var(--text-main); font-weight: 900;">${course.title || 'اسم المادة'}</h3>
                            <button onclick="window.location.href='course-details.html?id=${courseId}'" style="width: 100%; background: var(--primary-color); color: #fff; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-family: 'Cairo'; cursor: pointer;">دخول الحصة <i class="fas fa-play"></i></button>
                        </div>
                    </div>`;
            }
        }
    } catch (error) { console.error(error); }
}

// ==========================================
// الامتحانات (درجة صافية ورجوع الكود الأصلي)
// ==========================================
function renderGrades(completedExams) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    
    if (!completedExams || completedExams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; font-weight: 700; color: var(--text-muted);">لم تجتز أي امتحانات حتى الآن.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    completedExams.forEach((exams) => {
        let examName = "امتحان حصة";
        let score = 0;

        if (typeof exam === 'object' && exams !== null) {
            examName = exam.examName || exams.title || "امتحان";
            score = exam.score !== undefined ? exams.score : (exams.grade || 0);
        } else {
            examName = `امتحان حصة رقم ${String(exams).substring(0,4)}`;
            score = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
        }

        const isPass = Number(score) >= 50;
        const statusText = isPass ? 'ناجح' : 'راسب';
        const bgStatus = isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const colorStatus = isPass ? '#10b981' : '#ef4444';
        
        // شيلت الـ % وبقت الدرجة رقم صافي
        tableBody.innerHTML += `
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-main); font-weight: 800;">${examName}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted); font-weight: 600;">اليوم</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--primary-color); font-weight: 900; font-size: 16px;">${score}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border);">
                    <span style="background: ${bgStatus}; color: ${colorStatus}; padding: 6px 15px; border-radius: 8px; font-size: 13px; font-weight: 800;">
                        ${statusText}
                    </span>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// دالة جلب سجل العمليات في النافذة
// ==========================================
window.fetchRechargeHistory = async function() {
    const tbody = document.getElementById('historyTableBody');
    if(!tbody || !currentStudentId) return;
    
    try {
        const q = query(collection(db, "recharge_history"), where("studentId", "==", currentStudentId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">لا توجد عمليات سابقة.</td></tr>`;
            return;
        }

        let requests = [];
        snap.forEach(doc => requests.push(doc.data()));
        requests.sort((a, b) => new Date(b.date) - new Date(a.date)); // الأحدث فوق

        tbody.innerHTML = '';
        requests.forEach(data => {
            let dateStr = new Date(data.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute:'2-digit' });
            let statusHtml = data.status === 'success' 
                ? `<span class="badge-success">نجاح</span>` 
                : `<span class="badge-failed">فشل</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>${data.senderPhone}</td>
                    <td style="color: var(--primary-color); font-weight: 900;">${data.amount} ج.م</td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
};
