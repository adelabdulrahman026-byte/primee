import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc, arrayUnion, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
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
// 🎨 دالة عرض الإشعارات المنبثقة
// ==========================================
window.pmNotify = function(title, message, type = 'success') {
    const modal = document.getElementById('pmNotifyModal');
    const iconEl = document.getElementById('pmNotifyIcon');
    const titleEl = document.getElementById('pmNotifyTitle');
    const msgEl = document.getElementById('pmNotifyMessage');
    const btnEl = document.getElementById('pmNotifyBtn');

    if (type === 'success') { iconEl.innerHTML = '<i class="fas fa-check-circle"></i>'; iconEl.style.color = '#10b981'; btnEl.style.background = '#10b981'; }
    else if (type === 'error') { iconEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>'; iconEl.style.color = '#ef4444'; btnEl.style.background = '#ef4444'; }
    else if (type === 'warning') { iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>'; iconEl.style.color = '#f59e0b'; btnEl.style.background = '#f59e0b'; }
    else { iconEl.innerHTML = '<i class="fas fa-info-circle"></i>'; iconEl.style.color = '#3b82f6'; btnEl.style.background = '#3b82f6'; }

    titleEl.textContent = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    modal.classList.add('active');
};

// ==========================================
// 🚨 دالة إرسال رسائل الواتساب العامة للمنصة 🚨
// ==========================================
window.sendWhatsAppToPhone = async function(phone, msg) {
    if (!phone) return false;
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;
        const keys = docSnap.data();
        let cleanPhone = phone.replace(/\D/g, ''); 
        if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
        let chatId = cleanPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        await fetch(url, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });
        return true;
    } catch (e) { return false; }
};

// إنشاء/جلب Device ID
let currentDeviceId = localStorage.getItem('deviceId');
if (!currentDeviceId) {
    currentDeviceId = 'DEV-' + Date.now() + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', currentDeviceId);
}

// إغلاق الدروب داون عند الضغط بالخارج
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('navDropdown');
    const bellBtn = document.getElementById('navBellBtn');
    if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) { dropdown.classList.remove('active'); }
});

// تأثير كتابة عنوان الهيرو
const phrases = ["تعلّم بذكاء،<br>في شاشة واحدة.", "اكتشف قدراتك،<br>واصنع مستقبلك.", "نخبة المعلمين،<br>بألوان Primee."];
let phraseIndex = 0;
const heroTitle = document.getElementById('heroTitle');
if(heroTitle) {
    setInterval(() => {
        heroTitle.style.opacity = 0;
        setTimeout(() => {
            phraseIndex = (phraseIndex + 1) % phrases.length;
            heroTitle.innerHTML = phrases[phraseIndex];
            heroTitle.style.opacity = 1;
        }, 500);
    }, 3800);
}

// 🚨🚨 تم حذف دالة تحديث عداد الطلاب الحي نهائياً بناءً على طلبك 🚨🚨

// التحقق من تسجيل الدخول
const loggedInPhone = localStorage.getItem('studentPhone');
let globalUserData = null;
if (loggedInPhone) {
    const myC = document.getElementById('myCoursesLink'); if (myC) myC.style.display = 'block';
    const mobMyC = document.getElementById('mobileMyCoursesLink'); if(mobMyC) mobMyC.style.display = 'block';
    fetchStudentNavData(loggedInPhone);
}

