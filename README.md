# SportClub PWA — Οδηγίες εγκατάστασης (Ελληνικά)

Αυτό το παράδειγμα περιλαμβάνει τα απαραίτητα αρχεία για να λειτουργήσει η εφαρμογή ως PWA και να συγχρονίζει δεδομένα με Firebase Firestore.

Βασικά βήματα:
1. Προσθήκη icons
   - Βάλε τα αρχεία:
     - `/web-app-manifest-192x192.png`
     - `/web-app-manifest-512x512.png`
   - Μπορείς να αλλάξεις τα ονόματα στο `manifest.json`, αλλά ταιριάξε τα paths.

2. Firebase
   - Δημιούργησε ένα Firebase project (https://console.firebase.google.com).
   - Ενεργοποίησε Firestore (Firestore database).
   - Αντέγραψε το config object του project και επικόλλησέ το στο `firebase-config.js` (έγινε).
   - Ρύθμισε τους Firestore rules κατάλληλα. Σε δοκιμές, μπορείς να επιτρέψεις απλό κανόνα:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```
     Μην αφήσεις αυτόν τον κανόνα για παραγωγή — φτιάξε κατάλληλους κανόνες authentication/authorization.

3. Φιλοξενία (Hosting)
   - Το PWA χρειάζεται HTTPS για να λειτουργήσει σωστά (service workers).
   - Ιδέες: Firebase Hosting, GitHub Pages (με HTTPS), Netlify, Vercel.
   - Αν χρησιμοποιήσεις GitHub Pages, βεβαιώσου ότι όλα τα assets σερβίρονται από root ή τροποποίησε τα paths.

4. Εκτέλεση τοπικά
   - Μπορείς να σερβίρεις το φάκελο με έναν απλό static server (π.χ. `npx http-server -c-1 . -p 8080`) και να έχεις HTTPS μέσω εργαλείων όπως `mkcert` ή να αναπτύξεις σε Firebase Hosting.

5. Συμπεριφορά offline & συγχρονισμός
   - Η λογική: όταν offline, οι νέες εγγραφές μπαίνουν στον IndexedDB outbox. Όταν επανέλθεις online, το script στέλνει τα outbox items στο Firestore και τα διαγράφει.
   - Ο service-worker παρέχει caching του app shell ώστε η σελίδα να ανοίγει offline.

6. Βελτιώσεις για παραγωγή
   - Χρήση εξωτερικών βιβλιοθηκών IndexedDB (idb/dexie) για πιο στιβαρό persistence.
   - Χρήση Firebase Authentication για user-based data separation.
   - Περισσότερα checks και retry/backoff για sync.
   - Χρήση background sync API ή Workbox για πιο σύνθετες πολιτικές caching & sync.

Αν θες, μπορώ να φτιάξω PR από branch pwa-setup → main αφού ελέγξεις τα αρχεία.


---
