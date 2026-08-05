import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import * as tus from "https://cdn.skypack.dev/tus-js-client";
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
// جلب مفاتيح الأمان
// ==========================================
let SECURE_API_KEYS = null;
async function getSecureApiKeys() {
    if (SECURE_API_KEYS) return SECURE_API_KEYS; 
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (docSnap.exists()) {
            SECURE_API_KEYS = docSnap.data();
            return SECURE_API_KEYS;
        }
    } catch (e) {} return null;
}

// ==========================================
// واتساب WaPilot
// ==========================================
// ==========================================
// إرسال واتساب (WaPilot API المعتمد)
// ==========================================
async function sendWhatsAppToParent(parentPhone, msgText) {
    if(!parentPhone || parentPhone === "غير متوفر") return;
    
    const keys = await getSecureApiKeys();
    if (!keys || !keys.wapilot_instance || !keys.wapilot_token) return;

    const instanceId = keys.wapilot_instance; 
    const token = keys.wapilot_token;
    
    // تظبيط الرقم وإضافة @c.us زي ما الـ API بيطلب
    let formattedPhone = parentPhone.startsWith('0') ? '2' + parentPhone : parentPhone;
    let chatId = formattedPhone + "@c.us";
    
    var url = "https://api.wapilot.net/api/v2/" + instanceId + "/send-message";
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: msgText
            })
        });
        console.log("تم إرسال إشعار الواتساب عبر WaPilot بنجاح.");
    } catch(err) { 
        console.error("فشل إرسال الواتساب:", err); 
    }
}

// ==========================================
// حماية الصفحة والتنبيهات
// ==========================================
if (localStorage.getItem('adminLoggedIn') !== 'true') window.location.replace('admin-login.html');
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.replace('admin-login.html'); });