async function fetchStudentNavData(phone) {
    try {
        const userQ = query(collection(db, "users"), where("studentPhone", "==", phone));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
            const studentDoc = userSnap.docs[0];
            const data = studentDoc.data();
            globalUserData = { id: studentDoc.id, ...data };
            
            // الاستماع لحظر الجهاز والـ isBlocked
            onSnapshot(doc(db, "users", studentDoc.id), (docSnap) => {
                if (docSnap.exists()) {
                    const latestData = docSnap.data();
                    if (latestData.isBlocked === true || (latestData.blockedDevices && latestData.blockedDevices.includes(currentDeviceId))) {
                        localStorage.clear(); window.location.replace("login.html");
                    }
                }
            });

            // تحديث بيانات النافبار
            const firstName = (data.fullName || "طالب").split(" ")[0];
            const balance = data.walletBalance || 0;
            const avatarHtml = data.profileImage ? `<img src="${data.profileImage}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<i class="fas fa-user-graduate"></i>`;

            const navAuth = document.getElementById('navAuthSection');
            if (navAuth) navAuth.innerHTML = `<div class="logged-in-badge" onclick="window.location.href='student-dashboard.html'"><div class="badge-info"><span class="s-name">${firstName}</span><span class="s-wallet">${balance} ج.م</span></div><div class="badge-avatar">${avatarHtml}</div></div>`;

            const mobAuth = document.getElementById('mobileAuthSection');
            if (mobAuth) mobAuth.innerHTML = `<div class="mobile-user-profile-card"><div class="m-avatar">${avatarHtml}</div><h4>أهلاً، ${firstName}</h4><span class="m-wallet">رصيدك: ${balance} ج.م</span><button class="btn-logout-premium" onclick="localStorage.removeItem('studentPhone'); window.location.reload();"><i class="fas fa-sign-out-alt"></i> تسجيل خروج</button></div>`;
            
            // جلب الإشعارات
            let notifHtml = '';
            if (data.notifications && data.notifications.length > 0) {
                const notifs = data.notifications.reverse(); 
                notifs.forEach(n => {
                    let iconColor = n.title && n.title.includes('شحن') ? '#3b82f6' : '#10b981';
                    let iconBg = n.title && n.title.includes('شحن') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                    let iconClass = n.title && n.title.includes('شحن') ? 'fa-wallet' : 'fa-check-circle';
                    notifHtml += `<div class="notif-item"><div class="notif-icon" style="color: ${iconColor}; background: ${iconBg};"><i class="fas ${iconClass}"></i></div><div class="notif-text"><p>${n.text || n.title || 'إشعار جديد'}</p></div></div>`;
                });
                const badge = document.querySelector('.nav-bell-wrapper .badge'); if(badge) badge.style.display = 'block';
            } else {
                notifHtml = '<div style="text-align:center; color:#94a3b8; padding: 15px;">لا توجد إشعارات حالياً</div>';
                const badge = document.querySelector('.nav-bell-wrapper .badge'); if(badge) badge.style.display = 'none';
            }
            const notifContent = document.getElementById('notificationsListContent'); if(notifContent) notifContent.innerHTML = notifHtml;
        }
    } catch (e) {}
}

// القائمة الجانبية (Drawer)
document.getElementById('openDrawer')?.addEventListener('click', () => { document.getElementById('stagesDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('active'); document.body.style.overflow='hidden'; });
function closeDrawer() { document.getElementById('stagesDrawer')?.classList.remove('open'); document.getElementById('drawerOverlay')?.classList.remove('active'); document.body.style.overflow=''; }
document.getElementById('closeDrawer')?.addEventListener('click', closeDrawer); document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);

// تسجيل دخول ولي الأمر
document.getElementById('btnParentLogin')?.addEventListener('click', () => { 
    const p = document.getElementById('parentStudentPhone').value; 
    if(p.length>=10) window.location.href=`parent-report.html?phone=${p}`; 
    else pmNotify("رقم غير صحيح", "رجاءً أدخل رقم هاتف الطالب الصحيح.", "error"); 
});

// ==========================================
// 🌗 الوضع الليلي / النهاري
// ==========================================
function setTheme(isDark) {
    if (isDark) { document.body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
    syncThemeIcons(isDark);
}
function syncThemeIcons(isDark) {
    const desktopIcon = document.querySelector('#themeToggleBtn i'); if (desktopIcon) desktopIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    const mobIcon = document.querySelector('#themeToggleBtnMobile i'); if(mobIcon) mobIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}
function toggleTheme() { const currentlyDark = document.body.getAttribute('data-theme') === 'dark'; setTheme(!currentlyDark); }
const themeBtn = document.getElementById('themeToggleBtn'); const themeBtnMobile = document.getElementById('themeToggleBtnMobile');
themeBtn?.addEventListener('click', toggleTheme); themeBtnMobile?.addEventListener('click', toggleTheme);
setTheme(localStorage.getItem('theme') === 'dark');

// بحث المعلمين
document.getElementById('btnExecuteSearchTeacher')?.addEventListener('click', () => {
    const term = document.getElementById('searchTeacherInput').value.trim().toLowerCase();
    document.getElementById('searchTeacherModal').classList.remove('active');
    document.getElementById('allTeachersModal').classList.add('active'); // فتح المودال لعرض النتائج
    setTimeout(() => {
        document.querySelectorAll('#allTeachersGrid .primee-teacher-card').forEach(card => {
            const name = card.querySelector('.pt-card-name').innerText.toLowerCase();
            card.style.display = name.includes(term) ? 'flex' : 'none';
        });
    }, 100);
});

// ماب الصفوف والمراحل للفلاتر
const subStagesMap = {
    'ابتدائي': ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'],
    'إعدادي': ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي'],
    'ثانوي': ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'],
    'بكالوريا': ['بكالوريا علمي', 'بكالوريا أدبي']
};

// دالة الفلاتر المتداخلة (Nested Filters)
function setupNestedFilters(mainContainerId, subContainerId, onFilterCallback) {
    const mainBtns = document.querySelectorAll(`#${mainContainerId} .modern-filter-btn`);
    const subContainer = document.getElementById(subContainerId);
    if (!subContainer) return;

    mainBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); mainBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
            const mainFilter = btn.getAttribute('data-filter');
            
            if(mainFilter === 'all') { subContainer.style.display = 'none'; onFilterCallback('all'); }
            else {
                subContainer.innerHTML = '';
                const subStages = subStagesMap[mainFilter];
                if(subStages) {
                    // إضافة زرار "الكل في المرحلة"
                    const allSubBtn = document.createElement('button'); allSubBtn.className = 'sub-filter-btn active'; allSubBtn.textContent = 'الكل'; allSubBtn.onclick = () => { subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active')); allSubBtn.classList.add('active'); onFilterCallback(mainFilter); };
                    subContainer.appendChild(allSubBtn);
                    subStages.forEach(sub => {
                        const subBtn = document.createElement('button'); subBtn.className = 'sub-filter-btn'; subBtn.textContent = sub;
                        subBtn.onclick = (ev) => { subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active')); ev.target.classList.add('active'); onFilterCallback(sub); };
                        subContainer.appendChild(subBtn);
                    });
                    subContainer.style.display = 'flex';
                } else { subContainer.style.display = 'none'; }
                onFilterCallback(mainFilter); // فلترة أولية للمرحلة
            }
        });
    });
}

