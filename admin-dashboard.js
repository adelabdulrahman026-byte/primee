import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// تم إزالة import * as tus لحل مشكلة توقف الكود، وسيتم الاعتماد على مكتبة tus الموجودة في الـ HTML مباشرة.

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

if (localStorage.getItem('adminLoggedIn') !== 'true') window.location.replace('admin-login.html');
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.replace('admin-login.html'); });

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
        if(!perms.includes('liveChat')) { const navLive = document.getElementById('navLiveChat'); if(navLive) navLive.style.display = 'none'; }
        
        document.getElementById('navTeachers').style.display = 'none';
        document.getElementById('navPackages').style.display = 'none';
        document.getElementById('navAssistants').style.display = 'none';
        document.getElementById('navPromoCodes').style.display = 'none';
    }
}
applyPermissions();

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

// 🚨 تفعيل زرار الإشعارات 🚨
document.getElementById('enableSoundBtn')?.addEventListener('click', () => {
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(perm => {
            if(perm === "granted") adminAlert("تم", "تم تفعيل الإشعارات بنجاح", "success");
        });
    } else {
        adminAlert("معلومة", "الإشعارات مفعلة بالفعل لديك", "success");
    }
});

// إرسال واتساب (للطالب وولي الأمر)
async function sendWhatsAppMessage(phone, msg) {
    if (!phone) return false;
    try {
        const docSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (!docSnap.exists()) return false;
        const keys = docSnap.data();
        let formattedPhone = phone.toString().trim();
        if (formattedPhone.startsWith('0')) formattedPhone = '2' + formattedPhone;
        let chatId = formattedPhone + "@c.us";
        let url = `https://api.wapilot.net/api/v2/${keys.wapilot_instance}/send-message`;
        fetch(url, { method: "POST", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.wapilot_token}` }, body: JSON.stringify({ chat_id: chatId, text: msg }) }).catch(e=>console.log(e));
        return true;
    } catch (e) { return false; }
}
window.sendWhatsAppToParent = sendWhatsAppMessage;

async function uploadImageToR2(file) {
    const formData = new FormData(); formData.append("image", file);
    try {
        const response = await fetch("https://primee-api.adelabdulrahman026.workers.dev/upload-image", { method: "POST", body: formData });
        const data = await response.json();
        if (data.success) return data.url; throw new Error(data.error);
    } catch (error) { throw new Error("فشل الرفع"); }
}

async function uploadToVimeo(file, progressCallback) {
    const docSnap = await getDoc(doc(db, "settings", "api_keys"));
    const keys = docSnap.exists() ? docSnap.data() : null;
    if (!keys || !keys.vimeo_token) throw new Error("مفتاح Vimeo غير موجود");

    const createResponse = await fetch("https://api.vimeo.com/me/videos", {
        method: "POST", headers: { Authorization: `Bearer ${keys.vimeo_token}`, "Content-Type": "application/json", Accept: "application/vnd.vimeo.*+json;version=3.4" },
        body: JSON.stringify({ upload: { approach: "tus", size: file.size.toString() } })
    });
    if (!createResponse.ok) throw new Error(await createResponse.text());
    const video = await createResponse.json();

    return new Promise((resolve, reject) => {
        // تم استخدام window.tus بدلاً من الـ import لتجنب أخطاء الـ Modules
        const upload = new window.tus.Upload(file, {
            uploadUrl: video.upload.upload_link, retryDelays: [0,3000,5000,10000], headers: { Authorization: `Bearer ${keys.vimeo_token}` },
            metadata: { filename: file.name, filetype: file.type },
            onError(error){ reject(error); },
            onProgress(bytesUploaded, bytesTotal){ progressCallback(((bytesUploaded / bytesTotal) * 100).toFixed(2)); },
            async onSuccess(){
                await fetch(video.uri,{ method:"PATCH", headers:{ Authorization:`Bearer ${keys.vimeo_token}`, "Content-Type":"application/json" }, body:JSON.stringify({ privacy:{ view:"disable" } }) });
                resolve("https://player.vimeo.com/video/" + video.uri.split("/").pop());
            }
        });
        upload.start();
    });
}

// ==========================================
// 🚨 خدمة العملاء (Live Chat) 🚨
// ==========================================
let isLiveChatActive = false;
let currentChatStudent = null;
let chatUnsubscribe = null;

try {
    const supportRef = doc(db, "settings", "support");
    getDoc(supportRef).then(snap => {
        if (snap.exists()) {
            isLiveChatActive = snap.data().isLive;
            const btn = document.getElementById('toggleLiveModeBtn');
            if (isLiveChatActive && btn) {
                btn.innerHTML = '<i class="fas fa-satellite-dish"></i> الدعم الفني: أونلاين';
                btn.style.background = 'rgba(16, 185, 129, 0.1)'; btn.style.color = '#10b981'; btn.style.borderColor = '#10b981';
            }
        }
    }).catch(e=>console.log("No support doc yet"));

    document.getElementById('toggleLiveModeBtn')?.addEventListener('click', async () => {
        isLiveChatActive = !isLiveChatActive;
        try {
            await setDoc(doc(db, "settings", "support"), { isLive: isLiveChatActive }, { merge: true });
            const btn = document.getElementById('toggleLiveModeBtn');
            if (isLiveChatActive) {
                btn.innerHTML = '<i class="fas fa-satellite-dish"></i> الدعم الفني: أونلاين';
                btn.style.background = 'rgba(16, 185, 129, 0.1)'; btn.style.color = '#10b981'; btn.style.borderColor = '#10b981';
                adminAlert("تم", "أنت الآن أونلاين وتستقبل رسائل الطلاب.", "success");
            } else {
                btn.innerHTML = '<i class="fas fa-power-off"></i> الدعم الفني: أوفلاين';
                btn.style.background = 'rgba(239, 68, 68, 0.1)'; btn.style.color = '#ef4444'; btn.style.borderColor = '#ef4444';
                adminAlert("تم", "تم تحويلك لأوفلاين.", "success");
            }
        } catch(e) {}
    });

    onSnapshot(collection(db, "live_chats"), (snap) => {
        const container = document.getElementById('chatUsersContainer');
        if(!container) return;
        container.innerHTML = '';
        let hasChats = false;
        snap.forEach(docSnap => {
            const chat = docSnap.data();
            hasChats = true;
            container.innerHTML += `
                <div onclick="openStudentChat('${docSnap.id}', '${chat.studentName}', '${chat.studentPhone}')" style="padding: 15px; border-bottom: 1px solid #334155; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                    <strong style="color: #f8fafc; font-size: 15px;">${chat.studentName}</strong><br>
                    <small style="color: #f59e0b;">${chat.studentPhone}</small>
                </div>
            `;
        });
        if(!hasChats) container.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">لا توجد محادثات نشطة.</div>';
    }, (err) => console.log(err));

} catch(e) {}

window.openStudentChat = function(chatId, sName, sPhone) {
    currentChatStudent = chatId;
    const mainArea = document.getElementById('chatMainArea');
    mainArea.innerHTML = `
        <div style="padding: 15px; background: #1e293b; border-bottom: 1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
            <strong style="color: #f8fafc;">${sName} (${sPhone})</strong>
            <button onclick="endStudentChat('${chatId}')" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid #ef4444; padding: 5px 10px; border-radius: 6px; cursor: pointer;">إنهاء المحادثة <i class="fas fa-times"></i></button>
        </div>
        <div class="chat-messages" id="liveChatMessagesArea" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;"></div>
        <div style="padding: 15px; background: #1e293b; border-top: 1px solid #334155; display: flex; gap: 10px;">
            <input type="text" id="adminChatInput" placeholder="اكتب ردك هنا..." style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; font-family: 'Cairo'; outline:none;">
            <button onclick="sendAdminReply('${chatId}')" style="background: #10b981; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 900; cursor: pointer;"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    if(chatUnsubscribe) chatUnsubscribe();
    
    chatUnsubscribe = onSnapshot(doc(db, "live_chats", chatId), (docSnap) => {
        if(!docSnap.exists()) { mainArea.innerHTML = '<div style="flex: 1; display: flex; justify-content: center; align-items: center; color: #94a3b8;"><p>تم إنهاء المحادثة.</p></div>'; return; }
        
        // إيقاف رسالة الـ 5 ثواني
        updateDoc(doc(db, "live_chats", chatId), { adminJoined: true });

        const data = docSnap.data();
        const msgArea = document.getElementById('liveChatMessagesArea');
        msgArea.innerHTML = '';
        if(data.messages) {
            data.messages.forEach(m => {
                const isSys = m.sender === 'admin';
                const alignment = isSys ? 'align-self: flex-end; background: #3b82f6;' : 'align-self: flex-start; background: #334155;';
                msgArea.innerHTML += `<div style="max-width: 70%; padding: 12px; border-radius: 12px; color: #fff; ${alignment}">${m.text}</div>`;
            });
            msgArea.scrollTop = msgArea.scrollHeight;
        }
    });
};

window.sendAdminReply = async function(chatId) {
    const inp = document.getElementById('adminChatInput');
    const msg = inp.value.trim();
    if(!msg) return;
    inp.value = '';
    try {
        await updateDoc(doc(db, "live_chats", chatId), {
            messages: arrayUnion({ sender: 'admin', text: msg, time: new Date().toISOString() })
        });
    } catch(e) {}
};

window.endStudentChat = async function(chatId) {
    if(await adminConfirm("تأكيد إنهاء وحذف المحادثة للطرفين؟")) {
        if(chatUnsubscribe) chatUnsubscribe();
        try { await deleteDoc(doc(db, "live_chats", chatId)); } catch(e) {}
        document.getElementById('chatMainArea').innerHTML = '<div style="flex: 1; display: flex; justify-content: center; align-items: center; color: #94a3b8;"><p>اختر طالباً للرد...</p></div>';
    }
};

// ==========================================
// 1. مراقبة الطلاب والأرباح وإدارة الأجهزة
// ==========================================
let allStudentsData = [];
let allCoursesData = []; // هنحتاجها للتقرير المالي الدقيق
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

try {
    onSnapshot(query(collection(db, "users")), (snapshot) => {
        allStudentsData = [];
        snapshot.forEach(doc => allStudentsData.push({id: doc.id, ...doc.data()}));
        renderDashboardStats();
    });
} catch(e) {}

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
            
            document.getElementById('resTransferAttempts').textContent = currentStudentData.transferAttempts !== undefined ? currentStudentData.transferAttempts : 3;
            let blockedArr = currentStudentData.blockedDevices || [];
            document.getElementById('resBlockedCount').textContent = blockedArr.length;

            const statusSpan = document.getElementById('resStudentStatus');
            const btnToggleBlock = document.getElementById('btnToggleBlock');
            if(currentStudentData.isBlocked) {
                statusSpan.textContent = 'محظور كلياً ⛔'; statusSpan.style.color = '#ef4444';
                btnToggleBlock.innerHTML = '<i class="fas fa-unlock"></i> فك الحظر عن الحساب';
                btnToggleBlock.style.background = 'rgba(16, 185, 129, 0.1)'; btnToggleBlock.style.color = '#10b981';
            } else {
                statusSpan.textContent = 'نشط 🟢'; statusSpan.style.color = '#10b981';
                btnToggleBlock.innerHTML = '<i class="fas fa-ban"></i> حظر الحساب بالكامل';
                btnToggleBlock.style.background = 'rgba(239, 68, 68, 0.1)'; btnToggleBlock.style.color = '#ef4444';
            }
            document.getElementById('studentResultCard').style.display = 'block';
        }
    } catch(error) {} finally { document.getElementById('btnSearchStudent').innerHTML = '<i class="fas fa-search"></i> بحث'; }
});

