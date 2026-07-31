// تفعيل زرار الوضع الليلي
const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
    }
});

// تفعيل زرار رفع الصورة
const uploadBtn = document.getElementById('uploadBtn');
const profilePicInput = document.getElementById('profilePic');

uploadBtn.addEventListener('click', () => {
    profilePicInput.click();
});

// منع الفورم من عمل Refresh وتجهيز البيانات
const registerForm = document.getElementById('registerForm');
registerForm.addEventListener('submit', (e) => {
    e.preventDefault(); // بيمنع الصفحة تعمل ريفرش
    
    // تجميع البيانات من الحقول
    const studentData = {
        fullName: document.getElementById('fullName').value,
        studentPhone: document.getElementById('studentPhone').value,
        parentPhone: document.getElementById('parentPhone').value,
        grade: document.getElementById('grade').value,
        governorate: document.getElementById('governorate').value,
        address: document.getElementById('address').value,
        role: "student",
        walletBalance: 0,
        isBlocked: false,
        deviceId: "" // هيتحدث بعدين
    };

    console.log("البيانات جاهزة للرفع:", studentData);
    alert("البيانات اتجمعت بنجاح! جاهزين نربط فايربيز.");
});
