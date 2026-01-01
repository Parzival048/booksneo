/**
 * Create Enterprise User Script
 * Run with: node create-enterprise-user.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBgX18lz-qi22NEGIPzjumHy3FUriVG1l4",
    authDomain: "booksneo-9723d.firebaseapp.com",
    projectId: "booksneo-9723d",
    storageBucket: "booksneo-9723d.firebasestorage.app",
    messagingSenderId: "276565858040",
    appId: "1:276565858040:web:ea594a25d23a7490b58d0d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enterprise user credentials
const email = 'enterprise@booksneo.in';
const password = 'Enterprise@2025';

async function createEnterpriseUser() {
    try {
        console.log('Creating Enterprise user...');

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User created:', user.uid);

        // Create user profile with Enterprise plan in Firestore
        const userProfile = {
            email: email,
            full_name: 'Enterprise Admin',
            plan_id: 'enterprise',
            plan_name: 'Enterprise',
            billing_cycle: 'yearly',
            plan_start_date: new Date().toISOString(),
            plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            transactionsThisMonth: 0,
            companiesCount: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        console.log('\\n✅ Enterprise User Created Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('📋 Plan: Enterprise (Yearly)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\\nFeatures unlocked:');
        console.log('  ✓ Unlimited transactions');
        console.log('  ✓ Unlimited companies');
        console.log('  ✓ AI Categorization');
        console.log('  ✓ Bank Reconciliation');
        console.log('  ✓ Reports & Analytics');
        console.log('  ✓ Tally Sync');
        console.log('  ✓ API Access');
        console.log('  ✓ White Labeling');

        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('\\n⚠️ User already exists! Use these credentials:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email:', email);
            console.log('🔑 Password:', password);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            console.error('Error creating user:', error);
        }
        process.exit(1);
    }
}

createEnterpriseUser();
