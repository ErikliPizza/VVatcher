const extractDomainName = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (error) {
        return '';
    }
};

let previousUrl = null;

document.addEventListener('fullscreenchange', function () {
    const isFullscreen = document.fullscreenElement !== null;
    const currentUrl = window.location.href;
    const currentDomain = extractDomainName(currentUrl);
    chrome.storage.sync.get('targets', (result) => {
        const targets = result.targets || [];
        const allowedDomains = targets.map(item => item.target);
        // Check if the URL has changed or it's the first time, and if the current domain is in the allowedDomains array
        if (currentUrl !== previousUrl && allowedDomains.includes(currentDomain)) {
            chrome.runtime.sendMessage({ type: 'STORE', url: currentUrl });
            previousUrl = currentUrl; // Update the previous URL
        }
    });
});