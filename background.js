import { useFirestore } from "vuefire";
import { collection, doc, setDoc, Timestamp, onSnapshot, getDocs } from "firebase/firestore";
import { query, orderBy, limit, deleteDoc } from "firebase/firestore";

import { useGenAi } from "./src/composables/useGenAi.js";
import "./src/firebaseconfig.js";

const db = useFirestore();

let user;
let key;
let targets = [];
let isInitialized = false;

chrome.runtime.onStartup.addListener(async () => {
    await initialize();
});

// Initialize user info and filters from Chrome storage
async function initialize() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['user', 'targets', 'mk'], async (result) => {
            if (result.user) {
                user = result.user;
                const response = await pingGemini();
                if (response === false) {
                    console.error('false', result.mk);
                } else {
                    console.error(result.mk);
                    key = result.mk;
                }

                if (result.targets) {
                    targets = result.targets;
                } else {
                    await fetchUserFilters();
                }
                isInitialized = true;
                resolve(true);
            } else {
                chrome.storage.sync.remove(['targets', 'mk']);
                showNotification('Need Action', 'You are not logged in.');
                resolve(false);
            }
        });
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'LOGIN':
            user = message.user.uid;
            // Save user info to Chrome storage
            chrome.storage.sync.set({ user: user }, async () => {
                console.warn('User info saved to storage', user);
                await fetchUserFilters();
                sendResponse({ status: 'success' });
            });
            break;
        case 'LOGOUT':
            chrome.storage.sync.remove('user', () => {
                console.warn('User info removed from the storage.');
                user = null;
                sendResponse({ status: 'success' });
            });
            break;
        case 'STOREKEY':
            key = message.key;
            chrome.storage.sync.set({ mk: key }, () => {
                console.warn('API Key saved to storage', key);
                sendResponse({ status: 'success' });
            });
            break;
        case 'REMOVEKEY':
            chrome.storage.sync.remove('mk', () => {
                console.warn('API Key removed from the storage.');
                key = null;
                sendResponse({ status: 'success' });
            });
            break;
        case 'CHECKKEY':
            pingGemini().then((response) => {
                if (response === true) {
                    sendResponse({ status: 'success', key: key });
                } else {
                    sendResponse({ status: 'error' });
                }
            });
            break;
        case 'FETCH_TARGET':
            fetchUserFilters();
            sendResponse({ status: 'success' });
            break;
        case 'STORE':
            // Ensure initialization before handling the store
            if (isInitialized) {
                handleStore(message.url).then(() => sendResponse({ status: 'success' }));
            } else {
                initialize().then(() => handleStore(message.url).then(() => sendResponse({ status: 'success' })));
            }
            break;
        case 'OPENTAB':
            openTab(message.url);
            sendResponse({ status: 'success' });
            break;
        default:
    }
    return true; // Indicate that response will be sent asynchronously
});

async function pingGemini() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('mk', async (result) => {
            if (result.mk) {
                key = result.mk;
                resolve(true);
            } else {
                key = null;
                resolve(false);
            }
        });
    });
}

// Function to fetch user filters from Firebase
async function fetchUserFilters() {
    if (user) {
        // Reference to the user's targets collection
        const targetsCollectionRef = collection(db, `users/${user}/targets`);

        // Fetch the initial data
        try {
            const snapshot = await getDocs(targetsCollectionRef);
            targets = snapshot.docs.map(doc => doc.data());
            // Save filters to Chrome storage
            await chrome.storage.sync.set({ targets: targets });
            console.info('User targets saved to storage');

            // Set up listener for filter changes
            onSnapshot(targetsCollectionRef, (snapshot) => {
                targets = snapshot.docs.map(doc => doc.data());
                chrome.storage.sync.set({ targets: targets }, () => {
                    console.info('User filters updated in storage');
                });
            }, (error) => {
                console.warn('Error listening for user targets updates:', error);
            });
        } catch (error) {
            console.info('Error fetching user targets:', error);
        }
    }
}

async function handleStore(url) {
    try {
        await new Promise((resolve) => {
            chrome.storage.sync.get(['mk', 'user'], (result) => {
                if (result.mk) {
                    key = result.mk;
                }
                if (result.user) {
                    user = result.user;
                }
                resolve();
            });
        });

        console.error(user, ' - ', key);
        if (user && key) {
            // Initialize the model
            const model = await useGenAi('gemini-1.5-pro-latest', key);
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

                const userRef = doc(db, 'users', user);
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
            console.error('not logged or invalid API Key');
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

function openTab(url) {
    chrome.tabs.create({ url: url });
}

// Function to create and show a notification
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        title: title,
        iconUrl: '/icons/notify.png',
        message: message
    }, (notificationId) => {
        console.info('Notification shown with ID:', notificationId);
    });
}
