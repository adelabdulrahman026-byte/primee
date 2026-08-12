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

// ==========================================
// 1. الدخول والمود (Dark/Light) مع الـ Lottie
// ==========================================
const themeBtn = document.getElementById('themeToggleBtn');
const heroLottieBg = document.getElementById('heroLottieBg');
const heroOverlayColor = document.getElementById('heroOverlayColor');

// روابط الأنيميشن (نهار صحرا / ليل قمر)
const dayLottieUrl = "https://lottie.host/1c4d92eb-5986-455b-bf42-e56230f81d18/sYpZzB4H9m.json"; 
const nightLottieUrl = "https://lottie.host/80e3da11-dfab-40a2-9b24-9ad9828e1c66/hT9s76G5R2.json"; 

function applyThemeColors(isDark) {
    if (heroLottieBg) heroLottieBg.src = isDark ? nightLottieUrl : dayLottieUrl;
    // تظبيط الشفافية عشان الأنيميشن يبقى باين
    if (heroOverlayColor) heroOverlayColor.style.background = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.2)';
}

if(themeBtn) {
    const icon = themeBtn.querySelector('i');
    const isDark = localStorage.getItem('theme') === 'dark';
    
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

// ==========================================
// 2. المدرسين: السلايدر الـ 3D המفرغ (بدون كروت)
// ==========================================
let allTeachersData = [];
let teachersSwiperInstance = null;
let hero3DSwiperInstance = null; 

async function fetchTeachers() {
    try {
        const snap = await getDocs(collection(db, "teachers"));
        if(snap.empty) return;
        
        const hero3DGrid = document.getElementById('heroTeachers3DGrid');
        let hero3DHtml = '';
        
        snap.forEach(doc => {
            const t = { id: doc.id, ...doc.data() };
            allTeachersData.push(t);
            
            // 🚨 الكارت شفاف، والصورة PNG، والكلام بيختفي لو مش في الوش 🚨
            hero3DHtml += `
            <div class="swiper-slide hero-slide-transparent" onclick="openTeacherCourses('${t.name}')">
                <img src="${t.imageUrl}" alt="${t.name}" class="teacher-png">
                <h4 class="hero-teacher-name">${t.name}</h4>
                <span class="hero-teacher-subject">${t.subject}</span>
            </div>`;
        });
        
        if(hero3DGrid) {
            hero3DGrid.innerHTML = hero3DHtml;
            if(typeof Swiper !== 'undefined') {
                hero3DSwiperInstance = new Swiper('.hero-3d-slider', {
                    effect: 'cards',
                    grabCursor: true,
                    loop: true,
                    autoplay: { delay: 2500, disableOnInteraction: false },
                    cardsEffect: { 
                        slideShadows: false, // مفيش مربع أسود ورا المدرس
                        perSlideOffset: 15, 
                        perSlideRotate: 3,
                        rotate: true
                    }
                });
            }
        }
        
        renderTeachers('all');
    } catch(e) {}
}

function renderTeachers(filterText) {
    const grid = document.getElementById('teachersGrid');
    const filtered = allTeachersData.filter(t => filterText === 'all' ? true : t.stages && t.stages.includes(filterText));
    if(filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; padding:30px;">لا يوجد مدرسين.</div>'; return; }

    let html = '';
    filtered.forEach(t => {
        html += `
        <div class="swiper-slide">
            <img src="${t.imageUrl}" alt="${t.name}" class="cover-card-img">
            <div class="cover-card-fade">
                <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); color: #f59e0b; padding: 5px 12px; border-radius: 8px;">${t.subject}</div>
                <h3>${t.name}</h3>
                <button class="cover-card-btn" onclick="openTeacherCourses('${t.name}')">تصفح الحصص</button>
            </div>
        </div>`;
    });
    grid.innerHTML = html;

    if(teachersSwiperInstance) teachersSwiperInstance.destroy(true, true);
    if(typeof Swiper !== 'undefined') {
        teachersSwiperInstance = new Swiper('.teachers-slider', {
            effect: 'coverflow', grabCursor: true, centeredSlides: true, slidesPerView: 'auto',
            coverflowEffect: { rotate: 0, stretch: -30, depth: 150, modifier: 1, slideShadows: false },
            autoplay: { delay: 3000 },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
        });
    }
}
fetchTeachers();

// ==========================================
// 3. جلب الحصص وتفعيل المودال (نفس أكوادك السليمة)
// ==========================================
async function fetchCoursesSliders() {
    try {
        const snap = await getDocs(collection(db, "courses"));
        let allC = [];
        snap.forEach(d => allC.push({id: d.id, ...d.data()}));
        
        let latest = [...allC].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);

        const buildCard = (c) => `
        <div class="swiper-slide">
            <div class="course-slide-card">
                <div class="c-slide-img" style="background-image: url('${c.image || 'https://via.placeholder.com/300'}');"></div>
                <h4 style="margin:0 0 5px 0; font-size:18px; color:var(--text-main); font-weight:900;">${c.title}</h4>
                <p style="margin:0 0 10px 0; color:var(--text-muted); font-size:13px;">${c.instructor}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--input-border); padding-top:10px;">
                    <span style="color:#10b981; font-weight:900;">${c.price > 0 ? c.price + ' ج' : 'مجاني'}</span>
                    <button style="background:#3b82f6; color:#fff; border:none; padding:8px 15px; border-radius:8px;">اشترك</button>
                </div>
            </div>
        </div>`;

        const latGrid = document.getElementById('latestCoursesGrid');
        if(latGrid) { 
            latGrid.innerHTML = latest.map(buildCard).join(''); 
            new Swiper('.latest-courses-slider', { slidesPerView: 'auto', spaceBetween: 20 }); 
        }
    } catch(e) {}
}
fetchCoursesSliders();
