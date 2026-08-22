import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// 🎨 دالة الإشعارات المخصصة (pmNotify)
// ==========================================
window.pmNotify = function(title, message, type = 'success') {
    const modal = document.getElementById('pmNotifyModal');
    const iconEl = document.getElementById('pmNotifyIcon');
    const titleEl = document.getElementById('pmNotifyTitle');
    const msgEl = document.getElementById('pmNotifyMessage');
    const btnEl = document.getElementById('pmNotifyBtn');

    if (type === 'success') { iconEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i>'; btnEl.style.background = '#10b981'; }
    else if (type === 'error') { iconEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>'; btnEl.style.background = '#ef4444'; }
    else if (type === 'warning') { iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i>'; btnEl.style.background = '#f59e0b'; }
    else { iconEl.innerHTML = '<i class="fas fa-info-circle" style="color:#3b82f6;"></i>'; btnEl.style.background = '#3b82f6'; }

    titleEl.textContent = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    modal.classList.add('active');
};

// ==========================================
// 🚨 إرسال رسائل الواتساب
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

let currentDeviceId = localStorage.getItem('deviceId');
if (!currentDeviceId) {
    currentDeviceId = 'DEV-' + Date.now() + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', currentDeviceId);
}

// إغلاق الدروب داون عند الضغط بالخارج
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('navDropdown');
    const bellBtn = document.getElementById('navBellBtn');
    if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ==========================================
// 👤 حالة المستخدم المسجل
// ==========================================
const loggedInPhone = localStorage.getItem('studentPhone');
let globalUserData = null;
if (loggedInPhone) {
    const myC = document.getElementById('myCoursesLink'); if (myC) myC.style.display = 'block';
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
            
            onSnapshot(doc(db, "users", studentDoc.id), (docSnap) => {
                if (docSnap.exists()) {
                    const latestData = docSnap.data();
                    if (latestData.isBlocked === true || (latestData.blockedDevices && latestData.blockedDevices.includes(currentDeviceId))) {
                        localStorage.clear();
                        window.location.replace("login.html");
                    }
                }
            });

            const firstName = (data.fullName || "طالب").split(" ")[0];
            const balance = data.walletBalance || 0;
            const avatarHtml = data.profileImage ? `<img src="${data.profileImage}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<i class="fas fa-user-graduate"></i>`;

            const navAuth = document.getElementById('navAuthSection');
            if (navAuth) {
                navAuth.innerHTML = `
                    <div class="logged-in-badge" onclick="window.location.href='student-dashboard.html'">
                        <div class="badge-info">
                            <span class="s-name">${firstName}</span>
                            <span class="s-wallet">${balance} ج.م</span>
                        </div>
                        <div class="badge-avatar">${avatarHtml}</div>
                    </div>
                `;
            }

            // الإشعارات
            if (data.notifications && data.notifications.length > 0) {
                let notifHtml = '';
                data.notifications.reverse().forEach(n => {
                    notifHtml += `
                        <div class="notif-item">
                            <div class="notif-icon" style="background:rgba(59,130,246,0.1); color:#3b82f6;"><i class="fas fa-bell"></i></div>
                            <p>${n.text || n.title || 'إشعار جديد'}</p>
                        </div>
                    `;
                });
                document.getElementById('notificationsListContent').innerHTML = notifHtml;
                document.querySelector('.nav-bell-wrapper .badge').style.display = 'block';
            }
        }
    } catch (e) {}
}

// تسجيل دخول ولي الأمر
document.getElementById('btnParentLogin')?.addEventListener('click', () => { 
    const p = document.getElementById('parentStudentPhone').value.trim(); 
    if(p.length >= 10) window.location.href = `parent-report.html?phone=${p}`; 
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
    const desktopIcon = document.querySelector('#themeToggleBtn i');
    if (desktopIcon) desktopIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}
function toggleTheme() {
    const currentlyDark = document.body.getAttribute('data-theme') === 'dark';
    setTheme(!currentlyDark);
}
document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
setTheme(localStorage.getItem('theme') === 'dark');

// ==========================================
// 👨‍🏫 نخبة المعلمين (بالكروت المربعة المنظمة)
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;

window.followTeacher = async function(tName) {
    if(!loggedInPhone || !globalUserData) return pmNotify("تسجيل الدخول مطلوب", "سجل دخولك أولاً للمتابعة!", "warning");
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        let following = globalUserData.followingTeachers || [];
        if(following.includes(tName)) {
            pmNotify("متابع بالفعل", "أنت تتابع هذا المدرس بالفعل.", "info");
            btn.innerHTML = 'متابع ✔️';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#10b981';
            return;
        }
        
        await updateDoc(doc(db, "users", globalUserData.id), { followingTeachers: arrayUnion(tName) });
        globalUserData.followingTeachers = following;
        globalUserData.followingTeachers.push(tName);
        
        window.sendWhatsAppToPhone(globalUserData.studentPhone, `أهلاً بك يا بطل 🚀\nتمت متابعة الأستاذ: *${tName}* بنجاح في Primee Academy.`);
        btn.innerHTML = 'متابع ✔️';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#10b981';
    } catch(e) {
        pmNotify("خطأ", "حدث خطأ أثناء المتابعة.", "error");
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

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
    if(filtered.length === 0) { 
        grid.innerHTML = '<div style="text-align:center; width:100%; color:rgba(255,255,255,0.7); padding:30px;">لا يوجد مدرسين في هذا القسم حالياً.</div>'; 
        return; 
    }
    
    let html = '';
    filtered.forEach(t => {
        let isFollowing = globalUserData && globalUserData.followingTeachers && globalUserData.followingTeachers.includes(t.name);
        
        let followBtnHtml = isFollowing 
            ? `<button class="btn-t-follow" style="color:#10b981; border-color:#10b981;" onclick="event.stopPropagation();">متابع ✔️</button>`
            : `<button class="btn-t-follow" onclick="event.stopPropagation(); followTeacher('${t.name}')">متابعة الأستاذ <i class="fas fa-heart" style="color:#ef4444;"></i></button>`;

        let stagesList = t.stages ? t.stages.split(',').map(s => s.trim()).filter(Boolean) : [];
        let stagesHtml = stagesList.map(s => `<span class="t-stage-chip">${s}</span>`).join('');

        html += `
        <div class="swiper-slide">
            <div class="primee-teacher-box-card" onclick="openTeacherCourses('${t.name}')">
                <div class="t-card-photo-wrapper">
                    <div class="t-card-subject-badge"><i class="fas fa-book-open"></i> ${t.subject}</div>
                    <img src="${t.imageUrl}" alt="${t.name}" loading="lazy">
                </div>
                <div class="t-card-body">
                    <h4 class="t-card-name">${t.name}</h4>
                    <div class="t-card-stages-chips">${stagesHtml}</div>
                    <div class="t-card-buttons">
                        <button class="btn-t-courses" onclick="event.stopPropagation(); openTeacherCourses('${t.name}')">عرض الحصص <i class="fas fa-arrow-left"></i></button>
                        ${followBtnHtml}
                    </div>
                </div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;

    if(teachersSwiperInstance) teachersSwiperInstance.destroy(true, true);
    teachersSwiperInstance = new Swiper('.teachers-slider', {
        slidesPerView: 'auto',
        spaceBetween: 20,
        grabCursor: true,
        autoplay: { delay: 3500, disableOnInteraction: false },
        navigation: { nextEl: '#teacherNextBtn', prevEl: '#teacherPrevBtn' }
    });
}

fetchTeachers();

// فلاتر المراحل
const subStagesMap = {
    'ابتدائي': ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'],
    'إعدادي': ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي'],
    'ثانوي': ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'],
    'بكالوريا': ['بكالوريا علمي', 'بكالوريا أدبي']
};

function setupNestedFilters(mainContainerId, subContainerId, onFilterCallback) {
    const mainBtns = document.querySelectorAll(`#${mainContainerId} .modern-filter-btn`);
    const subContainer = document.getElementById(subContainerId);
    if (!subContainer) return;

    mainBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            mainBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mainFilter = btn.getAttribute('data-filter');
            
            if(mainFilter === 'all') {
                subContainer.style.display = 'none';
                onFilterCallback('all');
            } else {
                subContainer.innerHTML = '';
                const subStages = subStagesMap[mainFilter];
                if(subStages) {
                    const allSubBtn = document.createElement('button');
                    allSubBtn.className = 'sub-filter-btn active';
                    allSubBtn.textContent = 'الكل';
                    allSubBtn.onclick = () => {
                        subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
                        allSubBtn.classList.add('active');
                        onFilterCallback(mainFilter);
                    };
                    subContainer.appendChild(allSubBtn);

                    subStages.forEach(sub => {
                        const subBtn = document.createElement('button');
                        subBtn.className = 'sub-filter-btn';
                        subBtn.textContent = sub;
                        subBtn.onclick = (ev) => {
                            subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
                            ev.target.classList.add('active');
                            onFilterCallback(sub);
                        };
                        subContainer.appendChild(subBtn);
                    });
                    subContainer.style.display = 'flex';
                } else {
                    subContainer.style.display = 'none';
                }
                onFilterCallback(mainFilter);
            }
        });
    });
}
setupNestedFilters('teachersMainFilters', 'teachersSubFilters', renderTeachers);

