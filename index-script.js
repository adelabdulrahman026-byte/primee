import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc, arrayUnion, onSnapshot, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentDeviceId = localStorage.getItem('deviceId');
if (!currentDeviceId) {
    currentDeviceId = 'DEV-' + Date.now() + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', currentDeviceId);
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('navDropdown');
    const bellBtn = document.getElementById('navBellBtn');
    if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

const phrases = ["تعلّم بذكاء،<br><span>وتقدّم بثقة.</span>", "اكتشف قدراتك،<br><span>واصنع مستقبلك.</span>", "نخبة المعلمين،<br><span>في شاشة واحدة.</span>"];
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
    }, 3500);
}

// 🚨 تحديث عداد الطلاب الحي 🚨
async function updateLiveCounter() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        const targetNumber = snap.size;
        animateValue("liveStudentsCounter", 0, targetNumber, 2000);
    } catch (e) {}
}
function animateValue(id, start, end, duration) {
    if (start === end) return;
    var range = end - start;
    var current = start;
    var increment = end > start ? 1 : -1;
    var stepTime = Math.abs(Math.floor(duration / range));
    var obj = document.getElementById(id);
    var timer = setInterval(function() {
        current += increment;
        if(obj) obj.innerHTML = current;
        if (current == end) { clearInterval(timer); }
    }, stepTime);
}
updateLiveCounter();

const loggedInPhone = localStorage.getItem('studentPhone');
let globalUserData = null; // هنحتفظ ببيانات اليوزر عشان نحتاجها في الإشعارات
if (loggedInPhone) {
    const myC = document.getElementById('myCoursesLink');
    if (myC) myC.style.display = 'block';
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
            if (navAuth) navAuth.innerHTML = `<div class="logged-in-badge" onclick="window.location.href='student-dashboard.html'"><div class="badge-info"><span class="s-name">${firstName}</span><span class="s-wallet">${balance} ج.م</span></div><div class="badge-avatar">${avatarHtml}</div></div>`;

            const mobAuth = document.getElementById('mobileAuthSection');
            if (mobAuth) mobAuth.innerHTML = `
                <div class="mobile-user-profile-card">
                    <div class="m-avatar">${avatarHtml}</div>
                    <h4>أهلاً، ${firstName}</h4>
                    <span class="m-wallet">رصيدك: ${balance} ج.م</span>
                    <button class="btn-logout-premium" onclick="localStorage.removeItem('studentPhone'); window.location.reload();"><i class="fas fa-sign-out-alt"></i> تسجيل خروج</button>
                </div>
            `;
            
            const mobMyC = document.getElementById('mobileMyCoursesLink');
            if(mobMyC) mobMyC.style.display = 'block';
            
            let notifHtml = '';
            if (data.notifications && data.notifications.length > 0) {
                const notifs = data.notifications.reverse(); 
                notifs.forEach(n => {
                    let iconColor = n.title && n.title.includes('شحن') ? '#3b82f6' : '#10b981';
                    let iconBg = n.title && n.title.includes('شحن') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                    let iconClass = n.title && n.title.includes('شحن') ? 'fa-wallet' : 'fa-check-circle';
                    
                    notifHtml += `
                    <div class="notif-item">
                        <div class="notif-icon" style="color: ${iconColor}; background: ${iconBg};"><i class="fas ${iconClass}"></i></div>
                        <div class="notif-text"><p>${n.text || n.title || 'إشعار جديد'}</p></div>
                    </div>`;
                });
                const badge = document.querySelector('.nav-bell-wrapper .badge');
                if(badge) badge.style.display = 'block';
            } else {
                notifHtml = '<div style="text-align:center; color:#94a3b8; padding: 10px;">لا توجد إشعارات حالياً</div>';
                const badge = document.querySelector('.nav-bell-wrapper .badge');
                if(badge) badge.style.display = 'none';
            }
            const notifContent = document.getElementById('notificationsListContent');
            if(notifContent) notifContent.innerHTML = notifHtml;
        }
    } catch (e) {}
}

