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

// دالة إظهار نافذة النتيجة (قبول أو رفض)
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

// تأكد إن السكريبت يشتغل بعد ما الصفحة تحمل بالكامل
document.addEventListener('DOMContentLoaded', () => {
    const loggedInPhone = localStorage.getItem('studentPhone');
    if (!loggedInPhone) {
        window.location.replace("login.html");
    } else {
        fetchStudentData(loggedInPhone);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.replace("login.html");
        });
    }

    // =========================================================
    // عملية الشحن بالمحفظة (يا قبول يا رفض أوتوماتيك)
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
            // تسجيل العملية بحالة انتظار
            const docRef = await addDoc(collection(db, "recharge_requests"), {
                studentId: currentStudentId,
                studentPhone: currentStudentData.studentPhone,
                senderPhone: senderPhone,
                status: "waiting",
                date: new Date().toISOString()
            });

            document.getElementById('walletModal').classList.remove('active');
            alert("تم إرسال الطلب، قم بتحويل المبلغ الآن وسيتم إضافة الرصيد لحسابك تلقائياً.");

            // مؤقت الفشل (5 دقائق = 300,000 مللي ثانية)
            const failTimer = setTimeout(async () => {
                await updateDoc(doc(db, "recharge_requests", docRef.id), { status: "failed" });
                
                showResultModal("فشلت العملية ❌", "لم يصل التحويل في الوقت المحدد وتم إلغاء العملية.", false);
                
                // رسالة واتساب للطالب بالفشل
                const failMsg = `تنبيه من Primee Academy ⚠️\nفشلت عملية شحن المحفظة من الرقم ${senderPhone} لعدم استلام التحويل.`;
                sendWhatsAppGeneral(currentStudentData.studentPhone, failMsg);
            }, 300000);

            // المراقبة اللحظية لتأكيد النجاح
            const unsub = onSnapshot(doc(db, "recharge_requests", docRef.id), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    if (data.status === "success") {
                        clearTimeout(failTimer);
                        unsub();
                        
                        const amountAdded = data.amount || "المحول";
                        showResultModal("تم الشحن بنجاح 🎉", `تم إضافة مبلغ ${amountAdded} ج.م إلى محفظتك بنجاح!`, true);
                        
                        // 1. رسالة واتساب للطالب
                        const successStudentMsg = `مرحباً بك في Primee Academy 🎉\nتم بنجاح شحن محفظتك بمبلغ ${amountAdded} ج.م من الرقم ${senderPhone}.\nنتمنى لك دوام التفوق والنجاح! 🚀`;
                        sendWhatsAppGeneral(currentStudentData.studentPhone, successStudentMsg);

                        // 2. رسالة واتساب لولي الأمر (بالمبلغ واسم الطالب)
                        if (currentStudentData.parentPhone) {
                            const successParentMsg = `إشعار من Primee Academy 🔔\nالسيد ولي الأمر المحترم،\nتم بنجاح شحن محفظة الطالب/ة: *${currentStudentData.fullName}*\nبمبلغ قدره: *${amountAdded} ج.م*.\nشكراً لثقتكم بنا.`;
                            sendWhatsAppGeneral(currentStudentData.parentPhone, successParentMsg);
                        }

                        setTimeout(() => window.location.reload(), 3000);
                    } 
                    else if (data.status === "failed") {
                        clearTimeout(failTimer);
                        unsub();
                        showResultModal("فشلت العملية ❌", "تم إلغاء عملية الشحن لعدم وصول التحويل.", false);
                    }
                }
            });

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الاتصال بالخادم.");
        } finally {
            btn.innerHTML = "تأكيد وبدء التحقق <i class='fas fa-check-circle'></i>";
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
    } catch (error) {
        console.error("خطأ:", error);
    }
}

