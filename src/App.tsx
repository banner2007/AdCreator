import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, logOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from './types';
import { OperationType, handleFirestoreError } from './lib/firebase';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync/Load profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              credits: 5, // 5 free credits for new users
              subscriptionPlan: 'free',
            };
            await setDoc(userDocRef, { ...newProfile, createdAt: serverTimestamp() });
            setProfile(newProfile);
          } else {
            setProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 font-sans border-[12px] border-slate-200">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando Sistemas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {!user ? (
        <Landing onLogin={signInWithGoogle} />
      ) : (
        <Dashboard user={user} profile={profile} onLogout={logOut} refreshProfile={async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) setProfile(userDoc.data() as UserProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        }} />
      )}
    </div>
  );
}
