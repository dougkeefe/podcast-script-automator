# Podcast Script Automator

A powerful automation tool that streamlines the podcast production workflow by automatically generating metadata, converting audio files, and uploading episodes to Podcast Hosting Service [podhostapp.com](https://podhostapp.com).

## Features

- **Content-Based Metadata Generation**: Uses Claude AI to analyze source content and generate compelling podcast titles and descriptions
- **Audio Processing**: Automatically converts audio files to MP3 format with optimized settings
- **Scheduled Publishing**: Set specific dates and times for episode publishing (if host supports)
- **Hosting Integration**: Seamlessly uploads episodes to your podcast hosting service [podhostapp.com](https://podhostapp.com)
- **Timezone Support**: Configurable timezone support

## 📋 Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v14 or higher)
- [FFmpeg](https://ffmpeg.org/download.html) installed on your system
  - **Mac**: Install using Homebrew: `brew install ffmpeg`
  - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows) or install using [Chocolatey](https://chocolatey.org/): `choco install ffmpeg`
- [Claude API key](https://console.anthropic.com/) from Anthropic
- You've signed up for access to a podcast hosting service that provides API-level access like [podhostapp.com](https://podhostapp.com)

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/dougkeefe/podcast-script-automator.git
   cd podcast-script-automator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided `.env.SAMPLE`:
   ```bash
   cp .env.SAMPLE .env
   ```

4. Edit the `.env` file with your API keys and configuration:
   ```bash
   CLAUDE_API_KEY=your_claude_api_key_here
   HOSTING_API_ENDPOINT=https://xuwhkphkbckhrpvyjfbp.supabase.co/functions/v1/create-episode
   PODCAST_ID=your_podcast_id_here
   ```

## Usage

Run the script with the following command:

```bash
node script.js <audio_file_path> <content_url> <publish_date> <publish_time>
```

### Parameters:

- `<audio_file_path>`: Path to your audio file (supports various formats, will be converted to MP3)
- `<content_url>`: URL of the content to base the podcast metadata on
- `<publish_date>`: Date for publishing the podcast (YYYY-MM-DD format)
- `<publish_time>`: Time for publishing the podcast (HH:MM format in Atlantic Time)

### Example:

```bash
node script.js ./recordings/episode42.wav "https://example.com/article" "2023-05-15" "10:30"
```

## Workflow

1. The script fetches content from the provided URL and converts it to markdown
2. Claude AI analyzes the content and generates a title and description
3. The audio file is analyzed to determine its duration
4. The audio is converted to MP3 format with optimized settings
5. The episode is uploaded to your podcast hosting service with the generated metadata
6. Detailed logs are provided throughout the process

## Configuration

### Environment Variables

- `CLAUDE_API_KEY`: Your API key for Claude AI
- `HOSTING_API_ENDPOINT`: The API endpoint for your podcast hosting service
- `PODCAST_ID`: The ID of your podcast on the hosting service

### Audio Conversion Settings

The script uses the following FFmpeg settings for audio conversion:
- Format: MP3
- Audio channels: 2 (stereo)
- Sample rate: 48000 Hz
- Bitrate: 192 kbps
- Metadata: Preserves original metadata
- ID3 tags: Adds ID3v2.3 and ID3v1 tags

## Customization

You can customize the script by modifying the following:

- **Timezone**: Change the `ATLANTIC_TIMEZONE` constant in `script.js` to your preferred timezone
- **AI Prompt**: Modify the prompt sent to Claude AI in the `generatePodcastMetadata` function
- **Audio Settings**: Adjust the FFmpeg settings in the `convertAudio` function

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements

- [Claude AI](https://www.anthropic.com/claude) for metadata generation
- [FFmpeg](https://ffmpeg.org/) for audio processing
- [Node.js](https://nodejs.org/) and its amazing ecosystem

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
