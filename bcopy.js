import {useFirestore} from "vuefire";
import {collection, doc, setDoc, getDoc, onSnapshot, getDocs} from "firebase/firestore";
import {ref} from "vue";
import {useGenAi} from "./src/composables/useGenAi.js";
import "./src/firebaseconfig.js";

const db = useFirestore();
const user = ref();
const targets = ref([]);

chrome.runtime.onStartup.addListener(() => {
    // Load user info and filters from Chrome storage at startup
    chrome.storage.sync.get(['user', 'targets'], (result) => {
        if (result.user) {
            user.value = result.user;
            console.error('Loaded user info from storage:', user.value);

            if (result.targets) {
                targets.value = result.targets;
                console.error('Loaded user filters from storage:', targets.value);
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
            console.error(user.value);
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
            targets.value = snapshot.docs.map(doc => doc.data());
            // Save filters to Chrome storage
            chrome.storage.sync.set({ targets: targets.value }, () => {
                console.error('User targets saved to storage');
            });
        }).catch((error) => {
            console.error('Error fetching user targets:', error);
        });

        // Set up listener for filter changes
        onSnapshot(targetsCollectionRef, (snapshot) => {
            targets.value = snapshot.docs.map(doc => doc.data());
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
        // Initialize the model
        const model = await useGenAi('gemini-pro');

        // Generate prompt for the AI model
        const prompt = `Please extract and format the TV show information from the following URL: ${url}. The response should be in this format without any extra text: Name: "{TV Show Name} <-> value: {season}x{episode}"`;

        // Get the result from the AI model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        const f = extractInfo(text);
        console.error(text);
        return;

        // Match the TV show name and indicator using regex
        const nameMatch = text.match(/Name:\s*"([^"]+)"/);
        const indicatorMatch = text.match(/value:\s*([^\s,]+)/);

        // Extract the matched groups
        const name = nameMatch ? nameMatch[1].trim() : null;
        const indicator = indicatorMatch ? indicatorMatch[1].trim() : null;

        // Check if both name and indicator are successfully extracted
        if (name && indicator) {
            // Reference to the user's document in Firestore
            const userRef = doc(db, 'users', user.value);

            // Reference to the specific show document
            const showRef = doc(collection(userRef, 'shows'), name);

            // Save the document in Firestore
            await setDoc(showRef, {
                name: name,
                indicator: indicator
            });

            console.log("Data saved successfully.");
        } else {
            console.error("Sorry, could not proceed your data.", name, indicator);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}
function extractInfo(inputString) {
    const nameMatch = inputString.match(/Name: (\w+)/);
    const episodeMatch = inputString.match(/value: (\d+x\d+)/);

    const name = nameMatch ? nameMatch[1] : null;
    const episode = episodeMatch ? episodeMatch[1] : null;

    return { name, episode };
}
/*
// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        handlePageVisit(tab.url);
    }
});

// Listen for navigation completion
chrome.webNavigation.onCompleted.addListener((details) => {
    handlePageVisit(details.url);
});

// Function to handle page visits
function handlePageVisit(url) {
    if (isSpecificUrl(url) && currentUser) {
        saveUrlToFirebase(url);
    }
}

// Function to check if the URL meets criteria
function isSpecificUrl(url) {
    // Add your logic to filter specific URLs based on userFilters
    return targets.some(filter => url.includes(filter));
}

// Function to save URL to Firebase
// Function to save URL to Firebase
function saveUrlToFirebase(url) {
    const urlRef = firebase.database().ref(`users/${currentUser.uid}/visitedUrls`).push();
    urlRef.set({
        url: url,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
} */