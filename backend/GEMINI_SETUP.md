# Gemini AI Setup Guide

## Why AI Recognition Might Not Work

The AI image recognition feature requires a Google Gemini API key. If items aren't being recognized, it's likely because:

1. **No API Key**: The `GEMINI_API_KEY` environment variable is not set
2. **Invalid API Key**: The key is incorrect or expired
3. **API Quota Exceeded**: You've hit the free tier limit

## How to Get a Gemini API Key

1. **Visit Google AI Studio**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Create a new API key** or use an existing one
4. **Copy the API key**

## Setting Up the API Key

### Option 1: Environment Variable (Recommended)

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

### Option 2: Set in System Environment

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

**Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY=your_api_key_here
```

## What I've Improved

1. **Better Model**: Changed from `gemini-pro-vision` to `gemini-1.5-flash` (newer, better recognition)
2. **Improved Prompts**: More detailed and specific prompts for better accuracy
3. **Better Error Handling**: Won't fail uploads if AI is unavailable
4. **Lower Temperature**: More consistent results (0.1 instead of 0.3)
5. **Relaxed Safety Settings**: Less likely to block clothing images
6. **Better Parsing**: Improved JSON and text parsing for AI responses

## Testing

After setting up the API key:

1. Restart your development server
2. Upload a clothing item image
3. Check the console logs for any errors
4. The AI should now recognize:
   - Clothing type (TOP, BOTTOM, DRESS, etc.)
   - Colors
   - Occasion
   - Season
   - Generate a descriptive name

## Fallback Behavior

If the API key is not set or AI fails:
- The upload will still work
- Default values will be used (type from form, default occasion/season)
- You can manually edit the item after upload

## Troubleshooting

**"API keys are not supported" error:**
- Make sure you're using the correct API endpoint
- Check that your API key is valid
- Try regenerating the API key

**"401 Unauthorized" error:**
- Verify your API key is correct
- Check if the API key has the right permissions

**Items not being recognized:**
- Check server console for error messages
- Verify the API key is set correctly
- Try with a clear, well-lit clothing image
- Check your API quota/usage limits

## Current Model

The app now uses: **gemini-1.5-flash**

This is Google's latest fast model with excellent image recognition capabilities.

