import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// استدعاء الفايربيز ستوريدج لرفع الصور
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app); // تعريف الستوريدج

// متغير فاضي هيتملي وقت الرفع بس
let VIMEO_ACCESS_TOKEN = null;

// دالة بتجيب التوكن من الداتا بيز بأمان
async function getVimeoToken() {
    if (VIMEO_ACCESS_TOKEN) return VIMEO_ACCESS_TOKEN; // لو جبناه قبل كده مش هنجيبه تاني
    
    try {
        const docRef = doc(db, "settings", "api_keys");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            VIMEO_ACCESS_TOKEN = docSnap.data().vimeo_token;
            return VIMEO_ACCESS_TOKEN;
        } else {
            throw new Error("لم يتم العثور على مفتاح Vimeo في قاعدة البيانات!");
        }
    } catch (error) {
        console.error("خطأ في جلب مفتاح الأمان:", error);
        throw error;
    }
}
// حماية ونوافذ (نفس الكود السابق)
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

// ==========================================
// 1. قسم إدارة الطلاب (تحديث رقم ولي الأمر)
// ==========================================
let currentStudentId = null;
let currentStudentData = null;
document.getElementById('btnSearchStudent')?.addEventListener('click', async () => {
    const phone = document.getElementById('searchPhoneInput').value.trim();
    if(!phone) return adminAlert("خطأ", "أدخل رقم الهاتف!", "error");
    
    document.getElementById('btnSearchStudent').innerHTML = 'جاري...';
    try {
        const qSearch = query(collection(db, "users"), where("studentPhone", "==", phone));
        const querySnapshot = await getDocs(qSearch);
        if(querySnapshot.empty) {
            adminAlert("عذراً", "لا يوجد طالب بهذا الرقم", "error");
        } else {
            const studentDoc = querySnapshot.docs[0];
            currentStudentId = studentDoc.id;
            currentStudentData = studentDoc.data();
            
            document.getElementById('resStudentName').textContent = currentStudentData.fullName;
            document.getElementById('resStudentPhone').textContent = currentStudentData.studentPhone;
            // عرض رقم ولي الأمر!
            document.getElementById('resParentPhone').textContent = currentStudentData.parentPhone || "غير متوفر";
            
            document.getElementById('resStudentGrade').textContent = currentStudentData.grade;
            document.getElementById('resStudentWallet').textContent = (currentStudentData.walletBalance || 0) + ' ج.م';
            document.getElementById('studentResultCard').style.display = 'block';
        }
    } catch(error) { console.error(error); } 
    finally { document.getElementById('btnSearchStudent').innerHTML = '<i class="fas fa-search"></i> بحث'; }
});
// (كود الشحن والخصم والحظر زي ما هو تمام شغال)

// ==========================================
// 2. قسم إدارة الامتحانات (Exam Builder)
// ==========================================
const examsRef = collection(db, "exams");
let questionCount = 0;

// إضافة سؤال جديد في الفورم
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

// حفظ الامتحان في الفايربيز
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

// جلب الامتحانات وعرضها في الجدول والقائمة المنسدلة بتاعت الكورسات
onSnapshot(query(examsRef), (snapshot) => {
    const table = document.getElementById('adminExamsTable');
    const select = document.getElementById('requiredExamSelect');
    if(table) table.innerHTML = '';
    if(select) select.innerHTML = '<option value="">بدون امتحان (مفتوحة)</option>';

    snapshot.forEach(docSnap => {
        const exam = docSnap.data();
        // إضافة للجدول
        if(table) {
            table.innerHTML += `<tr>
                <td><strong>${exam.title}</strong></td>
                <td>${exam.questions.length} أسئلة</td>
                <td>الآن</td>
                <td><button onclick="deleteExam('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        }
        // إضافة لقائمة اختيار الكورس
        if(select) {
            select.innerHTML += `<option value="${docSnap.id}">${exam.title}</option>`;
        }
    });
});

window.deleteExam = async function(id) {
    if(await adminConfirm("هل أنت متأكد من حذف الامتحان؟")) {
        await deleteDoc(doc(db, "exams", id));
    }
}

// ==========================================
// 3. قسم إدارة الكورسات (رفع الصور وفيمو + التعديل)
// ==========================================
const coursesRef = collection(db, "courses");

// دالة رفع الفيديو لفيمو باستخدام TUS (تحتاج Access Token)
async function uploadToVimeo(file, progressCallback) {
    return new Promise((resolve, reject) => {
        if(VIMEO_ACCESS_TOKEN === "YOUR_VIMEO_ACCESS_TOKEN_HERE") {
            reject("برجاء وضع الـ Vimeo Access Token في الكود أولاً!");
            return;
        }

        const upload = new tus.Upload(file, {
            endpoint: "https://api.vimeo.com/me/videos",
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
                Accept: "application/vnd.vimeo.*+json;version=3.4"
            },
            uploadSize: file.size,
            onError: function(error) { reject(error); },
            onProgress: function(bytesUploaded, bytesTotal) {
                const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                progressCallback(percentage);
            },
            onSuccess: function() {
                // استخراج لينك الـ ID بتاع فيمو
                const videoId = upload.url.split('/').pop();
                resolve(`https://player.vimeo.com/video/${videoId}`);
            }
        });
        upload.start();
    });
}

