import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import * as tus from "https://cdn.skypack.dev/tus-js-client";

// ==========================================
// 🛡️ 1. نظام الحماية الصارم (منع F12 والـ Right Click)
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) || (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0))) {
        return false;
    }
}

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

// حماية الصفحة وتطبيق الصلاحيات
if (localStorage.getItem('adminLoggedIn') !== 'true') window.location.replace('admin-login.html');

document.getElementById('adminLogoutBtn')?.addEventListener('click', () => { 
    localStorage.clear(); 
    window.location.replace('admin-login.html'); 
});

const ROLE = localStorage.getItem('role') || 'superadmin';
const AST_TEACHER = localStorage.getItem('astTeacher');

function applyPermissions() {
    if (ROLE === 'assistant') {
        const perms = JSON.parse(localStorage.getItem('astPerms') || "[]");
        
        if(!perms.includes('students')) document.getElementById('navStudents').style.display = 'none';
        if(!perms.includes('courses')) document.getElementById('navCourses').style.display = 'none';
        if(!perms.includes('exams')) document.getElementById('navExams').style.display = 'none';
        if(!perms.includes('grading')) document.getElementById('navGrading').style.display = 'none';
        if(!perms.includes('codes')) document.getElementById('navCodes').style.display = 'none';
        if(!perms.includes('wallet')) document.getElementById('navWallet').style.display = 'none';
        if(!perms.includes('teacherReport')) document.getElementById('navTeacherReport').style.display = 'none';
        
        document.getElementById('navTeachers').style.display = 'none';
        document.getElementById('navPackages').style.display = 'none';
        document.getElementById('navAssistants').style.display = 'none';
        document.getElementById('navPromoCodes').style.display = 'none';
        document.getElementById('navLiveChat').style.display = 'none';
    }
}
applyPermissions();

// التنبيهات
function adminAlert(title, msg, type = 'success') {
    const modal = document.getElementById('customAdminAlert');
    if(!modal) return;
    document.getElementById('adminAlertTitle').textContent = title;
    document.getElementById('adminAlertMsg').textContent = msg;
    document.getElementById('adminAlertIcon').innerHTML = type === 'success' ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
    modal.classList.add('active');
}
window.adminAlert = adminAlert;

window.adminConfirm = function(msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAdminConfirm');
        document.getElementById('adminConfirmMsg').textContent = msg;
        modal.classList.add('active');
        document.getElementById('btnConfirmYes').onclick = () => { modal.classList.remove('active'); resolve(true); };
        document.getElementById('btnConfirmNo').onclick = () => { modal.classList.remove('active'); resolve(false); };
    });
}

// دالة إرسال واتساب مزدوج (للطالب وولي الأمر)
async function sendWhatsAppBoth(studentPhone, parentPhone, message) {
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return;
        const keys = docSnap.data();
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        
        const sendReq = (phone) => {
            if(!phone || phone.trim() === "" || phone.trim() === "0") return;
            let formattedPhone = phone.trim();
            if (formattedPhone.startsWith('0')) formattedPhone = '2' + formattedPhone;
            fetch(url, {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` },
                body: JSON.stringify({ chat_id: formattedPhone + "@c.us", text: message })
            }).catch(e=>console.log(e));
        };
        sendReq(studentPhone);
        sendReq(parentPhone);
    } catch(e) {}
}

async function uploadImageToR2(file) {
    const formData = new FormData();
    formData.append("image", file);
    try {
        const response = await fetch("https://primee-api.adelabdulrahman026.workers.dev/upload-image", { method: "POST", body: formData });
        const data = await response.json();
        if (data.success) return data.url;
        throw new Error(data.error);
    } catch (error) { throw new Error("فشل الرفع"); }
}

async function uploadToVimeo(file, progressCallback) {
    const docSnap = await getDoc(doc(db, "settings", "api_keys"));
    const keys = docSnap.exists() ? docSnap.data() : null;
    if (!keys || !keys.vimeo_token) throw new Error("مفتاح Vimeo غير موجود");

    const createResponse = await fetch("https://api.vimeo.com/me/videos", {
        method: "POST",
        headers: { Authorization: `Bearer ${keys.vimeo_token}`, "Content-Type": "application/json", Accept: "application/vnd.vimeo.*+json;version=3.4" },
        body: JSON.stringify({ upload: { approach: "tus", size: file.size.toString() } })
    });
    if (!createResponse.ok) throw new Error(await createResponse.text());
    const video = await createResponse.json();

    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            uploadUrl: video.upload.upload_link,
            retryDelays: [0,3000,5000,10000],
            headers: { Authorization: `Bearer ${keys.vimeo_token}` },
            metadata: { filename: file.name, filetype: file.type },
            onError(error){ reject(error); },
            onProgress(bytesUploaded, bytesTotal){ progressCallback(((bytesUploaded / bytesTotal) * 100).toFixed(2)); },
            async onSuccess(){
                await fetch(video.uri,{
                    method:"PATCH", headers:{ Authorization:`Bearer ${keys.vimeo_token}`, "Content-Type":"application/json" },
                    body:JSON.stringify({ privacy:{ view:"disable" } })
                });
                resolve("https://player.vimeo.com/video/" + video.uri.split("/").pop());
            }
        });
        upload.start();
    });
}

// ==========================================
// 🚨 خدمة العملاء (Toggle Online Status) 🚨
// ==========================================
const liveChatToggleBtn = document.getElementById('liveChatToggleBtn');
if(liveChatToggleBtn) {
    getDoc(doc(db, "settings", "support")).then(snap => {
        if(snap.exists() && snap.data().isLive === true) {
            liveChatToggleBtn.checked = true;
        }
    });

    liveChatToggleBtn.addEventListener('change', async (e) => {
        const isLive = e.target.checked;
        try {
            await setDoc(doc(db, "settings", "support"), { isLive: isLive }, { merge: true });
            if(isLive) adminAlert("تم", "خدمة العملاء الآن متاحة للطلاب 🟢", "success");
            else adminAlert("تنبيه", "خدمة العملاء مغلقة الآن 🔴", "error");
        } catch(err) {
            e.target.checked = !isLive; // إرجاع الزر لو فشل
            adminAlert("خطأ", "فشل تغيير الحالة", "error");
        }
    });
}

// ==========================================
// الإدارة الشاملة للمدرسين 
// ==========================================
const teachersRef = collection(db, "teachers");
let editingTeacherId = null;

onSnapshot(query(teachersRef), (snapshot) => {
    const table = document.getElementById('adminTeachersTable');
    const selectInstructor = document.getElementById('courseInstructor');
    const selectAstTeacher = document.getElementById('astTeacher');
    const reportTeacherSelect = document.getElementById('reportTeacherSelect');

    if(table) table.innerHTML = '';
    if(selectInstructor) selectInstructor.innerHTML = '<option value="" disabled selected>اختر المدرس</option>';
    if(selectAstTeacher) selectAstTeacher.innerHTML = '<option value="" disabled selected>اختر المدرس</option>';
    if(reportTeacherSelect) reportTeacherSelect.innerHTML = '<option value="" disabled selected>اختر المدرس</option>';

    snapshot.forEach(docSnap => {
        const t = docSnap.data();
        const safeImageUrl = t.imageUrl || t.image || 'https://via.placeholder.com/150';
        
        if(table) {
            table.innerHTML += `<tr>
                <td><img src="${safeImageUrl}" style="width:30px; height:30px; border-radius:50%; margin-left:10px; object-fit:cover; vertical-align:middle;"><strong>${t.name}</strong></td>
                <td>${t.subject}</td>
                <td>${t.stages}</td>
                <td style="display:flex; gap:5px; justify-content:center;">
                    <button onclick="editTeacher('${docSnap.id}')" style="background: rgba(59,130,246,0.1); color:#3b82f6; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteTeacher('${docSnap.id}')" style="background: rgba(239,68,68,0.1); color:#ef4444; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }
        
        if(selectInstructor) selectInstructor.innerHTML += `<option value="${t.name}">${t.name} (${t.subject})</option>`;
        if(selectAstTeacher) selectAstTeacher.innerHTML += `<option value="${t.name}">${t.name}</option>`;
        
        if (!(ROLE === 'assistant' && AST_TEACHER && t.name !== AST_TEACHER)) {
            if(reportTeacherSelect) reportTeacherSelect.innerHTML += `<option value="${t.name}">${t.name}</option>`;
        }
    });
});

