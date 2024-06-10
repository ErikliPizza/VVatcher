<script setup>
import {RouterView, useRouter} from "vue-router";
import {useCurrentUser} from "vuefire";
import {signOut} from "firebase/auth";
import {auth} from "../firebaseconfig.js";
import {computed, ref, watch} from "vue";

const user = useCurrentUser();
const router = useRouter();
const error = ref('');
const loading = ref(true); // Loading state

const goTo = (path) => {
  router.push(path);
}

const logout = async () => {
  try {
    await signOut(auth);
    chrome.runtime.sendMessage({ type: 'LOGOUT'});
    error.value = '';
  } catch (err) {
    error.value = err.message;
  }
};

const userName = computed(() => {
  // Splitting the email address by '@' symbol and taking the first part
  return user.value?.email.split('@')[0];
});

watch(() => user.value, (newValue) => {
  if (newValue === undefined) {
    loading.value = true;
  } else {
    loading.value = false;
    if (!newValue) {
      router.push({ name: 'Sign In' }); // Redirect to the sign-in route
    } else {
      router.push({ name: 'Targets' }); // Redirect to the home route
    }
  }
});
</script>

<template>
  <v-layout class="rounded rounded-md">
    <template v-if="loading">
      <v-main>
        <div>
          <v-container
              class="mx-auto d-flex justify-center align-center"
              max-width="448"
              rounded="lg"
              style="height: 100vh;"
          >
          <v-progress-circular indeterminate :size="64"></v-progress-circular>
          </v-container>
        </div>
      </v-main>
    </template>
    <template v-else>
      <v-app-bar v-if="user">
        <v-app-bar-nav-icon>
          <v-icon icon="mdi-face-woman-profile"></v-icon>
          <v-tooltip
              activator="parent"
              location="end"
          >{{ userName }}</v-tooltip>
        </v-app-bar-nav-icon>
        <v-spacer></v-spacer>
        <div>
          <v-btn @click="goTo('/targets')" class="me-5" :color="router.currentRoute.value.name === 'Targets' ? 'indigo-lighten-4' : 'indigo-lighten-0'" :elevation="router.currentRoute.value.name === 'Targets' ? '24' : '0'" :variant="router.currentRoute.value.name === 'Targets' ? 'tonal' : 'plain'">Targets</v-btn>
          <v-btn @click="goTo('/signup')" class="ms-5" :color="router.currentRoute.value.name === 'Sign Up' ? 'indigo-lighten-4' : 'indigo-lighten-0'" :variant="router.currentRoute.value.name === 'Sign Up' ? 'tonal' : 'plain'">Sign Up</v-btn>
        </div>
        <v-spacer></v-spacer>
        <template v-slot:append>
          <v-btn icon="mdi-logout" @click="logout"></v-btn>
        </template>
      </v-app-bar>

      <v-app-bar v-else>
        <v-spacer></v-spacer> <!-- Add another spacer to push buttons to the center -->
        <div>
          <v-spacer></v-spacer>
          <v-btn @click="goTo('/signin')" class="ms-5" :color="router.currentRoute.value.name === 'Sign In' ? 'indigo-lighten-4' : 'indigo-lighten-0'" :variant="router.currentRoute.value.name === 'Sign In' ? 'tonal' : 'plain'">Sign In</v-btn>
          <v-btn @click="goTo('/signup')" class="ms-5" :color="router.currentRoute.value.name === 'Sign Up' ? 'indigo-lighten-4' : 'indigo-lighten-0'" :variant="router.currentRoute.value.name === 'Sign Up' ? 'tonal' : 'plain'">Sign Up</v-btn>
        </div>
        <v-spacer></v-spacer> <!-- Add another spacer to push buttons to the center -->
      </v-app-bar>

      <v-main>
        <router-view></router-view>
      </v-main>
    </template>
  </v-layout>
</template>

<style scoped>
/* Add any additional styling you need */
</style>
