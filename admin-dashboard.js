import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// حماية الصفحة
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.replace('admin-login.html');
}
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.replace('admin-login.html');
});

// دوال النوافذ
function adminAlert(title, msg, type = 'success') {
    const modal = document.getElementById('customAdminAlert');
    const icon = document.getElementById('adminAlertIcon');
    document.getElementById('adminAlertTitle').textContent = title;
    document.getElementById('adminAlertMsg').textContent = msg;

    if(type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
    } else if(type === 'error') {
        icon.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
    } else {
        icon.innerHTML = '<i class="fas fa-info-circle" style="color: #3b82f6;"></i>';
    }
    modal.classList.add('active');
}

function adminConfirm(msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAdminConfirm');
        document.getElementById('adminConfirmMsg').textContent = msg;
        modal.classList.add('active');

        document.getElementById('btnConfirmYes').onclick = () => {
            modal.classList.remove('active');
            resolve(true);
        };
        document.getElementById('btnConfirmNo').onclick = () => {
            modal.classList.remove('active');
            resolve(false);
        };
    });
}

// الصوت والإشعارات
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
document.getElementById('enableSoundBtn')?.addEventListener('click', function() {
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        this.innerHTML = '<i class="fas fa-check-circle"></i> تم تفعيل الصوت';
        this.style.background = 'rgba(16, 185, 129, 0.1)';
        this.style.color = '#10b981';
    }).catch(err => console.log(err));
});

function showLiveToast(studentName) {
    const toast = document.getElementById('liveToast');
    document.getElementById('toastMessage').textContent = `الطالب: ${studentName}`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

// المراقبة اللحظية للطلاب والأرباح والكورسات
let isInitialLoad = true; 
const usersRef = collection(db, "users");
const coursesRef = collection(db, "courses");

onSnapshot(query(usersRef), (snapshot) => {
    document.getElementById('totalStudentsCount').textContent = snapshot.size;
    let totalRev = 0;
    const studentsArray = [];

    snapshot.forEach((doc) => { 
        const data = doc.data();
        studentsArray.push(data);
        if(data.walletBalance) totalRev += parseInt(data.walletBalance);
    });

    document.getElementById('totalRevenue').textContent = totalRev + ' ج.م';

    snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
            notificationSound.play().catch(e => console.log(e));
            showLiveToast(change.doc.data().fullName || "طالب جديد");
        }
    });
    
    const tableBody = document.getElementById('recentStudentsTable');
    if(tableBody) {
        tableBody.innerHTML = '';
        studentsArray.reverse().slice(0, 10).forEach(student => {
            const tr = document.createElement('tr');
            const walletText = student.walletBalance > 0 ? `<span style="color:#10b981;">${student.walletBalance} ج.م</span>` : `0 ج.م`;
            let gradeAr = student.grade;
            if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
            else if(gradeAr === 'sec1') gradeAr = 'الأول الثانوي';
            
            tr.innerHTML = `
                <td><strong>${student.fullName || '-'}</strong></td>
                <td style="color: #f59e0b;">${student.studentPhone || '-'}</td>
                <td>${gradeAr || '-'}</td>
                <td>${walletText}</td>
                <td style="color: #94a3b8; font-size: 13px;">الآن</td>
            `;
            tableBody.appendChild(tr);
        });
    }
    isInitialLoad = false;
});

// جلب وعرض الكورسات في جدول الأدمن لحظياً
onSnapshot(query(coursesRef), (snapshot) => {
    const coursesTable = document.getElementById('adminCoursesTable');
    if(!coursesTable) return;

    if(snapshot.empty) {
        coursesTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">لا توجد كورسات مضافة حتى الآن.</td></tr>`;
        return;
    }

    coursesTable.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const course = docSnap.data();
        const courseId = docSnap.id;

        let gradeAr = course.grade;
        if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
        else if(gradeAr === 'sec2') gradeAr = 'الثاني الثانوي';
        else if(gradeAr === 'sec1') gradeAr = 'الأول الثانوي';

        coursesTable.innerHTML += `
            <tr>
                <td><strong>${course.title}</strong></td>
                <td>${course.instructor}</td>
                <td>${gradeAr}</td>
                <td style="color: #10b981; font-weight: 900;">${course.price} ج.م</td>
                <td>
                    <button onclick="window.deleteCourse('${courseId}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 800;"><i class="fas fa-trash"></i> حذف</button>
                </td>
            </tr>
        `;
    });
});

// نشر كورس جديد
const addCourseForm = document.getElementById('addCourseForm');
if(addCourseForm) {
    addCourseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveCourse');
        btn.textContent = 'جاري النشر... ⏳';
        btn.disabled = true;

        const title = document.getElementById('courseTitle').value.trim();
        const instructor = document.getElementById('courseInstructor').value.trim();
        const grade = document.getElementById('courseGrade').value;
        const price = parseInt(document.getElementById('coursePrice').value) || 0;
        const image = document.getElementById('courseImage').value.trim();
        const videoUrl = document.getElementById('courseVideo').value.trim();
        const pdfUrl = document.getElementById('coursePdf').value.trim();
        const requiredExamId = document.getElementById('requiredExamId').value.trim();

        try {
            await addDoc(coursesRef, {
                title,
                instructor,
                grade,
                price,
                image,
                videoUrl,
                pdfUrl,
                requiredExamId, // الحفظ لشرط الامتحان
                createdAt: new Date().toISOString()
            });

            adminAlert("تم النشر بنجاح 🚀", "تم اضافة الحصة وإتاحتها للطلاب.", "success");
            addCourseForm.reset();
        } catch (error) {
            console.error(error);
            adminAlert("خطأ", "فشل رفع الحصة، تأكد من الاتصال.", "error");
        } finally {
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة الآن';
            btn.disabled = false;
        }
    });
}