// ==========================================
// 🎨 المدرسين ونخبة المعلمين
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;

// تدرجات الألوان الفخمة لكروت Primee
const teacherCardGradients = [
    'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.4), #0d1527 80%)',
    'radial-gradient(circle at 50% 20%, rgba(124, 58, 237, 0.4), #0d1527 80%)',
    'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.4), #0d1527 80%)',
    'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.4), #0d1527 80%)'
];

// دالة متابعة الأستاذ
window.followTeacher = async function(tName) {
    if(!loggedInPhone || !globalUserData) return pmNotify("تسجيل الدخول مطلوب", "سجل دخولك أولاً للمتابعة!", "warning");
    const btn = event.currentTarget; const oldHtml = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
    try {
        let following = globalUserData.followingTeachers || [];
        if(following.includes(tName)) { pmNotify("موجودة", "أنت تتابع هذا المدرس بالفعل.", "info"); btn.innerHTML = 'متابع ✔️'; btn.style.background='#059669'; return; }
        await updateDoc(doc(db, "users", globalUserData.id), { followingTeachers: arrayUnion(tName) });
        globalUserData.followingTeachers = following; globalUserData.followingTeachers.push(tName);
        window.sendWhatsAppToPhone(globalUserData.studentPhone, `تم متابعة الأستاذ: *${tName}* بنجاح في Primee Academy 🚀`);
        btn.innerHTML = 'متابع ✔️'; btn.style.background='#059669';
    } catch(e) { pmNotify("خطأ", "حدث خطأ أثناء المتابعة.", "error"); btn.innerHTML = oldHtml; btn.disabled = false; }
}

async function fetchTeachers() {
    try {
        const snap = await getDocs(collection(db, "teachers"));
        if(snap.empty) return;
        snap.forEach(docSnap => allTeachersData.push({ id: docSnap.id, ...docSnap.data() }));
        renderTeachers('all');
    } catch(e) {}
}