// ==========================================
// 📚 أحدث الحصص والباقات
// ==========================================
async function fetchCoursesSliders() {
    try {
        const snap = await getDocs(collection(db, "courses"));
        let allC = [];
        snap.forEach(d => allC.push({ id: d.id, ...d.data() }));
        let latest = [...allC].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
        let studentMyCourses = globalUserData ? globalUserData.myCourses || [] : [];

        const buildCard = (c) => {
            const isBought = studentMyCourses.includes(c.id);
            let btnHtml = isBought 
                ? `<button class="btn-bought-course" onclick="window.location.href='student-dashboard.html'">مشتراة ✔️</button>` 
                : `<button class="btn-buy-course" onclick="buyCourseAction('${c.id}', ${c.price}, '${c.title}', 'course')">اشترك</button>`;

            return `
            <div class="swiper-slide">
                <div class="course-slide-card">
                    <div class="c-slide-img" style="background-image: url('${c.image || 'https://via.placeholder.com/300'}');"></div>
                    <h4>${c.title}</h4>
                    <p><i class="fas fa-chalkboard-teacher"></i> ${c.instructor} | ${c.grade || ''}</p>
                    <div class="c-slide-bottom">
                        <span class="price">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>
                        ${btnHtml}
                    </div>
                </div>
            </div>`;
        };

        const latGrid = document.getElementById('latestCoursesGrid');
        if(latGrid) {
            latGrid.innerHTML = latest.map(buildCard).join('');
            new Swiper('.latest-courses-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 3500 } });
        }
    } catch(e) {}
}
fetchCoursesSliders();

// الباقات الشاملة
let allPackagesData = [];
let packagesSwiperInstance = null;

async function fetchPackages() {
    try {
        const snap = await getDocs(collection(db, "packages"));
        if(snap.empty) return;
        snap.forEach(docSnap => allPackagesData.push({ id: docSnap.id, ...docSnap.data() }));
        renderPackages('all');
    } catch(e) {}
}

function renderPackages(filterText) {
    const grid = document.getElementById('packagesGridContainer');
    const filtered = allPackagesData.filter(p => filterText === 'all' ? true : p.grade && p.grade.includes(filterText));
    if(filtered.length === 0) { 
        grid.innerHTML = '<div style="text-align:center; width:100%; color:rgba(255,255,255,0.7); padding:30px;">لا يوجد باقات في هذا القسم حالياً.</div>'; 
        return; 
    }

    let html = '';
    filtered.forEach(pkg => {
        let fHtml = '';
        if(pkg.features) pkg.features.forEach(f => fHtml += `<li><i class="fas fa-check-circle" style="color:var(--pm-green);"></i> ${f.trim()}</li>`);
        const subLink = loggedInPhone ? `javascript:buyCourseAction('${pkg.id}', ${pkg.newPrice}, '${pkg.name}', 'package')` : 'login.html';

        html += `
        <div class="swiper-slide">
            <div class="premium-package-box">
                <span class="pkg-badge-discount">🔥 خصم حصري</span>
                <div class="pkg-image-wrapper">
                    <img src="${pkg.imageUrl}" alt="${pkg.name}" loading="lazy">
                </div>
                <h3>${pkg.name}</h3>
                <p class="pkg-grade">${pkg.grade}</p>
                <ul class="pkg-features-list">${fHtml}</ul>
                <div class="pkg-pricing-row">
                    <span class="pkg-old-price">${pkg.oldPrice} ج</span>
                    <span class="pkg-new-price">${pkg.newPrice} ج.م</span>
                </div>
                <button onclick="${subLink}" class="btn-subscribe-pkg">اشترك في الباقة</button>
            </div>
        </div>`;
    });
    grid.innerHTML = html;

    if(packagesSwiperInstance) packagesSwiperInstance.destroy(true, true);
    packagesSwiperInstance = new Swiper('.packages-slider', {
        slidesPerView: 'auto',
        spaceBetween: 20,
        autoplay: { delay: 3800 },
        navigation: { nextEl: '#pkgNextBtn', prevEl: '#pkgPrevBtn' }
    });
}
fetchPackages();
setupNestedFilters('packagesMainFilters', 'packagesSubFilters', renderPackages);

// ==========================================
// 🛒 الشراء وتأكيد الاشتراك
// ==========================================
window.currentViewingTeacher = "";
window.pendingCourseId = null;
window.pendingCoursePrice = 0;
window.pendingCourseTitle = "";
window.pendingCourseType = "course";

window.openTeacherCourses = function(instructorName) {
    window.currentViewingTeacher = instructorName;
    document.getElementById('stageSelectionModal').classList.add('active');
};

window.selectStageAndLoadCourses = async function(stageKeyword) {
    document.getElementById('stageSelectionModal').classList.remove('active');
    document.getElementById('modalTeacherName').innerText = 'حصص ' + window.currentViewingTeacher;
    const grid = document.getElementById('modalCoursesGrid');
    grid.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:30px; color:var(--pm-primary);"></i></div>';
    document.getElementById('teacherCoursesModal').classList.add('active');

    try {
        let studentMyCourses = globalUserData ? globalUserData.myCourses || [] : [];
        const q = query(collection(db, "courses"), where("instructor", "==", window.currentViewingTeacher));
        const snapshot = await getDocs(q);
        let html = '';
        let hasCourses = false;

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const gradeStr = (c.grade || "").toLowerCase();
            let isMatch = false;

            if (stageKeyword === 'ابتدائي' && (gradeStr.includes('ابتدائي') || gradeStr.includes('primary'))) isMatch = true;
            else if (stageKeyword === 'إعدادي' && (gradeStr.includes('إعدادي') || gradeStr.includes('prep'))) isMatch = true;
            else if (stageKeyword === 'ثانوي' && (gradeStr.includes('ثانوي') || gradeStr.includes('secondary'))) isMatch = true;
            else if (stageKeyword === 'بكالوريا' && (gradeStr.includes('بكالوريا') || gradeStr.includes('bac'))) isMatch = true;

            if(isMatch) {
                hasCourses = true;
                const isBought = studentMyCourses.includes(docSnap.id);
                let btnHtml = isBought 
                    ? `<button class="btn-bought-course" onclick="window.location.href='student-dashboard.html'">تم الشراء ✔️</button>` 
                    : `<button class="btn-buy-course" onclick="buyCourseAction('${docSnap.id}', ${c.price}, '${c.title}', 'course')">اشترك الآن</button>`;

                html += `
                <div style="background:var(--pm-bg-card); border:1px solid var(--pm-border); border-radius:16px; padding:12px;">
                    <div style="aspect-ratio:16/9; background-image:url('${c.image || 'https://via.placeholder.com/300'}'); background-size:cover; border-radius:10px; margin-bottom:10px;"></div>
                    <h4 style="font-size:16px; margin-bottom:4px;">${c.title}</h4>
                    <p style="font-size:12px; color:var(--pm-text-muted); margin-bottom:10px;">${c.grade}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:900; color:var(--pm-green);">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>
                        ${btnHtml}
                    </div>
                </div>`;
            }
        });
        grid.innerHTML = hasCourses ? html : '<div style="color:var(--pm-text-muted); text-align:center; padding:30px;">لا توجد حصص في هذه المرحلة.</div>';
    } catch(e) {}
};

