<script setup>
import { useFirestore, useCurrentUser } from 'vuefire'
import { useCollection } from 'vuefire'
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import {onMounted, ref} from 'vue';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth, firestore } from "./firebaseconfig.js";

const db = useFirestore();
const users = useCollection(collection(db, 'users'));

const tvName = ref('');
const indicator = ref('');
const user = useCurrentUser()
const email = ref('');
const password = ref('');
const message = ref();
const error = ref('');
const records = ref([]);

onMounted(async () => {
  try {
    const querySnapshot = await getDocs(collection(firestore, 'data'));
    records.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    error.value = '';
  } catch (err) {
    error.value = err.message;
  }
});

const addWatchedMovie = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not logged in");
    }

    const userRef = doc(db, 'users', user.uid);
    const watchedMoviesRef = collection(userRef, 'watchedMovies');

    // Use movie title as the custom document title
    const movieTitle = tvName.value;
    const movieRef = doc(watchedMoviesRef, movieTitle);

    await setDoc(movieRef, {
      title: movieTitle,
      // Add other movie data as needed
    });

    console.log('Watched movie added:', movieTitle);
  } catch (err) {
    console.error('Error adding watched movie:', err);
  }
};
</script>

<template>
  <div>
    <v-btn>
      Button
    </v-btn>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
    <ul>
      <li v-for="todo in users" :key="todo.id">
        <span>{{ todo.name }}</span>
      </li>
    </ul>

    <div>
      <h1>Insert Data</h1>
      <form @submit.prevent="addWatchedMovie">
        <input v-model="tvName" type="text" placeholder="TV Name" required />
        <input v-model="indicator" type="text" placeholder="Indicator" required />
        <button type="submit">Submit</button>
      </form>
      <p v-if="error">{{ error }}</p>
    </div>

    <div>
      <h1>Sign Up</h1>
      <form @submit.prevent="signUp">
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
      <p v-if="error">{{ error }}</p>
    </div>

    <div>
      <h1>Reset Password</h1>
      <form @submit.prevent="sendPasswordReset">
        <input v-model="email" type="email" placeholder="Enter your email" required />
        <button type="submit">Reset Password</button>
      </form>
      <p v-if="message">{{ message }}</p>
      <p v-if="error">{{ error }}</p>
    </div>

    <div>
      <h1>Login</h1>
      <form @submit.prevent="login">
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
      <p v-if="error">{{ error }}</p>
    </div>

    <div>
      <h1>Logout</h1>
      <button @click="logout">Logout</button>
      <p v-if="error">{{ error }}</p>
    </div>

    <div>
      <h1>Records</h1>
      <ul>
        <li v-for="record in records" :key="record.id">
          {{ record.tv_name }} - {{ record.indicator }}
        </li>
      </ul>
      <p v-if="error">{{ error }}</p>
    </div>

    <div v-if="user">
      {{ user.providerData }}
    </div>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
