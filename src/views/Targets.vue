<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import { auth } from '../firebaseconfig.js';
import {collection, doc, getDocs, setDoc, onSnapshot, deleteDoc} from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const user = auth.currentUser;
const targets = ref([]);
const db = useFirestore();
const target = ref('');

const loaded = ref(false);
const loading = ref(false);
const error = ref('');


onMounted(async () => {
  try {
    if (!user) {
      error.value = "you are not logged in, process terminated."
      return;
    }
    const userDocRef = doc(db, 'users', user.uid);
    const targetsCollectionRef = collection(userDocRef, 'targets');

    // Set up a real-time listener for changes in the "targets" collection
    onSnapshot(targetsCollectionRef, (querySnapshot) => {
      targets.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  } catch (err) {
    error.value = "Error fetching targets: " + err;
  }
});


const addTarget = async () => {
  const url = target.value.trim();
  if (!user) {
    error.value = "You are not logged in! Use logout button and re-login.";
    return;
  } else if (!validateUrl(url)){
    error.value = "Invalid URL type. (https://site.com/) <-> " + url;
    return;
  } else if (loading.value){
    error.value = "Still in progress!";
    return;
  } else if (targets.value.length >= 7){
    return;
  }

  loading.value = true;

  setTimeout(async () => {
    const userRef = doc(db, 'users', user.uid);

    const targetRef = doc(collection(userRef, 'targets'), extractDomainName(url));

    await setDoc(targetRef, {
      target: extractDomainName(url),
    }).then(() => {
      target.value = '';
      chrome.runtime.sendMessage({ type: 'FETCH_TARGET' });
      loading.value = false;
      loaded.value = true;
      clearError()
    }).catch((err) => {
      error.value = "Something went wrong during insert action: " + err.message;
    });
  }, 2000);
};

// TODO: English Character only
const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to extract domain name
const extractDomainName = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return '';
  }
};

// Function to delete a target
const deleteTarget = async (id) => {
  try {
    if (!user || !id) { // Corrected the condition
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    const targetRef = doc(collection(userRef, 'targets'), id);
    await deleteDoc(targetRef);
    chrome.runtime.sendMessage({ type: 'FETCH_TARGET' });
    clearError()
  } catch (err) {
    error.value = "Something went wrong during delete action: " + err.message;
  }
};
const skelton = ref(true);
watch(() => targets.value, (newValue) => {
  if (newValue === undefined) {
    skelton.value = true;
  } else {
    skelton.value = false;
  }
});
const hasError = computed(() => {
  return error.value !== '';
})
const clearError = () => {
  error.value = "";
}
</script>
<template>
  <div>
    <template v-if="skelton">
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
      <v-container
          class="mx-auto pa-2"
          max-width="448"
          rounded="lg"
      >
        <v-card
            class="mx-auto"
            color="surface-light"
            max-width="400"
        >
          <v-card-text v-if="targets.length < 7">
            <v-text-field
                v-model="target"
                :loading="loading"
                append-inner-icon="mdi-plus-circle"
                density="compact"
                label="https://site.com/"
                variant="solo"
                hide-details
                single-line
                @click:append-inner="addTarget"
                @keyup.enter="addTarget"
            ></v-text-field>
          </v-card-text>
          <v-card-text v-else>
            You can listen only 7 web site.
          </v-card-text>
        </v-card>
        <v-card class="mt-2">
          <v-list density="compact">
            <v-list-item
                density="compact"
                v-for="(item, i) in targets"
                :key="i"
                :value="item"
                color="primary"
                variant="plain"
                :title="item.target"
            >
              <template v-slot:append>
                <v-btn
                    color="grey-lighten-1"
                    icon="mdi-delete-sweep"
                    variant="text"
                    @click="deleteTarget(item.id)"
                ></v-btn>
              </template>
              <v-divider class="mt-2"></v-divider>
            </v-list-item>
          </v-list>
        </v-card>
      </v-container>
      <v-snackbar v-model="hasError" color="error" :timeout="200" @click="clearError" class="cursor-pointer">
        {{ error }}
      </v-snackbar>
    </template>
  </div>
</template>

<style scoped>

</style>
