<script setup>
import {computed, ref} from "vue";
import {sendPasswordResetEmail} from "firebase/auth";
import {auth} from "../firebaseconfig.js";

const email = ref('');
const error = ref('');
const message = ref('');
const sendPasswordReset = async () => {
  try {
    error.value = '';
    await sendPasswordResetEmail(auth, email.value);
    message.value = 'Password reset email sent!';
    email.value = '';
  } catch (err) {
    error.value = err.message;
    message.value = '';
  }
};
const hasError = computed(() => {
  return error.value !== '';
})

const sent = computed(() => {
  return message.value === 'Password reset email sent!';
})

const rules = {
  required: value => !!value || 'Required.',
  email: value => {
    const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return pattern.test(value) || 'Invalid e-mail.'
  },
}
</script>

<template>
  <div>
    <v-container
        class="mx-auto pa-8 pb-4"
        max-width="448"
        rounded="lg"
    >
      <v-text-field
          v-model="email"
          :rules="[rules.required, rules.email]"
          density="compact"
          placeholder="Email address"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
      ></v-text-field>

      <v-btn
          color="blue"
          size="large"
          variant="tonal"
          block
          text="Send Reset Link"
          append-icon="mdi-fish"
          @click="sendPasswordReset"
      >
      </v-btn>
    </v-container>
  </div>
  <v-snackbar v-model="sent" color="success">
    {{ message }}
  </v-snackbar>

  <v-snackbar v-model="hasError" color="error">
    {{ error }}
  </v-snackbar>
</template>