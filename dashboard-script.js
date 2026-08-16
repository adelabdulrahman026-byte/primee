import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

    // ==========================================
    // التحكم في نافذة الدفع بالمحفظة (UI)
    // ==========================================
    const walletModal = document.getElementById('walletPaymentModal');
    const openWalletBtn = document.getElementById('openWalletModalBtn');
    const closeWalletBtn = document.getElementById('closeWalletModalBtn');

    if(openWalletBtn && walletModal) {
        openWalletBtn.addEventListener('click', () => {
            walletModal.classList.add('active');
            // نضع رقم الطالب تلقائياً لتسهيل الأمر، ويمكنه تغييره
            if(currentStudentData && currentStudentData.studentPhone) {
                document.getElementById('senderPhoneInput').value = currentStudentData.studentPhone;
            }
        });
    }

    if(closeWalletBtn && walletModal) {
        closeWalletBtn.addEventListener('click', () => {
            walletModal.classList.remove('active');
        });
    }
    
    // ==========================================
    // حفظ رقم السنترال/المحفظة (الربط مع السيرفر)
    // ==========================================
    document.getElementById('btnConfirmTopupNumber')?.addEventListener('click', async () => {
        const senderPhone = document.getElementById('senderPhoneInput').value.trim();
        if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
            return alert("❌ يرجى كتابة رقم الموبايل المحول منه بشكل صحيح (11 رقم)!");
        }

        const btn = document.getElementById('btnConfirmTopupNumber');
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الحفظ...";
        btn.disabled = true;

        try {
            // تحديث رقم activeTopupNumber للطالب في الداتا بيز
            await updateDoc(doc(db, "users", currentStudentId), {
                activeTopupNumber: senderPhone
            });

            alert("✅ تم حفظ الرقم بنجاح! قم بالتحويل الآن من هذا الرقم وسيتم إضافة الرصيد لحسابك تلقائياً في ثوانٍ.");
            document.getElementById('walletPaymentModal').classList.remove('active');
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الاتصال بالقاعدة، حاول مرة أخرى.");
        } finally {
            btn.innerHTML = "تأكيد الرقم وانتظار التحويل <i class='fas fa-paper-plane'></i>";
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
            
            // كود المراقبة اللحظية
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
    
    if (myCourseIds.length === 0) {
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
        for (const courseId of myCourseIds) {
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
    
    if (completedExams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; font-weight: 700; color: var(--text-muted);">لم تجتز أي امتحانات حتى الآن.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    completedExams.forEach((examId) => {
        const score = Math.floor(Math.random() * (100 - 60 + 1)) + 60; 
        const isPass = score >= 50;
        const statusText = isPass ? 'ناجح' : 'راسب';
        const bgStatus = isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const colorStatus = isPass ? '#10b981' : '#ef4444';
        
        tableBody.innerHTML += `
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-main); font-weight: 800;">امتحان حصة رقم ${examId.substring(0,4)}</td>
                <td style="padding: 15px; border-bottom: 1px solid var(--input-border); color: var(--text-muted); font-weight: 600;">اليوم</td>
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
        
        if(!currentStudentData) throw new Error("بيانات الطالب غير متوفرة حالياً.");

        // فحص الكود في قاعدة البيانات
        const codesQ = query(collection(db, "charge_codes"), where("code", "==", codeInput));
        const codeSnap = await getDocs(codesQ);

        if(codeSnap.empty) {
            alert("❌ الكود غير صحيح، تأكد من كتابته بشكل سليم.");
            return;
        }

        const codeDoc = codeSnap.docs[0];
        const codeData = codeDoc.data();

        // هل الكود مشحون قبل كده؟
        if(codeData.isUsed) {
            alert(`⚠️ هذا الكود تم شحنه مسبقاً بواسطة: ${codeData.usedByName}`);
            return;
        }

        // لو الكود سليم ومش مشحون، هنشحنه دلوقتي
        const newBalance = (currentStudentData.walletBalance || 0) + codeData.value;
        
        // 1. تحديث محفظة الطالب
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        
        // 2. حرق الكود
        await updateDoc(doc(db, "charge_codes", codeDoc.id), {
            isUsed: true,
            usedByPhone: studentPhone,
            usedByName: currentStudentData.fullName,
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
