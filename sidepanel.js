import { API_KEY, YOUTUBE_API_KEY } from './scripts/config.js';

document.getElementById("extensionButton").addEventListener("click", async () => {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = "<p>Loading suggestions...</p>";

    chrome.runtime.sendMessage({ action: "buttonPressed" }, async (response) => {
        const suggestions = response.response;

        resultDiv.innerHTML = ""; // Clear loading message

        // Display full AI response at the top
        const aiText = document.createElement("pre");
        aiText.textContent = suggestions;
        aiText.style.whiteSpace = "pre-wrap";
        aiText.style.marginBottom = "16px";
        aiText.style.color = "#000000";
        resultDiv.appendChild(aiText);

        // Extract numbered songs
        const songs = suggestions.match(/^\d+\.\s*(.+?)\s*$/gm);

        if (!songs || songs.length === 0) {
            const error = document.createElement("p");
            error.textContent = "Couldn't extract songs from AI.";
            resultDiv.appendChild(error);
            return;
        }

        let videoIDList = [];

        for (let song of songs.slice(0, 8)) { // limit to 8
            const searchQuery = encodeURIComponent(song);
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=1&q=${searchQuery}&key=${YOUTUBE_API_KEY}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                if (data.items && data.items.length > 0) {
                    const video = data.items[0];
                    const videoId = video.id.videoId;
                    videoIDList.push(videoId);
                    const title = video.snippet.title;
                    const thumbnailUrl = video.snippet.thumbnails.medium.url;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                    const container = document.createElement("div");
                    container.style.marginBottom = "12px";

                    const thumbnail = document.createElement("img");
                    thumbnail.src = thumbnailUrl;
                    thumbnail.alt = title;
                    thumbnail.style.width = "100%";
                    thumbnail.style.borderRadius = "8px";

                    const link = document.createElement("a");
                    link.href = videoUrl;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = title;
                    link.style.display = "block";
                    link.style.marginTop = "5px";
                    link.style.color = "#000000";
                    link.style.fontSize = "14px";
                    link.style.textDecoration = "none";

                    container.appendChild(thumbnail);
                    container.appendChild(link);
                    resultDiv.appendChild(container);
                } else {
                    const errMsg = document.createElement("p");
                    errMsg.textContent = `No video found for: ${song}`;
                    errMsg.style.color = "gray";
                    resultDiv.appendChild(errMsg);
                }

            } catch (err) {
                const errorelement = document.createElement("p");
                errorelement.textContent = `API error for: ${song}`;
                errorelement.style.color = "red";
                resultDiv.appendChild(errorelement);
            }
        }

        chrome.runtime.sendMessage({
            action: "saveVideoIDs",
            videoIDs: videoIDList
        });
    });
});

document.getElementById("makePlaylistButton").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "playlistButtonPressed" }, (response) => {
        if (response.success) {
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #4CAF50;">Playlist created successfully!</h2>
                </div>
            `;
        } else {
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color:rgb(207, 57, 57);">Playlist creation failed, this is likely due to our API rate limit being reached, please try again later!</h2>
                </div>
            `;
        }
    });
});
