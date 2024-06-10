import {useFirestore} from "vuefire";
import {collection, doc, setDoc, Timestamp, onSnapshot, getDocs} from "firebase/firestore";
import { query, orderBy, limit, deleteDoc } from "firebase/firestore";

import {ref} from "vue";
import {useGenAi} from "./src/composables/useGenAi.js";
import "./src/firebaseconfig.js"

const db = useFirestore();

const user = ref();
let targets = [];


chrome.runtime.onStartup.addListener(() => {
    // Load user info and filters from Chrome storage at startup
    chrome.storage.sync.get(['user', 'targets'], (result) => {
        if (result.user) {
            user.value = result.user;
            console.error('Loaded user info from storage:', user.value);

            if (result.targets) {
                targets = result.targets;
                console.error('Loaded user filters from storage:', targets);
            } else {
                fetchUserFilters();
            }
        }
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.type) {
        case 'LOGIN':
            user.value = message.user.uid;
            // Save user info to Chrome storage
            chrome.storage.sync.set({ user: user.value }, () => {
                console.warn('User info saved to storage', user.value);
            });
            // Fetch user filters
            fetchUserFilters();
            sendResponse({ status: 'success' });
            break;
        case 'LOGOUT':
            chrome.storage.sync.remove('user', () => {
                console.warn('User info removed from the storage.');
            });
            user.value = null;
            sendResponse({ status: 'success' });
            break;
        case 'FETCH_TARGET':
            fetchUserFilters();
            sendResponse({ status: 'success' });
            break;
        case 'STORE':
            handleStore(message.url);
            sendResponse({ status: 'success' });
            break;
        default:
    }
});


// Function to fetch user filters from Firebase
function fetchUserFilters() {
    if (user.value) {

        // Reference to the user's targets collection
        const targetsCollectionRef = collection(db, `users/${user.value}/targets`);

        // Fetch the initial data
        getDocs(targetsCollectionRef).then((snapshot) => {
            targets = snapshot.docs.map(doc => doc.data());
            // Save filters to Chrome storage
            chrome.storage.sync.set({ targets: targets }, () => {
                console.error('User targets saved to storage');
            });
        }).catch((error) => {
            console.error('Error fetching user targets:', error);
        });

        // Set up listener for filter changes
        onSnapshot(targetsCollectionRef, (snapshot) => {
            targets = snapshot.docs.map(doc => doc.data());
            chrome.storage.sync.set({ targets: targets }, () => {
                console.error('User filters updated in storage');
            });
        }, (error) => {
            console.error('Error listening for user targets updates:', error);
        });
    }
}

async function handleStore(url) {
    try {
        if (user.value) {
            // Initialize the model
            const model = await useGenAi('gemini-pro');

            // Generate prompt for the AI model
            const prompt = `Please extract and format the TV show information from the following URL: ${url}. The response should be in this format without any extra text: Name: "{TV Show Name} Value: {season}x{episode}"`;

            // Get the result from the AI model
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();

            const regexPattern = /Name:\s*(.+?)\s*Value:\s*(.+)/;
            const matches = text.match(regexPattern);

            if (matches && matches.length === 3) {
                const name = matches[1].trim();
                const value = matches[2].trim();

                const userRef = doc(db, 'users', user.value);
                const showRef = doc(collection(userRef, 'shows'), name);
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
                    indicator: value,  // e.g., "3x4"
                    timestamp: new Date(),
                    url: url
                });
                console.error("Saved");

            } else {
                console.error("Sorry, could not proceed your data.");
            }
        } else {
            console.error('not logged');
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}