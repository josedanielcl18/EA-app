/**
 * Firebase Configuration Module
 * 
 * Centralized Firebase configuration for all pages
 * Import this module instead of duplicating config in each HTML file
 * 
 * Usage:
 *   import { firebaseConfig, initializeFirebase } from './js/firebase-config.js';
 *   const { app, db, auth } = initializeFirebase();
 */

export const firebaseConfig = {
    apiKey: "AIzaSyDLfJ01cou9x4dBIirKbb016a69phKXOPc",
    authDomain: "ea-football-predictor.firebaseapp.com",
    projectId: "ea-football-predictor",
    storageBucket: "ea-football-predictor.firebasestorage.app",
    messagingSenderId: "419246128197",
    appId: "1:419246128197:web:3082ec10e3e4e81432b72c"
};

/**
 * Initialize Firebase and return app, db, and auth instances
 * Must be called after importing Firebase SDK modules
 * 
 * @returns {Object} Object containing { app, db, auth }
 */
export function initializeFirebase() {
    // These must be imported in the calling module before calling this function
    // Example:
    //   import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
    //   import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
    //   import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
    //   import { firebaseConfig, initializeFirebase } from "./js/firebase-config.js";
    
    throw new Error('initializeFirebase() is deprecated. Import Firebase modules directly and use firebaseConfig instead.');
}

/**
 * Helper to initialize Firebase in a module script
 * Returns an initialization function that the calling module should use
 * 
 * Usage in your module:
 *   import { firebaseConfig } from './js/firebase-config.js';
 *   import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
 *   import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
 *   import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
 *   
 *   const app = initializeApp(firebaseConfig);
 *   const db = getFirestore(app);
 *   const auth = getAuth(app);
 */