function renderTeachers(filterText) {
    const grid = document.getElementById('teachersGrid');
    const filtered = allTeachersData.filter(t => filterText === 'all' ? true : t.stages && t.stages.includes(filterText));
    if(filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; width:100%; color:rgba(255,255,255,0.7); padding:30px;">لا يوجد مدرسين هنا حالياً.</div>'; return; }
    
    let html = '';
    filtered.forEach((t, index) => {
        let cardBg = teacherCardGradients[index % teacherCardGradients.length];
        let isFollowing = globalUserData && globalUserData.followingTeachers && globalUserData.followingTeachers.includes(t.name);
        
        let followBtnHtml = isFollowing 
            ? `<button class="btn-follow-modernFollowing" style="background:#059669 !important; cursor:default;" onclick="event.stopPropagation();">متابع ✔️</button>`
            : `<button class="btn-follow-modern" onclick="event.stopPropagation(); followTeacher('${t.name}')">متابعة الأستاذ <i class="fas fa-heart"></i></button>`;

        html += `
        <div class="swiper-slide">
            <div class="primee-teacher-card" onclick="openTeacherCourses('${t.name}')">
                <div class="pt-card-bg-glow" style="background: ${cardBg};"></div>
                <div class="pt-card-subject-tag">${t.subject}</div>
                <img src="${t.imageUrl}" alt="${t.name}" class="pt-card-img" loading="lazy" decoding="async">
                <div class="pt-card-info-box">
                    <h4 class="pt-card-name">${t.name}</h4>
                    <div class="pt-card-actions">
                        <button class="btn-view-lessons" onclick="event.stopPropagation(); openTeacherCourses('${t.name}')">عرض الحصص <i class="fas fa-arrow-left"></i></button>
                        ${followBtnHtml}
                    </div>
                </div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;

    if(teachersSwiperInstance) teachersSwiperInstance.destroy(true, true);
    teachersSwiperInstance = new Swiper('.teachers-slider', { slidesPerView: 'auto', spaceBetween: 20, grabCursor: true, autoplay: { delay: 3500, disableOnInteraction: false }, navigation: { nextEl: '.modern-swiper-nav.swiper-button-next', prevEl: '.modern-swiper-nav.swiper-button-prev' }, pagination: { el: '.swiper-pagination', clickable: true } });
}

fetchTeachers();
setupNestedFilters('teachersMainFilters', 'teachersSubFilters', renderTeachers);

// عرض جميع المدرسين في مودال
document.getElementById('viewAllTeachersBtn')?.addEventListener('click', (e) => {
    e.preventDefault(); const grid = document.getElementById('allTeachersGrid'); let html = '';
    allTeachersData.forEach((t, idx) => {
        let cardBg = teacherCardGradients[idx % teacherCardGradients.length];
        html += `<div class="primee-teacher-card" style="width:100%; height:380px; display:flex;" onclick="document.getElementById('allTeachersModal').classList.remove('active'); openTeacherCourses('${t.name}')"><div class="pt-card-bg-glow" style="background: ${cardBg};"></div><div class="pt-card-subject-tag">${t.subject}</div><img src="${t.imageUrl}" class="pt-card-img"><div class="pt-card-info-box"><h4 class="pt-card-name">${t.name}</h4><button class="btn-view-lessons" style="padding: 8px 12px; font-size: 13px;">عرض الحصص <i class="fas fa-arrow-left"></i></button></div></div>`;
    });
    grid.innerHTML = html;
    document.getElementById('allTeachersModal').classList.add('active');
});

// ==========================================
//  الباقات الشاملة
// ==========================================
let allPackagesData = [];
let packagesSwiperInstance = null;

async function fetchPackages() {
    try {
        const snap = await getDocs(collection(db, "packages"));
        if(snap.empty) return; snap.forEach(docSnap => allPackagesData.push({id: docSnap.id, ...docSnap.data()})); renderPackages('all');
    } catch(e) {}
}

function renderPackages(filterText) {
    const grid = document.getElementById('packagesGridContainer');
    const filtered = allPackagesData.filter(p => filterText === 'all' ? true : p.grade && p.grade.includes(filterText));
    if(filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; width:100%; color:var(--pm-text-muted); padding:30px;">لا يوجد باقات هنا حالياً.</div>'; return; }
    let html = '';
    filtered.forEach(pkg => {
        let fHtml = ''; if(pkg.features) pkg.features.forEach(f => fHtml += `<li><i class="fas fa-check-circle" style="color: var(--pm-green);"></i> ${f.trim()}</li>`);
        const subLink = loggedInPhone ? `javascript:buyCourseAction('${pkg.id}', ${pkg.newPrice}, '${pkg.name}', 'package')` : 'login.html';
        html += `
        <div class="swiper-slide">
            <div class="premium-package-card">
                <img src="${pkg.imageUrl}" class="pkg-glow-image">
                <h3>${pkg.name}</h3><p>${pkg.grade}</p>
                <ul class="pkg-features">${fHtml}</ul>
                <div class="pkg-price-row">
                    <span class="old-price">${pkg.oldPrice} ج</span>
                    <span class="new-price">${pkg.newPrice} ج.م</span>
                </div>
                <button onclick="${subLink}" class="btn-buy-pkg">اشترك الآن</button>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
    if (packagesSwiperInstance) packagesSwiperInstance.destroy(true, true);
    packagesSwiperInstance = new Swiper('.packages-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 3800, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true } });
}
fetchPackages();
setupNestedFilters('packagesMainFilters', 'packagesSubFilters', renderPackages);

// ==========================================
// الحصص وأحدث المضاف
// ==========================================
async function fetchCoursesSliders() {
    try {
        const snap = await getDocs(collection(db, "courses")); let allC = []; snap.forEach(d => allC.push({id: d.id, ...d.data()}));
        let latest = [...allC].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
        let studentMyCourses = globalUserData ? globalUserData.myCourses || [] : [];

        const buildCard = (c) => {
            const viewsVal = c.maxViews; let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || !viewsVal) ? "لا محدود" : viewsVal;
            const isBought = studentMyCourses.includes(c.id);
            let btnHtml = isBought ? `<button class="btn-bought-course" onclick="window.location.href='student-dashboard.html'">مشتراة ✔️</button>` : `<button class="btn-buy-course" onclick="buyCourseAction('${c.id}', ${c.price}, '${c.title}', 'course')">اشترك</button>`;
            return `<div class="swiper-slide"><div class="course-slide-card"><div class="c-slide-img" style="background-image: url('${c.image || 'https://via.placeholder.com/300'}');"></div><h4>${c.title}</h4><p><i class="fas fa-chalkboard-teacher"></i> ${c.instructor} | المشاهدات: ${allowedV}</p><div class="c-slide-bottom"><span class="price">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>${btnHtml}</div></div></div>`;
        };

        const latGrid = document.getElementById('latestCoursesGrid');
        if(latGrid) { latGrid.innerHTML = latest.map(buildCard).join(''); new Swiper('.latest-courses-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 3500, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true } }); }
    } catch(e) {}
}
fetchCoursesSliders();

// ==========================================
// 🛒 الشراء والاشتراك وأكواد الخصم
// ==========================================
window.currentViewingTeacher = "";
window.pendingCourseId = null; window.pendingCoursePrice = 0; window.pendingCourseTitle = ""; window.pendingCourseType = "course";

// فتح نافذة اختيار المرحلة قبل عرض الحصص
window.openTeacherCourses = function(instructorName) { window.currentViewingTeacher = instructorName; document.getElementById('stageSelectionModal').classList.add('active'); }

// جلب وعرض حصص الأستاذ بناءً على المرحلة
window.selectStageAndLoadCourses = async function(stageKeyword) {
    document.getElementById('stageSelectionModal').classList.remove('active');
    document.getElementById('modalTeacherName').innerText = 'حصص ' + window.currentViewingTeacher;
    const grid = document.getElementById('modalCoursesGrid'); grid.innerHTML = '<div style="text-align: center; width: 100%; padding: 30px;"><i class="fas fa-spinner fa-spin" style="font-size:30px; color: var(--pm-blue);"></i></div>';
    document.getElementById('teacherCoursesModal').classList.add('active');

    try {
        let studentMyCourses = globalUserData ? globalUserData.myCourses || [] : [];
        const q = query(collection(db, "courses"), where("instructor", "==", window.currentViewingTeacher));
        const snapshot = await getDocs(q);
        let html = ''; let hasCourses = false;

        snapshot.forEach(docSnap => {
            const c = docSnap.data(); const gradeStr = (c.grade || "").toLowerCase(); let isMatch = false;
            if (stageKeyword === 'ابتدائي' && (gradeStr.includes('ابتدائي') || gradeStr.includes('primary'))) isMatch = true;
            else if (stageKeyword === 'إعدادي' && (gradeStr.includes('إعدادي') || gradeStr.includes('prep'))) isMatch = true;
            else if (stageKeyword === 'ثانوي' && (gradeStr.includes('ثانوي') || gradeStr.includes('secondary'))) isMatch = true;
            else if (stageKeyword === 'بكالوريا' && (gradeStr.includes('بكالوريا') || gradeStr.includes('bac'))) isMatch = true;

            if(isMatch) {
                hasCourses = true;
                const viewsVal = c.maxViews; let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || !viewsVal) ? "لا محدود" : viewsVal;
                const isBought = studentMyCourses.includes(docSnap.id);
                let btnHtml = isBought ? `<button class="btn-bought-course" onclick="window.location.href='student-dashboard.html'">تم الشراء ✔️</button>` : `<button class="btn-buy-course-modal" onclick="buyCourseAction('${docSnap.id}', ${c.price}, '${c.title}', 'course')">اشترك الآن</button>`;

                html += `<div class="course-modal-card"><div class="aspect-ratio-img" style="background-image: url('${c.image || 'https://via.placeholder.com/300'}')"></div><h4>${c.title}</h4><p><i class="fas fa-graduation-cap"></i> ${c.grade} | المشاهدات: ${allowedV}</p><div class="course-modal-bottom"><span class="price">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>${btnHtml}</div></div>`;
            }
        });
        grid.innerHTML = hasCourses ? html : '<div style="color: var(--pm-text-muted); text-align: center; width: 100%; padding: 30px;">لا توجد حصص في هذه المرحلة حالياً.</div>';
    } catch(e) {}
}

// بدء عملية الشراء
window.buyCourseAction = async function(courseId, price, title, type = 'course') {
    if(!loggedInPhone) { window.location.href = 'login.html'; return; } 
    if(!globalUserData) return;

    window.currentUserBalance = parseInt(globalUserData.walletBalance) || 0;
    window.pendingCourseId = courseId;
    window.originalCoursePrice = parseInt(price) || 0;
    window.pendingCoursePrice = window.originalCoursePrice;
    window.pendingCourseTitle = title;
    window.pendingCourseType = type;

    // تهيئة مودال التأكيد
    document.getElementById('promoCodeInput').value = ''; document.getElementById('promoCodeInput').disabled = false;
    document.getElementById('btnApplyPromo').disabled = false; document.getElementById('btnApplyPromo').innerHTML = 'تطبيق';
    document.getElementById('promoStatusMsg').innerHTML = '';
    window.updateConfirmBuyText();
    document.getElementById('confirmBuyModal').classList.add('active');
}

// تحديث نص التأكيد
window.updateConfirmBuyText = function() {
    document.getElementById('confirmBuyText').innerHTML = `سعر الاشتراك: <strong style="color: #ef4444">${window.pendingCoursePrice} ج.م</strong><br>رصيدك الحالي: <strong style="color: var(--pm-green)">${window.currentUserBalance} ج.م</strong>`;
};

// تطبيق كود الخصم
document.getElementById('btnApplyPromo')?.addEventListener('click', async () => {
    const codeInput = document.getElementById('promoCodeInput').value.trim().toUpperCase(); if(!codeInput) return;
    const btn = document.getElementById('btnApplyPromo'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
    try {
        const q = query(collection(db, "promo_codes"), where("code", "==", codeInput));
        const snap = await getDocs(q);
        if(snap.empty) { document.getElementById('promoStatusMsg').innerHTML = '<span style="color:#ef4444;">كود الخصم غير صحيح.</span>'; btn.innerHTML = 'تطبيق'; btn.disabled = false; return; }
        const promoData = snap.docs[0].data();
        if(new Date() > new Date(promoData.expiry)) { document.getElementById('promoStatusMsg').innerHTML = '<span style="color:#ef4444;">عذراً، هذا الكود منتهي الصلاحية.</span>'; btn.innerHTML = 'تطبيق'; btn.disabled = false; return; }
        
        // تطبيق الخصم
        const discountPercent = parseInt(promoData.discount) || 0;
        const discountAmount = (window.originalCoursePrice * discountPercent) / 100;
        window.pendingCoursePrice = Math.floor(window.originalCoursePrice - discountAmount);
        
        document.getElementById('promoStatusMsg').innerHTML = `<span style="color: var(--pm-green);">تم تطبيق خصم ${discountPercent}% بنجاح! 🎉</span>`;
        document.getElementById('promoCodeInput').disabled = true; window.updateConfirmBuyText(); btn.innerHTML = 'تم ✔️';
    } catch(e) { document.getElementById('promoStatusMsg').innerHTML = '<span style="color:#ef4444;">حدث خطأ أثناء الفحص.</span>'; btn.innerHTML = 'تطبيق'; btn.disabled = false; }
});

// تنفيذ عملية الشراء النهائية
document.getElementById('btnExecuteBuy')?.addEventListener('click', async () => {
    if (window.currentUserBalance < window.pendingCoursePrice) {
        pmNotify("رصيد غير كافٍ ⚠️", "رصيدك الحالي لا يكفي لإتمام الشراء.\nسيتم توجيهك لشحن الرصيد.", "warning");
        setTimeout(() => window.location.href = 'student-dashboard.html', 2500);
        return;
    }
    const btn = document.getElementById('btnExecuteBuy'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاشتراك...'; btn.disabled = true;
    try {
        const typeName = window.pendingCourseType === 'package' ? 'الباقة' : 'الحصة';
        const newCourses = globalUserData.myCourses || []; const newPackages = globalUserData.myPackages || [];
        if (window.pendingCourseType === 'package') { if(!newPackages.includes(window.pendingCourseId)) newPackages.push(window.pendingCourseId); } 
        else { if(!newCourses.includes(window.pendingCourseId)) newCourses.push(window.pendingCourseId); }
        
        const notifications = globalUserData.notifications || [];
        notifications.push({ title: `تم الاشتراك في ${typeName} 📚`, text: `تم الاشتراك في "${window.pendingCourseTitle}" بنجاح، بالتوفيق!`, date: new Date().toISOString() });

        // تحديث الداتابيز
        const updateData = { walletBalance: window.currentUserBalance - window.pendingCoursePrice, notifications: notifications };
        if (window.pendingCourseType === 'package') updateData.myPackages = newPackages; else updateData.myCourses = newCourses;
        await updateDoc(doc(db, "users", globalUserData.id), updateData);
        
        // إرسال رسائل واتساب
        window.sendWhatsAppToPhone(globalUserData.studentPhone, `أهلاً بك يا بطل 🎉\nتم اشتراكك في ${typeName} "${window.pendingCourseTitle}" بنجاح. بالتوفيق! 🚀`);
        if(globalUserData.parentPhone) window.sendWhatsAppToPhone(globalUserData.parentPhone, `إشعار من Primee Academy 🔔\nتم اشتراك الطالب/ة ${globalUserData.fullName} في ${typeName} "${window.pendingCourseTitle}".`);

        pmNotify("مبروك! 🎉", `تم الاشتراك في ${typeName} بنجاح.\nتقدر تتابعها من لوحة التحكم.`, "success");
        setTimeout(() => window.location.href = 'student-dashboard.html', 2500);
    } catch(e) { pmNotify("خطأ", "حدث خطأ أثناء الاشتراك. يرجى المحاولة مرة أخرى.", "error"); btn.innerHTML = 'نعم، اشترك الآن'; btn.disabled = false; }
});

// ==========================================
// 🚀 المساعدة الذكية ماجي وشات الواتساب (وظائفك)
// ==========================================
const WORKER_URL = "https://ai.adelabdulrahman026.workers.dev"; // رابط الـ Worker لنقل الحساب

// تهيئة أزرار ماجي
document.getElementById('openMaggieBtn')?.addEventListener('click', () => { 
    document.getElementById('maggieChatModal').classList.add('active'); resetMaggieInputArea();
});
document.getElementById('closeMaggieBtn')?.addEventListener('click', () => document.getElementById('maggieChatModal').classList.remove('active'));

// وظائف شات ماجي
window.appendAiMsg = (text) => { const chat = document.getElementById('maggieChatBody'); if(chat) { chat.innerHTML += `<div class="ai-msg">${text}</div>`; chat.scrollTop = chat.scrollHeight; } };
window.appendUserMsg = (text) => { const chat = document.getElementById('maggieChatBody'); if(chat) { chat.innerHTML += `<div class="user-msg">${text}</div>`; chat.scrollTop = chat.scrollHeight; } };

function resetMaggieInputArea() { const area = document.getElementById('maggieInputArea'); area.style.display='none'; area.innerHTML=''; }

// الخيارات الأساسية
document.getElementById('mainMaggieOptions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if(!btn) return;
    document.getElementById('mainMaggieOptions').style.display='none';
    
    if(btn.id === 'optTransfer') {
        window.appendUserMsg("نقل الحساب لجهاز آخر");
        window.appendAiMsg("⚠️ <b>تنبيه هام:</b> الحفاظ على سرية حسابك مسؤوليتك. لك <b>3 محاولات فقط</b> لنقل الحساب لجهاز آخر.<br><br>هل أنت متأكد من رغبتك في النقل؟");
        const area = document.getElementById('maggieInputArea'); area.innerHTML = `<button onclick="startTransferProcess()" style="background: var(--pm-green); color:#fff; width:100%; border:none; padding:12px; border-radius:10px; font-weight:bold; cursor:pointer;">موافق، أريد النقل</button><button onclick="window.resetMaggieChat()" style="background: rgba(239, 68, 68, 0.1); color:#ef4444; width:100%; border:none; padding:12px; border-radius:10px; cursor:pointer; margin-top:5px;">إلغاء</button>`; area.style.display='block'; area.style.flexDirection='column';area.style.gap='5px';
    } else if(btn.id === 'optWallet') {
        window.appendUserMsg("مشكلة في شحن المحفظة");
        window.appendAiMsg("إذا قمت بالتحويل ولم يتم الشحن، فربما لم تقم بإدخال <b>الرقم الذي قمت بالتحويل منه</b> بشكل صحيح.<br><br>المحاولة بتتم آلياً، ولو واجهتك مشكلة تقدر تتواصل مع دعم المدفوعات: 01093139047 📞");
        const area = document.getElementById('maggieInputArea'); area.innerHTML=`<button onclick="window.resetMaggieChat()" style="background:var(--pm-blue); width:100%; color:#fff; border:none; padding:10px; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`; area.style.display='block';
    } else if(btn.id === 'optLesson') {
        window.appendUserMsg("مشكلة في تشغيل الحصة");
        window.appendAiMsg("اكتب المشكلة اللي بتواجهك، وهتواصل مع الدعم الفني على الواتساب.");
        const area = document.getElementById('maggieInputArea'); area.innerHTML=`<input type="text" id="lessonProblemInput" placeholder="اكتب مشكلتك..." style="flex:1; padding:10px; border-radius:8px; border:1px solid rgba(148,163,184,0.2); background: rgba(0,0,0,0.05); color:var(--pm-text-main); font-family:'Cairo'; outline:none;"><button onclick="sendLessonProblem()" style="background:var(--pm-green); color:#fff; border:none; padding:10px 15px; border-radius:10px; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>`; area.style.display='flex';
    } else if(btn.id === 'optLive') {
        window.appendUserMsg("تواصل مباشر مع الدعم");
        window.open(`https://wa.me/201042728734?text=${encodeURIComponent("أهلاً، أحتاج لمساعدة فنية بخصوص المنصة.")}`, '_blank');
        window.appendAiMsg("تم تحويلك لدعم الواتساب الفني، شكراً لك!");
        resetMaggieInputArea();
    }
});

// الرجوع للقائمة الرئيسية
window.resetMaggieChat = function() {
    document.getElementById('mainMaggieOptions').style.display='flex'; resetMaggieInputArea();
}

// إرسال مشكلة الحصة
window.sendLessonProblem = function() {
    const prob = document.getElementById('lessonProblemInput').value.trim(); if(!prob) return;
    window.appendUserMsg(prob);
    window.open(`https://wa.me/201042728734?text=${encodeURIComponent("عندي مشكلة في تشغيل الحصة:\n" + prob)}`, '_blank');
    window.appendAiMsg("تم تحويلك لدعم الواتساب الفني، شكراً لك!");
    resetMaggieInputArea();
}

// 🔐 وظائف نقل الحساب (🔐 وظائف نقل الحساب (تستخدم الـ Worker والسيرفر)
window.transferSessionData = {};

window.startTransferProcess = async function() {
    if(!loggedInPhone) return window.appendAiMsg("عذراً، يرجى تسجيل الدخول أولاً.");
    const area = document.getElementById('maggieInputArea'); area.style.display='none';
    window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جاري جلب بيانات حسابك ومحاولاتك المتبقية...");
    
    try {
        const res = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_transfer', phone: loggedInPhone }) });
        const data = await res.json();
        if(!data.success) { window.appendAiMsg(`❌ ${data.error}`); resetMaggieInputArea(); } 
        else {
            window.transferSessionData = { docId: data.docId, attempts: data.attempts, oldDeviceId: data.oldDeviceId };
            window.appendAiMsg(`تم إرسال كود الـ OTP المكون من 4 أرقام في رسالة واتساب للرقم ${loggedInPhone}.<br>متبقي لك <b>${data.attempts} محاولات</b> لتأكيد النقل.<br><br>يرجى إدخال الكود:`);
            area.innerHTML = `<input type="text" id="otpInput" placeholder="أدخل كود الـ OTP..." style="flex:1; padding:10px; border-radius:8px; border:1px solid rgba(148,163,184,0.2); background: rgba(0,0,0,0.05); color:var(--pm-text-main); font-family:'Cairo'; outline:none;"><button onclick="verifyTransferOTP()" style="background:var(--pm-green); color:#fff; border:none; padding:10px 15px; border-radius:10px; cursor:pointer;"><i class="fas fa-check"></i> تأكيد</button>`; area.style.display='flex';
        }
    } catch (err) { window.appendAiMsg("❌ حدث خطأ في الاتصال بالسيرفر، يرجى المحاولة لاحقاً."); resetMaggieInputArea(); }
}

window.verifyTransferOTP = async function() {
    const otp = document.getElementById('otpInput').value.trim(); if(otp.length !== 4) return pmNotify("خطأ", "كود الـ OTP غير صحيح.", "error");
    window.appendUserMsg(otp);
    window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جاري التحقق من الكود وتأكيد نقل الجهاز...");
    const area = document.getElementById('maggieInputArea'); area.style.display='none';
    try {
        const res = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify_transfer', docId: window.transferSessionData.docId, otp: otp, oldDeviceId: window.transferSessionData.oldDeviceId, attemptsLeft: window.transferSessionData.attempts }) });
        const data = await res.json();
        if(data.success) {
            window.appendAiMsg(`✅ تم نقل الحساب بنجاح، وربطه بجهازك الحالي!<br>تذكر: المحاولة التالية ستستهلك من المحاولات الـ ${data.newAttempts} المتبقية لك.<br><br>تم طرد الجهاز القديم بنجاح.`);
        } else {
            window.appendAiMsg(`❌ ${data.error}`);
        }
        resetMaggieInputArea();
    } catch(e) { window.appendAiMsg("❌ حدث خطأ في الشبكة."); resetMaggieInputArea(); }
}
