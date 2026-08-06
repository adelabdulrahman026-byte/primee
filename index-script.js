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
// 1. فحص تسجيل الدخول
// ==========================================
const loggedInPhone = localStorage.getItem('studentPhone');
if (loggedInPhone) {
    const myCoursesLink = document.getElementById('myCoursesLink');
    if (myCoursesLink) myCoursesLink.style.display = 'block';
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

            const navAuthSection = document.getElementById('navAuthSection');
            if (navAuthSection) {
                navAuthSection.innerHTML = `
                    <div class="logged-in-badge" onclick="window.location.href='student-dashboard.html'">
                        <div class="badge-info"><span class="s-name">${firstName}</span><span class="s-wallet">${balance} ج.م</span></div>
                        <div class="badge-avatar"><i class="fas fa-user-graduate"></i></div>
                    </div>
                `;
            }

            const mobileAuthSection = document.getElementById('mobileAuthSection');
            if (mobileAuthSection) {
                mobileAuthSection.innerHTML = `
                    <div class="mobile-user-profile" onclick="window.location.href='student-dashboard.html'">
                        <div class="m-avatar"><i class="fas fa-user-graduate"></i></div>
                        <div class="m-info"><h4>أهلاً بك، ${firstName}</h4><span>الرصيد: ${balance} ج.م</span></div>
                    </div>
                    <button class="btn-logout-mobile" onclick="localStorage.removeItem('studentPhone'); window.location.reload();"><i class="fas fa-sign-out-alt"></i> تسجيل خروج</button>
                `;
            }

            const mobileMyCourses = document.getElementById('mobileMyCoursesLink');
            if(mobileMyCourses) mobileMyCourses.style.display = 'block';
        }
    } catch (error) { console.error(error); }
}

