# Fake Signup Helper Browser Extension

This browser extension helps you sign up for websites using fake personal information and temporary email addresses. It also provides proxy switching capabilities for anonymity.

## Features

### 1. Fake Personal Information Generation
- Generates realistic user data including names, addresses, and phone numbers
- Creates strong random passwords
- Customizable password options (length, numbers, symbols)

### 2. Temporary Email Management
- Creates disposable email addresses
- Automatically retrieves verification codes and emails
- Waits for incoming verification messages
- Integrates with MailJS for enhanced email capabilities

### 3. Form Autofill
- Automatically fills registration forms with generated data
- Saves form data for later verification code retrieval

### 4. Proxy Management
- Switch to a random proxy from a list of free proxies
- Disconnect from proxy when no longer needed
- Visual indicator of proxy connection status

## How to Use

1. **Generate Data**: Click the "Generate Data" button to create fake personal information and a temporary email address.

2. **Customize Password**: Click "More options" to customize the generated password.

3. **Fill Forms**: Click "Autofill Form" to automatically fill out registration forms on websites.

4. **Manage Proxy**:
   - Click "Switch Proxy" to connect to a random proxy.
   - Click "Disconnect Proxy" to return to your normal connection.

5. **Retrieve Verification Codes**:
   - After submitting a form, click "Get Verification" to check for verification codes.
   - Or click "Wait for OTP" to actively wait for a verification code to arrive.

## Installation

### Chrome/Edge
1. Download or clone this repository
2. Go to chrome://extensions/ or edge://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked" and select the downloaded folder

### Firefox
1. Download or clone this repository
2. Go to about:debugging#/runtime/this-firefox
3. Click "Load Temporary Add-on"
4. Select any file from the downloaded folder

## Privacy & Security

- All generated data is created locally in your browser
- No data is sent to third-party servers except when retrieving emails
- The extension only accesses form data on the pages where you explicitly use it
- Proxy connections are established through your browser's built-in proxy API

## Technical Details

This extension uses:
- Random user generation APIs
- mail.tm API for disposable emails
- MailJS library for enhanced email functionality
- Browser's built-in proxy API
- Content scripts for form interaction

## License

MIT License 