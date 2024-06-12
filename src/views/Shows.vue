<template>
  <template v-if="!loading">
    <v-card
        class="mx-auto mt-2"
        color="surface-light"
        max-width="400"
    >
      <v-card-text>
        <v-text-field
            v-model="searchQuery" placeholder="Search shows..." @keyup.enter="searchShows"
            :loading="loading"
            append-inner-icon="mdi-magnify"
            density="compact"
            label="Search templates"
            variant="solo"
            hide-details
            single-line
            @click:append-inner="searchShows"
        ></v-text-field>
      </v-card-text>
    </v-card>

    <v-card class="ma-2 pa-2">
      <div v-if="loading">Loading...</div>
      <div v-if="!loading && shows.length === 0">No shows found.</div>
      <v-expansion-panels v-else>

        <v-expansion-panel
            density="compact"
            v-for="(item, i) in shows"
            :key="i"
            :value="item"
        >
          <v-expansion-panel-title disable-icon-rotate>
            {{ item.id }}
            <template v-slot:actions>
              <v-icon color="error" icon="mdi-delete-sweep" @click="deleteShow(item.id)"/>
            </template>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                  density="compact"
                  v-for="(item, i) in item.episodes"
                  :key="i"
                  :value="item"
                  color="primary"
                  variant="plain"
              >
                <template v-slot:title>
                  <div class="d-flex justify-space-between align-center">
                    <v-chip color="primary">
                      {{ item.indicator }}
                    </v-chip>
                    <div>
                      {{ toDMYHM(item.timestamp.toDate()) }}
                    </div>
                    <div>
                      <v-btn
                          color="grey-lighten-1"
                          icon="mdi-delete-sweep"
                          variant="text"
                      ></v-btn>
                    </div>
                  </div>
                </template>
                <div class="d-flex justify-center align-center">
                  <hr style="height:1px;border-width:0;color:gray;background-color:gray; width: 10%;"/>
                </div>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>
  </template>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import {doc, collection, getDocs, query, orderBy, limit, where, deleteDoc, onSnapshot} from 'firebase/firestore';
import {useFirestore} from "vuefire";
import {auth} from "../firebaseconfig.js";
import useDateTranslator from "../composables/useDateHelper.js";

const { toDMYHM, toHumanReadable } = useDateTranslator();

const user = auth.currentUser;
const shows = ref([]);
const loading = ref(true);
const db = useFirestore();
const searchQuery = ref('');

onMounted(async () => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const showsCollectionRef = collection(userRef, 'shows');

    // Get all shows for the user
    const showsQuery = query(
        showsCollectionRef,
        orderBy('timestamp', 'desc'), // Assuming you have a 'timestamp' field
        limit(3)
    );

    // Set up real-time listener for shows
    onSnapshot(showsQuery, async (showsSnapshot) => {
      const showsData = [];

      for (const showDoc of showsSnapshot.docs) {
        const showData = { id: showDoc.id, ...showDoc.data(), episodes: [] };
        console.log('Fetching episodes for show:', showDoc.id);

        const episodesCollectionRef = collection(showDoc.ref, 'episodes');
        const episodesQuery = query(episodesCollectionRef, orderBy('timestamp', 'desc'));

        // Set up real-time listener for episodes
        onSnapshot(episodesQuery, (episodesSnapshot) => {
          showData.episodes = episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Find and update the show data in showsData
          const index = showsData.findIndex(show => show.id === showDoc.id);
          if (index !== -1) {
            showsData[index] = showData;
          } else {
            showsData.push(showData);
          }

          // Update the shows reactive variable
          shows.value = [...showsData];
        });
      }

      // Update the shows reactive variable if all shows are deleted
      if (showsSnapshot.empty) {
        shows.value = [];
      }
    });
  } catch (error) {
    console.error('Error fetching shows or episodes:', error);
  } finally {
    loading.value = false;
  }
});


const searchShows = async () => {
  if (loading.value === true) return;
  loading.value = true;
  try {
    const userRef = doc(db, 'users', user.uid);
    const showsCollectionRef = collection(userRef, 'shows');

    const sq = manipulateString(searchQuery.value);
    const showsQuery = query(
        showsCollectionRef,
        where('title', '>=', sq),
        where('title', '<=', sq + '\uf8ff'),
        orderBy('title'),
        limit(3)
    );

    const showsSnapshot = await getDocs(showsQuery);
    console.error(showsSnapshot.docs);
    const showsData = [];

    for (const showDoc of showsSnapshot.docs) {
      const showData = { id: showDoc.id, ...showDoc.data(), episodes: [] };
      const episodesCollectionRef = collection(showDoc.ref, 'episodes');
      const episodesQuery = query(episodesCollectionRef, orderBy('timestamp', 'desc'));
      const episodesSnapshot = await getDocs(episodesQuery);
      showData.episodes = episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      showsData.push(showData);
    }

    shows.value = showsData;
  } catch (error) {
    console.error('Error fetching shows or episodes:', error);
  } finally {
    loading.value = false;
  }
};

const deleteShow = async (id) => {
  try {
    if (!user || !id) { // Corrected the condition
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    const targetRef = doc(collection(userRef, 'shows'), id);
    await deleteDoc(targetRef);
    searchQuery.value = '';
  } catch (err) {
    searchQuery.value = '';
    console.error(err);
  }
};

function manipulateString(input) {
  // Step 1: Delete spaces at start and end
  let manipulatedString = input.trim();

  // Any Character -> English Characters
  manipulatedString = manipulatedString.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Step 2: Replace special characters with space
  manipulatedString = manipulatedString.replace(/[^\w\s]/g, ' ');

  // Step 3: Delete extra spaces between words
  manipulatedString = manipulatedString.replace(/\s+/g, ' ');

  // Step 4: Make it uppercase
  manipulatedString = manipulatedString.toUpperCase();

  return manipulatedString.trim();
}
</script>
