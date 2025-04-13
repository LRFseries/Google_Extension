import { API_KEY } from './config.js';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

console.log("This is a background script!");

// Initialize the AI with your API key
const ai = new GoogleGenerativeAI(API_KEY);

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

async function runAI() {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const response = await model.generateContent("Use the following YouTube video title to generate a list of 7-10 similar songs. Your response should only be a list of song names and the artist who made them, then a summary of why the songs are similar at the end. Nothing else. Always use a numbered list and never use asterisks (*)" + await getYouTubeTitle());
    const result = await response.response;
    const gemini_response = await result.text();
    // console.log(result.text());
    return gemini_response;
  } catch (error) {
    console.error('Error:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "buttonPressed") {
        console.log("Button pressed in popup!");
        runAI().then((gemini_response) => {
            sendResponse({ response: gemini_response });
        }).catch(error => {
            sendResponse({ status: "error", message: error.toString() });
        });
    }
    return true;
});