document.getElementById('openDrawer')?.addEventListener('click', () => { document.getElementById('stagesDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('active'); document.body.style.overflow='hidden'; });
function closeDrawer() { document.getElementById('stagesDrawer')?.classList.remove('open'); document.getElementById('drawerOverlay')?.classList.remove('active'); document.body.style.overflow=''; }
document.getElementById('closeDrawer')?.addEventListener('click', closeDrawer); document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);
document.getElementById('btnParentLogin')?.addEventListener('click', () => { const p = document.getElementById('parentStudentPhone').value; if(p.length>=10) window.location.href=`parent-report.html?phone=${p}`; else alert("رقم غير صحيح"); });

const themeBtn = document.getElementById('themeToggleBtn');
const heroVideoBg = document.getElementById('heroVideoBg');
const heroOverlayColor = document.getElementById('heroOverlayColor');
const dayVideoUrl = "https://www.primeeacademy.com/day.mp4"; 
const nightVideoUrl = "https://www.primeeacademy.com/night.mp4"; 

function applyThemeColors(isDark) {
    if (heroVideoBg) {
        const targetUrl = isDark ? nightVideoUrl : dayVideoUrl;
        if (heroVideoBg.src !== targetUrl) { heroVideoBg.src = targetUrl; heroVideoBg.load(); heroVideoBg.play().catch(()=>{}); }
    }
    if (heroOverlayColor) heroOverlayColor.style.background = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.4)';
}

if(themeBtn) {
    const icon = themeBtn.querySelector('i');
    const isDark = document.body.getAttribute('data-theme') === 'dark' || localStorage.getItem('theme') === 'dark';
    if(isDark) { document.body.setAttribute('data-theme', 'dark'); icon.classList.replace('fa-moon', 'fa-sun'); }
    applyThemeColors(isDark);
    themeBtn.addEventListener('click', () => {
        const currentlyDark = document.body.getAttribute('data-theme') === 'dark';
        if(currentlyDark) { 
            document.body.removeAttribute('data-theme'); localStorage.setItem('theme','light'); 
            icon.classList.replace('fa-sun','fa-moon'); applyThemeColors(false);
        } else { 
            document.body.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); 
            icon.classList.replace('fa-moon','fa-sun'); applyThemeColors(true);
        }
    });
}

document.getElementById('btnExecuteSearchTeacher')?.addEventListener('click', () => {
    const term = document.getElementById('searchTeacherInput').value.trim().toLowerCase();
    document.getElementById('searchTeacherModal').classList.remove('active');
    document.getElementById('viewAllTeachersBtn').click(); 
    setTimeout(() => {
        document.querySelectorAll('.modern-teacher-card').forEach(card => {
            const name = card.querySelector('h3').innerText.toLowerCase();
            card.parentElement.style.display = name.includes(term) ? 'block' : 'none';
        });
        document.getElementById('teachersSection').scrollIntoView({behavior: 'smooth'});
    }, 500);
});

const subStagesMap = {
    'ابتدائي': ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'],
    'إعدادي': ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي'],
    'ثانوي': ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'],
    'بكالوريا': ['الأول بكالوريا', 'الثاني بكالوريا', 'الثالث بكالوريا']
};
function setupNestedFilters(mainContainerId, subContainerId, onFilterCallback) {
    const mainBtns = document.querySelectorAll(`#${mainContainerId} .modern-filter-btn`);
    const subContainer = document.getElementById(subContainerId);
    mainBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            mainBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mainFilter = btn.getAttribute('data-filter');
            if(mainFilter === 'all') {
                subContainer.style.display = 'none'; onFilterCallback('all');
            } else {
                subContainer.innerHTML = '';
                const subStages = subStagesMap[mainFilter];
                if(subStages) {
                    subStages.forEach(sub => {
                        const subBtn = document.createElement('button');
                        subBtn.className = 'sub-filter-btn'; subBtn.textContent = sub;
                        subBtn.onclick = (ev) => {
                            subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
                            ev.target.classList.add('active'); onFilterCallback(sub);
                        };
                        subContainer.appendChild(subBtn);
                    });
                    subContainer.style.display = 'flex';
                }
                onFilterCallback(mainFilter); 
            }
        });
    });
}

// ==========================================
// 🚨 المدرسين والتلوين وزرار المتابعة 🚨
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;

