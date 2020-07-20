import * as firebase from "firebase-admin";
import * as serviceAccount from "../serviceAccountKey.json";

const firebaseApp = firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount as any),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const firestore = firebaseApp.firestore();
export default firestore;
