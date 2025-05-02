import { API_KEY, YOUTUBE_API_KEY } from './config.js';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

console.log("This is a background script!");

// Initialize the AI with your API key
const ai = new GoogleGenerativeAI(API_KEY);

// Function to get current YouTube video title
async function getYouTubeTitle() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('youtube.com/watch')) {
      return 'Not a YouTube video page';
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer');
        return videoTitle ? videoTitle.textContent.trim() : 'Title not found';
      }
    });

    return result;
  } catch (error) {
    console.error('Error getting video title:', error);
    return 'Error getting video title';
  }
}

// Function to run AI model
async function runAI() {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = "Use the following YouTube video title to generate a list of 8 similar songs. Your response should only be a list of song names and the artist who made them, then a summary of why the songs are similar at the end. Nothing else. Always use a numbered list and never use asterisks (*) " + await getYouTubeTitle();
    
    const response = await model.generateContent(prompt);
    const result = await response.response;
    const gemini_response = await result.text();
    return gemini_response;
  } catch (error) {
    console.error('Error in runAI:', error);
    return 'Error generating response';
  }
}

// Single message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {

      case "saveVideoIDs":
        chrome.storage.local.set({ videoIDs: message.videoIDs }, () => {
          console.log("Video IDs saved to storage:", message.videoIDs);
          sendResponse({ success: true });
        });
        break;

      case "buttonPressed":
        console.log("Button pressed in popup!");
        try {
          const gemini_response = await runAI();
          sendResponse({ response: gemini_response });
        } catch (error) {
          sendResponse({ status: "error", message: error.toString() });
        }
        break;

      case "playlistButtonPressed":
        console.log("Playlist Button pressed in popup!");
        chrome.identity.getAuthToken({ interactive: true }, function (token) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ success: false });
            return;
          }

          chrome.storage.local.get("videoIDs", (data) => {
            const savedVideoIDs = data.videoIDs || [];

            if (savedVideoIDs.length === 0) {
              console.error("No video IDs saved.");
              sendResponse({ success: false, error: "No videos to add." });
              return;
            }

            const playlistData = {
              snippet: {
                title: "My Generated Playlist",
                description: "Created using SongScout Extension!",
              },
              status: {
                privacyStatus: "private",
              }
            };

            fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet%2Cstatus", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(playlistData)
            })
              .then(response => response.json())
              .then(data => {
                if (data.error) {
                  console.error("YouTube API error:", data.error);
                  sendResponse({ success: false, error: data.error });
                  return;
                }

                const playlistId = data.id;
                console.log("Playlist created! ID:", playlistId);

                async function addVideosSequentially(videoIDs, playlistId, token) {
                  const errors = [];
                  for (const videoId of videoIDs) {
                    const response = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
                      method: "POST",
                      headers: {
                        Authorization: "Bearer " + token,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        snippet: {
                          playlistId: playlistId,
                          resourceId: {
                            kind: "youtube#video",
                            videoId: videoId
                          }
                        }
                      })
                    });
                    const result = await response.json();
                    if (result.error) {
                      errors.push(result);
                    }
                  }
                  return errors;
                }

                addVideosSequentially(savedVideoIDs, playlistId, token)
                  .then(errors => {
                    if (errors.length > 0) {
                      console.error("Errors adding items:", errors);
                      sendResponse({ success: false, errors });
                    } else {
                      console.log("All videos added successfully.");
                      sendResponse({ success: true, playlistId });
                    }
                  })
                  .catch(err => {
                    console.error("Error adding videos:", err);
                    sendResponse({ success: false, error: err.toString() });
                  });
              });
          });
        });
        break;

      default:
        console.warn("Unknown action:", message.action);
        sendResponse({ success: false, error: "Unknown action" });
        break;
    }
  })();

  return true; // Keep message channel open for async responses
});
