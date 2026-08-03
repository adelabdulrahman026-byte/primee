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

// ==========================================
// 1. حماية لوحة الأدمن (ممنوع الدخول بدون تسجيل)
// ==========================================
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.replace('admin-login.html');
}

// زرار تسجيل الخروج
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminId');
    window.location.replace('admin-login.html');
});

// ==========================================
// 2. إعدادات الصوت (صوت كاشير/تنبيه شيك)
// ==========================================
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

document.getElementById('enableSoundBtn').addEventListener('click', function() {
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        this.innerHTML = '<i class="fas fa-check-circle"></i> تم تفعيل الصوت';
        this.style.background = 'rgba(16, 185, 129, 0.1)';
        this.style.color = '#10b981';
    }).catch(err => console.log("مشكلة في تفعيل الصوت:", err));
});

function showLiveToast(studentName) {
    const toast = document.getElementById('liveToast');
    document.getElementById('toastMessage').textContent = `الطالب: ${studentName}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ==========================================
// 3. المراقبة اللحظية (Real-time Listener) للطلاب
// ==========================================
let isInitialLoad = true; 
let totalStudents = 0;

const usersRef = collection(db, "users");
const q = query(usersRef); 

onSnapshot(q, (snapshot) => {
    totalStudents = snapshot.size;
    document.getElementById('totalStudentsCount').textContent = totalStudents;

    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const student = change.doc.data();
            
            if (!isInitialLoad) {
                notificationSound.play().catch(e => console.log("الصوت محتاج تفعيل من الزرار"));
                showLiveToast(student.fullName || "طالب جديد");
            }
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
            if(student.grade === 'sec3') gradeAr = 'الثالث الثانوي';
            else if(student.grade === 'sec2') gradeAr = 'الثاني الثانوي';
            else if(student.grade === 'sec1') gradeAr = 'الأول الثانوي';
            else if(student.grade === 'prep3') gradeAr = 'الثالث الإعدادي';
            else if(student.grade === 'prep2') gradeAr = 'الثاني الإعدادي';
            else if(student.grade === 'prep1') gradeAr = 'الأول الإعدادي';
            
            tr.innerHTML = `
                <td><strong>${student.fullName || 'غير محدد'}</strong></td>
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
// 4. إدارة الطلاب (البحث، الشحن، الحظر)
// ==========================================
let currentSearchedStudentId = null;
let currentSearchedStudentData = null;

const btnSearchStudent = document.getElementById('btnSearchStudent');
const searchPhoneInput = document.getElementById('searchPhoneInput');
const studentResultCard = document.getElementById('studentResultCard');

// أ. كود البحث عن الطالب
if(btnSearchStudent) {
    btnSearchStudent.addEventListener('click', async () => {
        const phone = searchPhoneInput.value.trim();
        if(!phone) return alert("يرجى إدخال رقم الهاتف أولاً!");
        
        btnSearchStudent.innerHTML = 'جاري... ⏳';
        if(studentResultCard) studentResultCard.style.display = 'none';

        try {
            const qSearch = query(collection(db, "users"), where("studentPhone", "==", phone));
            const querySnapshot = await getDocs(qSearch);

            if(querySnapshot.empty) {
                alert("لم يتم العثور على طالب مسجل بهذا الرقم!");
            } else {
                const studentDoc = querySnapshot.docs[0];
                currentSearchedStudentId = studentDoc.id;
                currentSearchedStudentData = studentDoc.data();
                
                document.getElementById('resStudentName').textContent = currentSearchedStudentData.fullName;
                document.getElementById('resStudentPhone').textContent = currentSearchedStudentData.studentPhone;
                
                let gradeAr = currentSearchedStudentData.grade;
                if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
                else if(gradeAr === 'sec2') gradeAr = 'الثاني الثانوي';
                else if(gradeAr === 'sec1') gradeAr = 'الأول الثانوي';
                else if(gradeAr === 'prep3') gradeAr = 'الثالث الإعدادي';
                else if(gradeAr === 'prep2') gradeAr = 'الثاني الإعدادي';
                else if(gradeAr === 'prep1') gradeAr = 'الأول الإعدادي';
                document.getElementById('resStudentGrade').textContent = gradeAr || '-';
                
                document.getElementById('resStudentWallet').textContent = (currentSearchedStudentData.walletBalance || 0) + ' ج.م';
                
                const statusSpan = document.getElementById('resStudentStatus');
                const btnToggleBlock = document.getElementById('btnToggleBlock');
                
                if(currentSearchedStudentData.isBlocked) {
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

                if(studentResultCard) studentResultCard.style.display = 'block';
            }
        } catch(error) {
            console.error("خطأ في البحث:", error);
            alert("حدث خطأ أثناء البحث عن الطالب");
        } finally {
            btnSearchStudent.innerHTML = '<i class="fas fa-search"></i> بحث';
        }
    });
}

// ب. كود شحن المحفظة
const btnChargeWallet = document.getElementById('btnChargeWallet');
if(btnChargeWallet) {
    btnChargeWallet.addEventListener('click', async () => {
        const amountInput = document.getElementById('chargeAmount').value;
        const amount = parseInt(amountInput);
        
        if(!amount || amount <= 0) return alert("يرجى إدخال مبلغ صحيح أكبر من الصفر");
        if(!currentSearchedStudentId) return;

        btnChargeWallet.textContent = '⏳';
        
        try {
            const currentBalance = currentSearchedStudentData.walletBalance || 0;
            const newBalance = currentBalance + amount; 
            
            await updateDoc(doc(db, "users", currentSearchedStudentId), {
                walletBalance: newBalance
            });
            
            currentSearchedStudentData.walletBalance = newBalance;
            document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
            document.getElementById('chargeAmount').value = '';
            
            alert(`تم شحن ${amount} ج.م بنجاح! \nالرصيد الجديد للطالب أصبح: ${newBalance} ج.م 💸`);
        } catch(error) {
            console.error(error);
            alert("فشل الشحن!");
        } finally {
            btnChargeWallet.textContent = 'شحن';
        }
    });
}

// ج. كود حظر / فك حظر الطالب
const btnToggleBlock = document.getElementById('btnToggleBlock');
if(btnToggleBlock) {
    btnToggleBlock.addEventListener('click', async () => {
        if(!currentSearchedStudentId) return;
        
        const isCurrentlyBlocked = currentSearchedStudentData.isBlocked || false;
        const newBlockStatus = !isCurrentlyBlocked; 
        
        const confirmMsg = newBlockStatus ? "⚠️ هل أنت متأكد من حظر هذا الطالب؟ لن يتمكن من الدخول لحسابه نهائياً." : "هل أنت متأكد من فك الحظر عن هذا الطالب؟";
        if(!confirm(confirmMsg)) return;

        try {
            await updateDoc(doc(db, "users", currentSearchedStudentId), {
                isBlocked: newBlockStatus
            });
            
            alert(newBlockStatus ? "تم حظر الطالب بنجاح ⛔" : "تم فك الحظر بنجاح 🟢");
            
            document.getElementById('btnSearchStudent').click();
            
        } catch(error) {
            console.error(error);
            alert("حدث خطأ أثناء تعديل حالة الحظر");
        }
    });
}