window.deleteTeacher = async function(id) {
    if(await adminConfirm("هل أنت متأكد من مسح هذا المدرس نهائياً؟")) {
        try { await deleteDoc(doc(db, "teachers", id)); adminAlert("تم", "تم المسح بنجاح", "success"); } 
        catch(e) {}
    }
};

window.editTeacher = async function(id) {
    const docSnap = await getDoc(doc(db, "teachers", id));
    if(docSnap.exists()) {
        const t = docSnap.data();
        editingTeacherId = id;
        document.getElementById('teacherName').value = t.name || '';
        document.getElementById('teacherSubject').value = t.subject || '';
        
        const selectStages = document.getElementById('teacherStages');
        Array.from(selectStages.options).forEach(opt => {
            opt.selected = t.stages.includes(opt.value);
        });

        document.getElementById('btnSaveTeacher').innerHTML = '<i class="fas fa-edit"></i> تحديث بيانات المدرس';
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
};

document.getElementById('addTeacherForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveTeacher');
    btn.innerHTML = "جاري الحفظ والرفع... ⏳"; btn.disabled = true;

    try {
        const selectStages = document.getElementById('teacherStages');
        const selectedStages = Array.from(selectStages.selectedOptions).map(opt => opt.value).join(', ');
        const imageFile = document.getElementById('teacherImage').files[0];
        
        let imageUrl = null;
        if(imageFile) imageUrl = await uploadImageToR2(imageFile);

        const teacherData = { name: document.getElementById('teacherName').value.trim(), subject: document.getElementById('teacherSubject').value.trim(), stages: selectedStages };
        if(imageUrl) teacherData.imageUrl = imageUrl;

        if(editingTeacherId) {
            await updateDoc(doc(db, "teachers", editingTeacherId), teacherData);
            editingTeacherId = null;
        } else {
            if(!imageUrl) throw new Error("يجب رفع صورة للمدرس");
            teacherData.createdAt = new Date().toISOString();
            await addDoc(teachersRef, teacherData);
        }
        adminAlert("تم", "تم حفظ المدرس بنجاح", "success");
        document.getElementById('addTeacherForm').reset();
    } catch(err) { adminAlert("خطأ", err.message, "error"); }
    finally { btn.innerHTML = "<i class='fas fa-plus'></i> إضافة المدرس"; btn.disabled = false; }
});


// 1. مراقبة الطلاب والأرباح
let allStudentsData = [];
let teacherCourseIds = []; 

function renderDashboardStats() {
    let filteredStudents = allStudentsData;
    if (ROLE === 'assistant' && AST_TEACHER) {
        filteredStudents = allStudentsData.filter(s => {
            const myC = s.myCourses || [];
            return myC.some(cid => teacherCourseIds.includes(cid));
        });
    }

    if(document.getElementById('totalStudentsCount')) document.getElementById('totalStudentsCount').textContent = filteredStudents.length;
    let totalRev = 0;
    filteredStudents.forEach(s => totalRev += parseInt(s.walletBalance || 0));
    if(document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = totalRev + ' ج.م';

    const tableBody = document.getElementById('recentStudentsTable');
    if(tableBody) {
        tableBody.innerHTML = '';
        [...filteredStudents].reverse().slice(0, 10).forEach(student => {
            let timeText = student.createdAt ? new Date(student.createdAt).toLocaleString('ar-EG') : '-';
            tableBody.innerHTML += `<tr>
                <td><strong>${student.fullName || '-'}</strong></td>
                <td style="color: #f59e0b;">${student.studentPhone || '-'}</td>
                <td>${student.grade || '-'}</td>
                <td>${student.walletBalance > 0 ? `<span style="color:#10b981;">${student.walletBalance} ج.م</span>` : `0 ج.م`}</td>
                <td style="color: #94a3b8; font-size: 13px;" dir="ltr">${timeText}</td>
            </tr>`;
        });
    }
}

onSnapshot(query(collection(db, "users")), (snapshot) => {
    allStudentsData = [];
    snapshot.forEach(doc => allStudentsData.push({id: doc.id, ...doc.data()}));
    renderDashboardStats();
});

// ==========================================
// 🚨 2. إدارة الطلاب وحماية الأجهزة 🚨
// ==========================================
let currentStudentId = null;
let currentStudentData = null;

document.getElementById('btnSearchStudent')?.addEventListener('click', async () => {
    const phone = document.getElementById('searchPhoneInput').value.trim();
    if(!phone) return adminAlert("خطأ", "أدخل رقم الهاتف!", "error");
    document.getElementById('btnSearchStudent').innerHTML = 'جاري...';
    try {
        const querySnapshot = await getDocs(query(collection(db, "users"), where("studentPhone", "==", phone)));
        if(querySnapshot.empty) { adminAlert("عذراً", "لا يوجد طالب بهذا الرقم", "error"); } 
        else {
            const studentDoc = querySnapshot.docs[0];
            currentStudentId = studentDoc.id;
            currentStudentData = studentDoc.data();
            
            document.getElementById('resStudentName').textContent = currentStudentData.fullName;
            document.getElementById('resStudentPhone').textContent = currentStudentData.studentPhone;
            document.getElementById('resParentPhone').textContent = currentStudentData.parentPhone || "غير متوفر";
            document.getElementById('resStudentGrade').textContent = currentStudentData.grade || '-';
            document.getElementById('resStudentWallet').textContent = (currentStudentData.walletBalance || 0) + ' ج.م';
            
            // إدارة الأجهزة والمحاولات
            document.getElementById('resTransferAttempts').textContent = currentStudentData.transferAttempts !== undefined ? currentStudentData.transferAttempts : 3;
            
            const blockedList = document.getElementById('resBlockedDevicesList');
            blockedList.innerHTML = '';
            if(currentStudentData.blockedDevices && currentStudentData.blockedDevices.length > 0) {
                currentStudentData.blockedDevices.forEach(device => {
                    blockedList.innerHTML += `
                        <li style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 5px; font-family: monospace; font-size: 12px; color: #f8fafc;">
                            ${device}
                            <button onclick="unblockDevice('${device}')" style="background:none; border:none; color:#10b981; cursor:pointer;" title="فك حظر الجهاز"><i class="fas fa-unlock"></i></button>
                        </li>
                    `;
                });
            } else {
                blockedList.innerHTML = `<li style="color: #94a3b8; font-size: 12px;">لا توجد أجهزة محظورة.</li>`;
            }

            const statusSpan = document.getElementById('resStudentStatus');
            const btnToggleBlock = document.getElementById('btnToggleBlock');
            if(currentStudentData.isBlocked) {
                statusSpan.textContent = 'محظور ⛔'; statusSpan.style.color = '#ef4444';
                btnToggleBlock.innerHTML = '<i class="fas fa-unlock"></i> فك الحظر';
                btnToggleBlock.style.background = 'rgba(16, 185, 129, 0.1)'; btnToggleBlock.style.color = '#10b981';
            } else {
                statusSpan.textContent = 'نشط 🟢'; statusSpan.style.color = '#10b981';
                btnToggleBlock.innerHTML = '<i class="fas fa-ban"></i> حظر الطالب';
                btnToggleBlock.style.background = 'rgba(239, 68, 68, 0.1)'; btnToggleBlock.style.color = '#ef4444';
            }
            document.getElementById('studentResultCard').style.display = 'block';
        }
    } catch(error) {} finally { document.getElementById('btnSearchStudent').innerHTML = '<i class="fas fa-search"></i> بحث'; }
});

// تصفير المحاولات وفك الحظر
document.getElementById('btnResetAttempts')?.addEventListener('click', async () => {
    if(!currentStudentId) return;
    if(!await adminConfirm("هل أنت متأكد من إعادة محاولات النقل إلى 3؟")) return;
    await updateDoc(doc(db, "users", currentStudentId), { transferAttempts: 3 });
    document.getElementById('btnSearchStudent').click(); // تحديث
});

window.unblockDevice = async function(deviceId) {
    if(!currentStudentId) return;
    if(!await adminConfirm("فك الحظر عن هذا الجهاز؟")) return;
    await updateDoc(doc(db, "users", currentStudentId), {
        blockedDevices: arrayRemove(deviceId)
    });
    document.getElementById('btnSearchStudent').click(); // تحديث
};

document.getElementById('btnChargeWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح", "error");
    try {
        const newBalance = (parseInt(currentStudentData.walletBalance) || 0) + amount; 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        
        await addDoc(collection(db, "transactions"), {
            studentId: currentStudentId, studentName: currentStudentData.fullName, studentPhone: currentStudentData.studentPhone,
            type: "charge_admin", amount: amount, courseTitle: "إيداع يدوي (إدارة)", instructor: "-",
            createdAt: new Date().toISOString()
        });

        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم", "تم الشحن بنجاح وتسجيل العملية", "success");
    } catch(e) {}
});