function adminAlert(title, msg, type = 'success') {
    const modal = document.getElementById('customAdminAlert');
    if(!modal) return;
    const icon = document.getElementById('adminAlertIcon');
    document.getElementById('adminAlertTitle').textContent = title;
    document.getElementById('adminAlertMsg').textContent = msg;
    icon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
    modal.classList.add('active');
}
function adminConfirm(msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAdminConfirm');
        if(!modal) resolve(true);
        document.getElementById('adminConfirmMsg').textContent = msg;
        modal.classList.add('active');
        document.getElementById('btnConfirmYes').onclick = () => { modal.classList.remove('active'); resolve(true); };
        document.getElementById('btnConfirmNo').onclick = () => { modal.classList.remove('active'); resolve(false); };
    });
}
function showLiveToast(msg) {
    const toast = document.getElementById('liveToast');
    if(!toast) return;
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
document.getElementById('enableSoundBtn')?.addEventListener('click', function() {
    notificationSound.play().catch(()=>{});
    this.innerHTML = '<i class="fas fa-check-circle"></i> تم تفعيل الصوت';
    this.style.background = 'rgba(16, 185, 129, 0.1)';
    this.style.color = '#10b981';
});

// ==========================================
// 1. مراقبة الطلاب والأرباح (التاريخ الحقيقي)
// ==========================================
let isInitialLoad = true; 
const usersRef = collection(db, "users");

onSnapshot(query(usersRef), (snapshot) => {
    document.getElementById('totalStudentsCount').textContent = snapshot.size;
    let totalRev = 0;
    const studentsArray = [];

    snapshot.forEach((doc) => { 
        const data = doc.data();
        studentsArray.push({id: doc.id, ...data});
        if(data.walletBalance) totalRev += parseInt(data.walletBalance);
    });
    document.getElementById('totalRevenue').textContent = totalRev + ' ج.م';

    snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
            notificationSound.play().catch(()=>{});
            showLiveToast(change.doc.data().fullName || "طالب جديد");
        }
    });
    
    const tableBody = document.getElementById('recentStudentsTable');
    if(tableBody) {
        tableBody.innerHTML = '';
        studentsArray.reverse().slice(0, 10).forEach(student => {
            const tr = document.createElement('tr');
            let timeText = 'غير محدد';
            if (student.createdAt) {
                try {
                    const d = new Date(student.createdAt);
                    timeText = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                } catch(e){}
            }
            tr.innerHTML = `
                <td><strong>${student.fullName || '-'}</strong></td>
                <td style="color: #f59e0b;">${student.studentPhone || '-'}</td>
                <td>${student.grade || '-'}</td>
                <td>${student.walletBalance > 0 ? `<span style="color:#10b981;">${student.walletBalance} ج.م</span>` : `0 ج.م`}</td>
                <td style="color: #94a3b8; font-size: 13px;" dir="ltr">${timeText}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
    isInitialLoad = false;
});

// ==========================================
// 2. إدارة الطلاب
// ==========================================
let currentStudentId = null;
let currentStudentData = null;
document.getElementById('btnSearchStudent')?.addEventListener('click', async () => {
    const phone = document.getElementById('searchPhoneInput').value.trim();
    if(!phone) return adminAlert("خطأ", "أدخل رقم الهاتف!", "error");
    document.getElementById('btnSearchStudent').innerHTML = 'جاري...';
    try {
        const querySnapshot = await getDocs(query(usersRef, where("studentPhone", "==", phone)));
        if(querySnapshot.empty) {
            adminAlert("عذراً", "لا يوجد طالب بهذا الرقم", "error");
        } else {
            const studentDoc = querySnapshot.docs[0];
            currentStudentId = studentDoc.id;
            currentStudentData = studentDoc.data();
            document.getElementById('resStudentName').textContent = currentStudentData.fullName;
            document.getElementById('resStudentPhone').textContent = currentStudentData.studentPhone;
            document.getElementById('resParentPhone').textContent = currentStudentData.parentPhone || "غير متوفر";
            document.getElementById('resStudentGrade').textContent = currentStudentData.grade || '-';
            document.getElementById('resStudentWallet').textContent = (currentStudentData.walletBalance || 0) + ' ج.م';
            
            const statusSpan = document.getElementById('resStudentStatus');
            const btnToggleBlock = document.getElementById('btnToggleBlock');
            if(currentStudentData.isBlocked) {
                statusSpan.textContent = 'محظور ⛔'; statusSpan.style.color = '#ef4444';
                btnToggleBlock.innerHTML = '<i class="fas fa-unlock"></i> فك الحظر';
                btnToggleBlock.style.color = '#10b981'; btnToggleBlock.style.borderColor = '#10b981'; btnToggleBlock.style.background = 'rgba(16, 185, 129, 0.1)';
            } else {
                statusSpan.textContent = 'نشط 🟢'; statusSpan.style.color = '#10b981';
                btnToggleBlock.innerHTML = '<i class="fas fa-ban"></i> حظر الطالب';
                btnToggleBlock.style.color = '#ef4444'; btnToggleBlock.style.borderColor = '#ef4444'; btnToggleBlock.style.background = 'rgba(239, 68, 68, 0.1)';
            }
            document.getElementById('studentResultCard').style.display = 'block';
        }
    } catch(error) { console.error(error); } 
    finally { document.getElementById('btnSearchStudent').innerHTML = '<i class="fas fa-search"></i> بحث'; }
});

document.getElementById('btnChargeWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح", "error");
    try {
        const newBalance = (parseInt(currentStudentData.walletBalance) || 0) + amount; 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم", "تم الشحن بنجاح", "success");
    } catch(e) {}
});

document.getElementById('btnDeductWallet')?.addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('chargeAmount').value);
    if(!amount || amount <= 0) return adminAlert("خطأ", "أدخل مبلغ صحيح", "error");
    const currentBalance = parseInt(currentStudentData.walletBalance) || 0;
    if(!await adminConfirm(`تأكيد خصم ${amount}؟`)) return;
    try {
        const newBalance = Math.max(0, currentBalance - amount); 
        await updateDoc(doc(db, "users", currentStudentId), { walletBalance: newBalance });
        currentStudentData.walletBalance = newBalance;
        document.getElementById('resStudentWallet').textContent = newBalance + ' ج.م';
        document.getElementById('chargeAmount').value = '';
        adminAlert("تم", "تم الخصم بنجاح", "success");
    } catch(e) {}
});

// ==========================================
// 3. إدارة المدرسين (Teachers)
// ==========================================
const teachersRef = collection(db, "teachers");

document.getElementById('addTeacherForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveTeacher');
    btn.innerHTML = "جاري الرفع... ⏳"; btn.disabled = true;

    try {
        const selectStages = document.getElementById('teacherStages');
        const selectedStages = Array.from(selectStages.selectedOptions).map(opt => opt.value).join(', ');

        const imageFile = document.getElementById('teacherImage').files[0];
        let imageUrl = await uploadImageToImgBB(imageFile);

        await addDoc(teachersRef, {
            name: document.getElementById('teacherName').value.trim(),
            subject: document.getElementById('teacherSubject').value.trim(),
            stages: selectedStages,
            imageUrl: imageUrl,
            createdAt: new Date().toISOString()
        });
        adminAlert("تم", "تم إضافة المدرس بنجاح", "success");
        document.getElementById('addTeacherForm').reset();
    } catch(err) { adminAlert("خطأ", "فشل الرفع", "error"); }
    finally { btn.innerHTML = "<i class='fas fa-plus'></i> إضافة المدرس"; btn.disabled = false; }
});

onSnapshot(query(teachersRef), (snapshot) => {
    const table = document.getElementById('adminTeachersTable');
    const selectInstructor = document.getElementById('courseInstructor');
    if(table) table.innerHTML = '';
    if(selectInstructor) selectInstructor.innerHTML = '<option value="" disabled selected>اختر المدرس</option>';

    snapshot.forEach(docSnap => {
        const t = docSnap.data();
        if(table) {
            table.innerHTML += `<tr>
                <td><img src="${t.imageUrl}" style="width:30px; height:30px; border-radius:50%; margin-left:10px; vertical-align:middle;"><strong>${t.name}</strong></td>
                <td>${t.subject}</td>
                <td>${t.stages}</td>
                <td><button onclick="deleteDoc(doc(db, 'teachers', '${docSnap.id}'))" style="background: rgba(239,68,68,0.1); color:#ef4444; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        }
        if(selectInstructor) selectInstructor.innerHTML += `<option value="${t.name}">${t.name} (${t.subject})</option>`;
    });
});

