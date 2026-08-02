import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const loggedInPhone = localStorage.getItem('studentPhone');

// 1. فحص تسجيل الدخول وتحديث شكل الهيدر
if (loggedInPhone) {
    document.getElementById('myCoursesLink').style.display = 'block'; // إظهار لينك كورساتي
    fetchStudentNavData(loggedInPhone);
}

async function fetchStudentNavData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            const firstName = (data.fullName || "طالب").split(" ")[0];
            const balance = data.walletBalance || 0;

            // تغيير زراير الدخول إلى كبسولة الحساب
            const navAuthSection = document.getElementById('navAuthSection');
            navAuthSection.innerHTML = `
                <div class="logged-in-badge" onclick="window.location.href='student-dashboard.html'">
                    <div class="badge-info">
                        <span class="s-name">${firstName}</span>
                        <span class="s-wallet">${balance} ج.م</span>
                    </div>
                    <div class="badge-avatar"><i class="fas fa-user-graduate"></i></div>
                </div>
            `;
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات الطالب:", error);
    }
}

// 2. تفعيل القائمة الجانبية (الصفوف)
const openDrawerBtn = document.getElementById('openDrawer');
const closeDrawerBtn = document.getElementById('closeDrawer');
const stagesDrawer = document.getElementById('stagesDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

openDrawerBtn.addEventListener('click', () => {
    stagesDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
});

function closeDrawer() {
    stagesDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
}

closeDrawerBtn.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// 3. نافذة متابعة ولي الأمر
const btnParentLogin = document.getElementById('btnParentLogin');
if(btnParentLogin) {
    btnParentLogin.addEventListener('click', () => {
        const phone = document.getElementById('parentStudentPhone').value;
        if(phone.length >= 11) {
            // هنبعت رقم الطالب في الرابط لصفحة التقرير
            window.location.href = `parent-report.html?phone=${phone}`;
        } else {
            alert("رجاءً إدخال رقم هاتف صحيح للطالب.");
        }
    });
}

// 4. نافذة إشعارات OneSignal (بتظهر مرة واحدة بس)
window.addEventListener('load', () => {
    const hasSeenNotificationPrompt = localStorage.getItem('seenNotificationPrompt');
    
    if (!hasSeenNotificationPrompt) {
        setTimeout(() => {
            document.getElementById('notificationModal').classList.add('active');
        }, 3000); // تظهر بعد 3 ثواني من فتح الموقع
    }
});

document.getElementById('allowNotifications').addEventListener('click', () => {
    document.getElementById('notificationModal').classList.remove('active');
    localStorage.setItem('seenNotificationPrompt', 'true');
    // تشغيل نافذة الإشعارات الرسمية لـ OneSignal
    window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.slidedown.promptPush();
    });
});

document.getElementById('closeNotifications').addEventListener('click', () => {
    document.getElementById('notificationModal').classList.remove('active');
    localStorage.setItem('seenNotificationPrompt', 'true');
});
// فلترة المدرسين من القائمة الجانبية
const filterLinks = document.querySelectorAll('.drawer-links a');
const teacherCards = document.querySelectorAll('.teacher-card');

filterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // منع تحديث الصفحة
        const selectedText = e.target.innerText.trim(); // اسم المرحلة اللي داس عليها
        
        teacherCards.forEach(card => {
            const cardStages = card.querySelector('.stages-badges').innerText;
            if(cardStages.includes(selectedText) || selectedText.includes("عامة")) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
        closeDrawer(); // يقفل القائمة بعد ما يختار
    });
});
// === نظام الدارك مود (Dark Mode) ===
const themeToggleBtn = document.getElementById('themeToggleBtn');
const bodyElement = document.body;
const icon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

// التحقق من الاختيار المحفوظ مسبقاً
if (localStorage.getItem('theme') === 'dark') {
    bodyElement.setAttribute('data-theme', 'dark');
    if(icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
}

if(themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        if (bodyElement.getAttribute('data-theme') === 'dark') {
            bodyElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            bodyElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });
}