window.buyCourseAction = function(courseId, price, title, type = 'course') {
    if(!loggedInPhone) { window.location.href = 'login.html'; return; }
    if(!globalUserData) return;

    window.currentUserBalance = parseInt(globalUserData.walletBalance) || 0;
    window.pendingCourseId = courseId;
    window.originalCoursePrice = parseInt(price) || 0;
    window.pendingCoursePrice = window.originalCoursePrice;
    window.pendingCourseTitle = title;
    window.pendingCourseType = type;

    document.getElementById('promoCodeInput').value = '';
    document.getElementById('promoCodeInput').disabled = false;
    document.getElementById('btnApplyPromo').disabled = false;
    document.getElementById('promoStatusMsg').innerHTML = '';
    
    document.getElementById('confirmBuyText').innerHTML = `سعر الاشتراك: <strong style="color:#ef4444;">${window.pendingCoursePrice} ج.م</strong><br>رصيدك الحالي: <strong style="color:#10b981;">${window.currentUserBalance} ج.م</strong>`;
    document.getElementById('confirmBuyModal').classList.add('active');
};

// تطبيق كود الخصم
document.getElementById('btnApplyPromo')?.addEventListener('click', async () => {
    const codeInput = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    if(!codeInput) return;
    const btn = document.getElementById('btnApplyPromo');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const q = query(collection(db, "promo_codes"), where("code", "==", codeInput));
        const snap = await getDocs(q);
        if(snap.empty) {
            document.getElementById('promoStatusMsg').innerHTML = '<span style="color:#ef4444;">كود غير صحيح.</span>';
            btn.innerHTML = 'تطبيق'; btn.disabled = false; return;
        }
        const promoData = snap.docs[0].data();
        if(new Date() > new Date(promoData.expiry)) {
            document.getElementById('promoStatusMsg').innerHTML = '<span style="color:#ef4444;">الكود منتهي الصلاحية.</span>';
            btn.innerHTML = 'تطبيق'; btn.disabled = false; return;
        }

        const discountPercent = parseInt(promoData.discount) || 0;
        const discountAmount = (window.originalCoursePrice * discountPercent) / 100;
        window.pendingCoursePrice = Math.floor(window.originalCoursePrice - discountAmount);

        document.getElementById('promoStatusMsg').innerHTML = `<span style="color:#10b981;">تم تطبيق خصم ${discountPercent}% بنجاح!</span>`;
        document.getElementById('promoCodeInput').disabled = true;
        document.getElementById('confirmBuyText').innerHTML = `سعر الاشتراك بعد الخصم: <strong style="color:#ef4444;">${window.pendingCoursePrice} ج.م</strong><br>رصيدك الحالي: <strong style="color:#10b981;">${window.currentUserBalance} ج.م</strong>`;
        btn.innerHTML = 'تم ✔️';
    } catch(e) {
        btn.innerHTML = 'تطبيق'; btn.disabled = false;
    }
});

