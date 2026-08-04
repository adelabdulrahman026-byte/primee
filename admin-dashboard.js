import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// لاحظ: شلنا استدعاء الـ Storage خالص عشان هنستخدم ImgBB

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
// 1. جلب مفاتيح الأمان (Vimeo & ImgBB) بأمان تام
// ==========================================
let SECURE_API_KEYS = null;
async function getSecureApiKeys() {
    if (SECURE_API_KEYS) return SECURE_API_KEYS; 
    try {
        const docRef = doc(db, "settings", "api_keys");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            SECURE_API_KEYS = docSnap.data();
            return SECURE_API_KEYS;
        } else {
            throw new Error("لم يتم العثور على مفاتيح الأمان في قاعدة البيانات!");
        }
    } catch (error) {
        console.error("خطأ في جلب مفاتيح الأمان:", error);
        throw error;
    }
}

// ==========================================
// حماية الصفحة وتنبيهات
// ==========================================
if (localStorage.getItem('adminLoggedIn') !== 'true') window.location.replace('admin-login.html');
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.replace('admin-login.html'); });

function adminAlert(title, msg, type = 'success') {
    const modal = document.getElementById('customAdminAlert');
    const icon = document.getElementById('adminAlertIcon');
    document.getElementById('adminAlertTitle').textContent = title;
    document.getElementById('adminAlertMsg').textContent = msg;
    icon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
    modal.classList.add('active');
}
function adminConfirm(msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAdminConfirm');
        document.getElementById('adminConfirmMsg').textContent = msg;
        modal.classList.add('active');
        document.getElementById('btnConfirmYes').onclick = () => { modal.classList.remove('active'); resolve(true); };
        document.getElementById('btnConfirmNo').onclick = () => { modal.classList.remove('active'); resolve(false); };
    });
}
function showLiveToast(msg) {
    const toast = document.getElementById('liveToast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

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

// ==========================================
// مراقبة الطلاب والأرباح
// ==========================================
let isInitialLoad = true; 
const usersRef = collection(db, "users");

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
// إدارة الطلاب (بحث، شحن، خصم، حظر)
// ==========================================
let currentStudentId = null;
let currentStudentData = null;
document.getElementById('btnSearchStudent')?.addEventListener('click', async () => {
    const phone = document.getElementById('searchPhoneInput').value.trim();
    if(!phone) return adminAlert("خطأ", "أدخل رقم الهاتف!", "error");
    
    document.getElementById('btnSearchStudent').innerHTML = 'جاري...';
    try {
        const qSearch = query(usersRef, where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(qSearch);
        if(querySnapshot.empty) {
            adminAlert("عذراً", "لا يوجد طالب بهذا الرقم", "error");
        } else {
            const studentDoc = querySnapshot.docs[0];
            currentStudentId = studentDoc.id;
            currentStudentData = studentDoc.data();
            
            document.getElementById('resStudentName').textContent = currentStudentData.fullName;
            document.getElementById('resStudentPhone').textContent = currentStudentData.studentPhone;
            document.getElementById('resParentPhone').textContent = currentStudentData.parentPhone || "غير متوفر";
            
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
            document.getElementById('studentResultCard').style.display = 'block';
        }
    } catch(error) { console.error(error); } 
    finally { document.getElementById('btnSearchStudent').innerHTML = '<i class="fas fa-search"></i> بحث'; }
});

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
    } catch(error) { adminAlert("خطأ", "فشل الشحن", "error"); }
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
    } catch(error) { adminAlert("خطأ", "فشل الخصم", "error"); }
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
    } catch(error) { adminAlert("خطأ", "حدث خطأ", "error"); }
});

// ==========================================
// إدارة الامتحانات (Exam Builder)
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;

