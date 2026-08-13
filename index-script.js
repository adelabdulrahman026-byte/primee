import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// إغلاق الإشعارات لو ضغطت بره
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('navDropdown');
    const bellBtn = document.getElementById('navBellBtn');
    if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ==========================================
// 1. الأنيميشن، الدخول، وتحديث الهيدر
// ==========================================
const phrases = [
    "تعلّم بذكاء،<br><span>وتقدّم بثقة.</span>", 
    "اكتشف قدراتك،<br><span>واصنع مستقبلك.</span>", 
    "نخبة المعلمين،<br><span>في شاشة واحدة.</span>"
];
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

const loggedInPhone = localStorage.getItem('studentPhone');
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
            const data = userSnap.docs[0].data();
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
            
            // 🚨 قراءة الإشعارات الحقيقية من الداتا بيز 🚨
            // (بافتراض إنك مخزنها جوه حقل اسمه notifications عبارة عن Array)
            let notifHtml = '';
            if (data.notifications && data.notifications.length > 0) {
                // نعرضهم من الأحدث للأقدم
                const notifs = data.notifications.reverse();
                notifs.forEach(n => {
                    notifHtml += `
                    <div class="notif-item">
                        <div class="notif-icon"><i class="fas fa-bell"></i></div>
                        <div class="notif-text"><p>${n.text || n.title || 'إشعار جديد'}</p></div>
                    </div>`;
                });
                document.querySelector('.nav-bell-wrapper .badge').style.display = 'block';
            } else {
                notifHtml = '<div style="text-align:center; color:#94a3b8; padding: 10px;">لا توجد إشعارات حالياً</div>';
                document.querySelector('.nav-bell-wrapper .badge').style.display = 'none';
            }
            document.getElementById('notificationsListContent').innerHTML = notifHtml;
        }
    } catch (e) { console.error(e); }
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
        if (heroVideoBg.src !== targetUrl) {
            heroVideoBg.src = targetUrl;
            heroVideoBg.load();
            heroVideoBg.play().catch(()=>{});
        }
    }
    if (heroOverlayColor) {
        heroOverlayColor.style.background = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.4)';
    }
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

// المساعد الذكي ماجي
window.sendMaggieMessage = async function() {
    const input = document.getElementById('maggieInput');
    const msg = input.value.trim();
    if(!msg) return;
    const chatBody = document.getElementById('maggieChatBody');
    chatBody.innerHTML += `<div class="user-msg">${msg}</div>`;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    const loadingId = 'loading-' + Date.now();
    chatBody.innerHTML += `<div class="ai-msg" id="${loadingId}"><i class="fas fa-ellipsis-h fa-fade"></i> ماجي تفكر...</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
    const CLOUDFLARE_WORKER_URL = "https://your-worker-name.your-username.workers.dev"; 
    try {
        const response = await fetch(CLOUDFLARE_WORKER_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });
        const data = await response.json();
        document.getElementById(loadingId).remove();
        chatBody.innerHTML += `<div class="ai-msg">${data.reply}</div>`;
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBody.innerHTML += `<div class="ai-msg" style="color: #ef4444;">عذراً، فيه مشكلة في الاتصال حالياً. 🔌</div>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}
document.getElementById('maggieInput')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMaggieMessage(); });

// الفلاتر
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

// المدرسين
let allTeachersData = [];
let teachersSwiperInstance = null;
let heroFadeSwiperInstance = null; 

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
                <div class="hero-teacher-info">
                    <h4 class="hero-teacher-name">${t.name}</h4>
                    <span class="hero-teacher-subject">${t.subject}</span>
                </div>
            </div>`;
        });
        if(heroFadeGrid) {
            heroFadeGrid.innerHTML = heroFadeHtml;
            if(typeof Swiper !== 'undefined') {
                heroFadeSwiperInstance = new Swiper('.hero-fade-slider', {
                    effect: 'fade', fadeEffect: { crossFade: true },
                    grabCursor: true, loop: true, autoplay: { delay: 3000, disableOnInteraction: false }
                });
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
    filtered.forEach(t => {
        let stgText = t.stages ? t.stages.split(',').slice(0, 2).join(' | ') : '';
        html += `
        <div class="swiper-slide">
            <img src="${t.imageUrl}" alt="${t.name}" class="cover-card-img">
            <div class="cover-card-fade">
                <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); color: #f59e0b; padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-book"></i> ${t.subject}</div>
                <h3>${t.name}</h3><p>${stgText}</p>
                <button class="cover-card-btn" onclick="openTeacherCourses('${t.name}')">تصفح الحصص <i class="fas fa-arrow-left"></i></button>
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
// 6. الحصص وتعديل المشاهدات والشراء 🚨
// ==========================================
async function fetchCoursesSliders() {
    try {
        const snap = await getDocs(collection(db, "courses"));
        let allC = [];
        snap.forEach(d => allC.push({id: d.id, ...d.data()}));
        
        let latest = [...allC].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
        let top = [...allC].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 6);

        let studentMyCourses = [];
        if(loggedInPhone) {
            const userQ = query(collection(db, "users"), where("studentPhone", "==", loggedInPhone));
            const userSnap = await getDocs(userQ);
            if(!userSnap.empty) studentMyCourses = userSnap.docs[0].data().myCourses || [];
        }

        const buildCard = (c) => {
            // 🚨 تحديث المشاهدات (لا محدود لو صفر أو فاضي) 🚨
            let viewsVal = c.allowedViews;
            let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || viewsVal === undefined || viewsVal === null) ? "لا محدود" : viewsVal;
            
            // 🚨 تغيير شكل الزرار لو الطالب شاري الحصة 🚨
            const isBought = studentMyCourses.includes(c.id);
            let btnHtml = isBought 
                ? `<button onclick="window.location.href='student-dashboard.html'" style="background:var(--input-bg); color:#10b981; border:1px solid #10b981; padding:8px 15px; border-radius:8px; font-weight:800; cursor:pointer;">تم الشراء ✔</button>` 
                : `<button onclick="buyCourseAction('${c.id}', ${c.price}, '${c.title}')" style="background:#3b82f6; color:#fff; border:none; padding:8px 15px; border-radius:8px; font-weight:800; cursor:pointer;">اشترك</button>`;

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
        if(latGrid) { latGrid.innerHTML = latest.map(buildCard).join(''); new Swiper('.latest-courses-slider', { slidesPerView: 'auto', spaceBetween: 20 }); }
        const topGrid = document.getElementById('topCoursesGrid');
        if(topGrid) { topGrid.innerHTML = top.map(buildCard).join(''); new Swiper('.top-courses-slider', { slidesPerView: 'auto', spaceBetween: 20 }); }
    } catch(e) {}
}
fetchCoursesSliders();

