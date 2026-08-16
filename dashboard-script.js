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

// دالة للإرسال للطالب وولي الأمر معاً
async function notifyBoth(studentMsg, parentMsg) {
    if (currentStudentData?.studentPhone) {
        await sendWhatsAppGeneral(currentStudentData.studentPhone, studentMsg);
    }
    if (currentStudentData?.parentPhone) {
        await sendWhatsAppGeneral(currentStudentData.parentPhone, parentMsg);
    }
}

// دالة الكارت الشيك للنتائج
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
    // 1. الدفع عبر المحفظة (التحقق السريع في دقيقة واحدة)
    // =========================================================
    document.getElementById('btnConfirmWalletPayment')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return alert("يرجى كتابة رقم الموبايل المحول منه بشكل صحيح (11 رقم)!");
        }

        const btn = document.getElementById('btnConfirmWalletPayment');
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الفحص...";
        btn.disabled = true;

        try {
            // إنشاء الطلب في الداتا بيز
            const docRef = await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "waiting",
                date: new Date().toISOString()
            });

            document.getElementById('walletModal').classList.remove('active');
            fetchRechargeHistory(); // تحديث الجدول فوراً ليظهر قيد التحقق

            // رسائل البدء للواتساب
            const studentStartMsg = `مرحباً بك في Primee Academy ⏳\nتم تسجيل طلب شحن لمحفظتك من الرقم: ${senderPhone}.\nجاري التحقق من وصول المبلغ الآن.`;
            const parentStartMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر،\nتم تسجيل طلب شحن لمحفظة الطالب/ة: ${currentStudentData.fullName}.\nجاري التحقق من عملية الدفع الآن.`;
            notifyBoth(studentStartMsg, parentStartMsg);

            // ⏱️ مؤقت الفشل السريع (دقيقة واحدة = 60,000 مللي ثانية)
            const failTimer = setTimeout(async () => {
                await updateDoc(doc(db, "recharge_requests", docRef.id), { status: "failed" });
                
                showResultModal("فشلت العملية ❌", "لم يصل التحويل في الوقت المحدد وتم إلغاء العملية.", false);
                
                // رسائل الفشل للواتساب
                const studentFailMsg = `تنبيه من Primee Academy ⚠️\nفشلت عملية شحن المحفظة من الرقم ${senderPhone} لعدم استلامنا للتحويل.`;
                const parentFailMsg = `إشعار من Primee Academy ⚠️\nفشلت محاولة شحن محفظة الطالب/ة: ${currentStudentData.fullName} لعدم وصول التحويل.`;
                notifyBoth(studentFailMsg, parentFailMsg);
            }, 60000); 

            // المراقبة اللحظية للنتيجة
            const unsub = onSnapshot(doc(db, "recharge_requests", docRef.id), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    if (data.status === "success") {
                        clearTimeout(failTimer);
                        unsub();
                        
                        const amountAdded = data.amount || "المبلغ";
                        showResultModal("تم الشحن بنجاح 🎉", `تم إضافة ${amountAdded} ج.م إلى محفظتك بنجاح!`, true);
                        
                        // رسائل النجاح للواتساب
                        const studentSuccessMsg = `مرحباً بك في Primee Academy 🎉\nتم بنجاح شحن محفظتك بمبلغ *${amountAdded} ج.م*.\nرصيدك جاهز للاستخدام الآن! 🚀`;
                        const parentSuccessMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nتم بنجاح شحن محفظة الطالب/ة: *${currentStudentData.fullName}*\nبمبلغ قدره: *${amountAdded} ج.م*.\nشكراً لثقتكم بنا.`;
                        notifyBoth(studentSuccessMsg, parentSuccessMsg);

                        setTimeout(() => window.location.reload(), 3000);
                    } 
                    else if (data.status === "failed") {
                        clearTimeout(failTimer);
                        unsub();
                        fetchRechargeHistory();
                    }
                }
            });

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الاتصال بالخادم.");
        } finally {
            btn.innerHTML = "تأكيد وبدء التحقق السريع <i class='fas fa-bolt'></i>";
            btn.disabled = false;
        }
    });

    // =========================================================
    // 2. الشحن بالكود (رسائل فورية)
    // =========================================================
    document.getElementById('redeemCodeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('chargeCodeInput').value.trim().toUpperCase();
        const btn = document.getElementById('btnRedeem');
        
        if(!codeInput) return alert("رجاء إدخال الكود أولاً.");
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الفحص..."; 
        btn.disabled = true;

        try {
            const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
            const codeSnap = await getDocs(codesQ);

            if(codeSnap.empty) {
                showResultModal("كود غير صحيح ❌", "تأكد من كتابة الكود بشكل سليم.", false);
                return;
            }

            const codeDoc = codeSnap.docs[0];
            const codeData = codeDoc.data();

            if(codeData.isUsed) {
                showResultModal("تنبيه ⚠️", `هذا الكود تم شحنه مسبقاً.`, false);
                return;
            }

            const newBalance = (currentStudentData.walletBalance || 0) + codeData.value;
            
            await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
            await updateDoc(doc(db, "charge_codes", codeDoc.id), {
                isUsed: true,
                usedByPhone: currentStudentData.studentPhone,
                usedByName: currentStudentData.fullName,
                usedAt: new Date().toISOString()
            });

            // تسجيل العملية في جدول السجل
            await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                senderPhone: `كود: ${codeInput}`,
                status: "success",
                amount: codeData.value,
                date: new Date().toISOString()
            });

            showResultModal("تم الشحن بنجاح 🎉", `تم شحن ${codeData.value} ج.م لحسابك.`, true);
            
            // رسائل الواتساب
            const studentMsg = `مرحباً بك في Primee Academy 🎉\nتم شحن محفظتك باستخدام كود تفعيل بقيمة *${codeData.value} ج.م* بنجاح.\nبالتوفيق! 🚀`;
            const parentMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nقام الطالب/ة: *${currentStudentData.fullName}* بشحن محفظته باستخدام كود تفعيل بقيمة: *${codeData.value} ج.م*.\nشكراً لثقتكم بنا.`;
            notifyBoth(studentMsg, parentMsg);

            document.getElementById('redeemCodeForm').reset();
            setTimeout(() => { window.location.reload(); }, 2500);

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الاتصال بالخادم.");
        } finally {
            btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; 
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

            fetchMyCoursesSafe(currentStudentData.myCourses);
            renderGradesSafe(currentStudentData.completedExams);
            fetchRechargeHistory();
            
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
    } catch (error) {
        console.error("خطأ:", error);
    }
}

// ==========================================
// الكورسات (تصميم فخم آمن)
// ==========================================
async function fetchMyCoursesSafe(coursesArray) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    
    if (!coursesArray || coursesArray.length === 0) {
        coursesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed #334155;">
                <i class="fas fa-folder-open" style="font-size: 50px; color: #3b82f6; margin-bottom: 15px;"></i>
                <h3 style="color: #94a3b8; font-weight: 800;">لم تقم بشراء أي مواد بعد</h3>
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
                    <div class="recharge-card" style="padding: 0; overflow: hidden;">
                        <img src="${img}" style="width: 100%; height: 160px; object-fit: cover; border-bottom: 2px solid #334155;">
                        <div style="padding: 20px;">
                            <h3 style="color: #f8fafc; font-size: 18px; font-weight: 900; margin: 0 0 15px 0;">${title}</h3>
                            <button onclick="window.location.href='course-details.html?id=${courseId}'" style="width: 100%; background: linear-gradient(45deg, #3b82f6, #2563eb); color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: 900; font-family: 'Cairo'; cursor: pointer;">دخول الحصة <i class="fas fa-play"></i></button>
                        </div>
                    </div>
                `;
            }
        } catch (error) { console.error(error); }
    }
}

