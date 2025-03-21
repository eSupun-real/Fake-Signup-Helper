// Check and display the current proxy status when the popup opens
document.addEventListener("DOMContentLoaded", async () => {
  updateProxyStatus();
  
  // Set up proxy buttons handlers
  document.getElementById("switchProxy").addEventListener("click", switchProxy);
  document.getElementById("disconnectProxy").addEventListener("click", disconnectProxy);
  
  // Check if we have any pending form data that needs verification
  checkPendingFormData();
});

// Handle proxy switching
async function switchProxy() {
  const button = document.getElementById("switchProxy");
  button.disabled = true;
  button.textContent = "Switching...";
  
  try {
    const result = await chrome.runtime.sendMessage({ action: "switchProxy" });
    
    if (result && result.success) {
      showProxyMessage(`Switched to proxy: ${result.proxy}`, true);
    } else {
      const errorMessage = result && result.message 
        ? result.message 
        : "Failed to switch proxy. Check console for details.";
      console.error("Proxy switch failed:", errorMessage);
      showProxyMessage(errorMessage, false);
    }
  } catch (error) {
    console.error("Error in switchProxy:", error);
    showProxyMessage(`Error: ${error.message}`, false);
  } finally {
    button.disabled = false;
    button.textContent = "Switch Proxy";
    updateProxyStatus();
  }
}

// Handle proxy disconnection
async function disconnectProxy() {
  const button = document.getElementById("disconnectProxy");
  button.disabled = true;
  button.textContent = "Disconnecting...";
  
  try {
    const result = await chrome.runtime.sendMessage({ action: "disconnectProxy" });
    
    if (result && result.success) {
      showProxyMessage("Proxy disconnected successfully", true);
    } else {
      const errorMessage = result && result.message 
        ? result.message 
        : "Failed to disconnect proxy. Check console for details.";
      console.error("Proxy disconnect failed:", errorMessage);
      showProxyMessage(errorMessage, false);
    }
  } catch (error) {
    console.error("Error in disconnectProxy:", error);
    showProxyMessage(`Error: ${error.message}`, false);
  } finally {
    button.disabled = false;
    button.textContent = "Disconnect Proxy";
    updateProxyStatus();
  }
}

// Check for any pending form data that was submitted and needs verification
async function checkPendingFormData() {
  try {
    // Get the saved form data if any
    const storageData = await chrome.storage.local.get(['lastUsedFormData', 'lastFormSubmitTime']);
    const formData = storageData.lastUsedFormData;
    const submitTime = storageData.lastFormSubmitTime;
    
    // If we have form data and it was submitted recently (within last 30 minutes)
    if (formData && submitTime && (Date.now() - submitTime < 30 * 60 * 1000)) {
      // Create a verification section if it doesn't exist
      if (!document.getElementById("verification") || 
          document.getElementById("verification").style.display === "none") {
        
        // Show notification that we have form data
        const container = document.getElementById("emailData") || document.createElement("div");
        if (!document.getElementById("emailData")) {
          container.id = "emailData";
          document.querySelector(".container").appendChild(container);
        }
        
        container.innerHTML = `
          <h3>Recently Submitted Form</h3>
          <div class="data-field"><strong>Email:</strong> ${formData.email}</div>
          <div class="buttons">
            <button id="getVerificationForSubmitted">Get Verification Code</button>
            <button id="waitForVerificationForSubmitted">Wait for OTP</button>
          </div>
        `;
        
        // Add handler for the verification buttons
        document.getElementById("getVerificationForSubmitted").addEventListener("click", async () => {
          await getVerificationForSubmittedForm(formData);
        });
        
        document.getElementById("waitForVerificationForSubmitted").addEventListener("click", async () => {
          await waitForVerificationForSubmittedForm(formData);
        });
      }
    }
  } catch (error) {
    console.error("Error checking pending form data:", error);
  }
}