// ألوان متناسقة لكروت المدرسين
const teacherGradients = [
    'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(29, 78, 216, 0.9))', // Blue
    'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(4, 120, 87, 0.9))',  // Green
    'linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(180, 83, 9, 0.9))',  // Orange
    'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(109, 40, 217, 0.9))', // Purple
    'linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(190, 24, 93, 0.9))'   // Pink
];

window.followTeacher = async function(tName) {
    if(!loggedInPhone || !globalUserData) return alert("سجل دخولك أولاً للمتابعة!");
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
    
    try {
        let following = globalUserData.followingTeachers || [];
        if(following.includes(tName)) {
            alert("أنت تتابع هذا المدرس بالفعل.");
            btn.innerHTML = 'تم المتابعة ✔️'; return;
        }
        
        await updateDoc(doc(db, "users", globalUserData.id), {
            followingTeachers: arrayUnion(tName)
        });
        
        globalUserData.followingTeachers = following;
        globalUserData.followingTeachers.push(tName);
        
        // إرسال واتساب
        const msg = `أهلاً بك يا بطل 🚀\nتم متابعة الأستاذ: *${tName}* بنجاح.\nهيوصلك إشعار فوراً بأي حصة أو باقة جديدة تنزل للأستاذ.`;
        window.sendWhatsAppToPhone(globalUserData.studentPhone, msg);
        
        btn.innerHTML = 'تم المتابعة ✔️';
        btn.style.background = '#10b981'; btn.style.borderColor = '#10b981';
    } catch(e) {
        alert("حدث خطأ."); btn.innerHTML = oldHtml; btn.disabled = false;
    }
}

async function fetchTeachers() {
    try {
        const snap = await getDocs(collection(db, "teachers"));
        if(snap.empty) return;
        let heroFadeGrid = document.getElementById('heroTeachersFadeGrid');
        let heroFadeHtml = '';
        snap.forEach(doc => {
            const t = { id: doc.id, ...doc.data() };
            allTeachersData.push(t);
            heroFadeHtml += `
            <div class="swiper-slide hero-slide-fade" onclick="openTeacherCourses('${t.name}')" style="cursor:pointer;">
                <div class="teacher-glow-bg"></div>
                <img src="${t.imageUrl}" alt="${t.name}" class="teacher-fade-png">
                <div class="hero-teacher-info"><h4 class="hero-teacher-name">${t.name}</h4><span class="hero-teacher-subject">${t.subject}</span></div>
            </div>`;
        });
        if(heroFadeGrid) {
            heroFadeGrid.innerHTML = heroFadeHtml;
            if(typeof Swiper !== 'undefined') {
                new Swiper('.hero-fade-slider', { effect: 'fade', fadeEffect: { crossFade: true }, grabCursor: true, loop: true, autoplay: { delay: 3000, disableOnInteraction: false } });
            }
        }
        renderTeachers('all');
    } catch(e) {}
}

