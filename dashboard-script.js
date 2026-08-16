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
// دوال إرسال الواتساب السريعة (في الخلفية)
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
        
        fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        }).catch(e => console.log("WaPilot Error:", e));
        
        return true;
    } catch (e) { return false; }
}

async function notifyBoth(studentMsg, parentMsg) {
    if (currentStudentData?.studentPhone) sendWhatsAppGeneral(currentStudentData.studentPhone, studentMsg);
    if (currentStudentData?.parentPhone) sendWhatsAppGeneral(currentStudentData.parentPhone, parentMsg);
}

// =========================================================
// الكارت الشيك للرسائل (بديل الـ Alert)
// =========================================================
function showResultModal(title, desc, isSuccess) {
    const modal = document.getElementById('statusResultModal');
    if(!modal) return;
    
    document.getElementById('statusResultTitle').textContent = title;
    document.getElementById('statusResultDesc').textContent = desc;

    const iconEl = document.getElementById('statusResultIcon');
    if (isSuccess) {
        iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        document.getElementById('statusResultTitle').style.color = '#10b981';
    } else {
        iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
        document.getElementById('statusResultTitle').style.color = '#ef4444';
    }
    modal.classList.add('active');
}

window.closeResultModal = function() {
    document.getElementById('statusResultModal').classList.remove('active');
};

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
    // 1. الدفع عبر المحفظة (فحص فوري - يا نجاح يا فشل)
    // =========================================================
    document.getElementById('btnConfirmWalletPayment')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return showResultModal("تنبيه ⚠️", "يرجى كتابة رقم الموبايل (11 رقم) بشكل صحيح.", false);
        }

        const btn = document.getElementById('btnConfirmWalletPayment');
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الفحص...";
        btn.disabled = true;

        try {
            const transfersQ = query(collection(db, "received_transfers"), where("phone", "==", senderPhone), where("used", "==", false));
            const transfersSnap = await getDocs(transfersQ);

            document.getElementById('walletModal').classList.remove('active');

            if (transfersSnap.empty) {
                // الفلوس لسه موصلتش السيرفر
                await addDoc(collection(db, "recharge_history"), {
                    studentId: currentStudentId, senderPhone: senderPhone, amount: 0, status: "failed", date: new Date().toISOString()
                });

                showResultModal("فشلت العملية ❌", "لم نجد تحويل مسجل باسم هذا الرقم. تأكد من إرسال المبلغ أولاً.", false);
                
                const failS = `تنبيه من Primee Academy ⚠️\nفشلت محاولة شحن محفظتك من الرقم ${senderPhone} لعدم استلامنا لأي تحويل.`;
                const failP = `إشعار من Primee Academy ⚠️\nفشلت محاولة شحن محفظة الطالب/ة: ${currentStudentData.fullName} لعدم وصول التحويل.`;
                notifyBoth(failS, failP);
                
                if(window.fetchRechargeHistory) window.fetchRechargeHistory();
            } else {
                // الفلوس موجودة في الخزنة (السيرفر استلمها من الماكرو)
                const transferDoc = transfersSnap.docs[0];
                const amountAdded = transferDoc.data().amount;

                await updateDoc(doc(db, "received_transfers", transferDoc.id), { used: true, usedBy: currentStudentId });

                const newBalance = (currentStudentData.walletBalance || 0) + amountAdded;
                await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });

                await addDoc(collection(db, "recharge_history"), {
                    studentId: currentStudentId, senderPhone: senderPhone, amount: amountAdded, status: "success", date: new Date().toISOString()
                });

                showResultModal("عملية ناجحة 🎉", `تم إضافة ${amountAdded} ج.م إلى محفظتك بنجاح!`, true);

                const succS = `أهلاً بك في Primee Academy 🎉\nتم بنجاح شحن محفظتك بمبلغ ${amountAdded} ج.م من الرقم ${senderPhone}.\nرصيدك الحالي: ${newBalance} ج.م\nبالتوفيق! 🚀`;
                const succP = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nنجحت عملية الشحن لمحفظة الطالب/ة: *${currentStudentData.fullName}*\nبمبلغ قدره: *${amountAdded} ج.م*.`;
                notifyBoth(succS, succP);

                setTimeout(() => window.location.reload(), 2500);
            }

        } catch (error) {
            console.error(error);
            showResultModal("خطأ ❌", "حدث خطأ أثناء الاتصال بالخادم.", false);
        } finally {
            btn.innerHTML = "تأكيد وبدء التحقق <i class='fas fa-check-circle'></i>";
            btn.disabled = false;
        }
    });

    // =========================================================
    // 2. الشحن بالكود
    // =========================================================
    document.getElementById('redeemCodeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('chargeCodeInput').value.trim().toUpperCase();
        const btn = document.getElementById('btnRedeem');
        
        if(!codeInput) return showResultModal("تنبيه ⚠️", "يرجى إدخال الكود أولاً.", false);
        
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الفحص..."; 
        btn.disabled = true;

        try {
            const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
            const codeSnap = await getDocs(codesQ);

            if(codeSnap.empty) {
                btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; btn.disabled = false;
                return showResultModal("كود خاطئ ❌", "تأكد من كتابة الكود بشكل سليم.", false);
            }

            const codeDoc = codeSnap.docs[0];
            const codeData = codeDoc.data();

            if(codeData.isUsed) {
                btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; btn.disabled = false;
                return showResultModal("تنبيه ⚠️", "هذا الكود تم شحنه مسبقاً.", false);
            }

            const newBalance = (currentStudentData.walletBalance || 0) + codeData.value;
            
            await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
            await updateDoc(doc(db, "charge_codes", codeDoc.id), {
                isUsed: true, usedByPhone: currentStudentData.studentPhone, usedByName: currentStudentData.fullName, usedAt: new Date().toISOString()
            });

            await addDoc(collection(db, "recharge_history"), {
                studentId: currentStudentId, senderPhone: `كود: ${codeInput}`, amount: codeData.value, status: "success", date: new Date().toISOString()
            });

            showResultModal("تم الشحن بنجاح 🎉", `تم شحن ${codeData.value} ج.م لحسابك بنجاح.`, true);
            document.getElementById('redeemCodeForm').reset();
            
            const studentMsg = `مرحباً بك في Primee Academy 🎉\nتم شحن محفظتك باستخدام كود تفعيل بقيمة *${codeData.value} ج.م* بنجاح.\nرصيدك الآن: ${newBalance} ج.م\nبالتوفيق! 🚀`;
            const parentMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nقام الطالب/ة: *${currentStudentData.fullName}* بشحن محفظته باستخدام كود تفعيل بقيمة: *${codeData.value} ج.م*.`;
            notifyBoth(studentMsg, parentMsg);

            setTimeout(() => window.location.reload(), 2000);

        } catch (error) {
            console.error(error);
            btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; btn.disabled = false;
            showResultModal("خطأ ❌", "حدث خطأ بالشبكة، يرجى المحاولة لاحقاً.", false);
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
            
            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            if(document.getElementById('studentNameDisplay')) document.getElementById('studentNameDisplay').textContent = fullName;
            if(document.getElementById('welcomeMessage')) document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            if(document.getElementById('walletBalance')) document.getElementById('walletBalance').textContent = currentStudentData.walletBalance || 0;

            fetchMyCoursesSafe(currentStudentData.myCourses);
            fetchRealExams(); 
            
            onSnapshot(doc(db, "users", currentStudentId), (docSnap) => {
                if (docSnap.exists() && docSnap.data().isBlocked === true) {
                    localStorage.clear();
                    showResultModal("تم الإيقاف", "حسابك موقوف بواسطة الإدارة.", false);
                    setTimeout(() => window.location.replace("login.html"), 2000);
                }
            });

        } else {
            window.location.replace("login.html");
        }
    } catch (error) { console.error(error); }
}

