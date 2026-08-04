import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// جلب مفاتيح الأمان المخفية من قاعدة البيانات
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
            console.error("لم يتم العثور على مفاتيح الأمان في قاعدة البيانات!");
            return null;
        }
    } catch (error) {
        console.error("خطأ في جلب مفاتيح الأمان:", error);
        return null;
    }
}

// ==========================================
// إرسال واتساب للأدمن (في حالة التصحيح اليدوي)
// ==========================================
async function sendWhatsAppToParent(parentPhone, msgText) {
    if(!parentPhone || parentPhone === "غير متوفر") return;
    
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) return;

    const instanceId = keys.wapilot_instance; 
    const token = keys.wapilot_token;
    
    // تظبيط الرقم (إضافة 2 لمصر لو مش موجودة)
    let formattedPhone = parentPhone.startsWith('0') ? '2' + parentPhone : parentPhone;
    
    // الرابط المظبوط بتاعك
    var url = "https://api.wapilot.net/api/v2/" + instanceId + "/send-message";
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                phone: formattedPhone,
                message: msgText
            })
        });
        console.log("تم إرسال إشعار الواتساب عبر WaPilot بنجاح.");
    } catch(err) { 
        console.error("فشل إرسال الواتساب:", err); 
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
                // الكود القديم: <td style="color: #94a3b8; font-size: 13px;">الآن</td>
            // استبدله بالجزء ده:
            let timeText = 'غير محدد';
            if (student.createdAt) {
                const dateObj = new Date(student.createdAt);
                timeText = dateObj.toLocaleDateString('ar-EG') + ' ' + dateObj.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
            }
            
            tr.innerHTML = `
                <td><strong>${student.fullName || '-'}</strong></td>
                <td style="color: #f59e0b;">${student.studentPhone || '-'}</td>
                <td>${gradeAr || '-'}</td>
                <td>${walletText}</td>
                <td style="color: #94a3b8; font-size: 13px;" dir="ltr">${timeText}</td>
            `;
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
// إدارة الكورسات (رفع ImgBB و Vimeo + التعديل)
// ==========================================
const coursesRef = collection(db, "courses");

async function uploadImageToImgBB(file) {
    const keys = await getSecureApiKeys(); 
    if(!keys || !keys.imgbb_token) throw new Error("مفتاح ImgBB غير موجود في قاعدة البيانات!");

    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${keys.imgbb_token}`, { method: "POST", body: formData });
    const data = await response.json();
    if (data.success) return data.data.url;
    else throw new Error("فشل رفع الصورة على ImgBB");
}

async function uploadToVimeo(file, progressCallback) {
    return new Promise(async (resolve, reject) => {
        try {
            const keys = await getSecureApiKeys(); 
            if(!keys || !keys.vimeo_token) throw new Error("مفتاح Vimeo غير موجود في قاعدة البيانات!");

            const upload = new tus.Upload(file, {
                endpoint: "https://api.vimeo.com/me/videos",
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    Authorization: `Bearer ${keys.vimeo_token}`, 
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
        } catch (error) { reject(error); }
    });
}

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

        if (imageFile) {
            document.getElementById('imgStatus').style.display = 'inline';
            document.getElementById('imgStatus').textContent = "جاري رفع الصورة... ⏳";
            document.getElementById('imgStatus').style.color = '#f59e0b';
            imageUrl = await uploadImageToImgBB(imageFile);
            document.getElementById('imgStatus').textContent = "تم رفع الصورة بنجاح ✔️";
            document.getElementById('imgStatus').style.color = '#10b981';
        }

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

        let examText = course.requiredExamId ? '<span style="color:#ef4444; font-weight:800;"><i class="fas fa-lock"></i> مقفول</span>' : '<span style="color:#10b981; font-weight:800;"><i class="fas fa-unlock"></i> مفتوح</span>';

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

document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('courseFormTitle').innerHTML = `<i class="fas fa-plus-circle" style="color: #f59e0b;"></i> إضافة حصة أو كورس جديد`;
    document.getElementById('addCourseForm').reset();
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
    document.getElementById('imgStatus').style.display = 'none';
});

window.deleteCourse = async function(id) {
    const isConfirmed = await adminConfirm("هل أنت متأكد من حذف هذه الحصة نهائياً؟");
    if(!isConfirmed) return;
    try {
        await deleteDoc(doc(db, "courses", id));
        adminAlert("تم الحذف", "تمت إزالة الحصة بنجاح.", "success");
    } catch (error) { adminAlert("خطأ", "فشل الحذف", "error"); }
};

// ==========================================
// إدارة الامتحانات (المتقدم: مقالي واختياري وصور)
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;

window.toggleQType = function(id) {
    const type = document.getElementById(`qType_${id}`).value;
    const mcqContainer = document.getElementById(`mcqContainer_${id}`);
    if(type === 'mcq') mcqContainer.style.display = 'block';
    else mcqContainer.style.display = 'none';
}

document.getElementById('btnAddQuestion')?.addEventListener('click', () => {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    const qHtml = `
        <div class="question-box" id="qBox_${questionCount}" style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h5 style="color: #f59e0b; margin: 0; font-size: 16px;">سؤال رقم ${questionCount}</h5>
                <button type="button" onclick="document.getElementById('qBox_${questionCount}').remove()" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i> حذف</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <select class="q-type form-group-admin" id="qType_${questionCount}" onchange="toggleQType(${questionCount})" style="padding: 10px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155;">
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="essay">سؤال مقالي</option>
                </select>
                <input type="file" class="q-image" accept="image/*" style="padding: 5px; background: #0f172a; border-radius: 8px; color: #94a3b8; font-size: 13px;">
            </div>
            
            <textarea class="q-text" placeholder="اكتب صيغة السؤال هنا..." style="width: 100%; padding: 12px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155; margin-bottom: 15px; font-family: 'Cairo'; resize: vertical;" required></textarea>
            
            <div class="q-mcq-container" id="mcqContainer_${questionCount}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="q-opt1" placeholder="الاختيار الأول" style="padding: 10px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155;">
                    <input type="text" class="q-opt2" placeholder="الاختيار الثاني" style="padding: 10px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155;">
                    <input type="text" class="q-opt3" placeholder="الاختيار الثالث" style="padding: 10px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155;">
                    <input type="text" class="q-opt4" placeholder="الاختيار الرابع" style="padding: 10px; border-radius: 8px; background: #0f172a; color: #fff; border: 1px solid #334155;">
                </div>
                <select class="q-correct" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; font-weight: 800;">
                    <option value="" disabled selected>اختر الإجابة الصحيحة</option>
                    <option value="1">الاختيار الأول هو الصحيح</option>
                    <option value="2">الاختيار الثاني هو الصحيح</option>
                    <option value="3">الاختيار الثالث هو الصحيح</option>
                    <option value="4">الاختيار الرابع هو الصحيح</option>
                </select>
            </div>
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
    btn.textContent = "جاري الحفظ ورفع الصور... ⏳"; 
    btn.disabled = true;

    try {
        const questionsArray = [];
        for (const box of qBoxes) {
            const type = box.querySelector('.q-type').value;
            const text = box.querySelector('.q-text').value;
            const imageFile = box.querySelector('.q-image').files[0];
            
            let imageUrl = null;
            if (imageFile) imageUrl = await uploadImageToImgBB(imageFile);

            if (type === 'mcq') {
                questionsArray.push({
                    type: 'mcq',
                    text: text,
                    imageUrl: imageUrl,
                    options: [
                        box.querySelector('.q-opt1').value,
                        box.querySelector('.q-opt2').value,
                        box.querySelector('.q-opt3').value,
                        box.querySelector('.q-opt4').value
                    ],
                    correctIndex: parseInt(box.querySelector('.q-correct').value) - 1
                });
            } else {
                questionsArray.push({
                    type: 'essay',
                    text: text,
                    imageUrl: imageUrl
                });
            }
        }
        await addDoc(examsRef, { title: title, questions: questionsArray, createdAt: new Date().toISOString() });
        adminAlert("نجاح", "تم حفظ الامتحان بنجاح!", "success");
        document.getElementById('addExamForm').reset();
        document.getElementById('questionsContainer').innerHTML = '';
        questionCount = 0;
    } catch(err) { adminAlert("خطأ", "فشل الحفظ: " + err.message, "error"); } 
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
// قسم تصحيح الامتحانات (Grading System)
// ==========================================
const submissionsRef = collection(db, "exam_submissions");

onSnapshot(query(submissionsRef), (snapshot) => {
    const table = document.getElementById('adminGradingTable');
    if(!table) return;
    
    table.innerHTML = '';
    const filter = document.getElementById('filterGradingStatus')?.value || 'all';

    snapshot.forEach(docSnap => {
        const sub = docSnap.data();
        const subId = docSnap.id;
        
        if(filter !== 'all' && sub.status !== filter) return; 

        let statusText = '';
        if(sub.status === 'passed') statusText = '<span style="color:#10b981; font-weight:800;">ناجح</span>';
        else if(sub.status === 'failed') statusText = '<span style="color:#ef4444; font-weight:800;">راسب</span>';
        else statusText = '<span style="color:#f59e0b; font-weight:800;">قيد المراجعة</span>';

        let resetBtn = `<button onclick="resetStudentExam('${subId}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-family:'Cairo'; font-size:12px;"><i class="fas fa-redo"></i> إعادة للراسب</button>`;
        let gradeBtn = sub.status === 'pending' ? `<button onclick="gradeStudentExam('${subId}')" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-family:'Cairo'; font-size:12px;"><i class="fas fa-check"></i> تصحيح يدوي</button>` : '';

        table.innerHTML += `
            <tr>
                <td><strong>${sub.studentName}</strong><br><small style="color:#94a3b8;">${sub.studentPhone}</small></td>
                <td>${sub.examTitle}</td>
                <td>${sub.score}%</td>
                <td>${statusText}</td>
                <td style="display:flex; gap:5px; flex-wrap:wrap;">
                    ${gradeBtn}
                    ${resetBtn}
                </td>
            </tr>
        `;
    });
});

document.getElementById('filterGradingStatus')?.addEventListener('change', () => {
    // تحديث الجدول عند تغيير الفلتر
    const event = new Event('change');
});

// التصحيح اليدوي وإرسال الواتساب
window.gradeStudentExam = async function(subId) {
    const isPassed = await adminConfirm("هل تريد نجاح الطالب في هذا الامتحان (إعطاء 100%)؟ \n(اختر نعم للنجاح، وإلغاء لترسيبه)");
    try {
        const newStatus = isPassed ? 'passed' : 'failed';
        const newScore = isPassed ? 100 : 0;
        
        // تحديث الداتا بيز
        await updateDoc(doc(db, "exam_submissions", subId), {
            status: newStatus,
            score: newScore
        });

        // جلب بيانات الطالب لإرسال رسالة واتساب
        const subSnap = await getDoc(doc(db, "exam_submissions", subId));
        if(subSnap.exists()){
            const subData = subSnap.data();
            let waMsg = `مرحباً ولي أمر الطالب/ة: ${subData.studentName}\nتم تصحيح الامتحان المقالي (${subData.examTitle}).\nالنتيجة الآن: ${newStatus === 'passed' ? 'ناجح ✅' : 'راسب ❌'}\nتم تحديث حالة الحصة للطالب.`;
            await sendWhatsAppToParent(subData.parentPhone, waMsg);
        }

        adminAlert("تم التصحيح", `تم تقييم الطالب كـ: ${newStatus}`, "success");
    } catch (e) { console.error(e); }
}

// إعادة الامتحان
window.resetStudentExam = async function(subId) {
    const confirm = await adminConfirm("هل أنت متأكد من مسح نتيجة الطالب ليتمكن من إعادة الامتحان؟");
    if(!confirm) return;
    try {
        await deleteDoc(doc(db, "exam_submissions", subId));
        adminAlert("تم المسح", "تم مسح الامتحان.. يمكن للطالب الدخول للحصة وامتحانها مجدداً.", "success");
    } catch (e) { console.error(e); }
}