function renderTeachers(filterText) {
    const grid = document.getElementById('teachersGrid');
    const filtered = allTeachersData.filter(t => filterText === 'all' ? true : t.stages && t.stages.includes(filterText));
    if(filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; width:100%; color:#94a3b8; padding:30px;">لا يوجد مدرسين هنا.</div>'; return; }
    
    let html = '';
    filtered.forEach((t, index) => {
        let stgText = t.stages ? t.stages.split(',').slice(0, 2).join(' | ') : '';
        let bgColor = teacherGradients[index % teacherGradients.length]; // توزيع الألوان
        
        let isFollowing = globalUserData && globalUserData.followingTeachers && globalUserData.followingTeachers.includes(t.name);
        let followBtnHtml = isFollowing 
            ? `<button class="btn-follow-teacher" style="background:#10b981; border-color:#10b981;" onclick="event.stopPropagation();">تم المتابعة ✔️</button>`
            : `<button class="btn-follow-teacher" onclick="event.stopPropagation(); followTeacher('${t.name}')">متابعة الأستاذ <i class="fas fa-heart"></i></button>`;

        html += `
        <div class="swiper-slide">
            <!-- خلفية ملونة تحت الصورة -->
            <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: ${bgColor}; border-radius: 20px; z-index: -1;"></div>
            <img src="${t.imageUrl}" alt="${t.name}" class="cover-card-img" style="mix-blend-mode: luminosity;">
            <div class="cover-card-fade">
                <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); color: #f59e0b; padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-book"></i> ${t.subject}</div>
                <h3>${t.name}</h3><p>${stgText}</p>
                <button class="cover-card-btn" onclick="openTeacherCourses('${t.name}')">تصفح الحصص <i class="fas fa-arrow-left"></i></button>
                ${followBtnHtml}
            </div>
        </div>`;
    });
    grid.innerHTML = html;
    if(teachersSwiperInstance) teachersSwiperInstance.destroy(true, true);
    const sliderContainer = document.querySelector('.teachers-slider');
    if(!sliderContainer.classList.contains('teachers-grid-active') && typeof Swiper !== 'undefined') {
        teachersSwiperInstance = new Swiper('.teachers-slider', {
            effect: 'coverflow', grabCursor: true, centeredSlides: true, slidesPerView: 'auto',
            coverflowEffect: { rotate: 0, stretch: -30, depth: 150, modifier: 1, slideShadows: false },
            autoplay: { delay: 3000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
        });
    }
}
fetchTeachers();
setupNestedFilters('teachersMainFilters', 'teachersSubFilters', renderTeachers);

document.getElementById('viewAllTeachersBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const sc = document.querySelector('.teachers-slider');
    sc.classList.toggle('teachers-grid-active');
    if(sc.classList.contains('teachers-grid-active')) {
        e.target.innerHTML = 'عرض كشريط <i class="fas fa-arrow-right"></i>';
        if(teachersSwiperInstance) teachersSwiperInstance.destroy(false, true);
        sc.querySelector('.swiper-wrapper').style.transform = 'none';
    } else {
        e.target.innerHTML = 'عرض جميع المدرسين <i class="fas fa-arrow-left"></i>';
        renderTeachers(document.querySelector('#teachersMainFilters .active').getAttribute('data-filter') || 'all');
    }
});

// ==========================================
// 6. الباقات
// ==========================================
let allPackagesData = [];
let packagesSwiperInstance = null;

async function fetchPackages() {
    try {
        const snap = await getDocs(collection(db, "packages"));
        if(snap.empty) return;
        snap.forEach(doc => allPackagesData.push({id: doc.id, ...doc.data()}));
        renderPackages('all');
    } catch(e) {}
}

function renderPackages(filterText) {
    const grid = document.getElementById('packagesGridContainer');
    const filtered = allPackagesData.filter(p => filterText === 'all' ? true : p.grade && p.grade.includes(filterText));
    if(filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; width:100%; color:#94a3b8; padding:30px;">لا يوجد باقات هنا.</div>'; if (packagesSwiperInstance) packagesSwiperInstance.destroy(true, true); return; }

    let html = '';
    filtered.forEach(pkg => {
        let fHtml = '';
        if(pkg.features) pkg.features.forEach(f => fHtml += `<li><i class="fas fa-check-circle" style="color:#10b981;"></i> ${f.trim()}</li>`);
        const subLink = loggedInPhone ? `javascript:buyCourseAction('${pkg.id}', ${pkg.newPrice}, '${pkg.name}', 'package')` : 'login.html';
        
        html += `
        <div class="swiper-slide">
            <div class="premium-package-card">
                <img src="${pkg.imageUrl}" class="pkg-glow-image">
                <span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 900; align-self: flex-start; margin-bottom: 10px;">🔥 خصم خاص</span>
                <h3 style="color: var(--text-main); font-size: 22px; margin: 0 0 5px 0; font-weight: 900;">${pkg.name}</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin: 0 0 15px 0;">${pkg.grade}</p>
                <ul style="list-style:none; padding:0; margin:0 0 20px 0; color: var(--text-muted); display:flex; flex-direction:column; gap:10px; flex-grow:1;">${fHtml}</ul>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(91,33,182,0.3); padding-top:20px;">
                    <span style="text-decoration:line-through; color:#ef4444; font-weight:800;">${pkg.oldPrice} ج</span>
                    <span style="font-size:26px; font-weight:900; color:#10b981;">${pkg.newPrice} ج</span>
                </div>
                <button onclick="${subLink}" style="width:100%; background:var(--primary-color); color:#fff; border:none; padding:15px; border-radius:12px; font-weight:900; font-family:'Cairo'; margin-top:20px; cursor:pointer; transition:0.3s; box-shadow: 0 10px 20px rgba(91,33,182,0.2);">اشترك في الباقة</button>
            </div>
        </div>`;
    });
    grid.innerHTML = html;

    if (packagesSwiperInstance) packagesSwiperInstance.destroy(true, true);
    packagesSwiperInstance = new Swiper('.packages-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 3500, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true } });
}
fetchPackages();
setupNestedFilters('packagesMainFilters', 'packagesSubFilters', renderPackages);

// ==========================================
// 7. الحصص وقراءة المشاهدات
// ==========================================
async function fetchCoursesSliders() {
    try {
        const snap = await getDocs(collection(db, "courses"));
        let allC = [];
        snap.forEach(d => allC.push({id: d.id, ...d.data()}));
        
        let latest = [...allC].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
        let top = [...allC].sort((a,b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0)).slice(0, 3);

        let studentMyCourses = [];
        if(loggedInPhone && globalUserData) studentMyCourses = globalUserData.myCourses || [];

        const buildCard = (c) => {
            let viewsVal = c.maxViews; 
            let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || viewsVal === undefined || viewsVal === null) ? "لا محدود" : viewsVal;
            const isBought = studentMyCourses.includes(c.id);
            let btnHtml = isBought 
                ? `<button onclick="window.location.href='student-dashboard.html'" style="background:var(--input-bg); color:#10b981; border:1px solid #10b981; padding:8px 15px; border-radius:8px; font-weight:800; cursor:pointer;">تم الشراء ✔</button>` 
                : `<button onclick="buyCourseAction('${c.id}', ${c.price}, '${c.title}', 'course')" style="background:#3b82f6; color:#fff; border:none; padding:8px 15px; border-radius:8px; font-weight:800; cursor:pointer;">اشترك</button>`;

            return `
            <div class="swiper-slide">
                <div class="course-slide-card">
                    <div class="c-slide-img" style="background-image: url('${c.image || 'https://via.placeholder.com/300'}');"></div>
                    <h4 style="margin:0 0 5px 0; font-size:18px; color:var(--text-main); font-weight:900;">${c.title}</h4>
                    <p style="margin:0 0 10px 0; color:var(--text-muted); font-size:13px;"><i class="fas fa-chalkboard-teacher"></i> ${c.instructor} | <i class="fas fa-play-circle" style="color:#f59e0b;"></i> المشاهدات: ${allowedV}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:15px; border-top:1px solid var(--input-border);">
                        <span style="color:#10b981; font-weight:900; font-size:18px;">${c.price > 0 ? c.price + ' ج' : 'مجاني'}</span>
                        ${btnHtml}
                    </div>
                </div>
            </div>`;
        };

        const latGrid = document.getElementById('latestCoursesGrid');
        if(latGrid) { latGrid.innerHTML = latest.map(buildCard).join(''); new Swiper('.latest-courses-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 3500, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true } }); }
        
        const topGrid = document.getElementById('topCoursesGrid');
        if(topGrid) { topGrid.innerHTML = top.map(buildCard).join(''); new Swiper('.top-courses-slider', { slidesPerView: 'auto', spaceBetween: 20, autoplay: { delay: 4000, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true } }); }
    } catch(e) { console.error(e); }
}
fetchCoursesSliders();

// ==========================================
// 🚨 الشراء والدفع عبر البوابة أو الكود 🚨
// ==========================================
window.currentViewingTeacher = "";
window.pendingCourseId = null;
window.pendingCoursePrice = 0;
window.pendingCourseTitle = "";
window.pendingCourseType = "course"; // course or package

window.openTeacherCourses = function(instructorName) {
    window.currentViewingTeacher = instructorName;
    document.getElementById('stageSelectionModal').classList.add('active');
}

window.selectStageAndLoadCourses = async function(stageKeyword) {
    document.getElementById('stageSelectionModal').classList.remove('active');
    document.getElementById('modalTeacherName').innerText = 'حصص ' + window.currentViewingTeacher;
    const grid = document.getElementById('modalCoursesGrid');
    grid.innerHTML = '<div style="text-align: center; width: 100%; padding: 30px;"><i class="fas fa-spinner fa-spin" style="font-size:30px; color:#3b82f6;"></i><br>جاري الجلب...</div>';
    document.getElementById('teacherCoursesModal').classList.add('active');

    try {
        let studentMyCourses = globalUserData ? globalUserData.myCourses || [] : [];
        const q = query(collection(db, "courses"), where("instructor", "==", window.currentViewingTeacher));
        const snapshot = await getDocs(q);
        
        let html = ''; let hasCourses = false;

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const gradeStr = (c.grade || "").toLowerCase();
            let isMatch = false;
            if (stageKeyword === 'ابتدائي' && (gradeStr.includes('ابتدائي') || gradeStr.includes('ed'))) isMatch = true;
            else if (stageKeyword === 'إعدادي' && (gradeStr.includes('إعدادي') || gradeStr.includes('prep'))) isMatch = true;
            else if (stageKeyword === 'ثانوي' && (gradeStr.includes('ثانوي') || gradeStr.includes('sec'))) isMatch = true;
            else if (stageKeyword === 'بكالوريا' && (gradeStr.includes('بكالوريا') || gradeStr.includes('bac'))) isMatch = true;

            if(isMatch) {
                hasCourses = true;
                let viewsVal = c.maxViews; 
                let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || viewsVal === undefined || viewsVal === null) ? "لا محدود" : viewsVal;
                
                const isBought = studentMyCourses.includes(docSnap.id);
                let btnHtml = isBought 
                    ? `<button onclick="window.location.href='student-dashboard.html'" style="background:var(--input-bg); color:#10b981; border:1px solid #10b981; padding:8px 20px; border-radius:8px; cursor:pointer; font-weight:800;">تم الشراء ✔</button>` 
                    : `<button onclick="buyCourseAction('${docSnap.id}', ${c.price}, '${c.title}', 'course')" style="background:#f59e0b; color:#fff; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-weight:800;">اشترك الآن</button>`;

                html += `
                <div style="background: var(--bg-card); border: 1px solid var(--input-border); border-radius: 15px; padding: 15px; text-align: right;">
                    <div style="aspect-ratio: 16/9; background: url('${c.image || 'https://via.placeholder.com/300'}') center/cover; border-radius: 10px; margin-bottom: 15px;"></div>
                    <h4 style="color: var(--text-main); margin: 0 0 5px 0; font-size: 18px; font-weight: 800;">${c.title}</h4>
                    <p style="color: var(--text-muted); font-size: 13px; margin: 0 0 15px 0;"><i class="fas fa-graduation-cap"></i> ${c.grade} | <i class="fas fa-play-circle" style="color:#f59e0b;"></i> المشاهدات: ${allowedV}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--input-border); padding-top: 15px;">
                        <span style="color: #10b981; font-weight: 900; font-size: 20px;">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>
                        ${btnHtml}
                    </div>
                </div>`;
            }
        });
        grid.innerHTML = hasCourses ? html : '<div style="color: #ef4444; text-align: center; width: 100%; padding: 30px;">لا توجد حصص هنا حالياً.</div>';
    } catch(e) {}
}

window.buyCourseAction = async function(courseId, price, title, type = 'course') {
    if(!loggedInPhone || !globalUserData) { window.location.href = 'login.html'; return; } 
    const btn = event.target; const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

    try {
        window.currentUserId = globalUserData.id;
        window.currentUserBalance = parseInt(globalUserData.walletBalance) || 0;
        window.currentUserCourses = globalUserData.myCourses || []; 
        window.currentUserPackages = globalUserData.myPackages || []; 
        window.currentUserNotifications = globalUserData.notifications || []; 

        window.pendingCourseId = courseId;
        window.pendingCoursePrice = parseInt(price) || 0;
        window.pendingCourseTitle = title;
        window.pendingCourseType = type;

        if(window.currentUserBalance >= window.pendingCoursePrice) {
            document.getElementById('confirmBuyText').innerHTML = `سعر الاشتراك: <strong style="color:#ef4444">${window.pendingCoursePrice} ج.م</strong><br>رصيدك: <strong style="color:#10b981">${window.currentUserBalance} ج.م</strong><br><br>هل أنت متأكد من الشراء؟`;
            document.getElementById('confirmBuyModal').classList.add('active');
        } else {
            document.getElementById('chargeReqText').innerHTML = `السعر <strong>${window.pendingCoursePrice} ج.م</strong> ورصيدك <strong>${window.currentUserBalance} ج.م</strong>.<br>تحتاج لشحن <strong>${window.pendingCoursePrice - window.currentUserBalance} ج.م</strong>.`;
            document.getElementById('chargeToBuyModal').classList.add('active');
        }
    } catch (e) {} finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function executePurchaseAndAddCourse(newBalance) {
    let typeName = window.pendingCourseType === 'package' ? 'الباقة' : 'الحصة';
    
    if (window.pendingCourseType === 'package') {
        if(!window.currentUserPackages.includes(window.pendingCourseId)) window.currentUserPackages.push(window.pendingCourseId);
    } else {
        if(!window.currentUserCourses.includes(window.pendingCourseId)) window.currentUserCourses.push(window.pendingCourseId);
    }
    
    window.currentUserNotifications.push({
        title: `تم الاشتراك في ${typeName} 📚`,
        text: `تم الاشتراك في "${window.pendingCourseTitle}" بنجاح، تقدر تتابعها من الداش بورد.`,
        date: new Date().toISOString()
    });

    let updateData = {
        walletBalance: newBalance,
        notifications: window.currentUserNotifications
    };
    if (window.pendingCourseType === 'package') updateData.myPackages = window.currentUserPackages;
    else updateData.myCourses = window.currentUserCourses;

    await updateDoc(doc(db, "users", window.currentUserId), updateData);
    
    // إرسال واتساب للنجاح
    const sMsg = `أهلاً بك يا بطل 🎉\nتم شراء ${typeName} ("${window.pendingCourseTitle}") بنجاح.\nنتمنى لك التفوق والنجاح! 🚀`;
    const pMsg = `إشعار من Primee Academy 🔔\nتم اشتراك الطالب/ة: ${globalUserData.fullName} في ${typeName} ("${window.pendingCourseTitle}") بنجاح.`;
    
    window.sendWhatsAppToPhone(globalUserData.studentPhone, sMsg);
    if(globalUserData.parentPhone) window.sendWhatsAppToPhone(globalUserData.parentPhone, pMsg);
}

document.getElementById('btnExecuteBuy')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnExecuteBuy');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الشراء...'; btn.disabled = true;

    try {
        await executePurchaseAndAddCourse(window.currentUserBalance - window.pendingCoursePrice);
        alert("🎉 مبروك! تم الشراء بنجاح وإضافتها لكورساتك.");
        window.location.href = 'student-dashboard.html'; 
    } catch(e) { alert("حدث خطأ."); btn.innerHTML = 'نعم، اشترك'; btn.disabled = false; }
});

