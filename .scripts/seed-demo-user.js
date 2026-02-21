const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const userId = 'YvPuDRdH8TUvTZeYoD8kziGHSWl1';

async function seed() {
    console.log(`Demo kullanıcı (${userId}) için 14 günlük veri oluşturuluyor...`);

    // 1. Create Tasks
    const taskNames = [
        "Reserching Focus Techniques",
        "Designing Flowtime Dashboard",
        "Database Integration for Analytics",
        "Refining Landing Page Visuals",
        "Studying Deep Work Methodology"
    ];

    const tasks = [];
    for (const name of taskNames) {
        const taskRef = db.collection('tasks').doc();
        const taskData = {
            id: taskRef.id,
            userId,
            title: name,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: 'medium',
            focusMinutes: 0
        };
        await taskRef.set(taskData);
        tasks.push(taskData);
    }

    console.log(`${tasks.length} görev oluşturuldu.`);

    // 2. Create Sessions
    const now = new Date();
    let totalSessions = 0;

    for (let day = 13; day >= 0; day--) {
        const currentDay = new Date(now);
        currentDay.setDate(currentDay.getDate() - day);

        // 1 to 5 sessions per day
        const numSessions = 1 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numSessions; i++) {
            const task = tasks[Math.floor(Math.random() * tasks.length)];

            // Random start time between 9 AM and 6 PM
            const startHour = 9 + Math.floor(Math.random() * 9);
            const startMinute = Math.floor(Math.random() * 60);

            const startedAt = new Date(currentDay);
            startedAt.setHours(startHour, startMinute, 0, 0);

            // Duration 25-75 mins
            const durationSeconds = (25 + Math.floor(Math.random() * 50)) * 60;
            const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

            // Break 5-15 mins
            const breakDurationSeconds = (5 + Math.floor(Math.random() * 10)) * 60;

            await db.collection('sessions').add({
                userId,
                taskId: task.id,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
                durationSeconds,
                breakDurationSeconds,
                createdAt: startedAt.toISOString()
            });

            // Update task focus minutes
            const min = Math.floor(durationSeconds / 60);
            await db.collection('tasks').doc(task.id).update({
                focusMinutes: admin.firestore.FieldValue.increment(min)
            });

            totalSessions++;
        }
    }

    console.log(`✓ İşlem tamam! Toplam ${totalSessions} seans oluşturuldu.`);
}

seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
