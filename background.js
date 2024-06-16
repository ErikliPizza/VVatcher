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

async function initialize() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['user', 'targets', 'mk'], async (result) => {
            if (result.user) {
                user = result.user;
                const response = await pingGemini();

                if (response) {
                    key = result.mk;
                } else {
                    showNotification('Need Action', 'Your API Key is not valid.');
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'LOGIN':
            user = message.user.uid;
            chrome.storage.sync.set({ user: user }, async () => {
                await fetchUserFilters();
                sendResponse({ status: 'success' });
            });
            break;
        case 'LOGOUT':
            chrome.storage.sync.remove('user', () => {
                user = null;
                sendResponse({ status: 'success' });
            });
            break;
        case 'STOREKEY':
            key = message.key;
            chrome.storage.sync.set({ mk: key }, () => {
                sendResponse({ status: 'success' });
            });
            break;
        case 'REMOVEKEY':
            chrome.storage.sync.remove('mk', () => {
                key = null;
                sendResponse({ status: 'success' });
            });
            break;
        case 'CHECKKEY':
            pingGemini().then((response) => {
                sendResponse(response ? { status: 'success', key: key } : { status: 'error' });
            });
            break;
        case 'FETCH_TARGET':
            fetchUserFilters().then(() => sendResponse({ status: 'success' }));
            break;
        case 'STORE':
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
    return new Promise((resolve) => {
        chrome.storage.sync.get('mk', (result) => {
            key = result.mk || null;
            resolve(!!result.mk);
        });
    });
}

async function fetchUserFilters() {
    if (user) {
        const targetsCollectionRef = collection(db, `users/${user}/targets`);
        try {
            const snapshot = await getDocs(targetsCollectionRef);
            targets = snapshot.docs.map(doc => doc.data());
            await chrome.storage.sync.set({ targets: targets });
            onSnapshot(targetsCollectionRef, (snapshot) => {
                targets = snapshot.docs.map(doc => doc.data());
                chrome.storage.sync.set({ targets: targets });
            }, (error) => {
                console.warn('Error listening for user targets updates:', error);
            });
        } catch (error) {
            console.warn('Error fetching user targets:', error);
        }
    }
}

async function handleStore(url) {
    try {
        await new Promise((resolve) => {
            chrome.storage.sync.get(['mk', 'user'], (result) => {
                key = result.mk || key;
                user = result.user || user;
                resolve();
            });
        });

        if (user && key) {
            const model = await useGenAi('gemini-1.5-pro-latest', key);
            const parsedUrl = new URL(url);
            const path = parsedUrl.pathname;
            const prompt = `Please extract and format the TV show information from the following text: "${path.toUpperCase()}". The response should be in this format without any extra text: Name: "{TV Show Name} Value: {season}x{episode}"`;

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
                }, { merge: true });
                const episodesCollectionRef = collection(showRef, 'episodes');

                const episodesQuery = query(episodesCollectionRef, orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(episodesQuery);

                let episodes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (episodes.length >= 3) {
                    const oldestEpisode = episodes[episodes.length - 1];
                    const oldestEpisodeRef = doc(episodesCollectionRef, oldestEpisode.id);
                    await deleteDoc(oldestEpisodeRef);
                }
                const newEpisodeRef = doc(episodesCollectionRef);
                await setDoc(newEpisodeRef, {
                    indicator: value,
                    timestamp: new Date(),
                    url: url
                });
            } else {
                console.warn("Could not process data.");
            }
        } else {
            console.warn('Not logged in or invalid API Key');
        }
    } catch (error) {
        console.warn("An error occurred:", error);
    }
}

function manipulateString(input) {
    let manipulatedString = input.trim();
    manipulatedString = manipulatedString.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    manipulatedString = manipulatedString.replace(/[^\w\s]/g, ' ');
    manipulatedString = manipulatedString.replace(/\s+/g, ' ');
    return manipulatedString.toUpperCase().trim();
}

function openTab(url) {
    chrome.tabs.create({ url: url });
}

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