window.resetStudentAttempts = async function(id) {
    if(await adminConfirm("تأكيد إرجاع محاولات نقل الجهاز إلى 3؟")) {
        await updateDoc(doc(db, "users", id), { transferAttempts: 3 });
        document.getElementById('resTransferAttempts').textContent = 3;
        adminAlert("تم", "تم إرجاع المحاولات", "success");
    }
};
window.unblockStudentDevices = async function(id) {
    if(await adminConfirm("تأكيد فك الحظر عن الأجهزة القديمة؟")) {
        await updateDoc(doc(db, "users", id), { blockedDevices: [] });
        document.getElementById('resBlockedCount').textContent = 0;
        adminAlert("تم", "تم تفريغ قائمة الأجهزة المحظورة", "success");
    }
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
    if(!await adminConfirm(newStatus ? "تأكيد الحظر الكلي للحساب؟" : "تأكيد فك الحظر عن الحساب؟")) return;
    try {
        await updateDoc(doc(db, "users", currentStudentId), { isBlocked: newStatus });
        document.getElementById('btnSearchStudent').click();
    } catch(e) {}
});

// ==========================================
// 3. إدارة الكورسات 
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
                    document.getElementById('videoStatus').textContent = `جاري رفع المقطع (${titleInput.value})...`;
                    let vUrl = await uploadToVimeo(fileInput.files[0], (p) => {
                        document.getElementById('videoProgressBar').style.width = p + '%';
                    });
                    newVideosArray.push({ 
                        title: titleInput.value.trim(), 
                        url: vUrl, 
                        requiredExamId: examSelect.value || null 
                    });
                }
            }
            document.getElementById('videoStatus').textContent = `تم رفع الفيديوهات بنجاح ✔️`;
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
            if(!imageUrl && newVideosArray.length === 0) throw new Error("يجب رفع صورة وفيديو واحد على الأقل");
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
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة'; btn.disabled = false; 
        document.getElementById('videoProgressContainer').style.display = 'none'; 
    }
});

