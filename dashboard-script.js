import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    window.location.replace("login.html");
} else {
    fetchStudentData(loggedInPhone);
}

async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            currentStudentId = querySnapshot.docs[0].id;
            currentStudentData = querySnapshot.docs[0].data();
            
            if (!currentStudentData.myCourses) {
                currentStudentData.myCourses = [];
            }

            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            document.getElementById('studentNameDisplay').textContent = fullName;
            document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            
            const balance = currentStudentData.walletBalance || 0; 
            document.getElementById('walletBalance').textContent = balance;
            
            // بنجيب الكورسات بعد ما نتأكد إننا جبنا بيانات الطالب الأول
            fetchCourses();
            
        } else {
            document.getElementById('studentNameDisplay').textContent = "حساب غير معروف";
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
}

async function fetchCourses() {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">جاري تحميل المواد... ⏳</p>';

    try {
        const coursesRef = collection(db, "courses");
        const querySnapshot = await getDocs(coursesRef);

        if (querySnapshot.empty) {
            coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">لا توجد مواد متاحة حالياً.</p>';
            return;
        }

        coursesGrid.innerHTML = ''; 

        querySnapshot.forEach((docSnap) => {
            const course = docSnap.data();
            const courseId = docSnap.id;
            const price = course.price || 0; 
            
            // 🧠 السحر هنا: بنسأل، هل الطالب ده اشترى الكورس ده؟
            const isOwned = currentStudentData.myCourses.includes(courseId);

            // لو اشتراه، بنغير شكل الزرار والسعر والبادج
            const priceDisplay = isOwned ? '<span style="color:#10b981;">تم الشراء ✔️</span>' : (price === 0 ? 'مجانًا 🎁' : price + ' ج.م');
            
            const buttonHTML = isOwned 
                ? `<button class="btn-enter-course btn-owned" onclick="openCourse('${courseId}')">دخول الحصة 🚀</button>`
                : `<button class="btn-enter-course" onclick="initiatePurchase('${courseId}', ${price}, '${course.title}')">شراء الحصة</button>`;
            
            const badgeClass = isOwned ? 'badge owned-badge' : 'badge';
            const badgeText = isOwned ? 'مملوك' : (course.badge || 'جديد');

            const courseCard = `
                <div class="modern-course-card">
                    <div class="card-img" style="background-image: url('${course.image || ''}'); background-size: cover; background-position: center; background-color: #e2e8f0;">
                        <span class="${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="card-body">
                        <h4>${course.title || 'اسم المادة'}</h4>
                        <p class="instructor"><i class="fas fa-chalkboard-teacher"></i> ${course.instructor || 'أستاذ المادة'}</p>
                        
                        <p style="font-weight: 800; color: var(--primary-color); margin-bottom: 15px;">
                            ${priceDisplay}
                        </p>

                        <div class="card-footer">
                            ${buttonHTML}
                        </div>
                    </div>
                </div>
            `;
            coursesGrid.innerHTML += courseCard;
        });

    } catch (error) {
        console.error("خطأ في جلب الكورسات:", error);
    }
}

// ==================== دوال النافذة المنبثقة (Modal) ====================
function showCustomModal(icon, title, message, buttonsHTML) {
    document.getElementById('customModalIcon').innerHTML = icon;
    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalMessage').innerHTML = message;
    document.getElementById('customModalActions').innerHTML = buttonsHTML;
    document.getElementById('customModal').classList.add('active');
}

window.closeCustomModal = function() {
    document.getElementById('customModal').classList.remove('active');
};

// ==================== دوال الدخول والشراء ====================

// دالة لو الطالب معاه الكورس أصلاً
// دالة لو الطالب معاه الكورس أصلاً
window.openCourse = function(courseId) {
    // التعديل هنا: هنحوله لصفحة المشاهدة ونبعت رقم الكورس في الرابط
    window.location.href = `course-details.html?id=${courseId}`;
};

// دالة بدء الشراء
window.initiatePurchase = function(courseId, price, courseTitle) {
    if (price === 0) {
        showCustomModal('🎁', 'حصة مجانية!', 'هذه الحصة مجانية. هل تريد إضافتها لموادك؟', 
        `<button class="btn-cancel" onclick="closeCustomModal()">إلغاء</button>
         <button class="btn-confirm" onclick="confirmPurchaseAction('${courseId}', ${price})">إضافة الآن</button>`);
    } else {
        showCustomModal('🛒', 'تأكيد الشراء', `قيمة حصة <strong>${courseTitle}</strong> هي <strong>${price} ج.م</strong>.<br>رصيدك الحالي: ${currentStudentData.walletBalance || 0} ج.م.<br><br>هل تريد الشراء؟`, 
        `<button class="btn-cancel" onclick="closeCustomModal()">إلغاء</button>
         <button class="btn-confirm" onclick="confirmPurchaseAction('${courseId}', ${price})">تأكيد وخصم</button>`);
    }
};

// دالة تنفيذ الخصم وتحديث الداتا بيز
window.confirmPurchaseAction = async function(courseId, price) {
    closeCustomModal(); // نقفل رسالة التأكيد
    
    let currentBalance = currentStudentData.walletBalance || 0;
    
    if (currentBalance >= price) {
        let newBalance = currentBalance - price;
        
        try {
            // الخصم في فايربيز
            await updateDoc(doc(db, "users", currentStudentId), {
                walletBalance: newBalance,
                myCourses: arrayUnion(courseId)
            });

            // تحديث البيانات في الذاكرة الحالية
            currentStudentData.walletBalance = newBalance;
            currentStudentData.myCourses.push(courseId);
            document.getElementById('walletBalance').textContent = newBalance;

            // إظهار رسالة النجاح
            showCustomModal('🎉', 'مبروك!', 'تم شراء الحصة بنجاح وإضافتها لموادك.', `<button class="btn-ok" onclick="closeCustomModal()">رائع!</button>`);
            
            // إعادة رسم الكورسات عشان يظهر الزرار الأخضر
            fetchCourses();

        } catch (error) {
            console.error("خطأ أثناء الشراء:", error);
            showCustomModal('❌', 'خطأ تقني', 'حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.', `<button class="btn-cancel" onclick="closeCustomModal()">إغلاق</button>`);
        }
    } else {
        // لو الرصيد ميكفيش
        showCustomModal('💳', 'رصيد غير كافٍ', 'رصيد محفظتك لا يكفي لإتمام الشراء. يرجى شحن الرصيد أولاً.', `<button class="btn-cancel" onclick="closeCustomModal()">إغلاق</button>`);
    }
};

// ==================== تسجيل الخروج ====================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('studentPhone');
        localStorage.removeItem('loggedInUserId');
        window.location.replace("login.html");
    });
}
