// Browser API compatibility
let browser;
if (typeof globalThis.browser === "undefined") {
  browser = chrome;
} else {
  browser = globalThis.browser;
}

// Initialize global variables
let currentProxy = null;
let proxyListenerRegistered = false;
let mailjsHandler = null;

// Initialize MailjsHandler when script loads
try {
  importScripts('mailjs.min.js', 'mailjs-handler.js');
  mailjsHandler = new MailjsHandler();
  console.log("MailjsHandler initialized in background script");
} catch (error) {
  console.error("Error initializing MailjsHandler:", error);
}

// Generate and save icons when the extension is installed
browser.runtime.onInstalled.addListener(() => {
  generateIcons();
  // Initialize proxy on install
  setRandomProxy().catch(err => console.error("Error setting initial proxy:", err));
});

// Function to create icons dynamically
function generateIcons() {
  const sizes = [16, 48, 128];
  
  sizes.forEach(size => {
    // Create a canvas element
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Draw a gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4285f4');
    gradient.addColorStop(1, '#34a853');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw a sparkle symbol
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', size / 2, size / 2);
    
    // Convert to blob and store in extension
    canvas.convertToBlob().then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Save as extension icon
        browser.storage.local.set({ [`icon${size}`]: reader.result });
      };
      reader.readAsDataURL(blob);
    });
  });
}

async function getCountryFromIP() {
  try {
    const ipResponse = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
    const geoData = await geoResponse.json();
    return geoData.countryCode; // or geoData.country for full country name
  } catch (error) {
    console.error("Error getting IP or country:", error);
    return null;
  }
}

async function generateFakeData() {
  const countryCode = await getCountryFromIP();
  let apiUrl = "https://randomuser.me/api/";

  if (countryCode) {
    apiUrl += `?nat=${countryCode.toLowerCase()}`;
  }

  const response = await fetch(apiUrl);
  const data = await response.json();
  const user = data.results[0];

  return {
    username: user.login.username,
    name: `${user.name.first} ${user.name.last}`,
    address: `${user.location.street.number} ${user.location.street.name}, ${user.location.city}, ${user.location.state}, ${user.location.country}`,
    phone: user.phone,
    email: user.email,
  };
}