window.exportCourseExcel = async function(courseId, courseTitle) {
    adminAlert("جاري التحضير", "يتم تجميع البيانات...", "success");
    try {
        const q = query(collection(db, "users"), where("myCourses", "array-contains", courseId));
        const usersSnap = await getDocs(q);

        const exQ = query(collection(db, "exam_submissions"), where("courseId", "==", courseId));
        const exSnap = await getDocs(exQ);
        let submissions = {};
        exSnap.forEach(d => { submissions[d.data().studentId] = d.data(); });

        let csv = "\uFEFFاسم الطالب,رقم الطالب,رقم ولي الأمر,المحافظة,الامتحان,الدرجة\n";
        usersSnap.forEach(docSnap => {
            let u = docSnap.data();
            let sub = submissions[docSnap.id];
            let scoreText = sub ? `${sub.score} / ${sub.fullMark || sub.totalQuestions || 10}` : 'لم يمتحن';
            let statusText = sub ? (sub.status === 'passed' ? 'ناجح' : (sub.status==='failed'?'راسب':'مراجعة')) : '-';
            csv += `${u.fullName || '-'},${u.studentPhone || '-'},${u.parentPhone || '-'},${u.governorate || '-'},${statusText},${scoreText}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = `طلاب_حصة_${courseTitle}.csv`; link.click();
    } catch(e) { adminAlert("خطأ", "فشل تحميل التقرير", "error"); }
};

try {
    onSnapshot(query(coursesRef), (snapshot) => {
        const table = document.getElementById('adminCoursesTable');
        if(!table) return; table.innerHTML = '';
        teacherCourseIds = [];
        allCoursesData = [];

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            allCoursesData.push({id: docSnap.id, ...c});
            
            if (ROLE === 'assistant' && AST_TEACHER && c.instructor !== AST_TEACHER) return;
            teacherCourseIds.push(docSnap.id);
            
            let stdCount = allStudentsData.filter(s => s.myCourses && s.myCourses.includes(docSnap.id)).length;

            table.innerHTML += `<tr>
                <td><strong>${c.title}</strong></td>
                <td>${c.instructor}</td>
                <td>${c.grade}</td>
                <td><span style="color:#10b981; font-weight:900;">${stdCount} طالب</span><br><small style="color:#f59e0b;">${c.views || 0} مشاهدة عامة</small></td>
                <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                    <button onclick="exportCourseExcel('${docSnap.id}', '${c.title}')" style="background:#10b981; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="تحميل الإكسيل"><i class="fas fa-file-excel"></i></button>
                    <button onclick="editCourse('${docSnap.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; padding: 5px 8px; border-radius: 5px; cursor: pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteCourse('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 5px 8px; border-radius: 5px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
        renderDashboardStats();
    });
} catch(e) {}

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
        document.getElementById('btnSaveCourse').innerHTML = 'حفظ التعديلات وإضافة فيديو';
        document.getElementById('btnCancelEdit').style.display = 'block';
        window.scrollTo({top: document.getElementById('addCourseForm').offsetTop - 50, behavior: 'smooth'});
    }
}
document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('addCourseForm').reset();
    document.getElementById('courseVideosContainer').innerHTML = '';
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
});