// Get verification code for a form that was submitted
async function getVerificationForSubmittedForm(formData) {
  // Show loading state
  const button = document.getElementById("getVerificationForSubmitted");
  const originalText = button.textContent;
  button.textContent = "Checking...";
  button.disabled = true;
  
  // Create or show verification section
  const verification = document.getElementById("verification") || document.createElement("div");
  if (!document.getElementById("verification")) {
    verification.id = "verification";
    document.querySelector(".container").appendChild(verification);
  }
  
  verification.style.display = "block";
  verification.innerHTML = `<div>Checking for verification codes...</div>`;
  
  try {
    // Get the verification code
    const verificationCode = await chrome.runtime.sendMessage({
      action: "getVerificationCode",
      emailId: formData.email,
      password: formData.password,
    });
    
    // Show verification result
    document.getElementById("verification").innerHTML = `
      <h3>Verification</h3>
      <div class="data-field">${verificationCode}</div>
      ${verificationCode && verificationCode.startsWith('http') 
        ? `<div class="buttons"><a href="${verificationCode}" target="_blank">Open Link</a></div>` 
        : ''}
    `;
  } catch (error) {
    document.getElementById("verification").innerHTML = `
      <div class="error-message">Error retrieving verification: ${error.message}</div>
    `;
  }
  
  // Reset button
  button.textContent = originalText;
  button.disabled = false;
}

// Wait for a new verification code for a submitted form
async function waitForVerificationForSubmittedForm(formData) {
  // Show loading state
  const button = document.getElementById("waitForVerificationForSubmitted");
  const originalText = button.textContent;
  button.innerHTML = "Waiting... <div class='loading-spinner'></div>";
  button.disabled = true;
  
  // Create or show verification section
  const verification = document.getElementById("verification") || document.createElement("div");
  if (!document.getElementById("verification")) {
    verification.id = "verification";
    document.querySelector(".container").appendChild(verification);
  }
  
  verification.style.display = "block";
  verification.innerHTML = `<div>Waiting for verification code (up to 60 seconds)...</div>`;
  
  try {
    // Wait for a verification code to arrive
    const verificationCode = await chrome.runtime.sendMessage({
      action: "waitForVerificationCode",
      emailId: formData.email,
      password: formData.password,
      timeout: 60000 // 60 seconds timeout
    });
    
    // Show verification result
    document.getElementById("verification").innerHTML = `
      <h3>Verification</h3>
      <div class="data-field">${verificationCode}</div>
      ${verificationCode && verificationCode.startsWith('http') 
        ? `<div class="buttons"><a href="${verificationCode}" target="_blank">Open Link</a></div>` 
        : ''}
    `;
  } catch (error) {
    document.getElementById("verification").innerHTML = `
      <div class="error-message">Error retrieving verification: ${error.message}</div>
    `;
  }
  
  // Reset button
  button.innerHTML = originalText;
  button.disabled = false;
}

// Update the proxy status indicator
async function updateProxyStatus() {
  try {
    const currentProxy = await chrome.runtime.sendMessage({ action: "getProxy" });
    const statusIndicator = document.getElementById("proxyStatusIndicator");
    const statusText = document.getElementById("proxyStatus");
    
    if (currentProxy) {
      statusIndicator.className = "status-indicator status-active";
      statusText.textContent = `Connected: ${currentProxy}`;
    } else {
      statusIndicator.className = "status-indicator status-inactive";
      statusText.textContent = "Not connected";
    }
  } catch (error) {
    console.error("Error checking proxy status:", error);
  }
}

// Show a proxy-related message
function showProxyMessage(message, isSuccess) {
  const container = document.getElementById("proxy");
  
  // Remove any existing messages
  const existingMessage = container.querySelector(".success-message, .error-message");
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new message
  const messageElement = document.createElement("div");
  messageElement.className = isSuccess ? "success-message" : "error-message";
  messageElement.textContent = message;
  
  // Add to the proxy section
  container.appendChild(messageElement);
  
  // Remove message after a delay
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.remove();
    }
  }, 5000);
}