// ==========================================
// 2. تفعيل القائمة الجانبية (Drawer)
// ==========================================
const openDrawerBtn = document.getElementById('openDrawer');
const closeDrawerBtn = document.getElementById('closeDrawer');
const stagesDrawer = document.getElementById('stagesDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

if (openDrawerBtn && stagesDrawer && drawerOverlay) {
    openDrawerBtn.addEventListener('click', () => { stagesDrawer.classList.add('open'); drawerOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
}

function closeDrawer() {
    if (stagesDrawer && drawerOverlay) { stagesDrawer.classList.remove('open'); drawerOverlay.classList.remove('active'); document.body.style.overflow = ''; }
}

if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

// ==========================================
// 3. نافذة متابعة ولي الأمر والدارك مود
// ==========================================
const btnParentLogin = document.getElementById('btnParentLogin');
if (btnParentLogin) {
    btnParentLogin.addEventListener('click', () => {
        const phone = document.getElementById('parentStudentPhone').value;
        if (phone.length >= 10) window.location.href = `parent-report.html?phone=${phone}`;
        else alert("رجاءً إدخال رقم هاتف صحيح للطالب.");
    });
}

const themeToggleBtn = document.getElementById('themeToggleBtn');
const bodyElement = document.body;
if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector('i');
    if (localStorage.getItem('theme') === 'dark') {
        bodyElement.setAttribute('data-theme', 'dark');
        if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    }
    themeToggleBtn.addEventListener('click', () => {
        if (bodyElement.getAttribute('data-theme') === 'dark') {
            bodyElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        } else {
            bodyElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
        }
    });
}

// ==========================================
// 5. نافذة عرض حصص المدرس المحددة (المودال)
// ==========================================
window.openTeacherCourses = async function(instructorName) {
    document.getElementById('modalTeacherName').innerText = 'حصص ' + instructorName;
    const grid = document.getElementById('modalCoursesGrid');
    
    grid.innerHTML = '<div style="color: #94a3b8; text-align: center; width: 100%; padding: 30px;">جاري جلب الحصص... ⏳</div>';
    document.getElementById('teacherCoursesModal').classList.add('active');

    try {
        const q = query(collection(db, "courses"), where("instructor", "==", instructorName));
        const snapshot = await getDocs(q);
        
        if(snapshot.empty) {
            grid.innerHTML = '<div style="color: #ef4444; text-align: center; width: 100%; padding: 30px;">لا توجد حصص متاحة لهذا المدرس حالياً.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const c = doc.data();
            const subLink = loggedInPhone ? 'student-dashboard.html' : 'login.html'; 
            
            html += `
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 15px; padding: 15px; text-align: right;">
                <div style="aspect-ratio: 16/9; background: url('${c.image || 'https://via.placeholder.com/300'}') center/cover; border-radius: 10px; margin-bottom: 15px;"></div>
                <h4 style="color: #f8fafc; margin: 0 0 5px 0; font-size: 18px; font-weight: 800;">${c.title}</h4>
                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 15px 0;"><i class="fas fa-graduation-cap"></i> ${c.grade}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #475569; padding-top: 15px;">
                    <span style="color: #10b981; font-weight: 900; font-size: 20px;">${c.price > 0 ? c.price + ' ج.م' : 'مجاني'}</span>
                    <button onclick="window.location.href='${subLink}'" style="background: #f59e0b; color: #fff; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: 800;">اشترك</button>
                </div>
            </div>`;
        });
        grid.innerHTML = html;
    } catch(e) {
        grid.innerHTML = '<div style="color: #ef4444; text-align: center; width: 100%; padding: 30px;">حدث خطأ أثناء جلب الحصص.</div>';
    }
}

// ==========================================
// 6. جلب الباقات الديناميكية
// ==========================================
async function loadDynamicPackages() {
    const packagesGrid = document.querySelector('.packages-grid');
    if (!packagesGrid) return;

    try {
        const querySnapshot = await getDocs(collection(db, "packages"));
        if (querySnapshot.empty) {
            packagesGrid.innerHTML = '<div style="text-align: center; width: 100%; color: #94a3b8; padding: 20px;">لا توجد باقات متاحة حالياً.</div>';
            return;
        }

        let html = '';
        querySnapshot.forEach(docSnap => {
            const pkg = docSnap.data();
            const subLink = loggedInPhone ? 'student-dashboard.html' : 'login.html';
            
            let featuresHtml = '';
            if (pkg.features) {
                pkg.features.forEach(f => {
                    featuresHtml += `<li><i class="fas fa-check-circle"></i> ${f.trim()}</li>`;
                });
            }

            html += `
            <div class="package-card" style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 25px; overflow: hidden; position: relative; display: flex; flex-direction: column;">
                <div style="aspect-ratio: 1 / 1; background: url('${pkg.imageUrl}') center/contain no-repeat #0f172a; margin: -25px -25px 20px -25px; border-bottom: 2px solid #f59e0b;"></div>
                <div class="package-header">
                    <span class="package-badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 900;">🔥 خصم خاص</span>
                    <h3 style="color: #f8fafc; font-size: 22px; margin: 15px 0 5px 0;">${pkg.name}</h3>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">${pkg.grade}</p>
                </div>
                <ul class="package-features" style="list-style: none; padding: 0; margin: 20px 0; color: #cbd5e1; display: flex; flex-direction: column; gap: 10px; flex-grow: 1;">
                    ${featuresHtml}
                </ul>
                <div class="package-price" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px dashed #475569; padding-top: 20px;">
                    <span class="old-price" style="text-decoration: line-through; color: #ef4444; font-weight: 800;">${pkg.oldPrice} ج.م</span>
                    <span class="new-price" style="font-size: 26px; font-weight: 900; color: #10b981;">${pkg.newPrice} ج.م</span>
                </div>
                <button onclick="window.location.href='${subLink}'" class="btn-package-subscribe" style="width: 100%; background: #3b82f6; color: #fff; border: none; padding: 15px; border-radius: 12px; font-weight: 900; font-family: 'Cairo'; margin-top: 20px; cursor: pointer; transition: 0.3s;">اشترك الآن</button>
            </div>`;
        });
        packagesGrid.innerHTML = html;
    } catch (e) {}
}
loadDynamicPackages();
// ==========================================
// 7. جلب المدرسين (كروت Coverflow 3D والفلترة)
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;

// دالة رسم المدرسين بناءً على الفلتر
function renderTeachers(filterStage) {
    const teachersGrid = document.getElementById('teachersGrid');
    let html = '';

    const filteredTeachers = allTeachersData.filter(t => {
        if (filterStage === 'all') return true;
        return t.stages && t.stages.includes(filterStage);
    });

    if (filteredTeachers.length === 0) {
        teachersGrid.innerHTML = '<div style="text-align: center; width: 100%; color: #94a3b8; padding: 50px 20px;">لا يوجد مدرسين في هذه المرحلة حالياً.</div>';
        if(teachersSwiperInstance) { teachersSwiperInstance.destroy(true, true); teachersSwiperInstance = null; }
        return;
    }

    filteredTeachers.forEach(t => {
        let stagesText = t.stages ? t.stages.split(',').slice(0, 2).join(' | ') : ''; // نعرض اول مرحلتين بس عشان الزحمة
        
        html += `
        <div class="swiper-slide">
            <img src="${t.imageUrl}" alt="${t.name}" class="cover-card-img">
            <div class="cover-card-fade">
                <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); color: #f59e0b; padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1);">
                    <i class="fas fa-book"></i> ${t.subject}
                </div>
                <h3>${t.name}</h3>
                <p>${stagesText}</p>
                <button class="cover-card-btn" onclick="openTeacherCourses('${t.name}')">تصفح الحصص <i class="fas fa-arrow-left"></i></button>
            </div>
        </div>`;
    });

    teachersGrid.innerHTML = html;

    // إعادة تشغيل السلايدر
    if (teachersSwiperInstance) { teachersSwiperInstance.destroy(true, true); }
    const sliderContainer = document.querySelector('.teachers-slider');
    
    // لو مش دايسين "عرض الكل"، شغل السلايدر الـ 3D
    if (!sliderContainer.classList.contains('teachers-grid-active') && typeof Swiper !== 'undefined') {
        teachersSwiperInstance = new Swiper('.teachers-slider', {
            effect: 'coverflow', // التأثير المطلوب!
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            coverflowEffect: {
                rotate: 0, // بدون دوران
                stretch: -30, // تداخل الكروت
                depth: 150, // العمق للكروت الجانبية
                modifier: 1,
                slideShadows: false, // شيلنا الظل الافتراضي الكئيب
            },
            autoplay: { delay: 3000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            }
        });
    }
}

// تحميل المدرسين من الداتا بيز
async function fetchTeachers() {
    try {
        const querySnapshot = await getDocs(collection(db, "teachers"));
        allTeachersData = [];
        querySnapshot.forEach(doc => {
            allTeachersData.push({ id: doc.id, ...doc.data() });
        });
        renderTeachers('all'); // عرض الكل في البداية
    } catch (e) { console.error("خطأ في جلب المدرسين:", e); }
}
fetchTeachers();

// تشغيل زراير الفلترة
const filterBtns = document.querySelectorAll('#teachersFilters .modern-filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.getAttribute('data-filter');
        renderTeachers(filter);
    });
});

// زرار عرض جميع المدرسين (إلغاء السلايدر وفرد الشبكة)
document.getElementById('viewAllTeachersBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const sliderContainer = document.querySelector('.teachers-slider');
    const wrapper = sliderContainer.querySelector('.swiper-wrapper');
    
    sliderContainer.classList.toggle('teachers-grid-active');
    
    if (sliderContainer.classList.contains('teachers-grid-active')) {
        e.target.innerHTML = 'عرض كشريط <i class="fas fa-arrow-right"></i>';
        if(teachersSwiperInstance) { teachersSwiperInstance.destroy(false, true); }
        wrapper.style.transform = 'none'; 
    } else {
        e.target.innerHTML = 'عرض جميع المدرسين <i class="fas fa-arrow-left"></i>';
        // نعيد تشغيل الفلتر الحالي عشان يرجع السلايدر
        const activeFilter = document.querySelector('#teachersFilters .modern-filter-btn.active').getAttribute('data-filter');
        renderTeachers(activeFilter);
    }
});