// 🚨 الشحن المباشر بالكود وقت الشراء 🚨
document.getElementById('btnSubmitChargeBuy')?.addEventListener('click', async () => {
    const codeVal = document.getElementById('autoChargeCodeInput').value.trim();
    if(!codeVal) return alert("يرجى إدخال الكود.");
    const btn = document.getElementById('btnSubmitChargeBuy');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; btn.disabled = true;

    try {
        const q = query(collection(db, "charge_codes"), where("code", "==", codeVal));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("الكود غير صحيح.");
        const codeDoc = snap.docs[0]; const codeData = codeDoc.data();
        if (codeData.isUsed) throw new Error("مستخدم مسبقاً.");

        const codeValue = parseInt(codeData.value);
        const newTempBalance = window.currentUserBalance + codeValue;

        await updateDoc(doc(db, "charge_codes", codeDoc.id), { isUsed: true, usedByPhone: loggedInPhone, usedAt: new Date().toISOString() });

        window.currentUserNotifications.push({ title: "تم شحن الرصيد 💰", text: `تم إضافة ${codeValue} ج.م بنجاح.`, date: new Date().toISOString() });

        if(newTempBalance >= window.pendingCoursePrice) {
            await executePurchaseAndAddCourse(newTempBalance - window.pendingCoursePrice);
            alert(`🎉 تم شحن (${codeValue} ج.م) وتم الشراء بنجاح!`);
            window.location.href = 'student-dashboard.html';
        } else {
            await updateDoc(doc(db, "users", window.currentUserId), { walletBalance: newTempBalance, notifications: window.currentUserNotifications });
            window.currentUserBalance = newTempBalance;
            document.getElementById('autoChargeCodeInput').value = '';
            alert(`✅ تم شحن (${codeValue} ج.م). رصيدك الآن (${newTempBalance} ج.م) لا يكفي، أدخل كود آخر.`);
            btn.innerHTML = 'شحن واشتراك بالكود 🚀'; btn.disabled = false;
        }
    } catch(err) { alert(err.message); btn.innerHTML = 'شحن واشتراك بالكود 🚀'; btn.disabled = false; }
});