document.getElementById('btnDeductWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح", "error");
    if(!await adminConfirm(`تأكيد خصم ${amount}؟`)) return;
    try {
        const currentBalance = parseInt(currentStudentData.walletBalance) || 0;
        const newBalance = Math.max(0, currentBalance - amount); 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        
        await addDoc(collection(db, "transactions"), {
            studentId: currentStudentId, studentName: currentStudentData.fullName, studentPhone: currentStudentData.studentPhone,
            type: "deduct_admin", amount: -amount, courseTitle: "خصم يدوي (إدارة)", instructor: "-",
            createdAt: new Date().toISOString()
        });

        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم", "تم الخصم بنجاح", "success");
    } catch(e) {}
});

document.getElementById('btnToggleBlock')?.addEventListener('click', async () => {
    if(!currentStudentId) return;
    const newStatus = !currentStudentData.isBlocked;
    if(!await adminConfirm(newStatus ? "تأكيد الحظر؟" : "تأكيد فك الحظر؟")) return;
    try {
        await updateDoc(doc(db, "users", currentStudentId), { isBlocked: newStatus });
        document.getElementById('btnSearchStudent').click();
    } catch(e) {}
});

// ==========================================
// 3. إدارة الكورسات (تعديل إضافة الاسم للمقاطع)
// ==========================================
const coursesRef = collection(db, "courses");