document.getElementById('btnAddQuestion')?.addEventListener('click', () => {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    const qHtml = `
        <div class="question-box" id="qBox_${questionCount}">
            <h5 style="color: #f59e0b; margin: 0 0 10px 0;">سؤال رقم ${questionCount} <button type="button" onclick="document.getElementById('qBox_${questionCount}').remove()" style="float: left; background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-trash"></i></button></h5>
            <input type="text" class="q-text form-group-admin input" placeholder="اكتب السؤال هنا..." style="width: 100%; padding: 10px; margin-bottom: 10px;" required>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <input type="text" class="q-opt1" placeholder="الاختيار الأول" style="padding: 10px;" required>
                <input type="text" class="q-opt2" placeholder="الاختيار الثاني" style="padding: 10px;" required>
                <input type="text" class="q-opt3" placeholder="الاختيار الثالث" style="padding: 10px;" required>
                <input type="text" class="q-opt4" placeholder="الاختيار الرابع" style="padding: 10px;" required>
            </div>
            <select class="q-correct" style="width: 100%; padding: 10px;" required>
                <option value="" disabled selected>اختر الإجابة الصحيحة</option>
                <option value="1">الاختيار الأول</option>
                <option value="2">الاختيار الثاني</option>
                <option value="3">الاختيار الثالث</option>
                <option value="4">الاختيار الرابع</option>
            </select>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', qHtml);
});

document.getElementById('addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('examTitle').value;
    const qBoxes = document.querySelectorAll('.question-box');
    if(qBoxes.length === 0) return adminAlert("خطأ", "يجب إضافة سؤال واحد على الأقل", "error");

    const btn = document.getElementById('btnSaveExam');
    btn.textContent = "جاري الحفظ..."; btn.disabled = true;

    const questionsArray = [];
    qBoxes.forEach(box => {
        questionsArray.push({
            text: box.querySelector('.q-text').value,
            options: [
                box.querySelector('.q-opt1').value,
                box.querySelector('.q-opt2').value,
                box.querySelector('.q-opt3').value,
                box.querySelector('.q-opt4').value
            ],
            correctIndex: parseInt(box.querySelector('.q-correct').value) - 1
        });
    });

    try {
        await addDoc(examsRef, { title: title, questions: questionsArray, createdAt: new Date().toISOString() });
        adminAlert("نجاح", "تم حفظ الامتحان بنجاح!", "success");
        document.getElementById('addExamForm').reset();
        document.getElementById('questionsContainer').innerHTML = '';
        questionCount = 0;
    } catch(err) { adminAlert("خطأ", "فشل الحفظ", "error"); }
    finally { btn.innerHTML = '<i class="fas fa-save"></i> حفظ الامتحان'; btn.disabled = false; }
});

onSnapshot(query(examsRef), (snapshot) => {
    const table = document.getElementById('adminExamsTable');
    const select = document.getElementById('requiredExamSelect');
    if(table) table.innerHTML = '';
    if(select) select.innerHTML = '<option value="">بدون امتحان (مفتوحة)</option>';

    snapshot.forEach(docSnap => {
        const exam = docSnap.data();
        if(table) {
            table.innerHTML += `<tr>
                <td><strong>${exam.title}</strong></td>
                <td>${exam.questions.length} أسئلة</td>
                <td>الآن</td>
                <td><button onclick="deleteExam('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        }
        if(select) select.innerHTML += `<option value="${docSnap.id}">${exam.title}</option>`;
    });
});

window.deleteExam = async function(id) {
    if(await adminConfirm("هل أنت متأكد من حذف الامتحان؟")) await deleteDoc(doc(db, "exams", id));
}


// ==========================================
// إدارة الكورسات (رفع ImgBB و Vimeo + التعديل)
// ==========================================
const coursesRef = collection(db, "courses");

// دالة الرفع للصور (ImgBB)
async function uploadImageToImgBB(file) {
    const keys = await getSecureApiKeys(); 
    const IMGBB_API_KEY = keys.imgbb_token; 
    if(!IMGBB_API_KEY) throw new Error("مفتاح ImgBB غير موجود في قاعدة البيانات!");

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.success) {
        return data.data.url;
    } else {
        throw new Error("فشل رفع الصورة على ImgBB");
    }
}

