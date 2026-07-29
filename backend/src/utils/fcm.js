// FCM placeholder — replace with real Firebase Admin SDK integration
// 1. Install: npm install firebase-admin
// 2. Download service account key from Firebase Console > Project Settings > Service Accounts
// 3. Save it as serviceAccountKey.json in backend root
// 4. Uncomment and configure below:
//
// const admin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function sendPushNotification(userId, title, body) {
  // const message = { notification: { title, body }, token: userFcmToken };
  // await admin.messaging().send(message);
  console.log(`[FCM Placeholder] Notification to user ${userId}: ${title} - ${body}`);
}

module.exports = { sendPushNotification };