// حفظ أو تعديل الكورس
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
    
    const imageFile = document.getElementById('courseImageFile').files[0];
    const videoFile = document.getElementById('courseVideoFile').files[0];
    
    try {
        let imageUrl = null;
        let videoUrl = null;

        // 1. لو اختار صورة، نرفعها لفايربيز ستوريدج
        if (imageFile) {
            const imgRef = ref(storage, 'course_images/' + Date.now() + '_' + imageFile.name);
            await uploadBytesResumable(imgRef, imageFile);
            imageUrl = await getDownloadURL(imgRef);
        }

        // 2. لو اختار فيديو، نرفعه لفيمو
        if (videoFile) {
            document.getElementById('videoProgressContainer').style.display = 'block';
            document.getElementById('videoStatus').textContent = "جاري رفع الفيديو لفيمو... يرجى عدم إغلاق الصفحة";
            
            videoUrl = await uploadToVimeo(videoFile, (progress) => {
                document.getElementById('videoProgressBar').style.width = progress + '%';
                document.getElementById('videoStatus').textContent = `تم الرفع: ${progress}%`;
            });
        }

        // تجميع البيانات
        const courseData = { title, instructor, grade, price, requiredExamId };
        if (imageUrl) courseData.image = imageUrl; // لو رفع صورة جديدة
        if (videoUrl) courseData.videoUrl = videoUrl; // لو رفع فيديو جديد

        if (editingId) {
            // تحديث كورس موجود
            await updateDoc(doc(db, "courses", editingId), courseData);
            adminAlert("تم التعديل", "تم تعديل بيانات الحصة بنجاح.", "success");
            document.getElementById('btnCancelEdit').click(); // قفل وضع التعديل
        } else {
            // إضافة كورس جديد
            if(!imageUrl || !videoUrl) throw new Error("يجب رفع صورة وغلاف للحصة الجديدة!");
            courseData.createdAt = new Date().toISOString();
            await addDoc(coursesRef, courseData);
            adminAlert("تم النشر", "تم رفع الحصة بنجاح.", "success");
            document.getElementById('addCourseForm').reset();
            document.getElementById('videoProgressContainer').style.display = 'none';
            document.getElementById('videoStatus').textContent = "اختر ملف الفيديو";
        }
    } catch (error) {
        console.error(error);
        adminAlert("خطأ", error.message || "حدث خطأ أثناء الرفع", "error");
    } finally {
        btn.innerHTML = editingId ? 'حفظ التعديلات' : '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
        btn.disabled = false;
    }
});

// عرض الكورسات في الجدول (مع زرار التعديل)
onSnapshot(query(coursesRef), (snapshot) => {
    const table = document.getElementById('adminCoursesTable');
    if(!table) return;
    table.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const course = docSnap.data();
        let examText = course.requiredExamId ? '<span style="color:#ef4444;"><i class="fas fa-lock"></i> مقفول بامتحان</span>' : '<span style="color:#10b981;">مفتوح</span>';
        
        table.innerHTML += `
            <tr>
                <td><strong>${course.title}</strong></td>
                <td>${course.instructor}</td>
                <td>${course.grade}</td>
                <td>${examText}</td>
                <td style="display: flex; gap: 10px;">
                    <button onclick="editCourse('${docSnap.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; padding: 6px 12px; border-radius: 8px; cursor: pointer;"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteCourse('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer;"><i class="fas fa-trash"></i></button>
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
        
        document.getElementById('courseTitle').value = course.title;
        document.getElementById('courseInstructor').value = course.instructor;
        document.getElementById('courseGrade').value = course.grade;
        document.getElementById('coursePrice').value = course.price;
        document.getElementById('requiredExamSelect').value = course.requiredExamId || "";
        
        document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        document.getElementById('btnCancelEdit').style.display = 'block';
        window.scrollTo(0, 0); // نطلع الشاشة لفوق
    }
}

// إلغاء التعديل
document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    document.getElementById('editingCourseId').value = "";
    document.getElementById('courseFormTitle').innerHTML = `<i class="fas fa-plus-circle" style="color: #f59e0b;"></i> إضافة حصة أو كورس جديد`;
    document.getElementById('addCourseForm').reset();
    document.getElementById('btnSaveCourse').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> نشر الحصة';
    document.getElementById('btnCancelEdit').style.display = 'none';
});

window.deleteCourse = async function(id) {
    if(await adminConfirm("هل أنت متأكد من الحذف؟")) await deleteDoc(doc(db, "courses", id));
};