// Handle the main data generation
document.getElementById("generate").addEventListener("click", async () => {
  // Show loading state
  document.getElementById("generate").textContent = "Generating...";
  document.getElementById("generate").disabled = true;
  
  try {
    const fakeData = await chrome.runtime.sendMessage({ action: "generateFakeData" });
    const emailData = await chrome.runtime.sendMessage({ action: "getDisposableEmail" });

    // Display user data in a cleaner format
    document.getElementById("data").innerHTML = `
      <h3>Personal Information</h3>
      <div class="data-field"><strong>Username:</strong> ${fakeData.username}</div>
      <div class="data-field"><strong>Name:</strong> ${fakeData.name}</div>
      <div class="data-field"><strong>Address:</strong> ${fakeData.address}</div>
      <div class="data-field"><strong>Phone:</strong> ${fakeData.phone}</div>
    `;
    
    // Display email data
    document.getElementById("emailData").innerHTML = `
      <h3>Email Information</h3>
      <div class="data-field"><strong>Email:</strong> ${emailData.email}</div>
      <div class="data-field">
        <strong>Password:</strong> ${emailData.password}
        <span class="password-strength ${getPasswordStrengthClass(emailData.password)}">${getPasswordStrengthLabel(emailData.password)}</span>
        <div class="password-controls">
          <button class="copy-btn" id="copyPassword">Copy password</button>
          <button class="show-password-options" id="showPasswordOptions">More options</button>
        </div>
      </div>
      <div class="buttons">
        <button id="verify">Get Verification</button>
        <button id="waitForOTP">Wait for OTP</button>
        <button id="autofill">Autofill Form</button>
      </div>
    `;

    // Show password options
    document.getElementById("passwordOptions").style.display = "none";
    document.getElementById("showPasswordOptions").addEventListener("click", () => {
      const optionsSection = document.getElementById("passwordOptions");
      if (optionsSection.style.display === "none") {
        optionsSection.style.display = "block";
      } else {
        optionsSection.style.display = "none";
      }
    });
    
    // Reset generate button
    document.getElementById("generate").textContent = "Generate New Data";
    document.getElementById("generate").disabled = false;
    
    // Password length slider
    const lengthSlider = document.getElementById("passwordLength");
    const lengthValue = document.getElementById("lengthValue");
    lengthSlider.addEventListener("input", () => {
      lengthValue.textContent = lengthSlider.value;
    });
    
    // Generate new password button
    document.getElementById("generateNewPassword").addEventListener("click", async () => {
      const button = document.getElementById("generateNewPassword");
      button.disabled = true;
      button.textContent = "Generating...";
      
      try {
        const includeNumbers = document.getElementById("includeNumbers").checked;
        const includeSymbols = document.getElementById("includeSymbols").checked;
        const length = document.getElementById("passwordLength").value;
        
        // Request a new password with specified options
        const result = await chrome.runtime.sendMessage({
          action: "generateCustomPassword",
          options: {
            length: parseInt(length),
            numbers: includeNumbers,
            symbols: includeSymbols
          }
        });
        
        if (result && result.password) {
          // Update the displayed password
          const passwordFields = document.querySelectorAll('.data-field');
          let passwordField = null;
          
          // Find the password field by looking for the one with "Password:" text
          for (const field of passwordFields) {
            if (field.textContent.includes('Password:')) {
              passwordField = field;
              break;
            }
          }
          
          if (passwordField) {
            // Update formData with the new password
            emailData.password = result.password;
            
            // Update the text after the strong element
            const strongElement = passwordField.querySelector('strong');
            if (strongElement && strongElement.nextSibling) {
              strongElement.nextSibling.textContent = ` ${result.password}`;
            }
            
            // Update strength indicator
            const strengthIndicator = passwordField.querySelector('.password-strength');
            if (strengthIndicator) {
              strengthIndicator.className = `password-strength ${getPasswordStrengthClass(result.password)}`;
              strengthIndicator.textContent = getPasswordStrengthLabel(result.password);
            }
          }
        }
      } catch (error) {
        console.error("Error generating new password:", error);
        document.getElementById("verification").innerHTML = `
          <div class="error-message">Error generating password: ${error.message}</div>
        `;
        document.getElementById("verification").style.display = "block";
      } finally {
        button.disabled = false;
        button.textContent = "Generate New Password";
      }
    });
    
    // Handle verification code retrieval
    document.getElementById("verify").addEventListener("click", async () => {
      // Show loading state
      document.getElementById("verify").textContent = "Checking...";
      document.getElementById("verify").disabled = true;
      document.getElementById("verification").style.display = "block";
      document.getElementById("verification").innerHTML = `<div>Checking for verification codes...</div>`;
      
      try {
        const verification = await chrome.runtime.sendMessage({
          action: "getVerificationCode",
          emailId: emailData.email,
          password: emailData.password,
        });
        
        // Show verification result
        document.getElementById("verification").innerHTML = `
          <h3>Verification</h3>
          <div class="data-field">${verification}</div>
          ${verification && verification.startsWith('http') 
            ? `<div class="buttons"><a href="${verification}" target="_blank">Open Link</a></div>` 
            : ''}
        `;
      } catch (error) {
        document.getElementById("verification").innerHTML = `
          <div class="error-message">Error retrieving verification: ${error.message}</div>
        `;
      }
      
      // Reset verify button
      document.getElementById("verify").textContent = "Get Verification";
      document.getElementById("verify").disabled = false;
    });
    
    // Handle waiting for OTP
    document.getElementById("waitForOTP").addEventListener("click", async () => {
      // Show loading state
      const button = document.getElementById("waitForOTP");
      button.innerHTML = "Waiting... <div class='loading-spinner'></div>";
      button.disabled = true;
      document.getElementById("verification").style.display = "block";
      document.getElementById("verification").innerHTML = `<div>Waiting for verification code (up to 60 seconds)...</div>`;
      
      try {
        const verification = await chrome.runtime.sendMessage({
          action: "waitForVerificationCode",
          emailId: emailData.email,
          password: emailData.password,
          timeout: 60000 // 60 seconds
        });
        
        // Show verification result
        document.getElementById("verification").innerHTML = `
          <h3>Verification</h3>
          <div class="data-field">${verification}</div>
          ${verification && verification.startsWith('http') 
            ? `<div class="buttons"><a href="${verification}" target="_blank">Open Link</a></div>` 
            : ''}
        `;
      } catch (error) {
        document.getElementById("verification").innerHTML = `
          <div class="error-message">Error retrieving verification: ${error.message}</div>
        `;
      }
      
      // Reset verify button
      button.innerHTML = "Wait for OTP";
      button.disabled = false;
    });
    
    // Handle autofill
    document.getElementById("autofill").addEventListener("click", async () => {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      // Combine all the data for form filling
      const formData = {
        ...fakeData,
        email: emailData.email,
        password: emailData.password
      };
      
      // Send data to content script for autofilling
      chrome.tabs.sendMessage(activeTab.id, {
        action: "fillForm",
        data: formData
      });
      
      // Show confirmation instead of closing the popup
      const confirmMessage = document.createElement('div');
      confirmMessage.className = 'success-message';
      confirmMessage.textContent = 'Form autofilled successfully!';
      
      // Add the message to the verification section and make it visible
      document.getElementById('verification').innerHTML = '';
      document.getElementById('verification').appendChild(confirmMessage);
      document.getElementById('verification').style.display = 'block';
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        document.getElementById('verification').style.display = 'none';
      }, 3000);
    });

    // Add password copy functionality
    document.getElementById("copyPassword").addEventListener("click", () => {
      navigator.clipboard.writeText(emailData.password).then(() => {
        const copyBtn = document.getElementById("copyPassword");
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      });
    });
  } catch (error) {
    // Show error
    document.getElementById("data").innerHTML = `<div class="error-message">Error generating data: ${error.message}</div>`;
    document.getElementById("generate").textContent = "Try Again";
    document.getElementById("generate").disabled = false;
  }
});

// Function to determine password strength
function getPasswordStrengthClass(password) {
  if (!password) return 'weak';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLongEnough = password.length >= 12;
  
  const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial, isLongEnough].filter(Boolean).length;
  
  if (score >= 4) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

// Function to get strength label
function getPasswordStrengthLabel(password) {
  const strengthClass = getPasswordStrengthClass(password);
  switch (strengthClass) {
    case 'strong': return 'Strong';
    case 'medium': return 'Medium';
    case 'weak': return 'Weak';
    default: return '';
  }
}

// Update the message listener to handle form submissions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "formSubmitted" && message.data) {
    // Store the form data and timestamp
    chrome.storage.local.set({
      'lastUsedFormData': message.data,
      'lastFormSubmitTime': Date.now()
    });
    
    // Send confirmation
    sendResponse({ success: true });
  }
});