// دالة حذف الكورس (متاحة عالمياً)
window.deleteCourse = async function(courseId) {
    const confirmDelete = await adminConfirm("هل أنت متأكد من حذف هذه الحصة نهائياً؟");
    if(!confirmDelete) return;

    try {
        await deleteDoc(doc(db, "courses", courseId));
        adminAlert("تم الحذف", "تمت إزالة الحصة من المنصة بنجاح.", "success");
    } catch (error) {
        console.error(error);
        adminAlert("خطأ", "فشل الحذف", "error");
    }
};

// إدارة الطلاب (بحث، شحن، خصم، حظر) نفس الكود السابق
let currentStudentId = null;
let currentStudentData = null;
const btnSearchStudent = document.getElementById('btnSearchStudent');
const searchPhoneInput = document.getElementById('searchPhoneInput');
const studentResultCard = document.getElementById('studentResultCard');

if(btnSearchStudent) {
    btnSearchStudent.addEventListener('click', async () => {
        const phone = searchPhoneInput.value.trim();
        if(!phone) return adminAlert("خطأ", "يرجى إدخال رقم الهاتف أولاً!", "error");
        
        btnSearchStudent.innerHTML = 'جاري...';
        if(studentResultCard) studentResultCard.style.display = 'none';

        try {
            const qSearch = query(usersRef, where("studentPhone", "==", phone));
            const querySnapshot = await getDocs(qSearch);

            if(querySnapshot.empty) {
                adminAlert("عذراً", "لم يتم العثور على طالب مسجل بهذا الرقم!", "error");
            } else {
                const studentDoc = querySnapshot.docs[0];
                currentStudentId = studentDoc.id;
                currentStudentData = studentDoc.data();
                
                document.getElementById('resStudentName').textContent = currentStudentData.fullName;
                document.getElementById('resStudentPhone').textContent = currentStudentData.studentPhone;
                
                let gradeAr = currentStudentData.grade;
                if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
                document.getElementById('resStudentGrade').textContent = gradeAr || '-';
                document.getElementById('resStudentWallet').textContent = (currentStudentData.walletBalance || 0) + ' ج.م';
                
                const statusSpan = document.getElementById('resStudentStatus');
                const btnToggleBlock = document.getElementById('btnToggleBlock');
                
                if(currentStudentData.isBlocked) {
                    statusSpan.textContent = 'محظور ⛔';
                    statusSpan.style.color = '#ef4444';
                    btnToggleBlock.innerHTML = '<i class="fas fa-unlock"></i> فك الحظر';
                    btnToggleBlock.style.color = '#10b981';
                    btnToggleBlock.style.borderColor = '#10b981';
                    btnToggleBlock.style.background = 'rgba(16, 185, 129, 0.1)';
                } else {
                    statusSpan.textContent = 'نشط 🟢';
                    statusSpan.style.color = '#10b981';
                    btnToggleBlock.innerHTML = '<i class="fas fa-ban"></i> حظر الطالب';
                    btnToggleBlock.style.color = '#ef4444';
                    btnToggleBlock.style.borderColor = '#ef4444';
                    btnToggleBlock.style.background = 'rgba(239, 68, 68, 0.1)';
                }
                studentResultCard.style.display = 'block';
            }
        } catch(error) {
            console.error(error);
            adminAlert("مشكلة", "حدث خطأ أثناء البحث", "error");
        } finally {
            btnSearchStudent.innerHTML = '<i class="fas fa-search"></i> بحث';
        }
    });
}

document.getElementById('btnChargeWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح للشحن", "error");
    if(!currentStudentId) return;

    try {
        const newBalance = (parseInt(currentStudentData.walletBalance) || 0) + amount; 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم الشحن 💸", `تم شحن ${amount} ج.م بنجاح!`, "success");
    } catch(error) {
        adminAlert("خطأ", "فشل الشحن", "error");
    }
});

document.getElementById('btnDeductWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح للخصم", "error");
    if(!currentStudentId) return;

    const currentBalance = parseInt(currentStudentData.walletBalance) || 0;
    const isConfirmed = await adminConfirm(`هل أنت متأكد من خصم ${amount} ج.م من رصيد الطالب؟`);
    if(!isConfirmed) return;

    try {
        const newBalance = Math.max(0, currentBalance - amount); 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم الخصم 📉", `تم خصم ${amount} ج.م بنجاح!`, "success");
    } catch(error) {
        adminAlert("خطأ", "فشل الخصم", "error");
    }
});

document.getElementById('btnToggleBlock')?.addEventListener('click', async () => {
    if(!currentStudentId) return;
    const newBlockStatus = !currentStudentData.isBlocked; 
    const confirmMsg = newBlockStatus ? "⚠️ هل أنت متأكد من حظر هذا الطالب؟" : "هل أنت متأكد من فك الحظر؟";
    const isConfirmed = await adminConfirm(confirmMsg);
    if(!isConfirmed) return;

    try {
        await updateDoc(doc(db, "users", currentStudentId), { isBlocked: newBlockStatus });
        adminAlert("نجاح", newBlockStatus ? "تم حظر الطالب بنجاح ⛔" : "تم فك الحظر 🟢", "success");
        document.getElementById('btnSearchStudent').click();
    } catch(error) {
        adminAlert("خطأ", "حدث خطأ", "error");
    }
});
