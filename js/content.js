window.ContentScript = (function(window, $) {
    let observer = null,
        data = {},
        current = null

    let startHoverMonitoring = () => {
            // Select the node that will be observed for mutations
            let hoverPopup = document.getElementById('hover-box');

            // Options for the observer (which mutations to observe)
            let config = { attributes: true, childList: true };

            // Callback function to execute when mutations are observed
            let callback = function(mutationsList) {
                let renderFlag = false
                for(let mutation of mutationsList) {
                    if (mutation.type == 'childList') {
                        renderFlag = true
                        break
                        console.log('A child node has been added or removed.');
                    }
                    // else if (mutation.type == 'attributes') {
                    //     console.log('The ' + mutation.attributeName + ' attribute was modified.');
                    // }
                }
                
                if (!renderFlag) {
                    return false
                }

                let title = $(`#hover-box div.title div.show-name`).text()
                if (title.trim() == '') {
                    return false
                }

                if (data[title] == undefined) {
                    data[title] = {status: "pending"}
                    chrome.runtime.sendMessage({
                        action: "omdb_get",
                        title: title
                    }, function(response) {
                        console.log(response.farewell);
                    });
                    // stopHoverMonitoring()
                } else {
                    // if (!current || current != data[title]) {
                        stopHoverMonitoring()
                        renderRatings()
                        startHoverMonitoring()
                    // }
                }
            };

            // Create an observer instance linked to the callback function
            observer = new MutationObserver(callback);

            // Start observing the target node for configured mutations
            observer.observe(hoverPopup, config);
        },

        stopHoverMonitoring = () => {
            // Later, you can stop observing
            observer.disconnect();
        },

        renderRatings = () => {
            if (!$("#hover-box").is(":visible")) {
                return false;
            }
            let title = $(`#hover-box div.title div.show-name`).text(),
                $ratingsContainer = $(`#hover-box div.rating-stars`),
                $rottenTomatoesRating = $ratingsContainer.find("#hulu_rotten_tomato_rating"),
                $imdbRating = $ratingsContainer.find("#hulu_imdb_rating"),
                item = data[title]

            if (item['status'] == 'pending') {
                return false
            }

            console.log(item)

            current = item
            
            if ($rottenTomatoesRating.length == 0) {
                $rottenTomatoesRating = $('<div/>').attr({
                    id: 'hulu_rotten_tomato_rating',
                    title: 'Rotten Tomatoes Ratting'
                })
                $ratingsContainer.append($rottenTomatoesRating)
            }

            if ($imdbRating.length == 0) {
                $imdbRating = $('<div/>').attr({
                    id: 'hulu_imdb_rating',
                    title: 'IMDB Ratting'
                })
                $ratingsContainer.append($imdbRating)
            }

            if (!item['Ratings']) {
                return false
            }

            for (let i = 0; i < item['Ratings'].length; i++) {
                let rate = item['Ratings'][i]
                switch(rate['Source']) {
                    case "Internet Movie Database":
                        $imdbRating.children().remove()
                        $imdbRating.append(
                            $(`<div>IMDB Rating: ${rate['Value']}</div>`)
                        )
                        break;
                    
                    case "Rotten Tomatoes":
                        $rottenTomatoesRating.children().remove()
                        $rottenTomatoesRating.append(
                            $(`<div>Rotten Tomatoes Rating: ${rate['Value']}</div>`)
                        )
                        break;

                    default:
                        continue;
                }
            }
            
        }
    
    startHoverMonitoring()

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action == "rating_callback") {
            sendResponse({farewell: "goodbye"});
            data[request.title] = request.res
            stopHoverMonitoring()
            renderRatings()
            startHoverMonitoring()
        }
    });
}(window, jQuery));
