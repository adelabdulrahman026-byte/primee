import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, limit, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.replace('admin-login.html');
});

// ==========================================
// دوال النوافذ الشيك (Alert & Confirm)
// ==========================================
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

// ==========================================
// إعدادات الصوت والإشعارات
// ==========================================
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
document.getElementById('enableSoundBtn').addEventListener('click', function() {
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

// ==========================================
// المراقبة اللحظية (الطلاب الجدد)
// ==========================================
let isInitialLoad = true; 
const usersRef = collection(db, "users");
onSnapshot(query(usersRef), (snapshot) => {
    document.getElementById('totalStudentsCount').textContent = snapshot.size;

    snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
            notificationSound.play().catch(e => console.log(e));
            showLiveToast(change.doc.data().fullName || "طالب جديد");
        }
    });

    const studentsArray = [];
    snapshot.forEach((doc) => { studentsArray.push(doc.data()); });
    
    const tableBody = document.getElementById('recentStudentsTable');
    if(tableBody) {
        tableBody.innerHTML = '';
        studentsArray.reverse().slice(0, 10).forEach(student => {
            const tr = document.createElement('tr');
            const walletText = student.walletBalance > 0 ? `<span style="color:#10b981;">${student.walletBalance} ج.م</span>` : `0 ج.م`;
            
            let gradeAr = student.grade;
            if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
            else if(gradeAr === 'sec1') gradeAr = 'الأول الثانوي';
            else if(gradeAr === 'prep3') gradeAr = 'الثالث الإعدادي';
            
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

// ==========================================
// 4. إدارة الطلاب (البحث، الإيداع، الخصم، الحظر)
// ==========================================
let currentStudentId = null;
let currentStudentData = null;

const btnSearchStudent = document.getElementById('btnSearchStudent');
const searchPhoneInput = document.getElementById('searchPhoneInput');
const studentResultCard = document.getElementById('studentResultCard');

// البحث
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

// شحن المحفظة
document.getElementById('btnChargeWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح للشحن", "error");
    if(!currentStudentId) return;

    try {
        const newBalance = (currentStudentData.walletBalance || 0) + amount; 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        
        adminAlert("تم الشحن 💸", `تم شحن ${amount} ج.م بنجاح! الرصيد الجديد: ${newBalance} ج.م`, "success");
    } catch(error) {
        adminAlert("خطأ", "فشل الشحن", "error");
    }
});

// خصم من المحفظة
document.getElementById('btnDeductWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح للخصم", "error");
    if(!currentStudentId) return;

    const currentBalance = currentStudentData.walletBalance || 0;
    
    // تأكيد قبل الخصم
    const isConfirmed = await adminConfirm(`هل أنت متأكد من خصم ${amount} ج.م من رصيد الطالب؟`);
    if(!isConfirmed) return;

    try {
        // نمنع الرصيد إنه يبقى بالسالب
        const newBalance = Math.max(0, currentBalance - amount); 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        
        adminAlert("تم الخصم 📉", `تم خصم ${amount} ج.م بنجاح! الرصيد المتبقي: ${newBalance} ج.م`, "success");
    } catch(error) {
        adminAlert("خطأ", "فشل الخصم", "error");
    }
});

// الحظر / فك الحظر
document.getElementById('btnToggleBlock')?.addEventListener('click', async () => {
    if(!currentStudentId) return;
    
    const isCurrentlyBlocked = currentStudentData.isBlocked || false;
    const newBlockStatus = !isCurrentlyBlocked; 
    
    const confirmMsg = newBlockStatus ? 
        "⚠️ هل أنت متأكد من حظر هذا الطالب؟ سيتم طرده من حسابه فوراً!" : 
        "هل أنت متأكد من فك الحظر عن هذا الطالب؟";
        
    const isConfirmed = await adminConfirm(confirmMsg);
    if(!isConfirmed) return;

    try {
        await updateDoc(doc(db, "users", currentStudentId), { isBlocked: newBlockStatus });
        adminAlert("نجاح", newBlockStatus ? "تم حظر الطالب وطرده بنجاح ⛔" : "تم فك الحظر بنجاح 🟢", "success");
        document.getElementById('btnSearchStudent').click(); // ريفرش للكارت
    } catch(error) {
        adminAlert("خطأ", "حدث خطأ أثناء تعديل الحظر", "error");
    }
});
