import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// 👇 ضفنا هنا أوامر التحديث (updateDoc) وإضافة الكورس لممتلكات الطالب (arrayUnion)
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// متغيرات عشان نحفظ فيها بيانات الطالب الحالية ونستخدمها وقت الشراء
let currentStudentData = null;
let currentStudentId = null;

// 2. نظام الحماية (Route Guard)
const loggedInPhone = localStorage.getItem('studentPhone');

if (!loggedInPhone) {
    window.location.replace("login.html");
} else {
    fetchStudentData(loggedInPhone);
    fetchCourses(); 
}

// 3. دالة جلب وعرض بيانات الطالب
async function fetchStudentData(phone) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            currentStudentId = querySnapshot.docs[0].id;
            currentStudentData = querySnapshot.docs[0].data();
            
            // التأكد إن الطالب عنده قائمة كورسات (لو لسه جديد بنعتبرها فاضية)
            if (!currentStudentData.myCourses) {
                currentStudentData.myCourses = [];
            }

            const fullName = currentStudentData.fullName || "طالب";
            const firstName = fullName.split(" ")[0]; 

            document.getElementById('studentNameDisplay').textContent = fullName;
            document.getElementById('welcomeMessage').textContent = `أهلاً بك يا ${firstName}! 🚀`;
            
            const balance = currentStudentData.walletBalance || 0; 
            document.getElementById('walletBalance').textContent = balance;
            
        } else {
            document.getElementById('studentNameDisplay').textContent = "حساب غير معروف";
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
}

// 4. دالة جلب الكورسات من قاعدة البيانات
async function fetchCourses() {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">جاري تحميل المواد... ⏳</p>';

    try {
        const coursesRef = collection(db, "courses");
        const querySnapshot = await getDocs(coursesRef);

        if (querySnapshot.empty) {
            coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">لا توجد مواد متاحة حالياً.</p>';
            return;
        }

        coursesGrid.innerHTML = ''; 

        querySnapshot.forEach((docSnap) => {
            const course = docSnap.data();
            const courseId = docSnap.id;
            const price = course.price || 0; // لو مفيش سعر بيعتبره 0 (مجاني)

            const courseCard = `
                <div class="modern-course-card">
                    <div class="card-img" style="background-image: url('${course.image || ''}'); background-size: cover; background-position: center; background-color: #e2e8f0;">
                        <span class="badge">${course.badge || 'جديد'}</span>
                    </div>
                    <div class="card-body">
                        <h4>${course.title || 'اسم المادة'}</h4>
                        <p class="instructor"><i class="fas fa-chalkboard-teacher"></i> ${course.instructor || 'أستاذ المادة'}</p>
                        
                        <!-- إظهار السعر في الكارت -->
                        <p style="font-weight: 800; color: var(--primary-color); margin-bottom: 15px;">
                            ${price === 0 ? 'مجانًا 🎁' : price + ' ج.م'}
                        </p>

                        <div class="card-footer">
                            <button class="btn-enter-course" onclick="enterCourse('${courseId}', ${price}, '${course.title}')">دخول الحصة</button>
                        </div>
                    </div>
                </div>
            `;
            coursesGrid.innerHTML += courseCard;
        });

    } catch (error) {
        console.error("خطأ في جلب الكورسات:", error);
        coursesGrid.innerHTML = '<p style="text-align:center; width:100%; color:red;">حدث خطأ أثناء تحميل المواد.</p>';
    }
}

// 5. 🧠 نظام الشراء والخصم من المحفظة
window.enterCourse = async function(courseId, price, courseTitle) {
    if (!currentStudentData || !currentStudentId) return;

    // السيناريو الأول: الطالب اشترى الكورس ده قبل كده
    if (currentStudentData.myCourses.includes(courseId)) {
        alert("أنت تمتلك هذه الحصة بالفعل! سيتم فتحها الآن... 🎉");
        // بعدين هنفعل دي: window.location.href = `course-details.html?id=${courseId}`;
        return;
    }

    // السيناريو التاني: الكورس مجاني (سعره 0)
    if (price === 0) {
        alert("هذه الحصة مجانية! سيتم إضافتها لحسابك وفتحها الآن.");
        
        // تحديث الداتا بيز وإضافة الكورس للطالب
        await updateDoc(doc(db, "users", currentStudentId), {
            myCourses: arrayUnion(courseId)
        });
        currentStudentData.myCourses.push(courseId); 
        return;
    }

    // السيناريو التالت: الكورس بفلوس (لازم نخصم من المحفظة)
    const confirmPurchase = confirm(`قيمة حصة "${courseTitle}" هي ${price} ج.م.\nرصيدك الحالي: ${currentStudentData.walletBalance || 0} ج.م.\n\nهل تريد تأكيد الشراء وخصم المبلغ من محفظتك؟`);

    if (confirmPurchase) {
        let currentBalance = currentStudentData.walletBalance || 0;
        
        if (currentBalance >= price) {
            // الرصيد يكفي: نخصم الفلوس ونضيف الكورس
            let newBalance = currentBalance - price;

            try {
                // 1. الخصم في فايربيز
                await updateDoc(doc(db, "users", currentStudentId), {
                    walletBalance: newBalance,
                    myCourses: arrayUnion(courseId)
                });

                // 2. تحديث الشاشة قدام الطالب في نفس اللحظة
                currentStudentData.walletBalance = newBalance;
                currentStudentData.myCourses.push(courseId);
                document.getElementById('walletBalance').textContent = newBalance;

                alert("تم الشراء بنجاح! 🎉 سيتم فتح الحصة الآن.");
                // بعدين هنفعل دي: window.location.href = `course-details.html?id=${courseId}`;

            } catch (error) {
                console.error("خطأ أثناء الشراء:", error);
                alert("حدث خطأ أثناء إتمام عملية الشراء. حاول مرة أخرى.");
            }
        } else {
            // الرصيد لا يكفي
            alert("رصيد محفظتك غير كافٍ لإتمام الشراء! ❌ يرجى شحن الرصيد أولاً.");
        }
    }
};

// 6. برمجة زرار تسجيل الخروج
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('studentPhone');
        localStorage.removeItem('loggedInUserId');
        window.location.replace("login.html");
    });
}