// تنفيذ الشراء
document.getElementById('btnExecuteBuy')?.addEventListener('click', async () => {
    if (window.currentUserBalance < window.pendingCoursePrice) {
        pmNotify("رصيد غير كافٍ ⚠️", "رصيدك الحالي لا يكفي للشراء.\nسيتم توجيهك لشحن الرصيد.", "warning");
        setTimeout(() => window.location.href = 'student-dashboard.html', 2200);
        return;
    }

    const btn = document.getElementById('btnExecuteBuy');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاشتراك...';
    btn.disabled = true;

    try {
        const typeName = window.pendingCourseType === 'package' ? 'الباقة' : 'الحصة';
        const newCourses = globalUserData.myCourses || [];
        const newPackages = globalUserData.myPackages || [];

        if (window.pendingCourseType === 'package') {
            if(!newPackages.includes(window.pendingCourseId)) newPackages.push(window.pendingCourseId);
        } else {
            if(!newCourses.includes(window.pendingCourseId)) newCourses.push(window.pendingCourseId);
        }

        const notifications = globalUserData.notifications || [];
        notifications.push({
            title: `تم الاشتراك في ${typeName} 📚`,
            text: `تم الاشتراك في "${window.pendingCourseTitle}" بنجاح، نتمنى لك التوفيق!`,
            date: new Date().toISOString()
        });

        const updateData = {
            walletBalance: window.currentUserBalance - window.pendingCoursePrice,
            notifications: notifications
        };
        if (window.pendingCourseType === 'package') updateData.myPackages = newPackages;
        else updateData.myCourses = newCourses;

        await updateDoc(doc(db, "users", globalUserData.id), updateData);
        
        window.sendWhatsAppToPhone(globalUserData.studentPhone, `أهلاً بك يا بطل 🎉\nتم اشتراكك في ${typeName} "${window.pendingCourseTitle}" بنجاح. بالتوفيق! 🚀`);
        if(globalUserData.parentPhone) {
            window.sendWhatsAppToPhone(globalUserData.parentPhone, `إشعار من Primee Academy 🔔\nتم اشتراك الطالب/ة ${globalUserData.fullName} في ${typeName} "${window.pendingCourseTitle}".`);
        }

        pmNotify("مبروك! 🎉", `تم الاشتراك في ${typeName} بنجاح.\nيمكنك الآن متابعة المحاضرات من لوحة التحكم.`, "success");
        setTimeout(() => window.location.href = 'student-dashboard.html', 2000);
    } catch(e) {
        pmNotify("خطأ", "حدث خطأ أثناء إتمام العملية.", "error");
        btn.innerHTML = 'اشترك الآن';
        btn.disabled = false;
    }
});