async function fetchMyCoursesSafe(coursesArray) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    
    if (!coursesArray || coursesArray.length === 0) {
        coursesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px; background: rgba(0,0,0,0.02); border-radius: 20px; border: 1px dashed var(--input-border);">
                <h3 style="color: var(--text-muted);">لم تقم بشراء أي مواد بعد</h3>
            </div>`;
        return;
    }
    coursesGrid.innerHTML = ''; 
    for (const item of coursesArray) {
        let courseId = typeof item === 'object' ? (item.courseId || item.id) : item;
        if(!courseId) continue;

        try {
            const courseSnap = await getDoc(doc(db, "courses", courseId));
            if (courseSnap.exists()) {
                const course = courseSnap.data();
                const img = course.image || 'https://via.placeholder.com/400x200/1e293b/3b82f6?text=Course';
                const title = course.title || 'اسم المادة';
                
                coursesGrid.innerHTML += `
                    <div class="recharge-card" style="padding: 0; overflow: hidden; border: 1px solid var(--input-border);">
                        <img src="${img}" style="width: 100%; height: 160px; object-fit: cover; border-bottom: 2px solid var(--input-border);">
                        <div style="padding: 20px;">
                            <h3 style="color: var(--text-main); font-size: 18px; font-weight: 900; margin: 0 0 15px 0;">${title}</h3>
                            <button onclick="window.location.href='course-details.html?id=${courseId}'" style="width: 100%; background: var(--primary-color); color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: 900; font-family: 'Cairo'; cursor: pointer;">دخول الحصة <i class="fas fa-play"></i></button>
                        </div>
                    </div>`;
            }
        } catch (error) {}
    }
}

// ==========================================
// 🚨 حساب درجات الامتحانات (كام من كام) و (ناجح/راسب)
// ==========================================
async function fetchRealExams() {
    const tableBody = document.getElementById('gradesTableBody');
    const statExams = document.getElementById('statExamsCount');
    if(!tableBody) return;
    
    try {
        const q = query(collection(db, "exam_submissions"), where("studentPhone", "==", currentStudentData.studentPhone));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">لم يتم تسجيل امتحانات.</td></tr>`;
            if(statExams) statExams.textContent = "0";
            return;
        }

        if(statExams) statExams.textContent = snap.size;
        tableBody.innerHTML = '';

        snap.forEach(doc => {
            const exam = doc.data();
            const examName = exam.examTitle || exam.examName || "امتحان";
            
            // جلب الدرجة اللي الطالب جابها
            const score = exam.score !== undefined ? Number(exam.score) : (Number(exam.studentScore) || 0);
            
            // جلب الدرجة النهائية (لو مفيش هنفترض إنها 100 عشان نقدر نحسب الـ 50%)
            const fullMark = exam.totalScore || exam.fullMark || exam.totalQuestions || 100; 
            
            const dateStr = exam.date ? new Date(exam.date).toLocaleDateString('ar-EG') : 'اليوم';
            
            // شكل العرض التفصيلي للدرجة (مثال: 5 / 10)
            const scoreDisplay = `${score} / ${fullMark}`;

            // تحديد حالة النجاح والرسوب (أكبر من أو يساوي النص 50% ينجح)
            let isPass = false;
            if (exam.isPassed !== undefined) {
                isPass = exam.isPassed; // لو مسجلها صراحة في الداتا بيز
            } else {
                isPass = (score / fullMark) >= 0.5; // الحساب التلقائي للنص
            }

            const statusText = isPass ? 'ناجح' : 'راسب';
            const bgStatus = isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            const colorStatus = isPass ? '#10b981' : '#ef4444';

            tableBody.innerHTML += `
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-main); font-weight: 800;">${examName}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted); font-weight: 600;">${dateStr}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--primary-color); font-weight: 900; font-size: 16px; direction: ltr; text-align: right;">${scoreDisplay}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border);">
                        <span style="background: ${bgStatus}; color: ${colorStatus}; padding: 6px 15px; border-radius: 8px; font-size: 13px; font-weight: 800;">
                            ${statusText}
                        </span>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("خطأ في جلب الامتحانات:", error); }
}

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
        requests.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';
        requests.forEach(data => {
            let dateStr = new Date(data.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute:'2-digit' });
            let statusHtml = data.status === 'success' 
                ? `<span class="badge-success">نجاح</span>` 
                : `<span class="badge-failed">فشل</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>${data.senderPhone}</td>
                    <td style="color: var(--primary-color); font-weight: 900;">${data.amount || '0'} ج.م</td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
};