// ==========================================
// 4. إدارة الكورسات (Vimeo + ImgBB)
// ==========================================
const coursesRef = collection(db, "courses");

async function uploadImageToImgBB(file) {
    const keys = await getSecureApiKeys(); 
    if(!keys || !keys.imgbb_token) throw new Error("مفتاح ImgBB مفقود");
    const formData = new FormData(); formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${keys.imgbb_token}`, { method: "POST", body: formData });
    const data = await res.json();
    if(data.success) return data.data.url; else throw new Error("فشل رفع الصورة");
}

async function uploadToVimeo(file, progressCallback) {
    const keys = await getSecureApiKeys();

    if (!keys || !keys.vimeo_token) {
        throw new Error("مفتاح Vimeo غير موجود");
    }

    // إنشاء عملية رفع جديدة في Vimeo
    const createResponse = await fetch("https://api.vimeo.com/me/videos", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${keys.vimeo_token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.vimeo.*+json;version=3.4"
        },
        body: JSON.stringify({
            upload: {
                approach: "tus",
                size: file.size.toString()
            }
        })
    });

    if (!createResponse.ok) {
        const txt = await createResponse.text();
        throw new Error(txt);
    }

    const video = await createResponse.json();

    return new Promise((resolve, reject) => {

        const upload = new tus.Upload(file, {

            uploadUrl: video.upload.upload_link,

            retryDelays: [0,3000,5000,10000,20000],

            headers: {
                Authorization: `Bearer ${keys.vimeo_token}`
            },

            metadata: {
                filename: file.name,
                filetype: file.type
            },

            onError(error){
                reject(error);
            },

            onProgress(bytesUploaded, bytesTotal){

                const percentage =
                ((bytesUploaded / bytesTotal) * 100).toFixed(2);

                progressCallback(percentage);
            },

            async onSuccess(){

                // نشر الفيديو بعد انتهاء الرفع
                await fetch(video.uri,{
                    method:"PATCH",
                    headers:{
                        Authorization:`Bearer ${keys.vimeo_token}`,
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        privacy:{
                            view:"disable"
                        }
                    })
                });

                resolve(
                    "https://player.vimeo.com/video/" +
                    video.uri.split("/").pop()
                );
            }

        });

        upload.start();

    });
}

document.getElementById('addCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveCourse');
    const editingId = document.getElementById('editingCourseId').value;
    btn.textContent = editingId ? 'جاري التعديل...' : 'جاري الرفع...'; btn.disabled = true;

    try {
        let imageUrl = null, videoUrl = null;
        const imageFile = document.getElementById('courseImageFile').files[0];
        const videoFile = document.getElementById('courseVideoFile').files[0];

        if(imageFile) imageUrl = await uploadImageToImgBB(imageFile);
        if(videoFile) {
            document.getElementById('videoProgressContainer').style.display = 'block';
            videoUrl = await uploadToVimeo(videoFile, (p) => {
                document.getElementById('videoProgressBar').style.width = p + '%';
                document.getElementById('videoStatus').textContent = `الرفع: ${p}%`;
            });
        }

        const courseData = {
            title: document.getElementById('courseTitle').value.trim(),
            instructor: document.getElementById('courseInstructor').value,
            grade: document.getElementById('courseGrade').value,
            price: parseInt(document.getElementById('coursePrice').value) || 0,
            requiredExamId: document.getElementById('requiredExamSelect').value,
            pdfUrl: document.getElementById('coursePdf').value.trim()
        };
        if(imageUrl) courseData.image = imageUrl;
        if(videoUrl) courseData.videoUrl = videoUrl;

        if(editingId) {
            await updateDoc(doc(db, "courses", editingId), courseData);
            document.getElementById('btnCancelEdit').click();
        } else {
            if(!imageUrl || !videoUrl) throw new Error("يجب رفع صورة وفيديو");
            courseData.createdAt = new Date().toISOString();
            await addDoc(coursesRef, courseData);
            document.getElementById('addCourseForm').reset();
        }
        adminAlert("تم", "تم حفظ الحصة بنجاح", "success");
    } catch(err) { adminAlert("خطأ", err.message, "error"); }
    finally { btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة'; btn.disabled = false; document.getElementById('videoProgressContainer').style.display = 'none'; }
});

onSnapshot(query(coursesRef), (snapshot) => {
    const table = document.getElementById('adminCoursesTable');
    if(!table) return; table.innerHTML = '';
    snapshot.forEach(docSnap => {
        const c = docSnap.data();
        table.innerHTML += `<tr>
            <td><strong>${c.title}</strong></td>
            <td>${c.instructor}</td>
            <td>${c.grade}</td>
            <td>${c.requiredExamId ? '<span style="color:#ef4444;">مقفول</span>' : '<span style="color:#10b981;">مفتوح</span>'}</td>
            <td>
                <button onclick="editCourse('${docSnap.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; padding: 5px; border-radius: 5px; cursor: pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteDoc(doc(db, 'courses', '${docSnap.id}'))" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 5px; border-radius: 5px; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
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
        document.getElementById('requiredExamSelect').value = c.requiredExamId || "";
        document.getElementById('btnSaveCourse').innerHTML = 'حفظ التعديلات';
        document.getElementById('btnCancelEdit').style.display = 'block';
        window.scrollTo({top:0});
    }
}
document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('addCourseForm').reset();
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
});

