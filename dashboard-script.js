import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// دوال الواتساب المتكاملة (WaPilot)
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

function showResultModal(title, desc, isSuccess) {
    const modal = document.getElementById('statusResultModal');
    const iconEl = document.getElementById('statusResultIcon');
    const titleEl = document.getElementById('statusResultTitle');
    const descEl = document.getElementById('statusResultDesc');

    titleEl.textContent = title;
    descEl.textContent = desc;

    if (isSuccess) {
        iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        titleEl.style.color = '#10b981';
    } else {
        iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
        titleEl.style.color = '#ef4444';
    }

    modal.classList.add('active');
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
    // 1. الدفع عبر المحفظة (فحص أوتوماتيك بدون مراجعة)
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
            // تسجيل الطلب في السجل (recharge_requests)
            const docRef = await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "waiting", // הסيرفر هيقرأ الكلمة دي
                date: new Date().toISOString()
            });

            document.getElementById('walletModal').classList.remove('active');
            
            // رسائل بدء التحقق للطالب وولي الأمر
            const sMsg = `مرحباً بك في Primee Academy ⏳\nتم تسجيل طلب شحن لمحفظتك من الرقم: ${senderPhone}.\nجاري التحقق من عملية الدفع الآن...`;
            const pMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر،\nتم تسجيل طلب شحن لمحفظة الطالب/ة: ${currentStudentData.fullName}.\nجاري التحقق من عملية الدفع الآن...`;
            notifyBoth(sMsg, pMsg);

            // المراقبة اللحظية للنتيجة من السيرفر
            const unsub = onSnapshot(doc(db, "recharge_requests", docRef.id), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    if (data.status === "success") {
                        unsub();
                        const amountAdded = data.amount || "المبلغ";
                        showResultModal("تم الشحن بنجاح 🎉", `تم إضافة ${amountAdded} ج.م إلى محفظتك بنجاح!`, true);
                        
                        // رسايل النجاح بيبعتها الـ Cloudflare عشان أسرع وأضمن
                        setTimeout(() => window.location.reload(), 3000);
                    } 
                    else if (data.status === "failed") {
                        unsub();
                        showResultModal("فشلت العملية ❌", "تم رفض عملية الشحن.", false);
                        
                        // رسايل الفشل
                        const failS = `تنبيه من Primee Academy ⚠️\nفشلت عملية الشحن من الرقم ${senderPhone} لعدم استلامنا للتحويل.`;
                        const failP = `إشعار من Primee Academy ⚠️\nفشلت محاولة شحن محفظة الطالب/ة: ${currentStudentData.fullName} لعدم وصول التحويل بنجاح.`;
                        notifyBoth(failS, failP);
                        
                        if(window.fetchRechargeHistory) window.fetchRechargeHistory();
                    }
                }
            });

            // لو السيرفر مغيرش الحالة في خلال 60 ثانية تقلب فشل
            setTimeout(async () => {
                const checkDoc = await getDoc(docRef);
                if(checkDoc.exists() && checkDoc.data().status === "waiting") {
                    await updateDoc(docRef, { status: "failed" });
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
    // 2. الشحن بالكود (تحديث فوري)
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

            await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId, senderPhone: `كود: ${codeInput}`, amount: codeData.value, status: "success", date: new Date().toISOString()
            });

            showResultModal("تم الشحن بنجاح 🎉", `تم شحن ${codeData.value} ج.م لحسابك.`, true);
            
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
            
            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            if(document.getElementById('studentNameDisplay')) document.getElementById('studentNameDisplay').textContent = fullName;
            if(document.getElementById('welcomeMessage')) document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            if(document.getElementById('walletBalance')) document.getElementById('walletBalance').textContent = currentStudentData.walletBalance || 0;
            
            if(document.getElementById('statCoursesCount')) document.getElementById('statCoursesCount').textContent = (currentStudentData.myCourses || []).length;

            fetchMyCoursesSafe(currentStudentData.myCourses);
            
            // 🚨 هنا التعديل: جلب الامتحانات من exam_submissions بدل بيانات الطالب
            fetchRealExams(); 
            
            onSnapshot(doc(db, "users", currentStudentId), (docSnap) => {
                if (docSnap.exists() && docSnap.data().isBlocked === true) {
                    localStorage.clear();
                    alert("⚠️ تم إيقاف حسابك بواسطة الإدارة.");
                    window.location.replace("login.html");
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
        coursesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed #334155;"><h3 style="color: #94a3b8;">لم تقم بشراء أي مواد بعد</h3></div>`;
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
                    <div class="recharge-card" style="padding: 0; overflow: hidden;">
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
// 🚨 جلب الامتحانات من الكولكشن الصحيح
// ==========================================
async function fetchRealExams() {
    const tableBody = document.getElementById('gradesTableBody');
    const statExams = document.getElementById('statExamsCount');
    if(!tableBody) return;
    
    try {
        // البحث عن امتحانات الطالب ده بس
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
            const examName = exam.examTitle || exam.examName || "امتحان حصة";
            const score = exam.score || exam.studentScore || 0;
            const fullMark = exam.totalScore || exam.fullMark || 100;
            const dateStr = exam.date ? new Date(exam.date).toLocaleDateString('ar-EG') : 'اليوم';
            
            // حساب النجاح من 50%
            const isPass = (score / fullMark) * 100 >= 50;
            const statusText = isPass ? 'ناجح' : 'راسب';
            const bgStatus = isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            const colorStatus = isPass ? '#10b981' : '#ef4444';

            // عرض الدرجة رقم صافي زي ما طلبت (مثلاً 15 / 20)
            tableBody.innerHTML += `
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-main); font-weight: 800;">${examName}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted); font-weight: 600;">${dateStr}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--primary-color); font-weight: 900; font-size: 18px; direction: ltr; text-align: right;">${score} / ${fullMark}</td>
                    <td style="padding: 15px; border-bottom: 1px solid var(--input-border);">
                        <span style="background: ${bgStatus}; color: ${colorStatus}; padding: 6px 15px; border-radius: 8px; font-size: 13px; font-weight: 800;">
                            ${statusText}
                        </span>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("خطأ في جلب الامتحانات:", error);
    }
}

// ==========================================
// جلب سجل الشحن في القائمة الجانبية
// ==========================================
window.fetchRechargeHistory = async function() {
    const tbody = document.getElementById('historyTableBody');
    if(!tbody || !currentStudentId) return;
    
    try {
        const q = query(collection(db, "recharge_requests"), where("studentId", "==", currentStudentId));
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
            let statusHtml = '';
            
            if(data.status === 'success') statusHtml = `<span class="badge-success">نجاح</span>`;
            else if(data.status === 'failed') statusHtml = `<span class="badge-failed">فشل</span>`;
            else statusHtml = `<span style="background: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800;">انتظار</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>${data.senderPhone}</td>
                    <td style="color: var(--primary-color); font-weight: 900;">${data.amount || '-'} ج.م</td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
};