// دالة الرفع للفيديوهات (Vimeo)
async function uploadToVimeo(file, progressCallback) {
    return new Promise(async (resolve, reject) => {
        try {
            const keys = await getSecureApiKeys(); 
            const vimeoToken = keys.vimeo_token; 
            if(!vimeoToken) throw new Error("مفتاح Vimeo غير موجود في قاعدة البيانات!");

            const upload = new tus.Upload(file, {
                endpoint: "https://api.vimeo.com/me/videos",
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    Authorization: `Bearer ${vimeoToken}`, 
                    Accept: "application/vnd.vimeo.*+json;version=3.4"
                },
                uploadSize: file.size,
                onError: function(error) { reject(error); },
                onProgress: function(bytesUploaded, bytesTotal) {
                    const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                    progressCallback(percentage);
                },
                onSuccess: function() {
                    const videoId = upload.url.split('/').pop();
                    resolve(`https://player.vimeo.com/video/${videoId}`);
                }
            });
            upload.start();
        } catch (error) {
            reject(error);
        }
    });
}

// دالة إضافة / تعديل الحصة
document.getElementById('addCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveCourse');
    const editingId = document.getElementById('editingCourseId').value;
    
    btn.textContent = editingId ? 'جاري التعديل... ⏳' : 'جاري الرفع والنشر... ⏳';
    btn.disabled = true;

    const title = document.getElementById('courseTitle').value.trim();
    const instructor = document.getElementById('courseInstructor').value.trim();
    const grade = document.getElementById('courseGrade').value;
    const price = parseInt(document.getElementById('coursePrice').value) || 0;
    const requiredExamId = document.getElementById('requiredExamSelect').value;
    const pdfUrl = document.getElementById('coursePdf').value.trim();
    
    const imageFile = document.getElementById('courseImageFile').files[0];
    const videoFile = document.getElementById('courseVideoFile').files[0];
    
    try {
        let imageUrl = null;
        let videoUrl = null;

        // رفع الصورة عبر ImgBB
        if (imageFile) {
            document.getElementById('imgStatus').style.display = 'inline';
            document.getElementById('imgStatus').textContent = "جاري رفع الصورة... ⏳";
            document.getElementById('imgStatus').style.color = '#f59e0b';
            
            imageUrl = await uploadImageToImgBB(imageFile);
            
            document.getElementById('imgStatus').textContent = "تم رفع الصورة بنجاح ✔️";
            document.getElementById('imgStatus').style.color = '#10b981';
        }

        // رفع الفيديو لـ Vimeo
        if (videoFile) {
            document.getElementById('videoProgressContainer').style.display = 'block';
            document.getElementById('videoStatus').textContent = "جاري رفع الفيديو لفيمو... يرجى عدم إغلاق الصفحة";
            videoUrl = await uploadToVimeo(videoFile, (progress) => {
                document.getElementById('videoProgressBar').style.width = progress + '%';
                document.getElementById('videoStatus').textContent = `تم الرفع: ${progress}%`;
            });
        }

        const courseData = { title, instructor, grade, price, requiredExamId, pdfUrl };
        if (imageUrl) courseData.image = imageUrl;
        if (videoUrl) courseData.videoUrl = videoUrl;

        if (editingId) {
            await updateDoc(doc(db, "courses", editingId), courseData);
            adminAlert("تم التعديل", "تم تعديل بيانات الحصة بنجاح.", "success");
            document.getElementById('btnCancelEdit').click();
        } else {
            if(!imageUrl || !videoUrl) throw new Error("يجب رفع صورة وغلاف للحصة الجديدة!");
            courseData.createdAt = new Date().toISOString();
            await addDoc(coursesRef, courseData);
            adminAlert("تم النشر", "تم رفع الحصة بنجاح.", "success");
            
            document.getElementById('addCourseForm').reset();
            document.getElementById('videoProgressContainer').style.display = 'none';
            document.getElementById('videoStatus').textContent = "اختر ملف الفيديو (سيتم الرفع عند الضغط على نشر)";
            document.getElementById('imgStatus').style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        adminAlert("خطأ", error.message || "حدث خطأ أثناء الرفع", "error");
    } finally {
        btn.innerHTML = editingId ? 'حفظ التعديلات' : '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
        btn.disabled = false;
    }
});

