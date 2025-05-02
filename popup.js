import { API_KEY, YOUTUBE_API_KEY } from './scripts/config.js';

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


document.getElementById("extensionButton").addEventListener("click", async () => {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = "<p>Loading suggestions...</p>";

    chrome.runtime.sendMessage({ action: "buttonPressed" }, async (response) => {
        const suggestions = response.response;
        const songs = suggestions.match(/^\d+\.\s*(.+?)\s*$/gm); // Match numbered list

        if (!songs || songs.length === 0) {
            resultDiv.innerHTML = "Couldn't extract songs from AI.";
            return;
        }

        resultDiv.innerHTML = ""; // Clear loading


        let videoIDList = [];
        for (let song of songs.slice(0, 8)) { // Limit to 8 songs
            const searchQuery = encodeURIComponent(song);
            const apiKey = YOUTUBE_API_KEY; 
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${searchQuery}&key=${apiKey}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                if (data.items && data.items.length > 0) {
                    const video = data.items[0];
                    const videoId = video.id.videoId;
                    videoIDList.push(videoId); // Store video ID
                    const title = video.snippet.title;
                    const thumbnailUrl = video.snippet.thumbnails.medium.url;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                    const container = document.createElement("div");
                    container.style.marginBottom = "12px";

                    const iframe = document.createElement("iframe");
                    iframe.src = `https://www.youtube.com/embed/${videoId}`;
                    iframe.width = "100%";
                    iframe.height = "200";
                    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                    iframe.allowFullscreen = true;
                    iframe.style.border = "none";
                    iframe.style.borderRadius = "8px";
                    iframe.referrerPolicy="no-referrer-when-downgrade"

                    // If embed fails (Video unavailable), fallback to thumbnail + link
                    iframe.onerror = () => {
                        container.innerHTML = ""; // Clear container

                        const thumbnail = document.createElement("img");
                        thumbnail.src = thumbnailUrl;
                        thumbnail.alt = title;
                        thumbnail.style.width = "100%";
                        thumbnail.style.borderRadius = "8px";

                        const link = document.createElement("a");
                        link.href = videoUrl;
                        link.target = "_blank";
                        link.textContent = title;
                        link.style.display = "block";
                        link.style.marginTop = "5px";
                        link.style.color = "#d1c4e9";
                        link.style.fontSize = "14px";
                        link.style.textDecoration = "none";

                        container.appendChild(thumbnail);
                        container.appendChild(link);
                    };

                    container.appendChild(iframe);
                    resultDiv.appendChild(container);
                } else {
                    const errMsg = document.createElement("p");
                    errMsg.textContent = `No video found for: ${song}`;
                    errMsg.style.color = "lightgray";
                    resultDiv.appendChild(errMsg);
                }

            } catch (err) {
                const errorelement = document.createElement("p");
                errorelement.textContent = `API error for: ${song}`;
                errorelement.style.color = "red";
                resultDiv.appendChild(errorelement);
            }
        }
                // ...after building videoIDList
        chrome.runtime.sendMessage({
            action: "saveVideoIDs",
            videoIDs: videoIDList
        });

    });
});


