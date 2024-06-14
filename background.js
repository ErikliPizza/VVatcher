import {useFirestore} from "vuefire";
import {collection, doc, setDoc, Timestamp, onSnapshot, getDocs} from "firebase/firestore";
import { query, orderBy, limit, deleteDoc } from "firebase/firestore";

import {ref} from "vue";
import {useGenAi} from "./src/composables/useGenAi.js";
import "./src/firebaseconfig.js"

const db = useFirestore();

const user = ref();
const key = ref();
let targets = [];


chrome.runtime.onStartup.addListener(() => {
    // Load user info and filters from Chrome storage at startup
    chrome.storage.sync.get(['user', 'targets'], async (result) => {
        if (result.user) {

            user.value = result.user;
            const validKey = await pingGemini();
            if (validKey === false) {
                showNotification('Need Action', 'Your API Key could not load from local storage.')
            }
            if (result.targets) {
                targets = result.targets;
            } else {
                fetchUserFilters();
            }
        } else {
            chrome.storage.sync.remove(['targets', 'mk']);
            showNotification('Need Action', 'You are not logged in.')
        }
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'LOGIN':
            user.value = message.user.uid;
            // Save user info to Chrome storage
            chrome.storage.sync.set({user: user.value}, () => {
                console.warn('User info saved to storage', user.value);
            });
            // Fetch user filters
            fetchUserFilters();
            sendResponse({status: 'success'});
            break;
        case 'LOGOUT':
            chrome.storage.sync.remove('user', () => {
                console.warn('User info removed from the storage.');
            });
            user.value = null;
            sendResponse({status: 'success'});
            break;
        case 'STOREKEY':
            key.value = message.key;
            chrome.storage.sync.set({mk: key.value}, () => {
                console.warn('API Key saved to storage', key.value);
            });
            sendResponse({status: 'success'});
            break;
        case 'REMOVEKEY':
            chrome.storage.sync.remove('mk', () => {
                console.warn('API Key removed from the storage.');
            });
            key.value = null;
            sendResponse({status: 'success'});
            break;
        case 'CHECKKEY':
            pingGemini().then((response) => {
                if (response === true) {
                    sendResponse({status: 'success', key: key.value});
                } else {
                    sendResponse({status: 'error'});
                }
            });
            break;
        case 'FETCH_TARGET':
            fetchUserFilters();
            sendResponse({status: 'success'});
            break;
        case 'STORE':
            handleStore(message.url);
            sendResponse({status: 'success'});
            break;
        case 'OPENTAB':
            openTab(message.url);
            sendResponse({status: 'success'});
            break;
        default:
    }
    return true; // Indicate that response will be sent asynchronously
});

async function pingGemini() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('mk', async (result) => {
            if (result.mk) {
                key.value = result.mk;
                resolve(true);
            } else {
                key.value = null;
                resolve(false);
            }
        });
    });
}


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
                console.info('User targets saved to storage');
            });
        }).catch((error) => {
            console.info('Error fetching user targets:', error);
        });

        // Set up listener for filter changes
        onSnapshot(targetsCollectionRef, (snapshot) => {
            targets = snapshot.docs.map(doc => doc.data());
            chrome.storage.sync.set({ targets: targets }, () => {
                console.info('User filters updated in storage');
            });
        }, (error) => {
            console.warn('Error listening for user targets updates:', error);
        });
    }
}

async function handleStore(url) {
    try {
        if (user.value && key.value) {
            // Initialize the model
            const model = await useGenAi('gemini-1.5-pro-latest');
            const parsedUrl = new URL(url);
            const path = parsedUrl.pathname;
            // Generate prompt for the AI model
            const prompt = `Please extract and format the TV show information from the following text: "${path.toUpperCase()}". The response should be in this format without any extra text: Name: "{TV Show Name} Value: {season}x{episode}"`;

            // Get the result from the AI model
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();

            const regexPattern = /Name:\s*(.+?)\s*Value:\s*(.+)/;
            const matches = text.match(regexPattern);
            if (matches && matches.length === 3) {
                const name = manipulateString(matches[1]);
                const value = matches[2].trim();

                const userRef = doc(db, 'users', user.value);
                const showRef = doc(collection(userRef, 'shows'), name);
                await setDoc(showRef, {
                    timestamp: new Date(),
                    title: name
                    }, { merge: true }); // Merge avoids overwriting
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
                console.info("Saved");

            } else {
                console.warn("Sorry, could not proceed your data.");
            }
        } else {
            console.warn('not logged or invalid API Key');
        }
    } catch (error) {
        console.warn("An error occurred:", error);
    }
}

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

function openTab (url) {
    chrome.tabs.create({ url: url });
}

// Function to create and show a notification
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        title: title,
        iconUrl: 'icons/notify.png',
        message: message
    }, (notificationId) => {
        console.info('Notification shown with ID:', notificationId);
    });
}