async function generateStrongPassword() {
  try {
    // Use Genratr service instead of API Ninjas
    const apiUrl = "https://www.genratr.com/api/v1/password";
    
    // Configure password generation parameters
    const params = new URLSearchParams({
      length: 16,
      numbers: true,
      symbols: true,
      lowercase: true,
      uppercase: true
    });
    
    // Make the API request
    const response = await fetch(`${apiUrl}?${params}`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Genratr request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.password || data.result || data.value;
  } catch (error) {
    console.error("Error generating strong password with Genratr:", error);
    
    // Fallback to generate a strong password locally if the API fails
    return generateLocalPassword();
  }
}

function generateLocalPassword() {
  // Robust fallback function to generate a strong password locally
  const length = 16;
  const uppercaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed confusing I and O
  const lowercaseChars = "abcdefghijkmnopqrstuvwxyz"; // Removed confusing l
  const numberChars = "23456789"; // Removed confusing 0 and 1
  const specialChars = "!@#$%^&*()_+-=[]{}|;:,./?";
  
  // Ensure at least one of each character type for maximum strength
  let password = "";
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Create a combined charset without confusing characters
  const combinedCharset = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += combinedCharset.charAt(Math.floor(Math.random() * combinedCharset.length));
  }
  
  // Shuffle the password to ensure randomness
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Updated function to create disposable email using MailjsHandler
async function getDisposableEmail() {
  try {
    if (mailjsHandler) {
      console.log("Using MailjsHandler to create email account");
      const account = await mailjsHandler.createAccount();
      return {
        email: account.address,
        password: account.password,
        id: account.id,
        token: account.token
      };
    } else {
      // Fallback to old implementation if MailjsHandler isn't initialized
      console.log("Fallback to original email creation method");
      return getDisposableEmailOriginal();
    }
  } catch (error) {
    console.error("Error in getDisposableEmail:", error);
    // Fallback to old implementation
    console.log("Fallback to original email creation method after error");
    return getDisposableEmailOriginal();
  }
}

// Original getDisposableEmail function renamed for fallback
async function getDisposableEmailOriginal() {
  const mailtmDomain = "mail.tm";
  const mailtmApiUrl = "https://api.mail.tm";

  const response = await fetch(`${mailtmApiUrl}/domains`);
  const domains = await response.json();
  const domain = domains["hydra:member"][0].domain;

  // Generate a strong password instead of a random string
  const strongPassword = await generateStrongPassword();

  const emailResponse = await fetch(`${mailtmApiUrl}/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: `${generateRandomString(10)}@${domain}`,
      password: strongPassword,
    }),
  });

  const emailData = await emailResponse.json();

  return {
    email: emailData.address,
    password: emailData.password,
    id: emailData.id,
  };
}

// Updated function to get verification code using MailjsHandler
async function getVerificationCode(emailId, password) {
  try {
    if (mailjsHandler) {
      // If we have an active account with the same ID, use it
      if (mailjsHandler.currentAccount && mailjsHandler.currentAccount.id === emailId) {
        console.log("Using existing MailjsHandler account for verification");
        return await mailjsHandler.getLatestVerificationCode();
      } else {
        // Login with the provided credentials and get verification
        console.log("Logging in with provided credentials for verification");
        await mailjsHandler.mailjs.login(emailId, password);
        mailjsHandler.currentAccount = {
          id: emailId,
          password: password,
          token: mailjsHandler.mailjs.token,
          address: emailId
        };
        return await mailjsHandler.getLatestVerificationCode();
      }
    } else {
      // Fallback to old implementation
      console.log("Fallback to original verification method");
      return getVerificationCodeOriginal(emailId, password);
    }
  } catch (error) {
    console.error("Error in getVerificationCode:", error);
    // Fallback to old implementation
    return getVerificationCodeOriginal(emailId, password);
  }
}

// Original getVerificationCode function renamed for fallback
async function getVerificationCodeOriginal(emailId, password) {
  const mailtmApiUrl = "https://api.mail.tm";

  const messagesResponse = await fetch(`${mailtmApiUrl}/messages?page=1`, {
    headers: {
      Authorization: `Bearer ${await getAuthToken(emailId, password)}`,
    },
  });

  const messages = await messagesResponse.json();
  if (messages["hydra:member"].length > 0) {
    const messageId = messages["hydra:member"][0].id;
    const messageDetailsResponse = await fetch(`${mailtmApiUrl}/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${await getAuthToken(emailId, password)}`,
      },
    });
    const messageDetails = await messageDetailsResponse.json();

    const text = messageDetails.text;

    //basic regex for extracting codes or URLs. Adapt as needed.
    const codeMatch = text.match(/\b\d{6}\b/);
    const urlMatch = text.match(/https?:\/\/[^\s]+/);

    if (codeMatch) {
      return codeMatch[0];
    } else if (urlMatch) {
      return urlMatch[0];
    } else {
      return text; //Return the entire text if no code or URL is found.
    }
  } else {
    return "No messages yet.";
  }
}

async function getAuthToken(emailId, password) {
  const mailtmApiUrl = "https://api.mail.tm";
  const tokenResponse = await fetch(`${mailtmApiUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: emailId,
      password: password,
    }),
  });
  const tokenData = await tokenResponse.json();
  return tokenData.token;
}

