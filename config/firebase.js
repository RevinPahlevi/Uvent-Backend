// Firebase Admin SDK Configuration
// Purpose: Initialize Firebase for sending push notifications via FCM
// Created: 2025-12-17

const admin = require('firebase-admin');

// IMPORTANT: You need to download serviceAccountKey.json from Firebase Console
// Firebase Console → Project Settings → Service Accounts → Generate New Private Key
// Place the file in this config/ directory
// 
// ⚠️ SECURITY: Add serviceAccountKey.json to .gitignore!
// ⚠️ PRODUCTION: Use environment variables instead of file

let firebaseInitialized = false;

try {
    // Check if firebase-admin is installed
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