// ==========================================
// 5. إدارة الامتحانات (وواتساب المجمع والإكسيل)
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;
let allSubmissionsForExams = [];

// جلب كل الإجابات مرة واحدة لسرعة الإحصائيات
onSnapshot(query(collection(db, "exam_submissions")), (snap) => {
    allSubmissionsForExams = [];
    snap.forEach(d => allSubmissionsForExams.push(d.data()));
});

window.toggleQType = function(id) {
    const type = document.getElementById(`qType_${id}`).value;
    document.getElementById(`mcqContainer_${id}`).style.display = type === 'mcq' ? 'block' : 'none';
}

document.getElementById('btnAddQuestion')?.addEventListener('click', () => {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    container.insertAdjacentHTML('beforeend', `
        <div class="question-box" id="qBox_${questionCount}" style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h5 style="color: #f59e0b; margin: 0;">سؤال ${questionCount}</h5>
                <button type="button" onclick="document.getElementById('qBox_${questionCount}').remove()" style="color: #ef4444; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <select class="q-type form-group-admin" id="qType_${questionCount}" onchange="toggleQType(${questionCount})" style="padding: 10px; border-radius: 8px;"><option value="mcq">اختياري</option><option value="essay">مقالي</option></select>
                <input type="file" class="q-image" accept="image/*" style="padding: 5px;">
            </div>
            <textarea class="q-text" placeholder="اكتب السؤال..." style="width: 100%; padding: 12px; border-radius: 8px; margin-bottom: 15px;" required></textarea>
            <div class="q-mcq-container" id="mcqContainer_${questionCount}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="q-opt1" placeholder="اختيار 1" style="padding:10px; border-radius:8px;"><input type="text" class="q-opt2" placeholder="اختيار 2" style="padding:10px; border-radius:8px;">
                    <input type="text" class="q-opt3" placeholder="اختيار 3" style="padding:10px; border-radius:8px;"><input type="text" class="q-opt4" placeholder="اختيار 4" style="padding:10px; border-radius:8px;">
                </div>
                <select class="q-correct" style="width: 100%; padding: 10px; border-radius: 8px;"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>
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
            let imageUrl = imageFile ? await uploadImageToImgBB(imageFile) : null;
            if (type === 'mcq') qs.push({ type:'mcq', text:text, imageUrl:imageUrl, options:[box.querySelector('.q-opt1').value, box.querySelector('.q-opt2').value, box.querySelector('.q-opt3').value, box.querySelector('.q-opt4').value], correctIndex: parseInt(box.querySelector('.q-correct').value)-1 });
            else qs.push({ type:'essay', text:text, imageUrl:imageUrl });
        }
        const data = { title: document.getElementById('examTitle').value, questions: qs };
        if(editingId) { await updateDoc(doc(db, "exams", editingId), data); document.getElementById('btnCancelExamEdit').click(); }
        else { data.createdAt = new Date().toISOString(); await addDoc(examsRef, data); document.getElementById('addExamForm').reset(); document.getElementById('questionsContainer').innerHTML=''; questionCount=0; }
        adminAlert("تم", "تم الحفظ", "success");
    } catch(e) {} finally { btn.innerHTML = '<i class="fas fa-save"></i> حفظ'; btn.disabled = false; }
});

onSnapshot(query(examsRef), (snapshot) => {
    const table = document.getElementById('adminExamsTable');
    const select = document.getElementById('requiredExamSelect');
    const filter = document.getElementById('filterSpecificExam');
    if(table) table.innerHTML = '';
    if(select) select.innerHTML = '<option value="">بدون امتحان</option>';
    if(filter) filter.innerHTML = '<option value="all">كل الامتحانات</option>';

    snapshot.forEach(docSnap => {
        const ex = docSnap.data(); const exId = docSnap.id;
        
        // حساب عدد الطلاب اللي امتحنوا
        const studentsCount = allSubmissionsForExams.filter(s => s.examId === exId).length;

        if(table) {
            table.innerHTML += `<tr>
                <td><strong>${ex.title}</strong></td>
                <td>${ex.questions.length}</td>
                <td style="color:#10b981; font-weight:900;">${studentsCount} طالب</td>
                <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                    <button onclick="downloadExamExcel('${exId}', '${ex.title}')" style="background:#3b82f6; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="تحميل النتيجة إكسيل"><i class="fas fa-file-excel"></i></button>
                    <button onclick="notifyParentsForExam('${exId}', '${ex.title}')" style="background:#10b981; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="إرسال واتساب للأهالي"><i class="fab fa-whatsapp"></i></button>
                    <button onclick="editExam('${exId}')" style="background:rgba(59,130,246,0.1); color:#3b82f6; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteDoc(doc(db,'exams','${exId}'))" style="background:rgba(239,68,68,0.1); color:#ef4444; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }
        if(select) select.innerHTML += `<option value="${exId}">${ex.title}</option>`;
        if(filter) filter.innerHTML += `<option value="${exId}">${ex.title}</option>`;
    });
});

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
            if(q.type === 'mcq') { box.querySelector('.q-opt1').value=q.options[0]; box.querySelector('.q-opt2').value=q.options[1]; box.querySelector('.q-opt3').value=q.options[2]; box.querySelector('.q-opt4').value=q.options[3]; box.querySelector('.q-correct').value=q.correctIndex+1; }
        });
        document.getElementById('btnCancelExamEdit').style.display = 'inline-block'; window.scrollTo({top:0});
    }
}
document.getElementById('btnCancelExamEdit')?.addEventListener('click', () => { document.getElementById('editingExamId').value=""; document.getElementById('addExamForm').reset(); document.getElementById('questionsContainer').innerHTML=''; questionCount=0; document.getElementById('btnCancelExamEdit').style.display='none'; });

