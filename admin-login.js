const WORKER_AUTH_URL = "https://ai.adelabdulrahman026.workers.dev";

let activeSessionId = "";

const credentialsForm = document.getElementById('adminCredentialsForm');
const otpForm = document.getElementById('adminOtpForm');
const subtitleEl = document.getElementById('adminCardSubtitle');
const btnSendOtp = document.getElementById('btnSendAdminOtp');
const btnVerifyOtp = document.getElementById('btnVerifyAdminOtp');
const btnBack = document.getElementById('btnBackToStep1');

// 1. إرسال الهاتف وكلمة المرور لطلب كود الـ OTP
credentialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('adminPhoneInput').value.trim();
    const password = document.getElementById('adminPasswordInput').value.trim();

    if (!phone || !password) {
        return showAlert('تنبيه', 'يرجى إدخال رقم الهاتف وكلمة المرور.');
    }

    btnSendOtp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btnSendOtp.disabled = true;

    try {
        const response = await fetch(WORKER_AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "admin_request_otp",
                phone: phone,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            activeSessionId = data.sessionId;
            credentialsForm.style.display = 'none';
            otpForm.style.display = 'block';
            subtitleEl.innerHTML = `تم إرسال كود التحقق (OTP) في رسالة واتساب للرقم <strong style="color:#f59e0b">${phone}</strong>.`;
            document.getElementById('adminOtpInput').focus();
        } else {
            showAlert('فشل الدخول', data.error || 'بيانات الدخول غير صحيحة.');
        }
    } catch (err) {
        showAlert('خطأ في الاتصال', 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.');
    } finally {
        btnSendOtp.innerHTML = 'إرسال رمز الدخول 🚀';
        btnSendOtp.disabled = false;
    }
});

// 2. التحقق من كود الـ OTP وحفظ بيانات الجلسة
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const otp = document.getElementById('adminOtpInput').value.trim();
    if (otp.length < 6) {
        return showAlert('تنبيه', 'رمز التحقق يجب أن يتكون من 6 أرقام.');
    }

    btnVerifyOtp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btnVerifyOtp.disabled = true;

    try {
        const response = await fetch(WORKER_AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "admin_verify_otp",
                sessionId: activeSessionId,
                otp: otp
            })
        });

        const data = await response.json();

        if (data.success) {
            // حفظ بيانات الجلسة المشفرة والصلاحيات
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('role', data.role); // 'superadmin' أو 'assistant'
            localStorage.setItem('astName', data.name);
            localStorage.setItem('astTeacher', data.targetTeacher || '');
            localStorage.setItem('astPerms', JSON.stringify(data.permissions || []));
            sessionStorage.setItem('primee_admin_auth', data.adminToken);

            window.location.replace('admin-dashboard.html');
        } else {
            showAlert('رمز غير صحيح', data.error || 'رمز الـ OTP غير صحيح أو انتهت صلاحيته.');
        }
    } catch (err) {
        showAlert('خطأ', 'حدث خطأ أثناء التحقق من الرمز.');
    } finally {
        btnVerifyOtp.innerHTML = 'تأكيد الدخول للنظام ✔️';
        btnVerifyOtp.disabled = false;
    }
});

btnBack.addEventListener('click', () => {
    otpForm.style.display = 'none';
    credentialsForm.style.display = 'block';
    subtitleEl.innerText = 'الوصول مصرح للمديرين فقط';
    document.getElementById('adminOtpInput').value = '';
});