// ==========================================
// الامتحانات (درجة صافية بدون % - كود صلب)
// ==========================================
function renderGradesSafe(examsArray) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    
    if (!examsArray || !Array.isArray(examsArray) || examsArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #64748b;">لم يتم تسجيل امتحانات.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    examsArray.forEach((exam, index) => {
        let examName = "امتحان";
        let score = 0;

        // فحص ذكي للبيانات مهما كان شكلها
        if (typeof exam === 'object' && exam !== null) {
            examName = exam.examName || exam.title || exam.name || `امتحان رقم ${index + 1}`;
            score = exam.score !== undefined ? exam.score : (exam.grade !== undefined ? exam.grade : (exam.studentScore || 0));
            // لو في درجة نهائية بيعرضها (مثال: 15 / 20)
            if(exam.totalScore) score = `${score} / ${exam.totalScore}`;
        } else {
            // لو متسجلة كنص أو ID
            examName = `امتحان ${String(exam).substring(0,6)}`;
        }

        tableBody.innerHTML += `
            <tr>
                <td style="border-right: 4px solid #3b82f6;">${examName}</td>
                <td style="color: #10b981; font-weight: 900; font-size: 16px; direction: ltr; text-align: right;">${score}</td>
            </tr>
        `;
    });
}

// ==========================================
// جلب سجل الشحن
// ==========================================
async function fetchRechargeHistory() {
    const tbody = document.getElementById('rechargeHistoryBody');
    if(!tbody) return;
    
    try {
        const q = query(collection(db, "recharge_requests"), where("studentId", "==", currentStudentId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b;">لا توجد عمليات مسجلة.</td></tr>`;
            return;
        }

        // ترتيب العمليات من الأحدث للأقدم داخل الجافاسكريبت
        let requests = [];
        snap.forEach(doc => requests.push(doc.data()));
        requests.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';
        requests.forEach(data => {
            let statusHtml = '';
            let dateStr = new Date(data.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute:'2-digit' });

            if(data.status === 'waiting') {
                statusHtml = `<span class="status-badge status-waiting"><i class="fas fa-spinner fa-spin"></i> جاري التحقق</span>`;
            } else if(data.status === 'success') {
                statusHtml = `<span class="status-badge status-success"><i class="fas fa-check"></i> ناجح</span>`;
            } else if(data.status === 'failed') {
                statusHtml = `<span class="status-badge status-failed"><i class="fas fa-times"></i> فشل</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td style="border-right: 4px solid #334155; font-family: monospace; font-size: 14px;">${data.senderPhone}</td>
                    <td style="color: #94a3b8; font-size: 13px;">${dateStr}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}