// ==========================================
// 🤖 المساعدة الذكية ماجي
// ==========================================
const WORKER_URL = "https://ai.adelabdulrahman026.workers.dev";
window.liveChatInterval = null;
window.liveChatUnsubscribe = null;
let currentTransferDocId = null;
let currentTransferAttempts = null;
let currentOldDeviceId = null;

document.getElementById('openMaggieBtn')?.addEventListener('click', () => {
    document.getElementById('maggieChatModal').classList.add('active');
    if(typeof window.resetMaggieChat === 'function') window.resetMaggieChat();
});

document.getElementById('closeMaggieBtn')?.addEventListener('click', () => {
    document.getElementById('maggieChatModal').classList.remove('active');
    if(window.liveChatInterval) clearInterval(window.liveChatInterval);
    if(window.liveChatUnsubscribe) window.liveChatUnsubscribe();
});

window.appendAiMsg = function(text) {
    const chatBody = document.getElementById('maggieChatBody');
    if(!chatBody) return;
    chatBody.innerHTML += `<div class="ai-msg">${text}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}
window.appendUserMsg = function(text) {
    const chatBody = document.getElementById('maggieChatBody');
    if(!chatBody) return;
    chatBody.innerHTML += `<div class="user-msg">${text}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}

window.resetMaggieChat = function() {
    const chatBody = document.getElementById('maggieChatBody');
    const inputArea = document.getElementById('maggieInputArea');
    if(!chatBody || !inputArea) return;

    chatBody.innerHTML = `
        <div class="ai-msg">أهلاً بيك في Primee Academy 👋 أنا ماجي، أقدر أساعدك إزاي النهاردة؟</div>
        <div class="maggie-options" id="mainMaggieOptions">
            <button onclick="window.handleMaggieOption('transfer')"><i class="fas fa-mobile-alt"></i> نقل الحساب لجهاز آخر</button>
            <button onclick="window.handleMaggieOption('wallet_fail')"><i class="fas fa-wallet"></i> مشكلة في شحن المحفظة</button>
            <button onclick="window.handleMaggieOption('lesson_prob')"><i class="fas fa-video"></i> مشكلة في تشغيل الحصة</button>
            <button id="btnOptLiveBtn"><i class="fas fa-headset"></i> تواصل مباشر مع الدعم</button>
        </div>
    `;
    inputArea.style.display = 'none';
    if(window.liveChatInterval) clearInterval(window.liveChatInterval);
    if(window.liveChatUnsubscribe) window.liveChatUnsubscribe();

    setTimeout(() => {
        const liveBtn = document.getElementById('btnOptLiveBtn');
        if(liveBtn) {
            liveBtn.onclick = async () => {
                document.getElementById('mainMaggieOptions').style.display = 'none';
                window.appendUserMsg("تواصل مباشر مع الدعم");
                window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جاري التحقق من حالة خدمة العملاء...");

                try {
                    const supportSnap = await getDoc(doc(db, "settings", "support"));
                    const isLive = supportSnap.exists() ? supportSnap.data().isLive : false;

                    if (isLive) {
                        if (!loggedInPhone) {
                            window.appendAiMsg("يرجى تسجيل الدخول أولاً للتواصل مع الدعم.");
                            inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`;
                            inputArea.style.display = 'block';
                            return;
                        }

                        window.appendAiMsg(`
                            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 10px; border-radius: 8px; font-size: 12px; margin-bottom: 10px;">
                                ⚠️ <b>تنبيه:</b> جميع الرسائل تختفي بعد الجلسة.
                            </div>
                            جاري توجيهك لخدمة العملاء... ⏳
                        `);
                        
                        inputArea.innerHTML = `
                            <label class="file-upload-btn" style="cursor:pointer; color:#fff; border-radius:10px; background:#334155; padding:10px;">
                                <i class="fas fa-image"></i>
                                <input type="file" id="chatImageInput" accept="image/*" style="display:none;">
                            </label>
                            <input type="text" id="liveChatInput" placeholder="اكتب رسالتك للموظف..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#fff; font-family:'Cairo'; outline:none;">
                            <button id="btnSendLiveChat" style="background:#10b981; color:#fff; border:none; padding:10px 15px; border-radius:10px; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
                        `;
                        inputArea.style.display = 'flex';

                        const userQ = query(collection(db, "users"), where("studentPhone", "==", loggedInPhone));
                        const userSnap = await getDocs(userQ);
                        const sName = userSnap.empty ? "طالب" : (userSnap.docs[0].data().fullName || "طالب");

                        const chatRef = doc(db, "live_chats", loggedInPhone);
                        
                        await setDoc(chatRef, { studentPhone: loggedInPhone, studentName: sName, adminJoined: false, lastUpdated: new Date().toISOString() }, { merge: true });

                        let isWaiting = true;
                        window.lastMsgCount = 0;

                        if(window.liveChatUnsubscribe) window.liveChatUnsubscribe();
                        window.liveChatUnsubscribe = onSnapshot(chatRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const data = docSnap.data();
                                if (data.adminJoined && isWaiting) {
                                    isWaiting = false;
                                    if (window.liveChatInterval) clearInterval(window.liveChatInterval);
                                    document.querySelectorAll('.fa-spinner').forEach(el => { if(el.parentElement) el.parentElement.remove(); }); 
                                    window.appendAiMsg("تم انضمام ممثل خدمة العملاء للمحادثة، يمكنك التحدث الآن. 🎧");
                                }
                                const msgs = data.messages || [];
                                if (msgs.length > window.lastMsgCount) {
                                    for(let i = window.lastMsgCount; i < msgs.length; i++) {
                                        const m = msgs[i];
                                        if (m.sender === 'admin') window.appendAiMsg(m.text);
                                    }
                                    window.lastMsgCount = msgs.length;
                                }
                            } else {
                                window.appendAiMsg("تم إنهاء المحادثة من قبل الدعم الفني.");
                                inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`;
                                inputArea.style.display = 'block';
                                if(window.liveChatInterval) clearInterval(window.liveChatInterval);
                                if(window.liveChatUnsubscribe) window.liveChatUnsubscribe();
                            }
                        });

                        document.getElementById('chatImageInput').onchange = async (event) => {
                            const file = event.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = function(e) { window.appendUserMsg(`<img src="${e.target.result}" style="max-width:100%; border-radius:8px; border:2px solid #3b82f6;">`); }
                                reader.readAsDataURL(file);
                                window.appendAiMsg("⚠️ جاري رفع الصورة...");
                                try {
                                    const formData = new FormData(); formData.append("image", file);
                                    const res = await fetch("https://primee-api.adelabdulrahman026.workers.dev/upload-image", { method: "POST", body: formData });
                                    const uploadData = await res.json();
                                    if(uploadData.success) {
                                        await updateDoc(chatRef, { messages: arrayUnion({ sender: 'student', text: `<img src="${uploadData.url}" style="max-width:100%; border-radius:8px;">`, time: new Date().toISOString() }) });
                                        window.lastMsgCount++; 
                                    }
                                } catch(err) { window.appendAiMsg("فشل رفع الصورة."); }
                            }
                        };

                        document.getElementById('btnSendLiveChat').onclick = async () => {
                            const inp = document.getElementById('liveChatInput');
                            const msg = inp.value.trim();
                            if(msg) { 
                                window.appendUserMsg(msg); inp.value = ''; 
                                await updateDoc(chatRef, { messages: arrayUnion({ sender: 'student', text: msg, time: new Date().toISOString() }) });
                                window.lastMsgCount++;
                            }
                        };

                        window.liveChatInterval = setInterval(() => {
                            if (isWaiting) window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جميع ممثلي خدمة العملاء مشغولون الآن، برجاء الانتظار...");
                        }, 5000);

                    } else {
                        window.appendAiMsg("خدمة العملاء الآن خارج أوقات العمل 😴<br>برجاء المحاولة في وقت آخر.");
                        inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`;
                        inputArea.style.display = 'block';
                    }
                } catch(e) {
                    window.appendAiMsg("حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.");
                    inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`;
                    inputArea.style.display = 'block';
                }
            };
        }
    }, 100);
}