// تحميل الإكسيل للامتحان الواحد
window.downloadExamExcel = function(examId, examTitle) {
    const students = allSubmissionsForExams.filter(s => s.examId === examId);
    if(students.length === 0) return adminAlert("عذراً", "لا يوجد طلاب امتحنوا هذا الامتحان بعد.", "error");
    
    let csv = "\uFEFFاسم الطالب,الدرجة,الحالة,هاتف الطالب,هاتف ولي الأمر\n";
    students.forEach(s => {
        let status = s.status === 'passed' ? 'ناجح' : (s.status === 'failed' ? 'راسب' : 'قيد المراجعة');
        csv += `${s.studentName},${s.score}%,${status},${s.studentPhone},${s.parentPhone}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `نتيجة_${examTitle}.csv`; link.click();
};

// إرسال واتساب مجمع لنتيجة امتحان واحد
window.notifyParentsForExam = async function(examId, examTitle, btnElement) {
    const students = allSubmissionsForExams.filter(s => s.examId === examId);
    if(students.length === 0) return adminAlert("عذراً", "لا يوجد طلاب لإرسال النتائج لهم.", "error");
    
    if(!await adminConfirm(`سيتم إرسال رسائل لـ ${students.length} ولي أمر. هل تريد المتابعة؟`)) return;
    
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    
    // دالة التأخير الزمني (Delay)
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> إرسال ${i + 1} من ${students.length}`;
        
        let statusAr = s.status === 'passed' ? 'ناجح ✅' : (s.status === 'failed' ? 'راسب ❌' : 'قيد المراجعة ⏳');
        let msg = `مرحباً ولي أمر الطالب/ة: ${s.studentName}\nنود إعلامكم بنتيجة امتحان (${examTitle}) مع الأستاذ (${s.instructor}).\nالدرجة: ${s.score}%\nالحالة: ${statusAr}\nمع تحيات المنصة.`;
        
        await sendWhatsAppToParent(s.parentPhone, msg);
        
        // تأخير زمني 4 ثواني بين كل رسالة والتانية عشان الواتس ميتقفلش
        if (i < students.length - 1) await sleep(4000); 
    }
    
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
    adminAlert("تم", "تم إرسال جميع الرسائل بنجاح.", "success");
};


// ==========================================
// 6. سجل المشاهدات والتصحيح
// ==========================================
onSnapshot(query(collection(db, "exam_submissions")), (snapshot) => {
    const table = document.getElementById('adminGradingTable');
    if(!table) return; table.innerHTML = '';
    const sFilter = document.getElementById('filterGradingStatus')?.value || 'all';
    const eFilter = document.getElementById('filterSpecificExam')?.value || 'all';
    let count = 0;
    snapshot.forEach(docSnap => {
        const sub = {id: docSnap.id, ...docSnap.data()};
        if(sFilter !== 'all' && sub.status !== sFilter) return; 
        if(eFilter !== 'all' && sub.examId !== eFilter) return; 
        count++;
        let stText = sub.status==='passed' ? '<span style="color:#10b981;">ناجح (شاهد)</span>' : (sub.status==='failed' ? '<span style="color:#ef4444;">راسب (لم يشاهد)</span>' : '<span style="color:#f59e0b;">مراجعة</span>');
        let tText = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-';
        table.innerHTML += `<tr>
            <td><strong>${sub.studentName}</strong><br><small>${sub.studentPhone}</small></td>
            <td><strong>${sub.courseTitle}</strong><br><small>${sub.examTitle}</small></td>
            <td style="font-weight:900;">${sub.score}%</td>
            <td>${stText}</td>
            <td dir="ltr" style="font-size:12px;">${tText}</td>
            <td>
                ${sub.status === 'pending' ? `<button onclick="gradeStudentExam('${sub.id}')" style="background:#10b981; color:#fff; border:none; padding:5px; border-radius:5px;"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="editStudentScore('${sub.id}', ${sub.score})" style="background:#3b82f6; color:#fff; border:none; padding:5px; border-radius:5px;"><i class="fas fa-edit"></i></button>
            </td>
        </tr>`;
    });
    if(count===0) table.innerHTML=`<tr><td colspan="6" style="text-align:center;">لا توجد بيانات</td></tr>`;
});
document.getElementById('filterGradingStatus')?.addEventListener('change', () => { const ev=new Event('change'); });

window.gradeStudentExam = async function(id) {
    const isPassed = await adminConfirm("هل تريد إعطائه 100% ونجاحه؟");
    if(!isPassed) return;
    try { await updateDoc(doc(db,"exam_submissions",id), {status:'passed', score:100}); } catch(e){}
}
window.editStudentScore = async function(id, cur) {
    const n = prompt("أدخل الدرجة (0-100):", cur);
    if(!n) return;
    const num = parseInt(n);
    if(num>=0 && num<=100) { await updateDoc(doc(db,"exam_submissions",id), {score:num, status: num>=50?'passed':'failed'}); }
}

// ==========================================
// 7. مصنع الأكواد (أرقام فقط + إكسيل فوري)
// ==========================================
const codesRef = collection(db, "charge_codes");
let allCodesData = [];

// توليد كود أرقام فقط (مثال: 4582-1934-7850)
function generateNumericCode() {
    return Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
}

document.getElementById('generateCodesForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const count = parseInt(document.getElementById('codesCount').value);
    const price = parseInt(document.getElementById('codePrice').value);
    const delegate = document.getElementById('codeDelegate').value.trim();
    const type = document.getElementById('codeType').value;
    
    const btn = document.getElementById('btnGenerateCodes');
    btn.innerHTML = "جاري التوليد... ⏳"; btn.disabled = true;

    try {
        const batchDate = new Date().toISOString();
        let csv = "\uFEFFالكود,القيمة,المندوب,النوع\n"; // عشان الإكسيل الفوري

        for (let i = 0; i < count; i++) {
            const uniqueCode = generateNumericCode();
            csv += `${uniqueCode},${price},${delegate},${type}\n`; // إضافة لملف الإكسيل
            await addDoc(codesRef, {
                code: uniqueCode, value: price, delegate: delegate, type: type,
                isUsed: false, usedByPhone: null, usedByName: null, usedAt: null, createdAt: batchDate
            });
        }
        
        // التحميل الفوري للإكسيل
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `أكواد_${delegate}_${count}كود.csv`; link.click();

        adminAlert("تمت العملية", "تم التوليد وتحميل الإكسيل بنجاح", "success");
        document.getElementById('generateCodesForm').reset();
    } catch(err) {} finally { btn.innerHTML = "<i class='fas fa-cogs'></i> توليد وتحميل إكسيل"; btn.disabled = false; }
});

onSnapshot(query(codesRef), (snapshot) => {
    allCodesData = [];
    snapshot.forEach(docSnap => allCodesData.push({ id: docSnap.id, ...docSnap.data() }));
    renderCodesTable();
});

function renderCodesTable() {
    const table = document.getElementById('adminCodesTable');
    if(!table) return; table.innerHTML = '';
    const searchTerm = document.getElementById('searchCodeInput')?.value || '';
    const filterStatus = document.getElementById('filterCodeStatus')?.value || 'all';

    allCodesData.forEach(c => {
        if (filterStatus === 'used' && !c.isUsed) return;
        if (filterStatus === 'unused' && c.isUsed) return;
        if (searchTerm && !c.code.includes(searchTerm) && !c.delegate.includes(searchTerm)) return;

        let stText = c.isUsed ? `<span style="color:#ef4444;">${c.usedByName} (${c.usedByPhone})</span>` : `<span style="color:#10b981;">جديد</span>`;
        let tText = c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : '-';
        table.innerHTML += `<tr>
            <td style="font-family: monospace; font-size:16px; font-weight:900; color:#f59e0b;">${c.code}</td>
            <td>${c.value} ج</td>
            <td>${c.delegate}</td>
            <td>${stText}</td>
            <td>${tText}</td>
            <td><button onclick="deleteDoc(doc(db,'charge_codes','${c.id}'))" style="background: rgba(239,68,68,0.1); color:#ef4444; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
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
    link.download = `سجل_الأكواد_الكامل.csv`; link.click();
});

// ==========================================
// 8. إدارة الباقات (Packages)
// ==========================================
// ==========================================
// 8. إدارة الباقات (Packages)
// ==========================================
const packagesRef = collection(db, "packages");

document.getElementById('addPackageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSavePackage');
    btn.innerHTML = "جاري رفع الباقة... ⏳"; btn.disabled = true;

    try {
        const imageFile = document.getElementById('pkgImage').files[0];
        let imageUrl = await uploadImageToImgBB(imageFile); 
        
        // جلب الفيديوهات الإضافية وتحويلها لمصفوفة
        const extraVideos = document.getElementById('pkgVideos').value.split('\n').filter(v => v.trim() !== '');

        await addDoc(packagesRef, {
            name: document.getElementById('pkgName').value,
            grade: document.getElementById('pkgGrade').value,
            oldPrice: document.getElementById('pkgOldPrice').value,
            newPrice: document.getElementById('pkgNewPrice').value,
            features: document.getElementById('pkgFeatures').value.split(','),
            extraVideos: extraVideos, // الفيديوهات المتعددة
            imageUrl: imageUrl,
            createdAt: new Date().toISOString()
        });
        adminAlert("تم", "تم إضافة الباقة بنجاح", "success");
        document.getElementById('addPackageForm').reset();
    } catch(err) {} finally { btn.innerHTML = "<i class='fas fa-plus'></i> نشر الباقة"; btn.disabled = false; }
});

onSnapshot(query(packagesRef), (snapshot) => {
    const table = document.getElementById('adminPackagesTable');
    if(!table) return; table.innerHTML = '';
    snapshot.forEach(docSnap => {
        const pkg = docSnap.data();
        table.innerHTML += `<tr>
            <td><img src="${pkg.imageUrl}" style="width:40px; border-radius:8px; vertical-align:middle;"> <strong>${pkg.name}</strong></td>
            <td>${pkg.grade}</td>
            <td><span style="text-decoration:line-through; color:#ef4444; font-size:12px;">${pkg.oldPrice}</span> <strong style="color:#10b981;">${pkg.newPrice} ج.م</strong></td>
            <td><button onclick="deleteDoc(doc(db, 'packages', '${docSnap.id}'))" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border:none; padding: 4px 8px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
});

// ==========================================
// 9. إدارة المساعدين والصلاحيات
// ==========================================
const assistantsRef = collection(db, "assistants");

document.getElementById('addAssistantForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveAssistant');
    btn.innerHTML = "جاري الحفظ... ⏳"; btn.disabled = true;

    try {
        // جمع الصلاحيات المتعلم عليها
        const perms = [];
        document.querySelectorAll('.ast-perm:checked').forEach(cb => perms.push(cb.value));

        await addDoc(assistantsRef, {
            name: document.getElementById('astName').value,
            username: document.getElementById('astUsername').value,
            password: document.getElementById('astPassword').value,
            targetTeacher: document.getElementById('astTeacher').value, 
            permissions: perms, // مصفوفة الصلاحيات
            role: "assistant",
            createdAt: new Date().toISOString()
        });
        adminAlert("تم", "تم إضافة المساعد بنجاح", "success");
        document.getElementById('addAssistantForm').reset();
    } catch(err) { adminAlert("خطأ", "فشل الإضافة", "error"); }
    finally { btn.innerHTML = "<i class='fas fa-check'></i> إنشاء حساب المساعد"; btn.disabled = false; }
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
            <td><button onclick="deleteDoc(doc(db, 'assistants', '${docSnap.id}'))" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
});

// حقن أسماء المدرسين في قائمة المساعدين
onSnapshot(query(collection(db, "teachers")), (snapshot) => {
    const select = document.getElementById('astTeacher');
    if(select) {
        select.innerHTML = '<option value="" disabled selected>اختر المدرس</option>';
        snapshot.forEach(docSnap => {
            select.innerHTML += `<option value="${docSnap.data().name}">${docSnap.data().name}</option>`;
        });
    }
});

// دالة مسح الامتحان الإضافية اللي طلبتها
window.deleteExam = async function(id) {
    if(await adminConfirm("هل أنت متأكد من حذف هذا الامتحان نهائياً؟")) {
        try {
            await deleteDoc(doc(db, "exams", id));
            adminAlert("تم الحذف", "تم مسح الامتحان بنجاح", "success");
        } catch(e) { adminAlert("خطأ", "فشل الحذف", "error"); }
    }
};
