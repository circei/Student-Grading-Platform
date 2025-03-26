import { Injectable } from "@angular/core";
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where, writeBatch } from "@angular/fire/firestore";
import { catchError, from, map, Observable, tap, throwError } from "rxjs";

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  constructor(private firestore: Firestore) {}

  // Save a new user profile with default category & expense
  saveUserProfile(userId: string, email: string, hashedPassword: string): Observable<void> {
    const userRef = doc(this.firestore, `users/${userId}`);
    const expensesRef = collection(this.firestore, `users/${userId}/expenses`);
    const categoriesRef = collection(this.firestore, `users/${userId}/categories`);

    const batch = writeBatch(this.firestore);

    // Add user doc
    batch.set(userRef, { email, hashedPassword, createdAt: new Date(), weeklyBudget:0,lastWeeklyBudgetUpdate: new Date() });

    // Commit the batch and return an Observable
    return from(batch.commit()).pipe(
      map(() => void 0), // Ensure the Observable resolves to void
      catchError((error) => {
        console.error('Error saving user profile:', error);
        return throwError(() => error);
      })
    );
  }

  getUserProfile(userId: string): Observable<any> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data();
        } else {
          throw new Error('User profile not found');
        }
      })
    );
  }
  
  // Update user password
  updateUserPassword(userId: string, hashedPassword: string): Observable<void> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return from(updateDoc(userRef, { hashedPassword })).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error updating password:', error);
        return throwError(() => error);
      })
    );
  }

}