window.handleMaggieOption = async function(option) {
    const inputArea = document.getElementById('maggieInputArea');

    if (option === 'transfer') {
        document.getElementById('mainMaggieOptions').style.display = 'none';
        window.appendUserMsg("نقل الحساب لجهاز آخر");
        window.appendAiMsg("⚠️ <b>تنبيه هام:</b> حفاظاً على سرية بياناتك، غير مسموح بفتح الحساب من أكثر من جهاز. <br><br>لك <b>3 محاولات فقط</b> لنقل الحساب لجهاز جديد. وإذا قمت بفتح الحساب من الجهاز القديم سيتم حظره.<br><br>هل أنت متأكد من رغبتك في النقل؟");
        
        inputArea.innerHTML = `
            <button onclick="startTransferProcess()" style="background:#10b981; width:100%; border:none; padding:12px; color:#fff; border-radius:10px; font-weight:bold; cursor:pointer;">موافق، أريد النقل</button>
            <button onclick="window.resetMaggieChat()" style="background:#ef4444; width:100%; border:none; padding:12px; color:#fff; border-radius:10px; font-weight:bold; cursor:pointer; margin-top:5px;">إلغاء</button>
        `;
        inputArea.style.display = 'block';
    } 
    else if (option === 'wallet_fail') {
        document.getElementById('mainMaggieOptions').style.display = 'none';
        window.appendUserMsg("مشكلة في شحن المحفظة");
        window.appendAiMsg(`علشان تشحن من المحفظة، لازم تتأكد 100% من <b>الرقم اللي اتحول منه المبلغ</b>.<br><br>لو متأكد إنك عملت العملية ومفيش رصيد، المحاولة بتتم آلياً. لو فيه مشكلة مستمرة تقدر تتواصل مع الدعم التقني للمدفوعات:
            <div class="support-contact-links">
                <a href="tel:01093139047" class="btn-call"><i class="fas fa-phone-alt"></i> اتصال</a>
                <a href="https://wa.me/201093139047" class="btn-wa" target="_blank"><i class="fab fa-whatsapp"></i> واتساب</a>
            </div>`);
        inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">الرجوع للقائمة</button>`;
        inputArea.style.display = 'block';
    }
    else if (option === 'lesson_prob') {
        document.getElementById('mainMaggieOptions').style.display = 'none';
        window.appendUserMsg("مشكلة في تشغيل الحصة");
        window.appendAiMsg("اكتب المشكلة اللي بتواجهك بالتفصيل، وسيتم تحويلك لدعم الواتساب الفني.");
        
        inputArea.innerHTML = `
            <input type="text" id="lessonProblemInput" placeholder="اكتب المشكلة هنا..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#fff; font-family:'Cairo'; outline:none;">
            <button onclick="sendLessonProblem()" style="background:#10b981; color:#fff; border:none; padding:10px 15px; border-radius:10px; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
        `;
        inputArea.style.display = 'flex';
    }
};

