const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json');

// 1. تهيئة السيرفر بصلاحيات الأدمن
initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

// ==========================================================
// ⚙️ إعدادات الاختبار
// ==========================================================
const NUMBER_OF_STUDENTS = 20; // 👈 غيّر الرقم ده للعدد اللي إنت عايزه (مثلاً 50 أو 100)
const DEFAULT_PASSWORD = "Password123!"; // كلمة المرور الموحدة لحسابات الاختبار

// بيانات تجريبية لتوليد أسماء ومحافظات ومراحل عشوائية واقعية
const firstNames = ["أحمد", "محمد", "محمود", "يوسف", "عمر", "علي", "إبراهيم", "زياد", "مريم", "سارة", "نور", "ملك", "فاطمة", "شهد"];
const lastNames = ["عادل", "حسن", "السيد", "محمود", "كمال", "مصطفى", "إبراهيم", "طارق", "فؤاد", "خالد", "عبدالرحمن"];
const grades = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الثالث الإعدادي", "الأول بكالوريا", "الثاني بكالوريا"];
const governorates = ["الإسكندرية", "القاهرة", "الجيزة", "البحيرة", "الغربية", "الشرقية", "الدقهلية", "أسيوط"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomPhone(index) {
  // توليد رقم مصري فريد للاختبار
  const paddedIndex = String(index).padStart(6, '0');
  return `0109${paddedIndex}`;
}

async function seedTestStudents(count) {
  console.log(`🚀 جاري بدء اختبار المنصة وتوليد ${count} طالب...`);
  const startTime = Date.now();

  let successCount = 0;
  let batch = db.batch();
  let batchCounter = 0;

  for (let i = 1; i <= count; i++) {
    const studentPhone = generateRandomPhone(i + Math.floor(Math.random() * 90000));
    const fakeEmail = `${studentPhone}@primee.com`;
    const fullName = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)} (طالب تجريبي)`;
    const grade = getRandomItem(grades);
    const governorate = getRandomItem(governorates);
    const parentPhone = `011${Math.floor(10000000 + Math.random() * 90000000)}`;

    try {
      // 1. إنشاء المستخدم في Firebase Authentication
      const userRecord = await auth.createUser({
        email: fakeEmail,
        password: DEFAULT_PASSWORD,
        displayName: fullName
      });

      // 2. تجهيز الداتا بيز في Firestore
      const userRef = db.collection('users').doc(userRecord.uid);
      batch.set(userRef, {
        fullName: fullName,
        studentPhone: studentPhone,
        parentPhone: parentPhone,
        grade: grade,
        governorate: governorate,
        address: `${governorate} - شارع تجريبي`,
        walletBalance: Math.floor(Math.random() * 300), // رصيد عشوائي للاختبار
        isBlocked: false,
        myCourses: [],
        myPackages: [],
        followingTeachers: [],
        notifications: [
          {
            title: "مرحباً بك في المنصة 🎉",
            text: "تم تفعيل حسابك بنجاح. نتمنى لك التفوق والنجاح!",
            date: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      });

      batchCounter++;
      successCount++;

      // Firestore Batch يقبل كحد أقصى 500 عملية في المرة الواحدة
      if (batchCounter >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCounter = 0;
        console.log(`💾 تم حفظ دفعة من الطلاب بنجاح...`);
      }

    } catch (err) {
      console.error(`⚠️ تخطي الطالب رقم ${i} بسبب خطأ:`, err.message);
    }
  }

  // حفظ أي عمليات متبقية في الـ Batch
  if (batchCounter > 0) {
    await batch.commit();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n==================================================`);
  console.log(`✅ تم إنشاء ${successCount} طالب بنجاح خلال ${duration} ثانية!`);
  console.log(`🔑 كلمة المرور الموحدة لجميع الحسابات: ${DEFAULT_PASSWORD}`);
  console.log(`==================================================\n`);

  process.exit(0);
}

// تشغيل السكريبت
seedTestStudents(NUMBER_OF_STUDENTS);