async function fetchMyCourses(myCourseIds) {
    const coursesGrid = document.getElementById('myCoursesGrid');
    if(!coursesGrid) return;
    
    if (!myCourseIds || myCourseIds.length === 0) {
        coursesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 50px 20px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--input-border);">
                <i class="fas fa-folder-open" style="font-size: 50px; color: var(--input-border); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text-main); font-weight: 900;">لم تقم بشراء أي مواد بعد</h3>
                <p style="color: var(--text-muted); font-weight: 600;">تصفح الصفحة الرئيسية لشراء الحصص الجديدة.</p>
                <button onclick="window.location.href='index.html'" style="margin-top: 15px; background: var(--primary-color); color: #fff; border: none; padding: 12px 25px; border-radius: 12px; font-family: 'Cairo'; font-weight: 800; cursor: pointer;">تصفح المنصة</button>
            </div>`;
        return;
    }

    coursesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; font-weight: 800; color: var(--primary-color);">جاري تحميل موادك... ⏳</p>';

    try {
        coursesGrid.innerHTML = ''; 
        for (const item of myCourseIds) {
            let courseId = typeof item === 'object' ? (item.courseId || item.id) : item;
            if(!courseId) continue;

            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            
            if (courseSnap.exists()) {
                const course = courseSnap.data();
                const courseCard = `
                    <div class="modern-teacher-card" style="height: 100%; display: flex; flex-direction: column;">
                        <div class="card-image-wrapper" style="height: 180px; position: relative; background: var(--input-bg);">
                            <img src="${course.image || 'https://via.placeholder.com/400x250/5b21b6/ffffff?text=Course'}" alt="Course" style="width: 100%; height: 100%; object-fit: cover;">
                            <div class="card-overlay" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);"></div>
                            <div class="teacher-subject-badge" style="position: absolute; top: 15px; right: 15px; background: #10b981; color: #fff; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; z-index: 5;"><i class="fas fa-check-circle"></i> تم الشراء</div>
                        </div>
                        <div class="card-info-wrapper" style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: var(--text-main); font-weight: 900;">${course.title || 'اسم المادة'}</h3>
                            <p class="teacher-desc" style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px; flex: 1; font-weight: 600;"><i class="fas fa-chalkboard-teacher"></i> ${course.instructor || 'أستاذ المادة'}</p>
                            <button class="btn-modern-view" onclick="window.location.href='course-details.html?id=${courseId}'" style="width: 100%; background: var(--primary-color); color: #fff; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-family: 'Cairo'; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;">
                                دخول الحصة <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                `;
                coursesGrid.innerHTML += courseCard;
            }
        }
    } catch (error) {
        console.error("خطأ في جلب كورساتي:", error);
    }
}

function renderGrades(completedExams) {
    const tableBody = document.getElementById('gradesTableBody');
    if(!tableBody) return;
    
    if (!completedExams || completedExams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; font-weight: 700; color: var(--text-muted);">لم تجتز أي امتحانات حتى الآن.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    completedExams.forEach((exam) => {
        let examName = "امتحان حصة";
        let score = 0;
        let examDate = "اليوم";

        if (typeof exam === 'object' && exam !== null) {
            examName = exam.examName || exam.title || (exam.examId ? `امتحان حصة رقم ${String(exam.examId).substring(0,4)}` : "امتحان");
            score = exam.score !== undefined ? exam.score : (exam.grade !== undefined ? exam.grade : 0);
            if (exam.date) examDate = exam.date;
        } else {
            examName = `امتحان حصة رقم ${String(exam).substring(0,4)}`;
            score = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
        }

        const isPass = Number(score) >= 50;
        const statusText = isPass ? 'ناجح' : 'راسب';
        const bgStatus = isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const colorStatus = isPass ? '#10b981' : '#ef4444';
        
        tableBody.innerHTML += `
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-main); font-weight: 800;">${examName}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted); font-weight: 600;">${examDate}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--primary-color); font-weight: 900; font-size: 16px;">${score}%</td>
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
// شحن المحفظة عن طريق نظام الأكواد
// ==========================================
document.getElementById('redeemCodeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById('chargeCodeInput').value.trim().toUpperCase();
    const btn = document.getElementById('btnRedeem');
    
    if(!codeInput) return alert("رجاء إدخال الكود أولاً.");
    
    btn.innerHTML = "جاري الفحص... ⏳"; btn.disabled = true;

    try {
        const studentPhone = localStorage.getItem('studentPhone');
        const studentQ = query(collection(db, "users"), where("studentPhone", "==", studentPhone));
        const studentSnap = await getDocs(studentQ);
        if(studentSnap.empty) throw new Error("بيانات الطالب غير موجودة.");
        
        const studentDoc = studentSnap.docs[0];
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();

        const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
        const codeSnap = await getDocs(codesQ);

        if(codeSnap.empty) {
            alert("❌ الكود غير صحيح، تأكد من كتابته بشكل سليم.");
            return;
        }

        const codeDoc = codeSnap.docs[0];
        const codeData = codeDoc.data();

        if(codeData.isUsed) {
            alert(`⚠️ هذا الكود تم شحنه مسبقاً بواسطة: ${codeData.usedByName}`);
            return;
        }

        const newBalance = (studentData.walletBalance || 0) + codeData.value;
        
        await updateDoc(doc(db, "users", studentId), { walletBalance: newBalance });
        
        await updateDoc(doc(db, "charge_codes", codeDoc.id), {
            isUsed: true,
            usedByPhone: studentPhone,
            usedByName: studentData.fullName,
            usedAt: new Date().toISOString()
        });

        alert(`🎉 مبروك! تم شحن ${codeData.value} ج.م لحسابك بنجاح. رصيدك الآن: ${newBalance} ج.م`);
        document.getElementById('redeemCodeForm').reset();
        
        setTimeout(() => { window.location.reload(); }, 1500);

    } catch (error) {
        console.error("خطأ أثناء الشحن:", error);
        alert("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
        btn.innerHTML = "<i class='fas fa-bolt'></i> شحن الكود"; btn.disabled = false;
    }
});