function generateRandomString(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function getProxyList() {
  const response = await fetch("https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt");
  const text = await response.text();
  return text.split("\n").filter((line) => line.trim() !== "");
}

async function setRandomProxy() {
  try {
    // Just call our improved switchProxy function
    const result = await switchProxy();
    return result.success;
  } catch (error) {
    console.error("Error in setRandomProxy:", error);
    return false;
  }
}

// Use the appropriate browser object for event listeners
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Remove previous listener if it exists (important for Firefox)
try {
  browserAPI.tabs.onCreated.removeListener(setRandomProxy);
} catch (e) {
  // Ignore errors if no listener existed
}

// Add tab creation listener
browserAPI.tabs.onCreated.addListener(setRandomProxy);

// Message listener for extension communication
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === "generateFakeData") {
      sendResponse(await generateFakeData());
    } else if (request.action === "getDisposableEmail") {
      sendResponse(await getDisposableEmail());
    } else if (request.action === "getVerificationCode") {
      sendResponse(await getVerificationCode(request.emailId, request.password));
    } else if (request.action === "waitForVerificationCode") {
      // New method to wait for verification code
      if (mailjsHandler && mailjsHandler.currentAccount) {
        sendResponse(await mailjsHandler.waitForVerificationCode(request.timeout || 60000));
      } else {
        sendResponse("Mailjs handler not initialized or no active account");
      }
    } else if (request.action === "getProxy") {
      sendResponse(currentProxy);
    } else if (request.action === "switchProxy") {
      sendResponse(await switchProxy());
    } else if (request.action === "disconnectProxy") {
      sendResponse(await disconnectProxy());
    } else if (request.action === "generateCustomPassword") {
      const password = await generateCustomPassword(request.options || {});
      sendResponse({ password });
    } else if (request.action === "formSubmitted") {
      // Store the submission in local storage
      chrome.storage.local.set({
        'lastUsedFormData': request.data,
        'lastFormSubmitTime': Date.now()
      });
      sendResponse({ success: true });
    }
  })();
  return true; // Important: Keeps the message channel open for async responses
});

