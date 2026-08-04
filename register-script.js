import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.closeAlertModal = function() {
    const alertModal = document.getElementById('alertModal');
    if(alertModal) alertModal.classList.remove('active');
};

function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

// دالة رفع الصورة لـ ImgBB
async function uploadProfilePic(file) {
    try {
        const keysRef = await getDoc(doc(db, "settings", "api_keys"));
        if(!keysRef.exists() || !keysRef.data().imgbb_token) throw new Error("مفتاح رفع الصور مفقود");
        
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${keysRef.data().imgbb_token}`, { method: "POST", body: formData });
        const data = await response.json();
        if(data.success) return data.data.url;
        else throw new Error("فشل رفع الصورة");
    } catch(err) {
        console.error(err);
        return null;
    }
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const imageFile = document.getElementById('profilePic').files[0];
        if(!imageFile) {
            return showAlert("تنبيه ⚠️", "الصورة الشخصية إجبارية لإتمام عملية التسجيل، برجاء رفع صورتك.");
        }

        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'جاري التحقق ورفع الصورة... ⏳';
        submitBtn.disabled = true;

        const phone = document.getElementById('studentPhone').value;
        const parentPhone = document.getElementById('parentPhone').value;
        const fullName = document.getElementById('fullName').value;
        const password = document.getElementById('password').value;
        const grade = document.getElementById('grade').value;
        const governorate = document.getElementById('governorate').value;
        const address = document.getElementById('address').value;

        try {
            const q = query(collection(db, "users"), where("studentPhone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                showAlert("عذراً ⚠️", "رقم الهاتف ده مسجل بيه حساب قبل كده.");
                submitBtn.textContent = 'إنشاء الحساب الآن'; submitBtn.disabled = false;
                return; 
            }

            // رفع الصورة
            const picUrl = await uploadProfilePic(imageFile);
            if(!picUrl) {
                showAlert("خطأ", "حدثت مشكلة أثناء رفع الصورة، جرب صورة أخرى.");
                submitBtn.textContent = 'إنشاء الحساب الآن'; submitBtn.disabled = false;
                return;
            }

            await addDoc(collection(db, "users"), {
                studentPhone: phone,
                parentPhone: parentPhone,
                fullName: fullName,
                password: password,
                grade: grade,
                governorate: governorate,
                address: address,
                profilePic: picUrl,
                myCourses: [],
                completedExams: [],
                deviceId: "", 
                walletBalance: 0,
                isBlocked: false,
                createdAt: new Date().toISOString()
            });

            document.getElementById('successModal').classList.add('active');

        } catch (error) {
            console.error(error);
            showAlert("مشكلة تقنية", "حدث خطأ أثناء الاتصال بقاعدة البيانات.");
            submitBtn.textContent = 'إنشاء الحساب الآن'; submitBtn.disabled = false;
        }
    });
}