// باقي الشراء كما هو...
window.currentViewingTeacher = "";
window.pendingCourseId = null;
window.pendingCoursePrice = 0;
window.pendingCourseTitle = "";

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
        let studentMyCourses = [];
        if(loggedInPhone) {
            const userQ = query(collection(db, "users"), where("studentPhone", "==", loggedInPhone));
            const userSnap = await getDocs(userQ);
            if(!userSnap.empty) studentMyCourses = userSnap.docs[0].data().myCourses || [];
        }

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
                
                // 🚨 منطق المشاهدات (لا محدود) والشراء 🚨
                let viewsVal = c.allowedViews;
                let allowedV = (viewsVal == 0 || viewsVal === "0" || viewsVal === "" || viewsVal === undefined || viewsVal === null) ? "لا محدود" : viewsVal;
                
                const isBought = studentMyCourses.includes(docSnap.id);
                let btnHtml = isBought 
                    ? `<button onclick="window.location.href='student-dashboard.html'" style="background:var(--input-bg); color:#10b981; border:1px solid #10b981; padding:8px 20px; border-radius:8px; cursor:pointer; font-weight:800;">تم الشراء ✔</button>` 
                    : `<button onclick="buyCourseAction('${docSnap.id}', ${c.price}, '${c.title}')" style="background:#f59e0b; color:#fff; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-weight:800;">اشترك الآن</button>`;

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

window.buyCourseAction = async function(courseId, price, title) {
    if(!loggedInPhone) { window.location.href = 'login.html'; return; } 
    const btn = event.target; const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

    try {
        const userQ = query(collection(db, "users"), where("studentPhone", "==", loggedInPhone));
        const userSnap = await getDocs(userQ);
        const userData = userSnap.docs[0].data();
        window.currentUserId = userSnap.docs[0].id;
        window.currentUserBalance = parseInt(userData.walletBalance) || 0;
        window.currentUserCourses = userData.myCourses || []; 

        window.pendingCourseId = courseId;
        window.pendingCoursePrice = parseInt(price) || 0;
        window.pendingCourseTitle = title;

        if(window.currentUserBalance >= window.pendingCoursePrice) {
            document.getElementById('confirmBuyText').innerHTML = `سعر الحصة: <strong style="color:#ef4444">${window.pendingCoursePrice} ج.م</strong><br>رصيدك: <strong style="color:#10b981">${window.currentUserBalance} ج.م</strong><br><br>هل أنت متأكد من الشراء؟`;
            document.getElementById('confirmBuyModal').classList.add('active');
        } else {
            document.getElementById('chargeReqText').innerHTML = `سعر الحصة <strong>${window.pendingCoursePrice} ج.م</strong> ورصيدك <strong>${window.currentUserBalance} ج.م</strong>.<br>تحتاج لشحن <strong>${window.pendingCoursePrice - window.currentUserBalance} ج.م</strong>.`;
            document.getElementById('chargeToBuyModal').classList.add('active');
        }
    } catch (e) {} finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function executePurchaseAndAddCourse(newBalance) {
    if(!window.currentUserCourses.includes(window.pendingCourseId)) {
        window.currentUserCourses.push(window.pendingCourseId);
    }
    await updateDoc(doc(db, "users", window.currentUserId), {
        walletBalance: newBalance,
        myCourses: window.currentUserCourses
    });
}

document.getElementById('btnExecuteBuy')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnExecuteBuy');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الشراء...'; btn.disabled = true;

    try {
        await executePurchaseAndAddCourse(window.currentUserBalance - window.pendingCoursePrice);
        alert("🎉 مبروك! تم شراء الحصة بنجاح وإضافتها لكورساتك.");
        window.location.href = 'student-dashboard.html'; 
    } catch(e) { alert("حدث خطأ."); btn.innerHTML = 'نعم، اشترك'; btn.disabled = false; }
});

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

        if(newTempBalance >= window.pendingCoursePrice) {
            await executePurchaseAndAddCourse(newTempBalance - window.pendingCoursePrice);
            alert(`🎉 تم شحن (${codeValue} ج.م) وشراء الحصة بنجاح!`);
            window.location.href = 'student-dashboard.html';
        } else {
            await updateDoc(doc(db, "users", window.currentUserId), { walletBalance: newTempBalance });
            window.currentUserBalance = newTempBalance;
            document.getElementById('autoChargeCodeInput').value = '';
            alert(`✅ تم شحن (${codeValue} ج.م). رصيدك الآن (${newTempBalance} ج.م) لا يكفي للحصة. أدخل كود آخر.`);
            btn.innerHTML = 'شحن واشتراك 🚀'; btn.disabled = false;
        }
    } catch(err) { alert(err.message); btn.innerHTML = 'شحن واشتراك 🚀'; btn.disabled = false; }
});
