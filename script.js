/**
 * Podcast Processing Script
 * 
 * This script automates the process of generating podcast metadata, converting audio files to MP3 format,
 * and uploading the podcast episode to a hosting service. It uses various APIs and libraries to achieve this.
 * 
 * Entry Point:
 * The script is executed via the command line with the following arguments:
 * - filePath: The path to the audio file to be processed.
 * - contentUrl: The URL of the content to generate metadata for.
 * - date: The date for publishing the podcast.
 * - time: The time for publishing the podcast.
 * 
 * Overall Flow:
 * 1. Load environment variables and retrieve necessary API keys and configurations.
 * 2. Start processing in `processAudio`
 * 3. Fetch website content from the provided URL and convert it to markdown format using `fetchWebsiteContentAsMarkdown`.
 * 4. Generate podcast metadata using the Claude API based on the markdown content with `generatePodcastMetadata`.
 * 5. Calculate the duration of the audio file in minutes using `getAudioDurationInMinutes`.
 * 6. Convert the audio file to MP3 format using `convertAudio`.
 * 7. Upload the converted audio file and metadata to the hosting service using `uploadEpisodeToHosting`.
 * 8. Log the success or failure of the process in `processAudio`.
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { DateTime } from 'luxon';
import { marked } from 'marked'; 

// Load environment variables from a .env file
dotenv.config();

// Retrieve API keys and other configurations from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const HOSTING_API_ENDPOINT = process.env.HOSTING_API_ENDPOINT;
const PODCAST_ID = process.env.PODCAST_ID;

// Define the timezone for Atlantic Time
const ATLANTIC_TIMEZONE = 'America/Halifax';

/**
 * Get the duration of an audio file in minutes.
 * @param {string} filePath - The path to the audio file.
 * @returns {Promise<number>} - The duration of the audio in minutes.
 */
const getAudioDurationInMinutes = (filePath) => {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.error("Error getting audio metadata:", err);
                resolve(0);
                return;
            }
            const durationInSeconds = metadata.format.duration;
            const durationInMinutes = Math.round(durationInSeconds / 60);
            resolve(durationInMinutes);
        });
    });
};

/**
 * Fetch website content and convert it to markdown format.
 * @param {string} url - The URL of the website to fetch.
 * @returns {Promise<string|null>} - The markdown content or null if an error occurs.
 */
