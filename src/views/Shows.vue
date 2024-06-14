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
            label="Search shows"
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
            v-for="(show, i) in shows"
            :key="i"
            :value="show"
        >
          <v-expansion-panel-title disable-icon-rotate>
            <div class="text-center">
              <v-menu
                  v-model="show.menu"
                  :close-on-content-click="false"
                  location="end"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                      color="indigo"
                      icon="mdi-plus-circle"
                      variant="plain"
                      v-bind="props"
                  >
                  </v-btn>
                </template>

                <v-card min-width="300">
                  <div class="d-flex justify-center align-center">
                    <v-sheet class="ma-2 pa-2">
                      <v-text-field
                          v-model="s"
                          density="compact"
                          variant="outlined"
                          :counter="10"
                          label="S"
                          hide-details
                          required
                          width="50"
                          height="50"
                          @input="validateNumberInput('s', $event)"
                      ></v-text-field>
                    </v-sheet>
                    <v-sheet>
                      x
                    </v-sheet>
                    <v-sheet class="ma-2 pa-2">
                      <v-text-field
                          v-model="e"
                          density="compact"
                          variant="outlined"
                          :counter="10"
                          label="E"
                          hide-details
                          required
                          width="50"
                          height="50"
                          @input="validateNumberInput('e', $event)"
                      ></v-text-field>
                    </v-sheet>
                  </div>

                  <v-divider></v-divider>


                  <v-card-actions>
                    <v-spacer></v-spacer>

                    <v-btn
                        variant="text"
                        @click="show.menu = false"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="text"
                        @click="addEp(show.id), show.menu = false"
                    >
                      Save
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </div>
            {{ show.id }}
            <template v-slot:actions>
              <v-icon color="error" icon="mdi-delete-sweep" @click="deleteShow(show.id)"/>
            </template>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                  density="compact"
                  v-for="(ep, j) in show.episodes"
                  :key="j"
                  :value="ep"
                  color="primary"
                  variant="plain"
              >
                <template v-slot:title>
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <v-chip color="primary">
                        <v-tooltip
                            activator="parent"
                            location="top"
                        >{{ toDMYHM(ep.timestamp.toDate()) }}</v-tooltip>
                        {{ ep.indicator }}
                      </v-chip>
                      <v-btn v-if="ep.url" variant="plain" @click="openTab(ep.url)">
                        <v-icon icon="mdi-location-enter"></v-icon>
                        <v-tooltip
                            activator="parent"
                            location="top"
                        >{{ ep.url }}</v-tooltip>
                      </v-btn>
                    </div>

                    <div>

                      <v-btn
                          color="grey-lighten-1"
                          icon="mdi-delete-sweep"
                          variant="text"
                          @click="deleteEp(show.id, ep.id)"
                      ></v-btn>
                    </div>
                  </div>
                </template>
                <div class="d-flex justify-center align-center">
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
import { ref, onMounted } from 'vue';
import {
  doc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  deleteDoc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import {useFirestore} from "vuefire";
import {auth} from "../firebaseconfig.js";
import useDateTranslator from "../composables/useDateHelper.js";

const { toDMYHM } = useDateTranslator();

const user = auth.currentUser;
const shows = ref([]);
const loading = ref(true);
const db = useFirestore();
const searchQuery = ref('');
const s = ref('');
const e = ref('');

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

function validateNumberInput(fieldName, event) {
  // Remove non-numeric characters (except for the minus sign if it's the first character)
  const sanitizedValue = event.target.value.replace(/\D/g, '');

  // Update the model with the sanitized value
  if (fieldName === 's') {
    s.value = sanitizedValue;
  } else if (fieldName === 'e') {
    e.value = sanitizedValue;
  }
}
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

const deleteEp = async (showId, episodeId) => {
  try {
    if (!user || !showId || !episodeId) {
      return;
    }

    // Reference to the specific episode document
    const userRef = doc(db, 'users', user.uid);
    const showRef = doc(userRef, 'shows', showId);
    const episodeRef = doc(collection(showRef, 'episodes'), episodeId);

    await deleteDoc(episodeRef);

    searchQuery.value = '';
  } catch (err) {
    searchQuery.value = '';
    console.error(err);
  }
};

const addEp = async (showId) => {
  try {
    if (!user || !showId || s.value.trim() === '' || e.value.trim() === '') {
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    const showRef = doc(collection(userRef, 'shows'), showId);

    const episodesCollectionRef = collection(showRef, 'episodes');

    // Get the current episodes
    const episodesQuery = query(episodesCollectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(episodesQuery);

    let episodes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // If there are 3 or more episodes, delete the oldest one
    if (episodes.length >= 3) {
      const oldestEpisode = episodes[episodes.length - 1];
      const oldestEpisodeRef = doc(episodesCollectionRef, oldestEpisode.id);
      await deleteDoc(oldestEpisodeRef);
    }
    // Add the new episode
    const newEpisodeRef = doc(episodesCollectionRef);
    await setDoc(newEpisodeRef, {
      indicator: `${s.value.trim()}x${e.value.trim()}`,  // e.g., "3x4"
      timestamp: new Date(),
    });
    s.value = '';
    e.value = '';
    searchQuery.value = '';
  } catch (err) {
    s.value = '';
    e.value = '';
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

const openTab = (url) => {
  chrome.runtime.sendMessage({ type: 'OPENTAB', url: url });
}
</script>