// عرض الكورسات في الجدول (مع زرار التعديل والحذف)
onSnapshot(query(coursesRef), (snapshot) => {
    const table = document.getElementById('adminCoursesTable');
    if(!table) return;

    if(snapshot.empty) {
        table.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">لا توجد كورسات مضافة حتى الآن.</td></tr>`;
        return;
    }

    table.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const course = docSnap.data();
        const courseId = docSnap.id;

        let gradeAr = course.grade;
        if(gradeAr === 'sec3') gradeAr = 'الثالث الثانوي';
        else if(gradeAr === 'sec2') gradeAr = 'الثاني الثانوي';
        else if(gradeAr === 'sec1') gradeAr = 'الأول الثانوي';
        else if(gradeAr === 'prep3') gradeAr = 'الثالث الإعدادي';
        else if(gradeAr === 'prep2') gradeAr = 'الثاني الإعدادي';
        else if(gradeAr === 'prep1') gradeAr = 'الأول الإعدادي';
        else gradeAr = 'غير محدد';

        let examText = course.requiredExamId ? 
            '<span style="color:#ef4444; font-weight:800;"><i class="fas fa-lock"></i> مقفول</span>' : 
            '<span style="color:#10b981; font-weight:800;"><i class="fas fa-unlock"></i> مفتوح</span>';

        table.innerHTML += `
            <tr>
                <td><strong>${course.title || '-'}</strong></td>
                <td>${course.instructor || '-'}</td>
                <td>${gradeAr}</td>
                <td>${examText} <br><small style="color:#f59e0b; font-weight: 800;">السعر: ${course.price || 0} ج.م</small></td>
                <td style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="editCourse('${courseId}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 800; font-family: 'Cairo';"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteCourse('${courseId}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 800; font-family: 'Cairo';"><i class="fas fa-trash"></i> حذف</button>
                </td>
            </tr>
        `;
    });
});

// تفعيل وضع التعديل
window.editCourse = async function(id) {
    const docSnap = await getDoc(doc(db, "courses", id));
    if(docSnap.exists()) {
        const course = docSnap.data();
        
        document.getElementById('editingCourseId').value = id;
        document.getElementById('courseFormTitle').innerHTML = `<i class="fas fa-edit" style="color:#3b82f6;"></i> تعديل: ${course.title}`;
        
        document.getElementById('courseTitle').value = course.title || '';
        document.getElementById('courseInstructor').value = course.instructor || '';
        document.getElementById('courseGrade').value = course.grade || '';
        document.getElementById('coursePrice').value = course.price || 0;
        document.getElementById('coursePdf').value = course.pdfUrl || '';
        document.getElementById('requiredExamSelect').value = course.requiredExamId || "";
        
        document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        document.getElementById('btnCancelEdit').style.display = 'block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// زرار إلغاء التعديل
document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('courseFormTitle').innerHTML = `<i class="fas fa-plus-circle" style="color: #f59e0b;"></i> إضافة حصة أو كورس جديد`;
    document.getElementById('addCourseForm').reset();
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
    document.getElementById('imgStatus').style.display = 'none';
});

// دالة الحذف
window.deleteCourse = async function(id) {
    const isConfirmed = await adminConfirm("هل أنت متأكد من حذف هذه الحصة نهائياً؟");
    if(!isConfirmed) return;
    try {
        await deleteDoc(doc(db, "courses", id));
        adminAlert("تم الحذف", "تمت إزالة الحصة بنجاح.", "success");
    } catch (error) { adminAlert("خطأ", "فشل الحذف", "error"); }
};
