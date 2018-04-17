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

        renderMainRating = () => {
            let $mainShowContainer = $("#show-description")

            if ($mainShowContainer.length == 0) {
                return false
            }
            
            title = $mainShowContainer.find("div.desc-right h1.cu-show-name").text()
            if (!data[title]) {
                chrome.runtime.sendMessage({
                    action: "omdb_get",
                    main: true,
                    title: title
                }, function(response) {
                    console.log(response.farewell);
                });
            } else {
                let ratings = data[title]['Ratings'],
                    $mainRatingEl = $("#show-description div.show-details #show-rating")

                for (let i = 0; i < ratings.length; i++) {
                    let rate = ratings[i],
                        score = 0

                    switch(rate['Source']) {
                        case "Internet Movie Database":
                            score = JSON.parse(rate['Value'].substr(0, rate['Value'].indexOf('/10')))
                            let $imdbRating = $("<span/>").addClass("details-action main-ratings-container").attr({
                                    title: `Internet Movie Database Rating: ${score}`
                                })

                            $imdbRating.append(
                                $(`<img src=${chrome.extension.getURL('images/imdb.png')} class="hulu-extension-imdb-rating" />`),
                                $(`<span class="imdb-rating">${score}</span>`)
                            )
                            $imdbRating.insertAfter($mainRatingEl)
                            break;
                        
                        case "Rotten Tomatoes":
                            score = rate['Value']
                            let $rottenTomatoesRating = $("<span/>").addClass("details-action main-ratings-container").attr({
                                    title: `RottenTomatoes Rating: ${score}`
                                })

                            $rottenTomatoesRating.append(
                                $(`<img src=${chrome.extension.getURL('images/tomato.png')} class="hulu-extension-tomato-rating" />`),
                                $(`<span class="tomato-rating">${score}</span>`)
                            )

                            $rottenTomatoesRating.insertAfter($mainRatingEl)
                            break;
    
                        default:
                            continue;
                    }
                }
                
                console.log("main show data", ratings)
            }

            return true
        }

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
                let rate = item['Ratings'][i],
                    score = 0

                switch(rate['Source']) {
                    case "Internet Movie Database":
                        score = JSON.parse(rate['Value'].substr(0, rate['Value'].indexOf('/10')))
                        $imdbRating.children().remove()
                        $imdbRating.attr({
                            title: `Internet Movie Database Rating: ${score}`
                        })

                        $imdbRating.append(
                            $(`<img src=${chrome.extension.getURL('images/imdb.png')} class="hulu-extension-imdb-rating" />`),
                            $(`<span class="imdb-rating">${score}</span>`)
                        )
                        break;
                    
                    case "Rotten Tomatoes":
                        score = rate['Value'] //JSON.parse(rate['Value'].substr(0, rate['Value'].indexOf('%'))) / 20
                        $rottenTomatoesRating.children().remove()
                        $rottenTomatoesRating.attr({
                            title: `RottenTomatoes Rating: ${score}`
                        })

                        $rottenTomatoesRating.append(
                            $(`<img src=${chrome.extension.getURL('images/tomato.png')} class="hulu-extension-tomato-rating" />`),
                            $(`<span class="tomato-rating">${score}</span>`)
                        )
                        break;

                    default:
                        continue;
                }
            }
            
        },

        renderVideoRating = () => {
            return false
        }
    
    startHoverMonitoring()

    let mainInfoTimer = window.setInterval(() => {
        if (renderMainRating() || renderVideoRating()) {
            window.clearInterval(mainInfoTimer)
        }
    }, 1000)

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action == "rating_callback") {
            sendResponse({farewell: "goodbye"});

            data[request.title] = request.res

            if (request.main) {
                renderMainRating()
            } else {
                stopHoverMonitoring()
                renderRatings()
                startHoverMonitoring()
            }
        }
    });
}(window, jQuery));