window.startTransferProcess = async function() {
    const studentPhone = localStorage.getItem('studentPhone');
    if(!studentPhone) return window.appendAiMsg("يرجى تسجيل الدخول أولاً.");
    
    const inputArea = document.getElementById('maggieInputArea');
    window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جاري فحص حسابك والتواصل مع السيرفر...");
    inputArea.style.display = 'none';

    try {
        const res = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'request_transfer', phone: studentPhone })
        });
        const data = await res.json();

        if(!data.success) {
            window.appendAiMsg(`❌ ${data.error}`);
            inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; font-weight:bold; cursor:pointer;">الرجوع للقائمة</button>`;
            inputArea.style.display = 'block';
            return;
        }

        currentTransferDocId = data.docId;
        currentTransferAttempts = data.attempts;
        currentOldDeviceId = data.oldDeviceId;

        window.appendAiMsg(`تم إرسال كود (OTP) في رسالة واتساب للرقم ${studentPhone}.<br>متبقي لك <b>${data.attempts} محاولات</b>.<br>يرجى إدخال الكود هنا:`);
        
        inputArea.innerHTML = `
            <input type="text" id="otpInput" placeholder="أدخل الكود (4 أرقام)..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#fff; font-family:'Cairo'; outline:none;">
            <button onclick="verifyTransferOTP()" style="background:#10b981; color:#fff; border:none; padding:10px 15px; border-radius:10px; cursor:pointer;"><i class="fas fa-check"></i> تأكيد</button>
        `;
        inputArea.style.display = 'flex';

    } catch (err) {
        window.appendAiMsg("❌ حدث خطأ في الاتصال بالخادم.");
        inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; font-weight:bold; cursor:pointer;">الرجوع للقائمة</button>`;
        inputArea.style.display = 'block';
    }
};

