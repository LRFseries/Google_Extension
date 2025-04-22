document.getElementById("extensionButton").addEventListener("click", () => {

    chrome.runtime.sendMessage({ action: "buttonPressed" }, (response) => {
        console.log("Response from background:", response.response);
        document.getElementById('result').innerText = response.response;
    });

});

document.getElementById("makePlaylistButton").addEventListener("click", () => {

    chrome.runtime.sendMessage({ action: "playlistButtonPressed" }, (response) => {


    });

});