async function fetchWebsiteContentAsMarkdown(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${url} (status: ${response.status})`);
        }
        const html = await response.text();
        // Convert HTML to markdown
        const markdown = marked(html);
        return markdown;
    } catch (error) {
        console.error('Error fetching website content:', error);
        return null;
    }
}

/**
 * Generate podcast metadata using the Claude API.
 * @param {string} contentUrl - The URL of the content to generate metadata for.
 * @returns {Promise<Object>} - The generated podcast metadata.
 */
async function generatePodcastMetadata(contentUrl) {
    console.log('Generating content with Claude API');
    const markdownContent = await fetchWebsiteContentAsMarkdown(contentUrl);
    if (!markdownContent) {
        throw new Error('Could not retrieve and convert website content.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `Here is the content of the website in markdown format:\n\n${markdownContent}\n\nBased on this content, generate a compelling podcast episode title and description. The title of the podcast episode should be based on the h1 tag of the page. The description should be based on an overall summary of the contents of the page.Do not include any intro text or concluding text. Only provide the response directly with the response format as valid JSON with this format (without backticks):\n\n{\n  "title": "title",\n  "description": "description",\n  "keywords": ["keyword1", "keyword2", "keyword3"]\n}`,
            }],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        let errorDetails;
        try {
            errorDetails = JSON.parse(errorBody);
        } catch (e) {
            errorDetails = { raw: errorBody };
        }
        
        throw new Error(`Claude API error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorDetails)}`);
    }
    const data = await response.json();
    const parsedContent = JSON.parse(data.content[0].text);
    parsedContent.description = `Source: ${contentUrl}\n\n${parsedContent.description}\n\nThe contents and hosts of this podcast are AI generated.`;
    console.log('Parsed content:', parsedContent);

    return parsedContent;
}

/**
 * Convert an audio file to MP3 format.
 * @param {string} inputFilePath - The path to the input audio file.
 * @returns {Promise<void>} - Resolves when the conversion is complete.
 */
async function convertAudio(inputFilePath) {
    const outputFilePath = path.parse(inputFilePath).name + '.mp3';

    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .output(outputFilePath)
            .outputOptions(['-f mp3', '-ac 2', '-ar 48000', '-ab 192k', '-map_metadata 0', '-id3v2_version 3', '-write_id3v1 1'])
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .on('end', () => {
                console.log(`Conversion successful: ${inputFilePath} -> ${outputFilePath}`);
                resolve();
            })
            .run();
    });
}

/**
 * Process an audio file by generating metadata, converting the file, and uploading it.
 * @param {string} filePath - The path to the audio file.
 * @param {string} contentUrl - The URL of the content to generate metadata for.
 * @param {string} date - The date for publishing the podcast.
 * @param {string} time - The time for publishing the podcast.
 */
async function processAudio(filePath, contentUrl, date, time) {
    try {
        console.log('Processing new audio upload request');
        const metadata = await generatePodcastMetadata(contentUrl);
        const durationInMinutes = await getAudioDurationInMinutes(filePath);
        console.log(`Calculated audio duration: ${durationInMinutes} minutes`);

        await convertAudio(filePath);
        const convertedFilePath = path.parse(filePath).name + '.mp3';
        console.log(`Audio converted: ${filePath} -> ${convertedFilePath}`);

        const hostingResponse = await uploadEpisodeToHosting(
            PODCAST_ID, metadata.title, metadata.description, convertedFilePath, durationInMinutes, date, time
        );

        console.log({
            success: true,
            title: metadata.title,
            description: metadata.description,
            keywords: metadata.keywords,
            duration_minutes: durationInMinutes,
            hosting_response: hostingResponse
        });

    } catch (error) {
        console.error('Error processing audio:', error);
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            type: error.constructor.name,
        }));
    }
}

/**
 * Upload a podcast episode to the hosting service.
 * @param {string} podcastId - The ID of the podcast.
 * @param {string} title - The title of the episode.
 * @param {string} description - The description of the episode.
 * @param {string} localFilePath - The path to the local audio file.
 * @param {number} duration - The duration of the episode in minutes.
 * @param {string} date - The date for publishing the podcast.
 * @param {string} time - The time for publishing the podcast.
 * @returns {Promise<Object>} - The response from the hosting service.
 */
async function uploadEpisodeToHosting(podcastId, title, description, localFilePath, duration, date, time) {
    console.log('Uploading episode to hosting service...');
    const form = new FormData();
    form.append('podcast_id', podcastId);
    form.append('title', title);
    form.append('description', description);
    form.append('duration', String(duration));
    form.append('explicit', 'false');
    form.append('publish_date', date);

    const atlanticDateTime = DateTime.fromISO(`${date}T${time}`, { zone: ATLANTIC_TIMEZONE });
    const utcTime = atlanticDateTime.toUTC().toISO({ includeOffset: false, suppressMilliseconds: true });

    form.append('publish_time', utcTime.split('T')[1]);

    const audioFileContent = await fs.readFile(localFilePath);
    form.append('audio_file', audioFileContent, path.basename(localFilePath));

    const uploadResponse = await fetch(HOSTING_API_ENDPOINT, {
        method: 'POST',
        body: form,
    });

    const hostingResponseText = await uploadResponse.text();
    console.log('Hosting Upload Response:', hostingResponseText);

    if (!uploadResponse.ok) {
        throw new Error('Failed to upload episode to hosting service');
    }
    return JSON.parse(hostingResponseText);
}

// Retrieve command line arguments for file path, content URL, date, and time
const filePath = process.argv[2];
const contentUrl = process.argv[3];
const date = process.argv[4];
const time = process.argv[5];

// Check if all required arguments are provided
if (!filePath || !contentUrl || !date || !time) {
    console.error('Usage: node script.js <filePath> <contentUrl> <date> <time>');
    process.exit(1);
}

// Start processing the audio file
processAudio(filePath, contentUrl, date, time);