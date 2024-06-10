<script setup>
import GuestAccounting from "../components/GuestAccounting.vue";
import {computed, ref} from "vue";
import {signInWithEmailAndPassword} from "firebase/auth";
import {auth} from "../firebaseconfig.js";

const email = ref('')
const password = ref('')
const error = ref('');
const loading = ref(false);
const signIn = async () => {
  if (loading.value === true) return;
  error.value = '';
  loading.value = true;
  await lazyLogin(); // Await the lzy function call
  await signInWithEmailAndPassword(auth, email.value, password.value)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        chrome.runtime.sendMessage({ type: 'LOGIN', user: user });
        loading.value = false;
      })
      .catch((err) => {
        loading.value = false;
        error.value = err.message;
      });
};
async function lazyLogin() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1500);
  });
}

const hasError = computed(() => {
  return error.value !== '';
})
</script>

<template>
  <GuestAccounting v-model:email="email" v-model:password="password" @submit="signIn"/>
  <v-snackbar v-model="loading" color="light-green-lighten-4">
    <v-card-text class="d-flex justify-space-between">
      <div>
        Authorizing...
      </div>
      <div>
        <v-progress-circular color="primary" indeterminate :size="24"></v-progress-circular>
      </div>
    </v-card-text>
  </v-snackbar>

  <v-snackbar v-model="hasError" color="error">
    {{ error }}
  </v-snackbar>
</template>
