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

// ==========================================
// 1. فحص تسجيل الدخول وتحديث شكل الهيدر
// ==========================================
const loggedInPhone = localStorage.getItem('studentPhone');
if (loggedInPhone) {
    const myCoursesLink = document.getElementById('myCoursesLink');
    if (myCoursesLink) myCoursesLink.style.display = 'block'; // إظهار لينك كورساتي
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

            // 1. تحديث الهيدر في اللاب توب
            const navAuthSection = document.getElementById('navAuthSection');
            if (navAuthSection) {
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

            // 2. تحديث القائمة الجانبية في الموبايل (إخفاء زراير الدخول وإظهار بيانات الطالب)
            const mobileAuthSection = document.getElementById('mobileAuthSection');
            if (mobileAuthSection) {
                mobileAuthSection.innerHTML = `
                    <div class="mobile-user-profile" onclick="window.location.href='student-dashboard.html'">
                        <div class="m-avatar"><i class="fas fa-user-graduate"></i></div>
                        <div class="m-info">
                            <h4>أهلاً بك، ${firstName}</h4>
                            <span>الرصيد: ${balance} ج.م</span>
                        </div>
                    </div>
                    <button class="btn-logout-mobile" onclick="localStorage.removeItem('studentPhone'); window.location.reload();">
                        <i class="fas fa-sign-out-alt"></i> تسجيل خروج
                    </button>
                `;
            }

            // 3. إظهار لينك "كورساتي" في الموبايل
            const mobileMyCourses = document.getElementById('mobileMyCoursesLink');
            if(mobileMyCourses) mobileMyCourses.style.display = 'block';
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات الطالب:", error);
    }
}

// ==========================================
// 2. تفعيل القائمة الجانبية (الصفوف)
// ==========================================
const openDrawerBtn = document.getElementById('openDrawer');
const closeDrawerBtn = document.getElementById('closeDrawer');
const stagesDrawer = document.getElementById('stagesDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

if (openDrawerBtn && stagesDrawer && drawerOverlay) {
    openDrawerBtn.addEventListener('click', () => {
        stagesDrawer.classList.add('open');
        drawerOverlay.classList.add('active');
    });
}

function closeDrawer() {
    if (stagesDrawer && drawerOverlay) {
        stagesDrawer.classList.remove('open');
        drawerOverlay.classList.remove('active');
    }
}

if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

// ==========================================
// 3. فلترة المدرسين من القائمة الجانبية (متوافقة مع التصميم الجديد)
// ==========================================
const filterLinks = document.querySelectorAll('.drawer-links a');
// تحديث الكلاس ليطابق كروت المدرسين الشيك الجديدة
const teacherCards = document.querySelectorAll('.modern-teacher-card'); 

if (filterLinks.length > 0 && teacherCards.length > 0) {
    filterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // منع تحديث الصفحة
            const selectedText = e.target.innerText.trim(); // اسم المرحلة
            
            teacherCards.forEach(card => {
                const cardStages = card.querySelector('.stages-badges');
                if (cardStages) {
                    const stagesText = cardStages.innerText;
                    if (stagesText.includes(selectedText) || selectedText.includes("عامة")) {
                        card.style.display = "block";
                    } else {
                        card.style.display = "none";
                    }
                }
            });
            closeDrawer(); // يقفل القائمة بعد ما يختار
        });
    });
}

// ==========================================
// 4. نافذة متابعة ولي الأمر
// ==========================================
const btnParentLogin = document.getElementById('btnParentLogin');
if (btnParentLogin) {
    btnParentLogin.addEventListener('click', () => {
        const phoneInput = document.getElementById('parentStudentPhone');
        if (phoneInput) {
            const phone = phoneInput.value;
            // خليناها 10 عشان تقبل لو حد نسي الصفر، أو 11 لو كتبه كامل
            if (phone.length >= 10) { 
                window.location.href = `parent-report.html?phone=${phone}`;
            } else {
                alert("رجاءً إدخال رقم هاتف صحيح للطالب.");
            }
        }
    });
}

// ==========================================
// 5. نظام الدارك مود (Dark Mode)
// ==========================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const bodyElement = document.body;

if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector('i');
    
    // التحقق من الاختيار المحفوظ مسبقاً
    if (localStorage.getItem('theme') === 'dark') {
        bodyElement.setAttribute('data-theme', 'dark');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        if (bodyElement.getAttribute('data-theme') === 'dark') {
            bodyElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        } else {
            bodyElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    });
}

// ==========================================
// 6. نافذة إشعارات OneSignal
// ==========================================
window.addEventListener('load', () => {
    const hasSeenNotificationPrompt = localStorage.getItem('seenNotificationPrompt');
    const notificationModal = document.getElementById('notificationModal');
    
    if (!hasSeenNotificationPrompt && notificationModal) {
        setTimeout(() => {
            notificationModal.classList.add('active');
        }, 3000); // تظهر بعد 3 ثواني
    }
});

const btnAllowNotif = document.getElementById('allowNotifications');
const btnCloseNotif = document.getElementById('closeNotifications');
const notifModal = document.getElementById('notificationModal');

if (btnAllowNotif && notifModal) {
    btnAllowNotif.addEventListener('click', () => {
        notifModal.classList.remove('active');
        localStorage.setItem('seenNotificationPrompt', 'true');
        // تشغيل نافذة الإشعارات الرسمية لـ OneSignal
        if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.slidedown.promptPush();
            });
        }
    });
}

if (btnCloseNotif && notifModal) {
    btnCloseNotif.addEventListener('click', () => {
        notifModal.classList.remove('active');
        localStorage.setItem('seenNotificationPrompt', 'true');
    });
}
// ==========================================
// 7. تشغيل سلايدر المدرسين (Swiper.js)
// ==========================================
window.addEventListener('load', () => {
    if (typeof Swiper !== 'undefined') {
        const teacherSwiper = new Swiper('.teachers-slider', {
            loop: true, // يلف ويرجع للأول تاني لوحده
            grabCursor: true, // شكل الماوس يبقى إيد بتمسك
            autoplay: {
                delay: 2500, // بيقلب الكارت كل ثانيتين ونص
                disableOnInteraction: false, // يكمل تقليب حتى لو المستخدم لمسه
                pauseOnMouseEnter: true, // يقف لو المستخدم وقف عليه بالماوس عشان يقرأ
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            // بيحدد يعرض كام كارت حسب حجم الشاشة
            breakpoints: {
                0: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                },
            }
        });
    }
});
