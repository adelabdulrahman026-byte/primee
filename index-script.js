// تم حذف سطر الـ import لـ getCountFromServer
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc, arrayUnion, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// دالة pmNotify باقية كما هي دون تغيير

// دالة sendWhatsAppToPhone باقية كما هي دون تغيير

// دالة تحديد الـ Device ID باقية كما هي دون تغيير

// دالة phraseAnimation الخاصة بالهيرو تم حذفها لتتوافق مع التصميم الأبسط الجديد

// تم حذف دالة updateLiveCounter و animateValue تماماً كما طلبت لإلغاء عداد الطلاب المباشر

const loggedInPhone = localStorage.getItem('studentPhone');
let globalUserData = null;
if (loggedInPhone) {
    const myC = document.getElementById('myCoursesLink');
    if (myC) myC.style.display = 'block';
    fetchStudentNavData(loggedInPhone);
}

// دالة fetchStudentNavData باقية كما هي دون تغيير

// دالة closeDrawer و Hamburger باقية كما هي دون تغيير

// دالة ParentLogin باقية كما هي دون تغيير

// دالة تفعيل الوضع الليلي / النهاري باقية كما هي دون تغيير

// دالة البحث عن المدرسين باقية كما هي دون تغيير

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
// 🎨 كروت المدرسين بالتصميم الأنيق الجديد
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;

// دالة followTeacher باقية كما هي دون تغيير

async function fetchTeachers() {
    try {
        const snap = await getDocs(collection(db, "teachers"));
        if(snap.empty) return;
        // تم حذف كود الـ heroFadeGrid لأن التصميم الجديد للهيرو بسيط ولا يحتوي على سلايدر مدرسين
        snap.forEach(doc => {
            const t = { id: doc.id, ...doc.data() };
            allTeachersData.push(t);
        });
        renderTeachers('all');
    } catch(e) {}
}

function renderTeachers(filterText) {
    const grid = document.getElementById('teachersGrid');
    const filtered = allTeachersData.filter(t => filterText === 'all' ? true : t.stages && t.stages.includes(filterText));
    if(filtered.length === 0) { 
        grid.innerHTML = '<div style="text-align:center; width:100%; color:#94a3b8; padding:30px;">لا يوجد مدرسين هنا.</div>'; 
        return; 
    }
    
    let html = '';
    filtered.forEach((t, index) => {
        let isFollowing = globalUserData && globalUserData.followingTeachers && globalUserData.followingTeachers.includes(t.name);
        
        let followBtnHtml = isFollowing 
            ? `<button class="btn-follow-modern" style="background:rgba(16,185,129,0.2) !important; border-color:#10b981 !important; color:#10b981 !important;" onclick="event.stopPropagation();">تمت المتابعة ✔️</button>`
            : `<button class="btn-follow-modern" onclick="event.stopPropagation(); followTeacher('${t.name}')">متابعة <i class="fas fa-heart"></i></button>`;

        html += `
        <div class="swiper-slide">
            <div class="primee-teacher-card" onclick="openTeacherCourses('${t.name}')">
                <div class="pt-card-img-wrapper">
                    <img src="${t.imageUrl}" alt="${t.name}" class="pt-card-img" loading="lazy" decoding="async">
                    <div class="pt-card-subject-tag"><i class="fas fa-book"></i> ${t.subject}</div>
                </div>
                <div class="pt-card-info-box">
                    <h4 class="pt-card-name">${t.name}</h4>
                    <div class="pt-card-actions">
                        <button class="btn-view-lessons" onclick="event.stopPropagation(); openTeacherCourses('${t.name}')">
                            <span>تصفح الحصص</span>
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        ${followBtnHtml}
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    grid.innerHTML = html;
    if(teachersSwiperInstance) teachersSwiperInstance.destroy(true, true);
    
    if(typeof Swiper !== 'undefined') {
        teachersSwiperInstance = new Swiper('.teachers-slider', {
            slidesPerView: 'auto',
            spaceBetween: 22,
            centeredSlides: false,
            grabCursor: true,
            autoplay: { delay: 3500, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
        });
    }
}

fetchTeachers();
setupNestedFilters('teachersMainFilters', 'teachersSubFilters', renderTeachers);

// دالة viewAllTeachersBtn الخاصة بعرض كافة المدرسين في نافذة منبثقة باقية كما هي

// كود جلب وعرض الباقات الشاملة باق كما هو دون تغيير

// كود جلب وعرض سلايدرات الحصص (الأحدث والأكثر مشاهدة) باق كما هو دون تغيير

// كود وظائف الشراء والاشتراك باق كما هو دون تغيير

// كود المساعدة الذكية ماجي (AI & Live Chat) باق كما هو دون تغيير