window.deleteCourse = async function(id) {
    if(await adminConfirm("تأكيد حذف الحصة نهائياً؟")) {
        try { await deleteDoc(doc(db, "courses", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch (e) {}
    }
};

document.getElementById('addCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveCourse');
    const editingId = document.getElementById('editingCourseId').value;
    btn.textContent = editingId ? 'جاري التعديل والرفع...' : 'جاري الرفع والنشر... ⏳'; 
    btn.disabled = true;

    try {
        let imageUrl = null;
        const imageFile = document.getElementById('courseImageFile').files[0];
        if(imageFile) imageUrl = await uploadImageToR2(imageFile);

        let newVideosArray = []; 
        const videoRows = document.querySelectorAll('#courseVideosContainer .video-row');
        let hasVideosToUpload = false;
        videoRows.forEach(row => { if(row.querySelector('.course-video-file').files.length > 0) hasVideosToUpload = true; });

        if(hasVideosToUpload) {
            document.getElementById('videoProgressContainer').style.display = 'block';
            for (let i = 0; i < videoRows.length; i++) {
                const titleInput = videoRows[i].querySelector('.course-video-title');
                const fileInput = videoRows[i].querySelector('.course-video-file');
                const examSelect = videoRows[i].querySelector('.course-video-exam');
                if(fileInput.files.length > 0) {
                    document.getElementById('videoStatus').textContent = `جاري رفع المقطع (${i + 1}/${videoRows.length})...`;
                    let vUrl = await uploadToVimeo(fileInput.files[0], (p) => {
                        document.getElementById('videoProgressBar').style.width = p + '%';
                    });
                    newVideosArray.push({ 
                        title: titleInput.value.trim() || `المقطع ${i + 1}`, 
                        url: vUrl, 
                        requiredExamId: examSelect.value || null 
                    });
                }
            }
            document.getElementById('videoStatus').textContent = `تم رفع المقاطع بنجاح ✔️`;
        }

        const courseData = {
            title: document.getElementById('courseTitle').value.trim(),
            instructor: document.getElementById('courseInstructor').value,
            grade: document.getElementById('courseGrade').value,
            price: parseInt(document.getElementById('coursePrice').value) || 0,
            pdfUrl: document.getElementById('coursePdf').value.trim(),
            maxViews: parseInt(document.getElementById('courseMaxViews').value) || 0
        };
        if(imageUrl) courseData.image = imageUrl;

        if(editingId) {
            const existingDoc = await getDoc(doc(db, "courses", editingId));
            let currentVideos = existingDoc.data().videos || [];
            courseData.videos = [...currentVideos, ...newVideosArray];
            await updateDoc(doc(db, "courses", editingId), courseData);
            document.getElementById('btnCancelEdit').click();
        } else {
            if(!imageUrl && newVideosArray.length === 0) throw new Error("يجب رفع صورة ومقطع واحد على الأقل");
            courseData.videos = newVideosArray;
            courseData.createdAt = new Date().toISOString();
            courseData.views = 0;
            await addDoc(coursesRef, courseData);
            document.getElementById('addCourseForm').reset();
            document.getElementById('courseVideosContainer').innerHTML = '';
        }
        adminAlert("تم", "تم حفظ الحصة بنجاح", "success");
    } catch(err) { adminAlert("خطأ", err.message, "error"); }
    finally { 
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> حفظ ونشر الحصة'; btn.disabled = false; 
        document.getElementById('videoProgressContainer').style.display = 'none'; 
    }
});

// تصدير اكسيل للكورس
window.exportCourseExcel = async function(courseId, courseTitle) {
    adminAlert("جاري التحميل", "يتم تجميع تقرير الطلاب...", "success");
    try {
        const q = query(collection(db, "users"), where("myCourses", "array-contains", courseId));
        const usersSnap = await getDocs(q);

        const exQ = query(collection(db, "exam_submissions"), where("courseId", "==", courseId));
        const exSnap = await getDocs(exQ);
        let submissions = {};
        exSnap.forEach(d => { submissions[d.data().studentPhone] = d.data(); });

        let csv = "\uFEFFاسم الطالب,رقم الطالب,رقم ولي الأمر,المحافظة,الامتحان,الدرجة\n";
        usersSnap.forEach(docSnap => {
            let u = docSnap.data();
            let sub = submissions[u.studentPhone];
            let scoreText = sub ? `${sub.score} / ${sub.totalQuestions || 10}` : 'لم يمتحن';
            let statusText = sub ? (sub.status === 'passed' ? 'ناجح' : (sub.status==='failed'?'راسب':'مراجعة')) : '-';
            csv += `${u.fullName || '-'},${u.studentPhone || '-'},${u.parentPhone || '-'},${u.governorate || '-'},${statusText},${scoreText}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `طلاب_حصة_${courseTitle}.csv`; link.click();
    } catch(e) { adminAlert("خطأ", "فشل تحميل التقرير", "error"); }
};

onSnapshot(query(coursesRef), (snapshot) => {
    const table = document.getElementById('adminCoursesTable');
    if(!table) return; table.innerHTML = '';
    teacherCourseIds = [];

    snapshot.forEach(docSnap => {
        const c = docSnap.data();
        if (ROLE === 'assistant' && AST_TEACHER && c.instructor !== AST_TEACHER) return;
        teacherCourseIds.push(docSnap.id);

        // حساب عدد المشتركين فعلياً
        let enrolledCount = allStudentsData.filter(s => s.myCourses && s.myCourses.includes(docSnap.id)).length;

        table.innerHTML += `<tr>
            <td><strong>${c.title}</strong></td>
            <td>${c.instructor}</td>
            <td>${c.grade}</td>
            <td><span style="color:#10b981; font-weight:900;">${enrolledCount} طالب</span></td>
            <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                <button onclick="exportCourseExcel('${docSnap.id}', '${c.title}')" style="background:#10b981; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="تحميل الإكسيل"><i class="fas fa-file-excel"></i> إكسيل</button>
                <button onclick="editCourse('${docSnap.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; padding: 5px 8px; border-radius: 5px; cursor: pointer;"><i class="fas fa-edit"></i> تعديل</button>
                <button onclick="deleteCourse('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 5px 8px; border-radius: 5px; cursor: pointer;"><i class="fas fa-trash"></i> مسح</button>
            </td>
        </tr>`;
    });
    renderDashboardStats();
});

window.editCourse = async function(id) {
    const docSnap = await getDoc(doc(db, "courses", id));
    if(docSnap.exists()) {
        const c = docSnap.data();
        document.getElementById('editingCourseId').value = id;
        document.getElementById('courseTitle').value = c.title || '';
        document.getElementById('courseInstructor').value = c.instructor || '';
        document.getElementById('courseGrade').value = c.grade || '';
        document.getElementById('coursePrice').value = c.price || 0;
        document.getElementById('coursePdf').value = c.pdfUrl || '';
        document.getElementById('courseMaxViews').value = c.maxViews || 0;
        document.getElementById('btnSaveCourse').innerHTML = 'حفظ التعديلات وإضافة مقطع';
        document.getElementById('btnCancelEdit').style.display = 'block';
        window.scrollTo({top: document.getElementById('addCourseForm').offsetTop - 50, behavior: 'smooth'});
    }
}
document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('addCourseForm').reset();
    document.getElementById('courseVideosContainer').innerHTML = '';
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> حفظ ونشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
});

// ==========================================
// 4. إدارة الامتحانات والـ AI 🚨
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;
window.currentExamsData = [];
window.examOptionsHTML = '<option value="">بدون امتحان (مفتوحة)</option>';

onSnapshot(query(examsRef), (snap) => {
    window.currentExamsData = [];
    window.examOptionsHTML = '<option value="">بدون امتحان (مفتوحة)</option>';
    
    const filter = document.getElementById('filterSpecificExam');
    if(filter) filter.innerHTML = '<option value="all">كل الامتحانات / الحصص</option>';
    
    snap.forEach(docSnap => {
        const ex = {id: docSnap.id, ...docSnap.data()};
        window.currentExamsData.push(ex);
        window.examOptionsHTML += `<option value="${ex.id}">${ex.title}</option>`;
        if(filter) filter.innerHTML += `<option value="${ex.id}">${ex.title}</option>`;
    });
    
    document.querySelectorAll('.exam-select-sync').forEach(sel => {
        let currentVal = sel.value;
        sel.innerHTML = window.examOptionsHTML;
        if(currentVal) sel.value = currentVal;
    });
    renderExamsTable(); 
});

window.deleteExam = async function(id) {
    if(await adminConfirm("تأكيد حذف الامتحان نهائياً؟")) {
        try { await deleteDoc(doc(db, "exams", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch(e) {}
    }
};

window.toggleQType = function(id) {
    const type = document.getElementById(`qType_${id}`).value;
    document.getElementById(`mcqContainer_${id}`).style.display = type === 'mcq' ? 'block' : 'none';
    document.getElementById(`essayContainer_${id}`).style.display = type === 'essay' ? 'block' : 'none';
}

document.getElementById('btnAddQuestion')?.addEventListener('click', () => {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    container.insertAdjacentHTML('beforeend', `
        <div class="question-box" id="qBox_${questionCount}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h5 style="color: #f59e0b; margin: 0;">سؤال ${questionCount}</h5>
                <button type="button" onclick="document.getElementById('qBox_${questionCount}').remove()" style="color: #ef4444; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <select class="q-type form-group-admin" id="qType_${questionCount}" onchange="toggleQType(${questionCount})">
                    <option value="mcq">اختياري</option>
                    <option value="essay">مقالي</option>
                </select>
                <input type="file" class="q-image" accept="image/*" style="padding: 5px; background:var(--input-bg);">
            </div>
            <textarea class="q-text" placeholder="اكتب السؤال..." style="width: 100%; padding: 12px; border-radius: 8px; margin-bottom: 15px; background:var(--input-bg); color:#fff;" required></textarea>
            
            <div class="q-mcq-container" id="mcqContainer_${questionCount}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="q-opt1" placeholder="اختيار 1" style="padding:10px; border-radius:8px; background:var(--input-bg); color:#fff; border:1px solid #334155;">
                    <input type="text" class="q-opt2" placeholder="اختيار 2" style="padding:10px; border-radius:8px; background:var(--input-bg); color:#fff; border:1px solid #334155;">
                    <input type="text" class="q-opt3" placeholder="اختيار 3" style="padding:10px; border-radius:8px; background:var(--input-bg); color:#fff; border:1px solid #334155;">
                    <input type="text" class="q-opt4" placeholder="اختيار 4" style="padding:10px; border-radius:8px; background:var(--input-bg); color:#fff; border:1px solid #334155;">
                </div>
                <label style="color:#cbd5e1; font-size:12px;">الإجابة الصحيحة:</label>
                <select class="q-correct" style="width: 100%; padding: 10px; border-radius: 8px; background:var(--input-bg); color:#fff; border:1px solid #334155;">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                </select>
            </div>

            <!-- قسم المقالي والذكاء الاصطناعي 🚨 -->
            <div class="q-essay-container" id="essayContainer_${questionCount}" style="display:none; background:rgba(59,130,246,0.05); padding:15px; border-radius:8px; border:1px dashed #3b82f6;">
                <label style="display:flex; align-items:center; gap:10px; color:#3b82f6; font-weight:800; margin-bottom:10px; cursor:pointer;">
                    <input type="checkbox" class="q-ai-grade" style="width:18px; height:18px;">
                    تصحيح فوري بالذكاء الاصطناعي (AI)
                </label>
                <textarea class="q-model-answer" placeholder="اكتب الإجابة النموذجية (بشكل مفصل) ليقارن بها الذكاء الاصطناعي إجابة الطالب ويعطيه الدرجة تلقائياً..." style="width: 100%; padding: 12px; border-radius: 8px; background:var(--input-bg); color:#fff; border:1px solid #334155; min-height:80px;"></textarea>
            </div>
        </div>
    `);
});

document.getElementById('addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qBoxes = document.querySelectorAll('.question-box');
    if(qBoxes.length === 0) return adminAlert("خطأ", "أضف سؤال", "error");
    const editingId = document.getElementById('editingExamId').value;
    const btn = document.getElementById('btnSaveExam');
    btn.textContent = "جاري الحفظ..."; btn.disabled = true;

    try {
        const qs = [];
        for (const box of qBoxes) {
            const type = box.querySelector('.q-type').value;
            const text = box.querySelector('.q-text').value;
            const imageFile = box.querySelector('.q-image').files[0];
            let imageUrl = imageFile ? await uploadImageToR2(imageFile) : null;
            
            if (type === 'mcq') {
                qs.push({ type:'mcq', text:text, imageUrl:imageUrl, options:[box.querySelector('.q-opt1').value, box.querySelector('.q-opt2').value, box.querySelector('.q-opt3').value, box.querySelector('.q-opt4').value], correctIndex: parseInt(box.querySelector('.q-correct').value)-1 });
            } else {
                const isAiGraded = box.querySelector('.q-ai-grade').checked;
                const modelAnswer = box.querySelector('.q-model-answer').value.trim();
                qs.push({ type:'essay', text:text, imageUrl:imageUrl, isAiGraded: isAiGraded, modelAnswer: modelAnswer });
            }
        }
        const data = { title: document.getElementById('examTitle').value, questions: qs };
        if(editingId) { await updateDoc(doc(db, "exams", editingId), data); document.getElementById('btnCancelExamEdit').click(); }
        else { data.createdAt = new Date().toISOString(); await addDoc(examsRef, data); document.getElementById('addExamForm').reset(); document.getElementById('questionsContainer').innerHTML=''; questionCount=0; }
        adminAlert("تم", "تم الحفظ", "success");
    } catch(e) {} finally { btn.innerHTML = '<i class="fas fa-save"></i> حفظ الامتحان'; btn.disabled = false; }
});

// توليد PDF للامتحان 🚨
window.exportExamPDF = function(examId, examTitle) {
    adminAlert("تجهيز", "جاري تجميع درجات الطلاب في PDF...", "success");
    const tbody = document.getElementById('pdfExamStudentsBody');
    tbody.innerHTML = '';
    
    let studentsInExam = allSubmissionsForExams.filter(s => s.examId === examId);
    if(studentsInExam.length === 0) return adminAlert("تنبيه", "لا يوجد طلاب امتحنوا هذا الامتحان بعد", "error");

    studentsInExam.forEach(s => {
        let isPass = (s.score / s.totalQuestions) >= 0.5;
        let stText = isPass ? 'ناجح' : 'راسب';
        tbody.innerHTML += `
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; text-align:center;">${s.studentName}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; text-align:center;" dir="ltr">${s.studentPhone}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; text-align:center;" dir="ltr">${s.parentPhone || '-'}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; color:#10b981; font-weight:bold; text-align:center;" dir="ltr">${s.score} / ${s.totalQuestions}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; color:${isPass ? '#10b981' : '#ef4444'}; font-weight:bold; text-align:center;">${stText}</td>
            </tr>
        `;
    });

    document.getElementById('pdfExamTitleDisplay').textContent = examTitle;
    const element = document.getElementById('pdfExamReportContent');
    element.style.display = 'block';
    
    html2pdf().set({
        margin: 10, filename: `نتيجة_${examTitle}.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save().then(() => {
        element.style.display = 'none';
    });
}

let allSubmissionsForExams = [];
onSnapshot(query(collection(db, "exam_submissions")), (snap) => {
    allSubmissionsForExams = [];
    snap.forEach(d => allSubmissionsForExams.push({id: d.id, ...d.data()}));
    renderExamsTable(); 
    renderGradingTable();
});

function renderExamsTable() {
    const table = document.getElementById('adminExamsTable');
    if(!table) return; table.innerHTML = '';
    window.currentExamsData.forEach(ex => {
        const studentsCount = allSubmissionsForExams.filter(s => s.examId === ex.id).length;
        table.innerHTML += `<tr>
            <td><strong>${ex.title}</strong></td>
            <td>${ex.questions ? ex.questions.length : 0}</td>
            <td style="color:#10b981; font-weight:900;">${studentsCount} طالب</td>
            <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                <button onclick="exportExamPDF('${ex.id}', '${ex.title}')" style="background:#f59e0b; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="تحميل تقرير PDF"><i class="fas fa-file-pdf"></i></button>
                <button onclick="editExam('${ex.id}')" style="background:rgba(59,130,246,0.1); color:#3b82f6; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteExam('${ex.id}')" style="background:rgba(239,68,68,0.1); color:#ef4444; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

window.editExam = async function(id) {
    const docSnap = await getDoc(doc(db, "exams", id));
    if(docSnap.exists()) {
        const ex = docSnap.data();
        document.getElementById('editingExamId').value = id;
        document.getElementById('examTitle').value = ex.title;
        document.getElementById('questionsContainer').innerHTML = ''; questionCount = 0;
        ex.questions.forEach(q => {
            document.getElementById('btnAddQuestion').click();
            const box = document.getElementById(`qBox_${questionCount}`);
            box.querySelector('.q-type').value = q.type; box.querySelector('.q-text').value = q.text;
            window.toggleQType(questionCount);
            if(q.type === 'mcq') { 
                box.querySelector('.q-opt1').value=q.options[0]; box.querySelector('.q-opt2').value=q.options[1]; 
                box.querySelector('.q-opt3').value=q.options[2]; box.querySelector('.q-opt4').value=q.options[3]; 
                box.querySelector('.q-correct').value=q.correctIndex+1; 
            } else {
                box.querySelector('.q-ai-grade').checked = q.isAiGraded || false;
                box.querySelector('.q-model-answer').value = q.modelAnswer || '';
            }
        });
        document.getElementById('btnCancelExamEdit').style.display = 'inline-block'; window.scrollTo({top:0});
    }
}
document.getElementById('btnCancelExamEdit')?.addEventListener('click', () => { document.getElementById('editingExamId').value=""; document.getElementById('addExamForm').reset(); document.getElementById('questionsContainer').innerHTML=''; questionCount=0; document.getElementById('btnCancelExamEdit').style.display='none'; });

// ==========================================
// 5. سجل المشاهدات والتصحيح 🚨
// ==========================================
window.deleteSubmission = async function(id) {
    if(await adminConfirm("تأكيد مسح النتيجة ليتمكن الطالب من الإعادة؟")) {
        try { await deleteDoc(doc(db, "exam_submissions", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch(e) {}
    }
};

window.viewStudentAnswer = function(answerText) {
    document.getElementById('studentEssayAnswerContent').textContent = answerText || "لم يكتب الطالب إجابة مقالية.";
    document.getElementById('viewAnswerModal').classList.add('active');
};

function renderGradingTable() {
    const table = document.getElementById('adminGradingTable');
    if(!table) return; 
    table.innerHTML = '';
    const sFilter = document.getElementById('filterGradingStatus')?.value || 'all';
    const eFilter = document.getElementById('filterSpecificExam')?.value || 'all';
    let count = 0;

    allSubmissionsForExams.forEach(sub => {
        if (ROLE === 'assistant' && AST_TEACHER && sub.instructor !== AST_TEACHER) return;
        if(sFilter !== 'all' && sub.status !== sFilter) return; 
        if(eFilter !== 'all' && sub.examId !== eFilter) return; 
        
        count++;
        let stText = sub.status === 'passed' ? '<span style="color:#10b981;">ناجح (شاهد)</span>' : (sub.status === 'failed' ? '<span style="color:#ef4444;">راسب (مغلق)</span>' : '<span style="color:#f59e0b;">مراجعة مقالي</span>');
        
        // إظهار لو اتصحح بالـ AI
        if(sub.gradedByAI) stText += '<br><small style="color:#3b82f6;"><i class="fas fa-robot"></i> مصحح بـ AI</small>';
        
        let tText = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-';
        let scoreText = sub.hasEssay && sub.status === 'pending' ? 'مراجعة' : `${sub.score} / ${sub.totalQuestions || 10}`;
        
        table.innerHTML += `<tr>
            <td><strong>${sub.studentName}</strong><br><small style="color:#f59e0b;">ط: ${sub.studentPhone}</small></td>
            <td style="color:#94a3b8; font-size:13px;" dir="ltr">${sub.parentPhone || 'غير مسجل'}</td>
            <td><strong>${sub.courseTitle}</strong><br><small style="color:#94a3b8;">${sub.examTitle}</small></td>
            <td style="font-weight:900; font-size: 18px;">${scoreText}</td>
            <td>${stText}</td>
            <td dir="ltr" style="font-size:12px; color:#94a3b8;">${tText}</td>
            <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                ${sub.hasEssay ? `<button onclick="viewStudentAnswer('${sub.essayAnswer || ''}')" style="background:#f59e0b; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="عرض إجابة المقالي"><i class="fas fa-eye"></i></button>` : ''}
                ${sub.status === 'pending' ? `<button onclick="gradeStudentExam('${sub.id}', ${sub.totalQuestions})" style="background:#10b981; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="إعطاء نجاح للكل"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="editStudentScore('${sub.id}', ${sub.score}, ${sub.totalQuestions || 10}, '${sub.studentPhone}', '${sub.parentPhone}', '${sub.studentName}', '${sub.examTitle}')" style="background:#3b82f6; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="تعديل الدرجة"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSubmission('${sub.id}')" style="background:#ef4444; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="إعادة الامتحان"><i class="fas fa-redo"></i></button>
            </td>
        </tr>`;
    });
    if(count === 0) table.innerHTML=`<tr><td colspan="7" style="text-align:center;">لا توجد بيانات...</td></tr>`;
}
document.getElementById('filterGradingStatus')?.addEventListener('change', renderGradingTable);
document.getElementById('filterSpecificExam')?.addEventListener('change', renderGradingTable);

window.gradeStudentExam = async function(id, total) {
    if(!await adminConfirm("إعطاء الطالب الدرجة النهائية ونجاحه؟")) return;
    try { 
        const subRef = doc(db,"exam_submissions",id);
        const subSnap = await getDoc(subRef);
        if(subSnap.exists()) {
            const d = subSnap.data();
            const newScore = total || 10;
            await updateDoc(subRef, {status:'passed', score:newScore}); 
            
            let waMsg = `مرحباً بك في Primee Academy\nتم تصحيح وتحديث امتحان (${d.examTitle}) لحصة (${d.courseTitle}) للطالب/ة: ${d.studentName}.\nالنتيجة: ناجح ✅\nالدرجة: ${newScore} من ${total || 10}\nتم فتح الحصة للطالب بنجاح.`;
            await sendWhatsAppBoth(d.studentPhone, d.parentPhone, waMsg);
            
            adminAlert("تم", "تم تسجيل النجاح وإرسال رسالة للطالب وولي الأمر", "success");
        }
    } catch(e){}
}

window.editStudentScore = async function(id, cur, total, sPhone, pPhone, sName, exTitle) {
    const n = prompt(`أدخل الدرجة الجديدة (من ${total}):`, cur);
    if(!n) return;
    const num = parseInt(n);
    if(num>=0 && num<=total) { 
        try {
            const subRef = doc(db,"exam_submissions",id);
            let newStatus = num >= (total/2) ? 'passed' : 'failed';
            await updateDoc(subRef, {score:num, status: newStatus});

            let waMsg = `إشعار من Primee Academy\nتم تحديث نتيجة امتحان (${exTitle}) للطالب/ة: ${sName}.\n`;
            if(newStatus === 'passed') waMsg += `النتيجة: ناجح ✅\nالدرجة: ${num} من ${total}`;
            else waMsg += `النتيجة: راسب ❌\nالدرجة: ${num} من ${total}\nالحصة مغلقة الآن.`;
            
            await sendWhatsAppBoth(sPhone, pPhone, waMsg);
            adminAlert("تم", "تم التعديل وإرسال إشعار للطالب وولي الأمر", "success");
        } catch(e) {}
    }
}

// ==========================================
// 🚨 المحفظة (العمليات المالية) 🚨
// ==========================================
let allTransactions = [];
onSnapshot(query(collection(db, "transactions")), (snap) => {
    const table = document.getElementById('adminWalletTable');
    if(!table) return; table.innerHTML = '';
    allTransactions = [];
    snap.forEach(d => allTransactions.push({id: d.id, ...d.data()}));
    
    let filteredTrans = allTransactions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (ROLE === 'assistant' && AST_TEACHER) {
        filteredTrans = filteredTrans.filter(t => t.instructor === AST_TEACHER || t.instructor === "-");
    }

    filteredTrans.forEach(t => {
        let tType = t.type === 'purchase_course' ? '<span style="color:#ef4444;">شراء حصة/باقة</span>' : '<span style="color:#10b981;">شحن رصيد</span>';
        let tDate = new Date(t.createdAt).toLocaleString('ar-EG');
        table.innerHTML += `<tr>
            <td dir="ltr" style="font-size:12px;">${tDate}</td>
            <td><strong>${t.studentName}</strong><br><small style="color:#f59e0b;">${t.studentPhone}</small></td>
            <td>${tType}</td>
            <td style="font-weight:900;" dir="ltr">${t.amount} ج.م</td>
            <td><strong>${t.courseTitle}</strong><br><small style="color:#3b82f6;">أ. ${t.instructor}</small></td>
        </tr>`;
    });
});

// ==========================================
// 🚨 تقرير المدرس التفصيلي (PDF) 🚨
// ==========================================
document.getElementById('btnGenerateReport')?.addEventListener('click', async () => {
    const teacher = document.getElementById('reportTeacherSelect').value;
    const period = document.getElementById('reportPeriodSelect').value;
    if(!teacher) return adminAlert("خطأ", "اختر المدرس أولاً", "error");

    adminAlert("جاري التحضير", "يتم تجميع التفاصيل المالية...", "success");

    let filtered = allTransactions.filter(t => t.instructor === teacher && t.type === 'purchase_course');
    let now = new Date();
    if(period === 'current_month') {
        filtered = filtered.filter(t => new Date(t.createdAt).getMonth() === now.getMonth() && new Date(t.createdAt).getFullYear() === now.getFullYear());
    } else if(period === 'last_month') {
        let lastMonth = now.getMonth() - 1;
        let y = now.getFullYear();
        if(lastMonth < 0) { lastMonth = 11; y--; }
        filtered = filtered.filter(t => new Date(t.createdAt).getMonth() === lastMonth && new Date(t.createdAt).getFullYear() === y);
    }

    // تجميع المبيعات لكل كورس/باقة
    let salesDetails = {};
    let totalRev = 0;
    let studentsSet = new Set();
    
    filtered.forEach(t => {
        let amt = Math.abs(t.amount);
        totalRev += amt;
        studentsSet.add(t.studentPhone);
        
        if(!salesDetails[t.courseTitle]) {
            salesDetails[t.courseTitle] = { count: 0, revenue: 0, price: amt };
        }
        salesDetails[t.courseTitle].count += 1;
        salesDetails[t.courseTitle].revenue += amt;
    });

    let detailsHtml = '';
    for(let title in salesDetails) {
        detailsHtml += `<tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000;">حصة/باقة</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; font-weight:bold;">${title}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; text-align:center;">${salesDetails[title].count}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color:#000; text-align:center;">${salesDetails[title].price} ج.م</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color:#10b981; font-weight:bold; text-align:center;">${salesDetails[title].revenue} ج.م</td>
        </tr>`;
    }
    if(Object.keys(salesDetails).length === 0) detailsHtml = `<tr><td colspan="5" style="text-align:center;">لا توجد مبيعات في هذه الفترة</td></tr>`;
    
    document.getElementById('pdfDetailedSalesBody').innerHTML = detailsHtml;

    document.getElementById('pdfTeacherName').textContent = teacher;
    document.getElementById('pdfPeriod').textContent = document.getElementById('reportPeriodSelect').options[document.getElementById('reportPeriodSelect').selectedIndex].text;
    document.getElementById('pdfTotalRevenue').textContent = totalRev + " ج.م";
    document.getElementById('pdfGenerateDate').textContent = new Date().toLocaleString('ar-EG');
    
    // المحافظات
    let govCounts = {};
    studentsSet.forEach(phone => {
        let s = allStudentsData.find(st => st.studentPhone === phone);
        if(s) {
            let g = s.governorate || "غير محدد";
            govCounts[g] = (govCounts[g] || 0) + 1;
        }
    });

    let govHtml = '';
    for(let g in govCounts) {
        govHtml += `<tr><td style="padding:10px; border:1px solid #cbd5e1; color:#000;">${g}</td><td style="padding:10px; border:1px solid #cbd5e1; color:#000;">${govCounts[g]}</td></tr>`;
    }
    document.getElementById('pdfGovTableBody').innerHTML = govHtml || `<tr><td colspan="2" style="text-align:center;">لا توجد مبيعات</td></tr>`;

    const element = document.getElementById('pdfReportContent');
    element.style.display = 'block';
    
    html2pdf().set({
        margin: 10, filename: `تقرير_مفصل_${teacher}.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save().then(() => {
        element.style.display = 'none';
    });
});

// 7. مصنع الأكواد
const codesRef = collection(db, "charge_codes");
let allCodesData = [];

window.deleteCode = async function(id) {
    if(await adminConfirm("تأكيد حذف الكود؟")) {
        try { await deleteDoc(doc(db, "charge_codes", id)); adminAlert("تم", "تم حذف الكود", "success"); } 
        catch(e) {}
    }
};

function generateAlphanumericCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

document.getElementById('generateCodesForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const count = parseInt(document.getElementById('codesCount').value);
    const price = parseInt(document.getElementById('codePrice').value);
    const delegate = document.getElementById('codeDelegate').value.trim();
    const btn = document.getElementById('btnGenerateCodes');
    btn.innerHTML = "جاري التوليد... ⏳"; btn.disabled = true;

    try {
        const batchDate = new Date().toISOString();
        let csv = "\uFEFFالكود,القيمة,المندوب,النوع\n";
        for (let i = 0; i < count; i++) {
            const uniqueCode = generateAlphanumericCode();
            csv += `${uniqueCode},${price},${delegate},wallet\n`; 
            await addDoc(codesRef, {
                code: uniqueCode, value: price, delegate: delegate, type: 'wallet',
                isUsed: false, usedByPhone: null, usedByName: null, usedAt: null, createdAt: batchDate
            });
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `أكواد_${delegate}_${count}كود.csv`; link.click();
        adminAlert("تم", "تم التوليد وتحميل الإكسيل", "success");
        document.getElementById('generateCodesForm').reset();
    } catch(err) {} finally { btn.innerHTML = "<i class='fas fa-cogs'></i> توليد وتحميل إكسيل للأكواد"; btn.disabled = false; }
});

onSnapshot(query(codesRef), (snapshot) => {
    allCodesData = [];
    snapshot.forEach(docSnap => allCodesData.push({ id: docSnap.id, ...docSnap.data() }));
    renderCodesTable();
});

function renderCodesTable() {
    const table = document.getElementById('adminCodesTable');
    if(!table) return; table.innerHTML = '';
    const searchTerm = document.getElementById('searchCodeInput')?.value.toUpperCase() || '';
    const filterStatus = document.getElementById('filterCodeStatus')?.value || 'all';

    allCodesData.forEach(c => {
        if (filterStatus === 'used' && !c.isUsed) return;
        if (filterStatus === 'unused' && c.isUsed) return;
        if (searchTerm && !c.code.includes(searchTerm) && !c.delegate.toUpperCase().includes(searchTerm)) return;

        let stText = c.isUsed ? `<span style="color:#ef4444;">${c.usedByName} (${c.usedByPhone})</span>` : `<span style="color:#10b981;">جديد</span>`;
        let tText = c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : '-';
        table.innerHTML += `<tr>
            <td style="font-family: monospace; font-size:16px; font-weight:900; color:#f59e0b;">${c.code}</td>
            <td>${c.value} ج</td>
            <td>${c.delegate}</td>
            <td>${stText}</td>
            <td>${tText}</td>
            <td><button onclick="deleteCode('${c.id}')" style="background: rgba(239,68,68,0.1); color:#ef4444; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
}
document.getElementById('searchCodeInput')?.addEventListener('input', renderCodesTable);
document.getElementById('filterCodeStatus')?.addEventListener('change', renderCodesTable);

document.getElementById('btnExportAllCodes')?.addEventListener('click', () => {
    let csv = "\uFEFFالكود,القيمة,المندوب,الحالة,الطالب,رقم الطالب\n";
    allCodesData.forEach(c => csv += `${c.code},${c.value},${c.delegate},${c.isUsed?'مستخدم':'جديد'},${c.usedByName||'-'},${c.usedByPhone||'-'}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `سجل_الأكواد.csv`; link.click();
});

// 🚨 قسم البرومو كود 🚨
const promoCodesRef = collection(db, "promo_codes");
document.getElementById('addPromoCodeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSavePromoCode');
    btn.innerHTML = "جاري الحفظ... ⏳"; btn.disabled = true;

    try {
        await addDoc(promoCodesRef, {
            code: document.getElementById('promoCodeString').value.toUpperCase().trim(),
            discount: parseInt(document.getElementById('promoCodeDiscount').value),
            expiry: document.getElementById('promoCodeExpiry').value,
            createdAt: new Date().toISOString()
        });
        adminAlert("تم", "تم إنشاء البرومو كود", "success");
        document.getElementById('addPromoCodeForm').reset();
    } catch(err) {} finally { btn.innerHTML = "<i class='fas fa-plus'></i> إنشاء البرومو كود"; btn.disabled = false; }
});

window.deletePromoCode = async function(id) {
    if(await adminConfirm("تأكيد مسح البرومو كود؟")) {
        try { await deleteDoc(doc(db, "promo_codes", id)); } catch(e) {}
    }
}

onSnapshot(query(promoCodesRef), (snap) => {
    const table = document.getElementById('adminPromoCodesTable');
    if(!table) return; table.innerHTML = '';
    snap.forEach(docSnap => {
        const p = docSnap.data();
        let isExpired = new Date() > new Date(p.expiry);
        let color = isExpired ? '#ef4444' : '#10b981';
        table.innerHTML += `<tr>
            <td style="font-family:monospace; font-weight:900; color:#d946ef; font-size:18px;">${p.code}</td>
            <td>${p.discount}%</td>
            <td style="color:${color}; font-weight:bold;" dir="ltr">${p.expiry}</td>
            <td><button onclick="deletePromoCode('${docSnap.id}')" style="background: rgba(239,68,68,0.1); color:#ef4444; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
});

// 8. إدارة الباقات (تعديل إضافة مقاطع الباقة)
const packagesRef = collection(db, "packages");

window.deletePackage = async function(id) {
    if(await adminConfirm("تأكيد حذف الباقة نهائياً؟")) {
        try { await deleteDoc(doc(db, "packages", id)); adminAlert("تم", "تم المسح بنجاح", "success"); } 
        catch(e) { adminAlert("خطأ", "فشل المسح", "error"); }
    }
};

document.getElementById('addPackageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSavePackage');
    const editingId = document.getElementById('editingPkgId').value;
    btn.innerHTML = editingId ? "جاري التحديث والرفع... ⏳" : "جاري إنشاء الباقة... ⏳"; 
    btn.disabled = true;

    try {
        let imageUrl = null;
        const imageFile = document.getElementById('pkgImage').files[0];
        if(imageFile) imageUrl = await uploadImageToR2(imageFile);

        let newVideosArray = []; 
        const videoRows = document.querySelectorAll('#packageVideosContainer .video-row');
        let hasVideosToUpload = false;
        videoRows.forEach(row => { if(row.querySelector('.pkg-video-file').files.length > 0) hasVideosToUpload = true; });

        if(hasVideosToUpload) {
            document.getElementById('pkgVideoProgressContainer').style.display = 'block';
            for (let i = 0; i < videoRows.length; i++) {
                const titleInput = videoRows[i].querySelector('.pkg-video-title');
                const fileInput = videoRows[i].querySelector('.pkg-video-file');
                const examSelect = videoRows[i].querySelector('.pkg-video-exam');
                if(fileInput.files.length > 0) {
                    document.getElementById('pkgVideoStatus').textContent = `جاري الرفع (${i + 1})...`;
                    let vUrl = await uploadToVimeo(fileInput.files[0], (p) => {
                        document.getElementById('pkgVideoProgressBar').style.width = p + '%';
                    });
                    newVideosArray.push({ 
                        title: titleInput.value.trim() || `مقطع ${i + 1}`,
                        url: vUrl, 
                        requiredExamId: examSelect.value || null 
                    });
                }
            }
            document.getElementById('pkgVideoStatus').textContent = `تم الرفع بنجاح ✔️`;
        }

        const pkgData = {
            name: document.getElementById('pkgName').value,
            grade: document.getElementById('pkgGrade').value,
            oldPrice: parseInt(document.getElementById('pkgOldPrice').value) || 0,
            newPrice: parseInt(document.getElementById('pkgNewPrice').value) || 0,
            features: document.getElementById('pkgFeatures').value.split(','),
            maxViews: parseInt(document.getElementById('pkgMaxViews').value) || 0
        };
        if(imageUrl) pkgData.imageUrl = imageUrl;

        if (editingId) {
            const existingDoc = await getDoc(doc(db, "packages", editingId));
            let currentVideos = existingDoc.data().videos || [];
            pkgData.videos = [...currentVideos, ...newVideosArray];
            await updateDoc(doc(db, "packages", editingId), pkgData);
            document.getElementById('btnCancelPkgEdit').click();
            adminAlert("تم", "تم التحديث بنجاح", "success");
        } else {
            if(!imageUrl && !editingId) throw new Error("يجب رفع صورة غلاف");
            pkgData.videos = newVideosArray;
            pkgData.createdAt = new Date().toISOString();
            pkgData.views = 0;
            await addDoc(packagesRef, pkgData);
            document.getElementById('addPackageForm').reset();
            document.getElementById('packageVideosContainer').innerHTML = '';
            adminAlert("تم", "تم إنشاء الباقة بنجاح", "success");
        }
    } catch(err) { adminAlert("خطأ", err.message, "error"); } 
    finally { btn.innerHTML = "<i class='fas fa-plus'></i> حفظ ونشر الباقة"; btn.disabled = false; document.getElementById('pkgVideoProgressContainer').style.display = 'none'; }
});

onSnapshot(query(packagesRef), (snapshot) => {
    const table = document.getElementById('adminPackagesTable');
    if(!table) return; table.innerHTML = '';
    snapshot.forEach(docSnap => {
        const pkg = docSnap.data();
        let enrolledCount = allStudentsData.filter(s => s.myCourses && s.myCourses.includes(docSnap.id)).length;
        
        table.innerHTML += `<tr>
            <td><img src="${pkg.imageUrl}" style="width:40px; border-radius:8px; vertical-align:middle;"> <strong>${pkg.name}</strong></td>
            <td>${pkg.grade}</td>
            <td><span style="text-decoration:line-through; color:#ef4444; font-size:12px;">${pkg.oldPrice}</span> <strong style="color:#10b981;">${pkg.newPrice} ج.م</strong></td>
            <td><span style="color:#f59e0b; font-weight:900;">${enrolledCount} مشترك</span></td>
            <td style="display:flex; gap:5px; justify-content:center;">
                <button onclick="exportCourseExcel('${docSnap.id}', '${pkg.name}')" style="background:#10b981; color:#fff; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-file-excel"></i></button>
                <button onclick="editPackage('${docSnap.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border:none; padding: 4px 8px; border-radius: 6px; cursor: pointer;" title="تعديل"><i class="fas fa-edit"></i></button>
                <button onclick="deletePackage('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border:none; padding: 4px 8px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
});

window.editPackage = async function(id) {
    const docSnap = await getDoc(doc(db, "packages", id));
    if(docSnap.exists()) {
        const p = docSnap.data();
        document.getElementById('editingPkgId').value = id;
        document.getElementById('pkgName').value = p.name || '';
        document.getElementById('pkgGrade').value = p.grade || '';
        document.getElementById('pkgOldPrice').value = p.oldPrice || '';
        document.getElementById('pkgNewPrice').value = p.newPrice || '';
        document.getElementById('pkgFeatures').value = p.features ? p.features.join(',') : '';
        document.getElementById('pkgMaxViews').value = p.maxViews || 0;
        document.getElementById('btnSavePackage').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات وإضافة المقاطع';
        document.getElementById('btnCancelPkgEdit').style.display = 'block';
        window.scrollTo({top: document.getElementById('addPackageForm').offsetTop - 50, behavior: 'smooth'});
    }
};

document.getElementById('btnCancelPkgEdit')?.addEventListener('click', () => {
    document.getElementById('editingPkgId').value = "";
    document.getElementById('addPackageForm').reset();
    document.getElementById('packageVideosContainer').innerHTML = '';
    document.getElementById('btnSavePackage').innerHTML = '<i class="fas fa-plus"></i> حفظ ونشر الباقة';
    document.getElementById('btnCancelPkgEdit').style.display = 'none';
});

// 9. إدارة المساعدين
const assistantsRef = collection(db, "assistants");
let editingAssistantId = null;

window.deleteAssistant = async function(id) {
    if(await adminConfirm("تأكيد مسح المساعد؟")) {
        try { await deleteDoc(doc(db, "assistants", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch(e) {}
    }
};

document.getElementById('addAssistantForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveAssistant');
    btn.innerHTML = "جاري الحفظ... ⏳"; btn.disabled = true;

    try {
        const perms = [];
        document.querySelectorAll('.ast-perm:checked').forEach(cb => perms.push(cb.value));

        const astData = {
            name: document.getElementById('astName').value,
            username: document.getElementById('astUsername').value,
            password: document.getElementById('astPassword').value,
            targetTeacher: document.getElementById('astTeacher').value, 
            permissions: perms, 
            role: "assistant"
        };

        if(editingAssistantId) {
            await updateDoc(doc(db, "assistants", editingAssistantId), astData);
            editingAssistantId = null;
        } else {
            astData.createdAt = new Date().toISOString();
            await addDoc(assistantsRef, astData);
        }
        
        adminAlert("تم", "تم حفظ بيانات المساعد بنجاح", "success");
        document.getElementById('addAssistantForm').reset();
    } catch(err) { adminAlert("خطأ", "فشل الحفظ", "error"); }
    finally { btn.innerHTML = "<i class='fas fa-check'></i> حفظ بيانات المساعد"; btn.disabled = false; }
});

onSnapshot(query(assistantsRef), (snapshot) => {
    const table = document.getElementById('adminAssistantsTable');
    if(!table) return; table.innerHTML = '';
    snapshot.forEach(docSnap => {
        const ast = docSnap.data();
        table.innerHTML += `<tr>
            <td><strong>${ast.name}</strong></td>
            <td style="color:#f59e0b; font-family:monospace;">${ast.username}</td>
            <td><span style="background:rgba(59,130,246,0.1); color:#3b82f6; padding:3px 8px; border-radius:5px;">${ast.targetTeacher}</span></td>
            <td style="display:flex; gap:5px; justify-content:center;">
                <button onclick="deleteAssistant('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
});
