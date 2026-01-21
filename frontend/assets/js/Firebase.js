  // Import the functions you need from the SDKs you need

  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

  // TODO: Add SDKs for Firebase products that you want to use

  // https://firebase.google.com/docs/web/setup#available-libraries


  // Your web app's Firebase configuration

  // For Firebase JS SDK v7.20.0 and later, measurementId is optional

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

  const app = initializeApp(firebaseConfig);

  const analytics = getAnalytics(app);
