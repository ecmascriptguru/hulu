chrome.tabs.query({active: true}, (tabs) => {
    let loc = new URL(tabs[0].url);

    if (loc.host.indexOf("www.hulu.") !== 0) {
        chrome.tabs.create({url: "https://www.hulu.com/"});
    } else {
        window.close();
    }
})