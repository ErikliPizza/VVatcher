<template>
  <div>
    <v-card
        class="mx-auto"
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

    <h1>User Shows</h1>
    <div v-if="loading">Loading...</div>
    <div v-if="!loading && shows.length === 0">No shows found.</div>
    <div v-else>
      <div v-for="show in shows" :key="show.id">
        <h2>{{ show.id }}</h2>
        <ul>
          <li v-for="episode in show.episodes" :key="episode.id">
            {{ episode.indicator }} - {{ episode.timestamp.toDate().toLocaleString() }} - <a :href="episode.url">Watch</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {doc, collection, getDocs, query, orderBy, limit, where} from 'firebase/firestore';
import {useFirestore} from "vuefire";
import {auth} from "../firebaseconfig.js";

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

    const showsSnapshot = await getDocs(showsQuery);

    const showsData = [];

    for (const showDoc of showsSnapshot.docs) {
      const showData = { id: showDoc.id, ...showDoc.data(), episodes: [] };
      console.log('Fetching episodes for show:', showDoc.id);

      const episodesCollectionRef = collection(showDoc.ref, 'episodes');
      const episodesQuery = query(episodesCollectionRef, orderBy('timestamp', 'desc'));
      const episodesSnapshot = await getDocs(episodesQuery);

      console.log('Episodes found for show', showDoc.id, ':', episodesSnapshot.docs.length);

      showData.episodes = episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      showsData.push(showData);
    }

    shows.value = showsData;
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
