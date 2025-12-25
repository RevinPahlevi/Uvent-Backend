const admin = require('firebase-admin');

let firebaseInitialized = false;

try {
    const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✓ Firebase Admin SDK initialized successfully');

} catch (error) {
    console.error('⚠️ Firebase Admin SDK initialization failed:', error.message);
    console.error('Push notifications will NOT work. In-app notifications will still work.');
    console.error('To fix: ');
    console.error('1. Run: npm install firebase-admin');
    console.error('2. Download serviceAccountKey.json from Firebase Console');
    console.error('3. Place it in backend/config/ folder');
}

module.exports = {
    admin,
    firebaseInitialized
};