window.verifyTransferOTP = async function() {
    const otp = document.getElementById('otpInput').value.trim();
    if(!otp) return;
    window.appendUserMsg(otp);
    window.appendAiMsg("<i class='fas fa-spinner fa-spin'></i> جاري التحقق...");
    const inputArea = document.getElementById('maggieInputArea');

    let newDeviceId = localStorage.getItem('deviceId');
    if (!newDeviceId) {
        newDeviceId = 'DEV-' + Date.now() + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', newDeviceId);
    }

    try {
        const vRes = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'verify_transfer', docId: currentTransferDocId, otp: otp, 
                newDeviceId: newDeviceId, oldDeviceId: currentOldDeviceId, attemptsLeft: currentTransferAttempts 
            })
        });
        const vData = await vRes.json();

        if(vData.success) {
            window.appendAiMsg(`✅ تم نقل الحساب بنجاح!<br>متبقي لك <b>${vData.newAttempts} محاولات</b>.<br>تذكر: الجهاز القديم أصبح محظوراً.`);
            inputArea.innerHTML = `<button onclick="window.resetMaggieChat()" style="width:100%; background:#3b82f6; border:none; padding:10px; color:#fff; border-radius:10px; cursor:pointer;">إنهاء</button>`;
            inputArea.style.display = 'block';
        } else {
            window.appendAiMsg(`❌ ${vData.error}`);
        }
    } catch(e) { window.appendAiMsg("❌ حدث خطأ أثناء التفعيل."); }
};

window.sendLessonProblem = function() {
    const prob = document.getElementById('lessonProblemInput').value.trim();
    if(!prob) return;
    window.appendUserMsg(prob);
    window.open(`https://wa.me/201042728734?text=${encodeURIComponent("عندي مشكلة في الحصة:\n" + prob)}`, '_blank');
    window.appendAiMsg("تم توجيهك للواتساب للتواصل مع الدعم الفني، شكراً لك!");
    document.getElementById('lessonProblemInput').value = '';
};