// ==========================================
// 4. إدارة الامتحانات 🚨 (تحديث PDF المخفي)
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;
window.currentExamsData = [];
window.examOptionsHTML = '<option value="">بدون امتحان (مفتوحة)</option>';

try {
    onSnapshot(query(examsRef), (snap) => {
        window.currentExamsData = [];
        window.examOptionsHTML = '<option value="">بدون امتحان (مفتوحة)</option>';
        
        const filter = document.getElementById('filterSpecificExam');
        if(filter) filter.innerHTML = '<option value="all">كل الامتحانات</option>';
        
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
} catch(e) {}

window.deleteExam = async function(id) {
    if(await adminConfirm("تأكيد حذف الامتحان نهائياً؟")) {
        try { await deleteDoc(doc(db, "exams", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch(e) {}
    }
};

window.exportExamPDF = async function(examId, examTitle) {
    adminAlert("جاري التحضير", "يتم تجميع النتيجة...", "success");
    try {
        const exQ = query(collection(db, "exam_submissions"), where("examId", "==", examId));
        const exSnap = await getDocs(exQ);
        
        if(exSnap.empty) return adminAlert("تنبيه", "لا يوجد طلاب امتحنوا هذا الامتحان بعد", "error");

        let html = '';
        let counter = 1;
        exSnap.forEach(d => {
            const sub = d.data();
            const scoreText = `${sub.score} / ${sub.fullMark || sub.totalQuestions || 10}`;
            const statusText = sub.status === 'passed' ? 'ناجح' : (sub.status === 'failed' ? 'راسب' : 'مراجعة');
            
            html += `<tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align:center;">${counter++}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${sub.studentName}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align:center;" dir="ltr">${sub.studentPhone}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align:center;" dir="ltr">${sub.parentPhone || '-'}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align:center;">${scoreText}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align:center;">${statusText}</td>
            </tr>`;
        });

        document.getElementById('pdfExamName').textContent = examTitle;
        document.getElementById('pdfExamTableBody').innerHTML = html;

        const element = document.getElementById('examPdfReportContent');
        // هنا السر اللي بيخلي الـ PDF يطبع وهو مخفي في الكلاس الجديد!
        
        html2pdf().set({
            margin: 10, filename: `نتيجة_امتحان_${examTitle}.pdf`, image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();

    } catch(e) { adminAlert("خطأ", "فشل تحميل التقرير", "error"); }
};

let allSubmissionsForExams = [];
try {
    onSnapshot(query(collection(db, "exam_submissions")), (snap) => {
        allSubmissionsForExams = [];
        snap.forEach(d => allSubmissionsForExams.push({id: d.id, ...d.data()}));
        renderExamsTable(); 
        renderGradingTable();
    });
} catch(e) {}

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
                <button onclick="exportExamPDF('${ex.id}', '${ex.title}')" style="background:#ef4444; color:#fff; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;" title="تحميل نتيجة PDF"><i class="fas fa-file-pdf"></i></button>
                <button onclick="editExam('${ex.id}')" style="background:rgba(59,130,246,0.1); color:#3b82f6; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteExam('${ex.id}')" style="background:rgba(239,68,68,0.1); color:#ef4444; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

// ==========================================
// 5. سجل المشاهدات والتصحيح 
// ==========================================
window.deleteSubmission = async function(id) {
    if(await adminConfirm("تأكيد مسح النتيجة ليتمكن الطالب من الإعادة؟")) {
        try { await deleteDoc(doc(db, "exam_submissions", id)); adminAlert("تم", "تم المسح", "success"); } 
        catch(e) {}
    }
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
        let tText = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-';
        let scoreText = sub.hasEssay && sub.status === 'pending' ? 'مراجعة' : `${sub.score} / ${sub.fullMark || sub.totalQuestions || 10}`;
        
        let aiBadge = sub.gradedByAi ? '<br><small style="color:#d946ef; font-weight:800;"><i class="fas fa-robot"></i> مصحح بالذكاء الاصطناعي</small>' : '';

        table.innerHTML += `<tr>
            <td><strong>${sub.studentName}</strong><br><small style="color:#f59e0b;">ط: ${sub.studentPhone}</small><br><small style="color:#cbd5e1;">أب: ${sub.parentPhone || '-'}</small></td>
            <td><strong>${sub.courseTitle}</strong><br><small style="color:#94a3b8;">${sub.examTitle}</small>${aiBadge}</td>
            <td style="font-weight:900; font-size: 18px; direction: ltr;">${scoreText}</td>
            <td>${stText}</td>
            <td dir="ltr" style="font-size:12px; color:#94a3b8;">${tText}</td>
            <td style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                ${sub.status === 'pending' ? `<button onclick="openEssayGradingModal('${sub.id}')" style="background:#f59e0b; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="تصحيح المقالي"><i class="fas fa-marker"></i></button>` : ''}
                <button onclick="editStudentScore('${sub.id}', ${sub.score}, ${sub.fullMark || sub.totalQuestions || 10})" style="background:#3b82f6; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="تعديل الدرجة"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSubmission('${sub.id}')" style="background:#ef4444; color:#fff; border:none; padding:5px 8px; border-radius:5px;" title="إعادة الامتحان"><i class="fas fa-redo"></i></button>
            </td>
        </tr>`;
    });
    if(count === 0) table.innerHTML=`<tr><td colspan="6" style="text-align:center;">لا توجد بيانات...</td></tr>`;
}
document.getElementById('filterGradingStatus')?.addEventListener('change', renderGradingTable);
document.getElementById('filterSpecificExam')?.addEventListener('change', renderGradingTable);

window.currentGradingSubId = null;
window.openEssayGradingModal = async function(subId) {
    const sub = allSubmissionsForExams.find(s => s.id === subId);
    if(!sub || !sub.essayAnswers) return;
    
    currentGradingSubId = subId;
    let html = `<strong>الطالب:</strong> ${sub.studentName}<br><hr style="border-color:#334155;">`;
    
    sub.essayAnswers.forEach((ans, idx) => {
        html += `<div style="margin-bottom: 15px;">
            <p style="color:#f59e0b; font-weight:800;">السؤال: ${ans.questionText}</p>
            <p style="color:#10b981;">إجابة الطالب: ${ans.answer}</p>
        </div>`;
    });

    document.getElementById('essayGradingContent').innerHTML = html;
    document.getElementById('essayScoreInput').value = sub.score || 0;
    document.getElementById('essayGradingModal').classList.add('active');
};

document.getElementById('btnSaveEssayGrade')?.addEventListener('click', async () => {
    const sub = allSubmissionsForExams.find(s => s.id === currentGradingSubId);
    const newScore = parseFloat(document.getElementById('essayScoreInput').value) || 0;
    const fullMark = sub.fullMark || sub.totalQuestions || 10;
    
    let newStatus = newScore >= (fullMark / 2) ? 'passed' : 'failed';
    
    try {
        await updateDoc(doc(db, "exam_submissions", currentGradingSubId), { score: newScore, status: newStatus });
        document.getElementById('essayGradingModal').classList.remove('active');
        
        let waMsgStudent = `مرحباً بك ${sub.studentName}\nتم تصحيح إجاباتك المقالية لامتحان (${sub.examTitle}).\nالنتيجة: ${newStatus === 'passed'?'ناجح ✅':'راسب ❌'}\nالدرجة: ${newScore} من ${fullMark}`;
        let waMsgParent = `إشعار من Primee Academy 🔔\nولي أمر الطالب/ة: ${sub.studentName}\nتم تصحيح امتحان (${sub.examTitle}).\nالنتيجة: ${newStatus === 'passed'?'ناجح ✅':'راسب ❌'}\nالدرجة: ${newScore} من ${fullMark}`;
        
        sendWhatsAppMessage(sub.studentPhone, waMsgStudent);
        if(sub.parentPhone) sendWhatsAppMessage(sub.parentPhone, waMsgParent);
        
        adminAlert("تم", "تم رصد الدرجة وإرسال الواتساب للطالب وولي الأمر", "success");
    } catch(e) {}
});

window.editStudentScore = async function(id, cur, total) {
    const n = prompt(`الدرجة (من ${total}):`, cur);
    if(!n) return;
    const num = parseFloat(n);
    if(num>=0 && num<=total) { 
        try {
            const subRef = doc(db,"exam_submissions",id);
            const subSnap = await getDoc(subRef);
            if(subSnap.exists()){
                const d = subSnap.data();
                let newStatus = num >= (total/2) ? 'passed' : 'failed';
                await updateDoc(subRef, {score:num, status: newStatus});

                let waMsgStudent = `مرحباً بك ${d.studentName}\nتم تعديل درجتك في امتحان (${d.examTitle}).\nالدرجة الجديدة: ${num} من ${total}\nالنتيجة: ${newStatus === 'passed'?'ناجح ✅':'راسب ❌'}`;
                let waMsgParent = `إشعار من Primee Academy 🔔\nولي أمر الطالب/ة: ${d.studentName}\nتم تحديث درجة امتحان (${d.examTitle}).\nالدرجة الجديدة: ${num} من ${total}\nالنتيجة: ${newStatus === 'passed'?'ناجح ✅':'راسب ❌'}`;
                
                sendWhatsAppMessage(d.studentPhone, waMsgStudent);
                if(d.parentPhone) sendWhatsAppMessage(d.parentPhone, waMsgParent);
                
                adminAlert("تم", "تم التعديل وإرسال إشعار", "success");
            }
        } catch(e) {}
    }
}

// ==========================================
// 🚨 المحفظة (العمليات المالية) 🚨
// ==========================================
let allTransactions = [];
try {
    onSnapshot(query(collection(db, "transactions")), (snap) => {
        const table = document.getElementById('adminWalletTable');
        if(!table) return; table.innerHTML = '';
        allTransactions = [];
        snap.forEach(d => allTransactions.push({id: d.id, ...d.data()}));
        
        // إصلاح خطأ ترتيب الـ Array اللي كان بيبوظ الداتا
        let filteredTrans = [...allTransactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (ROLE === 'assistant' && AST_TEACHER) {
            filteredTrans = filteredTrans.filter(t => t.instructor === AST_TEACHER || t.instructor === "-");
        }

        filteredTrans.forEach(t => {
            let tType = t.type === 'purchase_course' ? '<span style="color:#ef4444;">شراء حصة</span>' : '<span style="color:#10b981;">شحن رصيد</span>';
            let tDate = new Date(t.createdAt).toLocaleString('ar-EG');
            table.innerHTML += `<tr>
                <td dir="ltr" style="font-size:12px;">${tDate}</td>
                <td><strong>${t.studentName}</strong><br><small style="color:#f59e0b;">${t.studentPhone}</small></td>
                <td>${tType}</td>
                <td style="font-weight:900;" dir="ltr">${t.amount} ج.م</td>
                <td><strong>${t.courseTitle || '-'}</strong><br><small style="color:#3b82f6;">أ. ${t.instructor || '-'}</small></td>
            </tr>`;
        });
    });
} catch(e) {}

// ==========================================
// 🚨 تقرير المدرس (الآلية الجديدة الدقيقة) 🚨
// ==========================================
document.getElementById('btnGenerateReport')?.addEventListener('click', () => {
    const teacher = document.getElementById('reportTeacherSelect').value;
    const period = document.getElementById('reportPeriodSelect').value;
    if(!teacher) return adminAlert("خطأ", "اختر المدرس أولاً", "error");

    adminAlert("جاري التحضير", "يتم تجميع البيانات...", "success");

    // استخراج الكورسات الخاصة بالمدرس فقط
    const tCourses = allCoursesData.filter(c => c.instructor === teacher);
    
    let totalRev = 0;
    let totalSalesCount = 0;
    let uniqueStudents = new Set();
    let cHtml = '';

    tCourses.forEach(c => {
        // البحث عن الطلاب اللي عندهم الكورس ده في حساباتهم (سواء دفع كود أو مجاني)
        let buyers = allStudentsData.filter(s => s.myCourses && s.myCourses.includes(c.id));
        
        // لو في فترة زمنية، المفروض نفلتر تاريخ الشراء، بس مؤقتاً هنجيب الإجمالي العام أدق
        let count = buyers.length;
        let price = Number(c.price) || 0;
        let revenue = count * price;

        buyers.forEach(b => uniqueStudents.add(b.studentPhone));

        totalSalesCount += count;
        totalRev += revenue;

        cHtml += `<tr>
            <td style="padding:10px; border:1px solid #cbd5e1; color:#000;">${c.title}</td>
            <td style="padding:10px; border:1px solid #cbd5e1; color:#000; text-align:center;">${price > 0 ? price + ' ج.م' : 'مجاني'}</td>
            <td style="padding:10px; border:1px solid #cbd5e1; color:#000; text-align:center;">${count}</td>
            <td style="padding:10px; border:1px solid #cbd5e1; color:#10b981; font-weight:bold; text-align:center;">${revenue} ج.م</td>
        </tr>`;
    });

    document.getElementById('pdfTeacherName').textContent = teacher;
    document.getElementById('pdfPeriod').textContent = document.getElementById('reportPeriodSelect').options[document.getElementById('reportPeriodSelect').selectedIndex].text;
    document.getElementById('pdfTotalStudents').textContent = uniqueStudents.size;
    document.getElementById('pdfTotalSalesCount').textContent = totalSalesCount; 
    document.getElementById('pdfTotalRevenue').textContent = totalRev + " ج.م";
    document.getElementById('pdfGenerateDate').textContent = new Date().toLocaleString('ar-EG');
    document.getElementById('pdfTeacherCoursesTableBody').innerHTML = cHtml || `<tr><td colspan="4" style="text-align:center;">لا توجد مبيعات</td></tr>`;

    const element = document.getElementById('pdfReportContent');
    // السحر هنا عشان الـ PDF يطبع صح وهو في الكلاس الجديد المخفي
    html2pdf().set({
        margin: 10, filename: `تقرير_${teacher}.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
});

// مصنع الأكواد والبرومو كود والمساعدين يعملون كما هم تماماً...
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
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
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
            const uniqueCode = "PR-" + generateAlphanumericCode();
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

try {
    onSnapshot(query(codesRef), (snapshot) => {
        allCodesData = [];
        snapshot.forEach(docSnap => allCodesData.push({ id: docSnap.id, ...docSnap.data() }));
        renderCodesTable();
    });
} catch(e) {}

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
