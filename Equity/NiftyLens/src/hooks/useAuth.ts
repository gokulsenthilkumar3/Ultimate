'use client'
import { useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '@/lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth || !firebaseConfigured) { setLoading(false); return undefined }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase authentication is not configured.')
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  const signInWithEmail = (email: string, password: string) =>
    auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase authentication is not configured.'))

  const signUpWithEmail = (email: string, password: string) =>
    auth ? createUserWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase authentication is not configured.'))

  const resetPassword = (email: string) =>
    auth ? sendPasswordResetEmail(auth, email) : Promise.reject(new Error('Firebase authentication is not configured.'))

  const signOut = () => auth ? firebaseSignOut(auth) : Promise.resolve()

  return { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut }
}
