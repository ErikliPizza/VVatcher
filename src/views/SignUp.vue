<script setup>
import GuestAccounting from "../components/GuestAccounting.vue";
import {computed, ref} from "vue";
import {createUserWithEmailAndPassword} from "firebase/auth";
import {auth} from "../firebaseconfig.js";
import {doc, setDoc} from "firebase/firestore";
import {useFirestore} from "vuefire";

const db = useFirestore();

const email = ref('')
const password = ref('')
const error = ref('');
const loading = ref(false);
const process = ref('');
const createUser = async (email, password) => {
  createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up
        const user = userCredential.user;
        chrome.runtime.sendMessage({ type: 'LOGIN', user: user });
        return userCredential.user;
      })
      .catch((err) => {
        throw err;
      });
};
const setUserDoc = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {});
  } catch (err) {
    throw err;
  }
};

const signUp = async () => {
  if (loading.value === true) return;
  try {
    error.value = '';
    loading.value = true;
    process.value = "creating new user..";
    const uid = await createUser(email.value, password.value);
    process.value = "linking stuff to user.."
    await setUserDoc(uid);
    process.value = 'Successfully created!';
    setTimeout(() => {
      loading.value = false;
      setTimeout(()=> {
        process.value = '';
      }, 500);
    }, 1500);
    reset();
  } catch (err) {
    error.value = err.message || "An error occurred";
    loading.value = false;
    reset();
  }
};

const reset = () => {
  email.value = '';
  password.value = '';
}
const hasError = computed(() => {
  return error.value !== '';
})

const success = computed(() => {
  return process.value === 'Successfully created!';
})
</script>

<template>
  <GuestAccounting v-model:email="email" v-model:password="password" @submit="signUp"/>
  <v-snackbar v-model="loading" :color="success ? 'success' : 'light-green-lighten-4'">
    <v-card-text class="d-flex justify-space-between">
      <div>
        {{ process }}
      </div>
      <div>
        <v-progress-circular color="primary" indeterminate :size="24" v-if="!success"></v-progress-circular>
      </div>
    </v-card-text>
  </v-snackbar>

  <v-snackbar v-model="hasError" color="error">
    {{ error }}
  </v-snackbar>
</template>

<style scoped>

</style>