let HuluBackground = ((top, $) => {
    let apiKey = 'ae94c401'

    let getRating = (title, tabId, mainFlag) => {
        let omdbApiBaseUrl = "​http://www.omdbapi.com/?apikey=" + apiKey + "&t=" + title
        omdbApiBaseUrl = omdbApiBaseUrl.replace('\u200b', '')
        $.ajax({
            url: omdbApiBaseUrl,
            type: 'get',
            success: (res) => {
                chrome.tabs.sendMessage(tabId, {action: "rating_callback", main: mainFlag, title: title, res: res}, (response) => {
                    console.log(response)
                }); 
            }
        })
    }
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action == "omdb_get") {
            sendResponse({farewell: "goodbye"});
            getRating(request.title, sender.tab.id, request.main)
        }
    });
})(window, jQuery)