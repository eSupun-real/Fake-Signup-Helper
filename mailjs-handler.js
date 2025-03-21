// Mailjs handler for Fake Signup Helper extension
// This file provides an interface to the mail.tm API using the Mailjs library

class MailjsHandler {
  constructor() {
    this.mailjs = null;
    this.currentAccount = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize the Mailjs instance
      this.mailjs = new Mailjs();
      console.log("Mailjs handler initialized");
    } catch (error) {
      console.error("Error initializing Mailjs:", error);
    }
  }

  /**
   * Creates a new temporary email account
   * @returns {Promise<Object>} Account information with email and password
   */
  async createAccount() {
    try {
      // Create a random account
      const result = await this.mailjs.createOneAccount();
      
      if (!result || !result.data) {
        throw new Error("Failed to create email account");
      }
      
      // Store the account data
      this.currentAccount = {
        id: result.data.id,
        address: result.data.address,
        password: result.data.password,
        token: this.mailjs.token
      };
      
      return this.currentAccount;
    } catch (error) {
      console.error("Error creating email account:", error);
      throw error;
    }
  }

  /**
   * Gets all messages for the current account
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages() {
    try {
      if (!this.currentAccount) {
        throw new Error("No active email account");
      }
      
      const result = await this.mailjs.getMessages();
      return result.data;
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }

  /**
   * Gets a specific message by ID
   * @param {string} messageId The ID of the message to retrieve
   * @returns {Promise<Object>} The message data
   */
  async getMessage(messageId) {
    try {
      if (!this.currentAccount) {
        throw new Error("No active email account");
      }
      
      const result = await this.mailjs.getMessage(messageId);
      return result.data;
    } catch (error) {
      console.error(`Error getting message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Extracts verification code from a message
   * @param {Object} message The message object to extract from
   * @returns {String|null} Verification code or null if not found
   */
  extractVerificationCode(message) {
    if (!message || !message.text) {
      return null;
    }
    
    // Try to find a 6-digit verification code
    const sixDigitMatch = message.text.match(/\b\d{6}\b/);
    if (sixDigitMatch) {
      return sixDigitMatch[0];
    }
    
    // Try to find a 4-digit verification code
    const fourDigitMatch = message.text.match(/\b\d{4}\b/);
    if (fourDigitMatch) {
      return fourDigitMatch[0];
    }
    
    // Try to find a verification link
    const urlMatch = message.text.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      return urlMatch[0];
    }
    
    return null;
  }

  /**
   * Gets the latest verification code from messages
   * @returns {Promise<String|null>} Verification code or null if not found
   */
  async getLatestVerificationCode() {
    try {
      if (!this.currentAccount) {
        throw new Error("No active email account");
      }
      
      // Get all messages
      const messages = await this.getMessages();
      
      if (!messages || messages.length === 0) {
        return "No messages yet. Check back in a minute.";
      }
      
      // Get the most recent message
      const latestMessage = messages[0];
      
      // Get full message details
      const fullMessage = await this.getMessage(latestMessage.id);
      
      // Extract and return verification code
      const code = this.extractVerificationCode(fullMessage);
      
      return code || "No verification code found in the message. Full text: " + fullMessage.text.substring(0, 200) + "...";
    } catch (error) {
      console.error("Error getting verification code:", error);
      throw error;
    }
  }

  /**
   * Waits for a new message and returns the verification code
   * @param {number} timeout Timeout in milliseconds
   * @returns {Promise<String|null>} Verification code or null if not found
   */
  async waitForVerificationCode(timeout = 60000) {
    try {
      if (!this.currentAccount) {
        throw new Error("No active email account");
      }
      
      const startTime = Date.now();
      let initialMessageCount = 0;
      
      // Get initial message count
      const initialMessages = await this.getMessages();
      if (initialMessages) {
        initialMessageCount = initialMessages.length;
      }
      
      // Poll for new messages
      while (Date.now() - startTime < timeout) {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get current messages
        const currentMessages = await this.getMessages();
        
        // If we have more messages than before, check the newest one
        if (currentMessages && currentMessages.length > initialMessageCount) {
          const latestMessage = await this.getMessage(currentMessages[0].id);
          const code = this.extractVerificationCode(latestMessage);
          
          if (code) {
            return code;
          }
        }
      }
      
      return "No verification code received within the timeout period.";
    } catch (error) {
      console.error("Error waiting for verification code:", error);
      throw error;
    }
  }
}

// Export the handler
window.MailjsHandler = MailjsHandler; 