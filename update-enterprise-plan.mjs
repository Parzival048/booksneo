/**
 * Update Enterprise User Plan
 * Run with: node update-enterprise-plan.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

async function updateEnterprisePlan() {
    try {
        console.log('Signing in as Enterprise user...');

        // Sign in first to get the user ID
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('Signed in. User ID:', user.uid);

        // Update user profile with correct field names (planId not plan_id)
        const userProfile = {
            email: email,
            full_name: 'Enterprise Admin',
            planId: 'enterprise',  // This is the field AuthContext looks for
            billing_cycle: 'yearly',
            plan_start_date: new Date().toISOString(),
            plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            transactionsThisMonth: 0,
            companiesCount: 0,
            updated_at: new Date().toISOString()
        };

        // Get existing doc to preserve created_at
        const docRef = doc(db, 'users', user.uid);
        const existingDoc = await getDoc(docRef);

        if (existingDoc.exists()) {
            userProfile.created_at = existingDoc.data().created_at;
        } else {
            userProfile.created_at = new Date().toISOString();
        }

        await setDoc(docRef, userProfile, { merge: true });

        console.log('\n✅ Enterprise Plan Updated Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('📋 Plan: Enterprise (Yearly)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\nAll features are now unlocked:');
        console.log('  ✓ Unlimited transactions');
        console.log('  ✓ Unlimited companies');
        console.log('  ✓ AI Categorization');
        console.log('  ✓ Bank Reconciliation');
        console.log('  ✓ Reports & Analytics');
        console.log('  ✓ Tally Sync');
        console.log('  ✓ API Access');
        console.log('  ✓ White Labeling');
        console.log('\nLogin at http://localhost:5173/login');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

updateEnterprisePlan();