// 🚨 الشحن عبر بوابة الدفع وقت الشراء 🚨
document.getElementById('btnConfirmGatewayBuy')?.addEventListener('click', async () => {
    const senderPhone = document.getElementById('gatewaySenderPhone').value.trim();
    if (senderPhone.length !== 11 || !senderPhone.startsWith('01')) {
        return alert("يرجى كتابة رقم الموبايل (11 رقم) بشكل صحيح.");
    }

    const btn = document.getElementById('btnConfirmGatewayBuy');
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> جاري الفحص..."; btn.disabled = true;

    try {
        const transfersQ = query(collection(db, "received_transfers"), where("phone", "==", senderPhone), where("used", "==", false));
        const transfersSnap = await getDocs(transfersQ);

        if (transfersSnap.empty) {
            // تسجيل محاولة فاشلة في فايربيز عشان الإدارة تشوفها
            await addDoc(collection(db, "received_transfers"), {
                studentId: globalUserData.id, studentName: globalUserData.fullName, studentPhone: globalUserData.studentPhone,
                phone: senderPhone, amount: 0, status: "failed", type: "electronic_payment", used: true,
                courseTitle: "محاولة شحن وتفعيل مباشر (فاشلة)", createdAt: new Date().toISOString()
            });
            alert("فشلت العملية ❌\nلم نجد تحويل مسجل من هذا الرقم، يرجى تحويل المبلغ أولاً ثم المحاولة مجدداً.");
        } else {
            const transferDoc = transfersSnap.docs[0];
            const amountAdded = parseInt(transferDoc.data().amount) || 0;

            await updateDoc(doc(db, "received_transfers", transferDoc.id), { used: true, studentId: globalUserData.id, studentName: globalUserData.fullName, studentPhone: globalUserData.studentPhone, status: "success" });

            const newTempBalance = window.currentUserBalance + amountAdded;
            
            if(newTempBalance >= window.pendingCoursePrice) {
                await executePurchaseAndAddCourse(newTempBalance - window.pendingCoursePrice);
                alert(`🎉 تم التأكيد! تم شحن محفظتك بـ (${amountAdded} ج.م) وتم شراء المادة بنجاح.`);
                window.location.href = 'student-dashboard.html';
            } else {
                await updateDoc(doc(db, "users", window.currentUserId), { walletBalance: newTempBalance });
                window.currentUserBalance = newTempBalance;
                alert(`✅ تم شحن (${amountAdded} ج.م). رصيدك الآن (${newTempBalance} ج.م) لسه مش مكفي!`);
            }
        }
    } catch(err) { alert("خطأ في الخادم."); } 
    finally { btn.innerHTML = "تأكيد التحويل والاشتراك 💸"; btn.disabled = false; }
});

// ==========================================
// 🚀 المساعدة الذكية ماجي (AI & Live Chat) 🚨
// ==========================================
const WORKER_URL = "https://ai.adelabdulrahman026.workers.dev";
window.liveChatInterval = null;
window.liveChatUnsubscribe = null;
let currentTransferDocId = null;
let currentTransferAttempts = null;
let currentOldDeviceId = null;

// الحل الجذري عشان الزرار يفتح
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
