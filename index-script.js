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
        // السطر ده بيجمد حركة الموقع اللي ورا القائمة
        document.body.style.overflow = 'hidden'; 
    });
}

function closeDrawer() {
    if (stagesDrawer && drawerOverlay) {
        stagesDrawer.classList.remove('open');
        drawerOverlay.classList.remove('active');
        // السطر ده بيرجع الموقع يتحرك طبيعي لما تقفل القائمة
        document.body.style.overflow = ''; 
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
// ==========================================
// 7. جلب المدرسين من قاعدة البيانات وعرضهم
// ==========================================
async function loadDynamicTeachers() {
    const teachersGrid = document.getElementById('teachersGrid');
    if (!teachersGrid) return;

    try {
        const querySnapshot = await getDocs(collection(db, "teachers"));
        
        if (querySnapshot.empty) {
            teachersGrid.innerHTML = '<div style="text-align: center; width: 100%; color: #94a3b8; padding: 20px;">جاري انضمام نخبة من المدرسين قريباً...</div>';
            return;
        }

        let html = '';
        querySnapshot.forEach(doc => {
            const t = doc.data();
            
            // تقسيم المراحل عشان نعملها Badges شيك
            let stagesHtml = '';
            if (t.stages) {
                t.stages.split(',').forEach(s => {
                    stagesHtml += `<span class="stage-badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; margin-left: 5px;">${s.trim()}</span>`;
                });
            }

            html += `
            <div class="swiper-slide">
                <div class="modern-teacher-card" style="background: #1e293b; border-radius: 15px; border: 1px solid #334155; overflow: hidden;">
                    <div class="card-image-wrapper" style="position: relative; height: 200px; background: #0f172a;">
                        <img src="${t.imageUrl}" alt="${t.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div class="teacher-subject-badge" style="position: absolute; top: 15px; right: 15px; background: #f59e0b; color: #fff; padding: 5px 15px; border-radius: 8px; font-weight: 900; font-size: 14px;"><i class="fas fa-book"></i> ${t.subject}</div>
                    </div>
                    <div class="card-info-wrapper" style="padding: 20px;">
                        <h3 style="color: #f8fafc; margin: 0 0 10px 0; font-size: 20px; font-weight: 900;">${t.name}</h3>
                        <div class="stages-badges" style="margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 5px;">
                            ${stagesHtml}
                        </div>
                        <button onclick="window.location.href='login.html'" style="width: 100%; background: #3b82f6; color: #fff; border: none; padding: 12px; border-radius: 10px; font-family: 'Cairo'; font-weight: 800; cursor: pointer; transition: 0.3s;">تصفح الحصص <i class="fas fa-arrow-left"></i></button>
                    </div>
                </div>
            </div>`;
        });

        teachersGrid.innerHTML = html;

        // تشغيل مكتبة السلايدر بعد ما العناصر اترسمت
        if (typeof Swiper !== 'undefined') {
            new Swiper('.teachers-slider', {
                loop: false, // خليناها false عشان لو عدد المدرسين قليل مش هتبوظ
                grabCursor: true,
                autoplay: { delay: 2500, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                breakpoints: {
                    0: { slidesPerView: 1, spaceBetween: 20 },
                    768: { slidesPerView: 2, spaceBetween: 30 },
                    1024: { slidesPerView: 3, spaceBetween: 30 }
                }
            });
        }
    } catch (e) {
        console.error("خطأ في جلب المدرسين:", e);
    }
}
loadDynamicTeachers();
