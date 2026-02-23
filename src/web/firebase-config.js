// Firebase configuration — proyecto: neostech (GCP project ID: neos-tech)
// ⚠️  Los valores de authDomain, storageBucket y projectId son generados por Firebase
//     y no pueden cambiarse sin migrar al proyecto neostech.
//     Para migrar: crear proyecto GCP "neostech", exportar Firestore, actualizar estos valores.
const firebaseConfig = {
    apiKey: "AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw",
    authDomain: "neos-tech.firebaseapp.com",
    projectId: "neos-tech",
    storageBucket: "neos-tech.firebasestorage.app",
    messagingSenderId: "738411977369",
    appId: "1:738411977369:web:7facc71cea4c271d217608",
    measurementId: "G-DL4X5MX5JL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebase, db, auth };
}