async function generateCustomPassword(options) {
  try {
    // Use Genratr service with custom options
    const apiUrl = "https://www.genratr.com/api/v1/password";
    
    // Configure password generation parameters with defaults
    const params = new URLSearchParams({
      length: options.length || 16,
      numbers: options.numbers !== undefined ? options.numbers : true,
      symbols: options.symbols !== undefined ? options.symbols : true,
      lowercase: options.lowercase !== undefined ? options.lowercase : true,
      uppercase: options.uppercase !== undefined ? options.uppercase : true
    });
    
    // Make the API request
    const response = await fetch(`${apiUrl}?${params}`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Genratr request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.password || data.result || data.value;
  } catch (error) {
    console.error("Error generating custom password with Genratr:", error);
    
    // Fallback to generate a custom password locally
    return generateLocalCustomPassword(options);
  }
}

function generateLocalCustomPassword(options) {
  // Defaults
  const length = options.length || 16;
  const useUppercase = options.uppercase !== undefined ? options.uppercase : true;
  const useLowercase = options.lowercase !== undefined ? options.lowercase : true;
  const useNumbers = options.numbers !== undefined ? options.numbers : true;
  const useSymbols = options.symbols !== undefined ? options.symbols : true;
  
  // Character sets
  const uppercaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed confusing I and O
  const lowercaseChars = "abcdefghijkmnopqrstuvwxyz"; // Removed confusing l
  const numberChars = "23456789"; // Removed confusing 0 and 1
  const specialChars = "!@#$%^&*()_+-=[]{}|;:,./?";
  
  // Start with an empty password
  let password = "";
  let charset = "";
  
  // Build charset based on options
  if (useUppercase) charset += uppercaseChars;
  if (useLowercase) charset += lowercaseChars;
  if (useNumbers) charset += numberChars;
  if (useSymbols) charset += specialChars;
  
  // If no options selected, use lowercase as default
  if (!charset) charset = lowercaseChars;
  
  // Ensure at least one character from each selected character set
  if (useUppercase && password.length < length) 
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  if (useLowercase && password.length < length) 
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  if (useNumbers && password.length < length) 
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  if (useSymbols && password.length < length) 
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest randomly
  while (password.length < length) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Firefox proxy request handler
function firefoxProxyRequestHandler(proxyInfo) {
  return function(requestDetails) {
    return proxyInfo;
  };
}

// Clean up any existing Firefox proxy handlers
function cleanupFirefoxProxyHandlers() {
  if (typeof browser !== 'undefined' && browser.proxy && browser.proxy.onRequest) {
    try {
      browser.proxy.onRequest.removeListener(proxyListenerRegistered);
      proxyListenerRegistered = null;
    } catch (e) {
      // Ignore errors if no listener exists
      console.log("No proxy listener to remove");
    }
  }
}

async function switchProxy() {
  try {
    // Clean up any existing Firefox proxy handlers first
    cleanupFirefoxProxyHandlers();
    
    const proxies = await getProxyList();
    
    if (proxies.length === 0) {
      console.error("No proxies available");
      return { success: false, message: "No proxies available" };
    }
    
    // Try up to 5 random proxies until we find one that works
    for (let i = 0; i < 5 && i < proxies.length; i++) {
      const randomIndex = Math.floor(Math.random() * proxies.length);
      const randomProxy = proxies[randomIndex];
      
      // Remove the tested proxy from the list to avoid trying it again
      proxies.splice(randomIndex, 1);
      
      const [host, port] = randomProxy.split(":");
      
      // Skip if host or port is invalid
      if (!host || !port || isNaN(parseInt(port))) {
        continue;
      }
      
      // Store current proxy for reference
      currentProxy = `${host}:${port}`;
      
      try {
        // Detect browser type
        const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getBrowserInfo;
        
        if (isFirefox) {
          // Firefox proxy configuration
          // First, request additional permissions if needed
          try {
            await browser.permissions.request({
              permissions: ["browserSettings"]
            });
          } catch (permError) {
            console.warn("Could not request additional permissions:", permError);
            // Continue anyway - might already have permissions
          }
          
          // Create proxy info object
          const proxyInfo = {
            type: "socks",
            host: host,
            port: parseInt(port),
            proxyDNS: true,
            failoverTimeout: 5
          };
          
          // Create and register the handler function
          const handler = firefoxProxyRequestHandler(proxyInfo);
          proxyListenerRegistered = handler; // Store reference for cleanup
          
          browser.proxy.onRequest.addListener(handler, { urls: ["<all_urls>"] });
          
          console.log(`Set Firefox proxy to ${host}:${port}`);
          return { success: true, proxy: currentProxy };
        } 
        // Chrome-style proxy setting
        else if (chrome.proxy && chrome.proxy.settings) {
          const config = {
            mode: "fixed_servers",
            rules: {
              singleProxy: {
                scheme: "socks5",
                host: host,
                port: parseInt(port)
              },
              bypassList: ["localhost", "127.0.0.1"]
            }
          };
          
          await chrome.proxy.settings.set({ 
            value: config, 
            scope: 'regular' 
          });
          console.log(`Set Chrome proxy to ${host}:${port}`);
          return { success: true, proxy: currentProxy };
        } 
        else {
          throw new Error("Proxy API not available - check extension permissions");
        }
      } catch (error) {
        console.error("Error setting proxy:", error);
        return { 
          success: false, 
          message: `Error setting proxy: ${error.message}` 
        };
      }
    }
    
    return { success: false, message: "Could not find a working proxy" };
  } catch (error) {
    console.error("Error in switchProxy:", error);
    return { success: false, message: error.message };
  }
}

// Add disconnectProxy function
async function disconnectProxy() {
  try {
    // Clean up any existing Firefox proxy handlers first
    cleanupFirefoxProxyHandlers();
    
    // Detect browser type
    const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getBrowserInfo;
    
    // Clear the current proxy
    currentProxy = null;
    
    if (isFirefox) {
      // For Firefox, we can either remove the proxy listener or set to "direct" connection
      try {
        // Firefox has different proxy modes - we use "direct" to bypass proxy
        const proxyInfo = { type: "direct" };
        
        // Create and register the handler function
        const handler = firefoxProxyRequestHandler(proxyInfo);
        proxyListenerRegistered = handler; // Store reference for cleanup
        
        // Remove any existing handlers first
        cleanupFirefoxProxyHandlers();
        
        // Add our "direct" handler
        browser.proxy.onRequest.addListener(handler, { urls: ["<all_urls>"] });
        
        console.log("Disabled Firefox proxy");
        return { success: true };
      } catch (error) {
        console.error("Error disabling Firefox proxy:", error);
        return { 
          success: false, 
          message: `Error disabling Firefox proxy: ${error.message}` 
        };
      }
    } 
    // Chrome-style proxy setting
    else if (chrome.proxy && chrome.proxy.settings) {
      // Set to system settings or direct connection
      const config = {
        mode: "system" // Use system proxy settings (usually direct)
      };
      
      await chrome.proxy.settings.set({ 
        value: config, 
        scope: 'regular' 
      });
      
      console.log("Disabled Chrome proxy");
      return { success: true };
    } 
    else {
      throw new Error("Proxy API not available - check extension permissions");
    }
  } catch (error) {
    console.error("Error in disconnectProxy:", error);
    return { success: false, message: error.message };
  }
}