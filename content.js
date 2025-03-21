// Helper function to create a floating autofill button
function createFloatingButton() {
  // This function is now disabled per user request
  return;
}

// Function to fill form with data
function fillFormWithData(data) {
  console.log("Filling form with data:", data);
  
  // Store form data for later use with OTP verification
  chrome.storage.local.set({ 'lastUsedFormData': data }, () => {
    console.log("Form data saved for later use with OTP verification");
  });
  
  // Define possible field selectors for each data type
  const fieldMap = {
    username: ['username', 'user', 'loginname', 'login', 'account', 'userid', 'user-id', 'user_id', 'nickname', 'uname'],
    name: ['name', 'fullname', 'full-name', 'full_name', 'displayname', 'profile-name', 'realname', 'customer-name', 'customer_name', 'clientname'],
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'givenname', 'forename', 'first', 'namefirst'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'familyname', 'surname', 'last', 'namelast', 'secondname'],
    address: ['address', 'street', 'streetaddress', 'street-address', 'addr', 'location', 'mailing-address', 'residence', 'addressline1', 'address1', 'addressline'],
    phone: [
      // Common phone field identifiers
      'phone', 'telephone', 'phone-number', 'phonenum', 'phonenumber', 'tel', 'mobile', 'cellphone', 'cell-phone', 'contactnumber',
      'cell', 'mobilephone', 'mobile-phone', 'daytimephone', 'eveningphone', 'workphone', 'homephone', 'primaryphone',
      // Additional phone fields with variants
      'phone_number', 'phone-mobile', 'contact-phone', 'cellphone-number', 'mobile_number', 'mobileno', 'phone-no',
      'contactphone', 'phonecontact', 'contact_phone', 'phonemobile', 'phone_mobile', 'phone_home', 'phone_work',
      // Format-specific identifiers
      'phone1', 'phonearea', 'phonelocal', 'phonecountry', 'phoneext', 'extension', 'phone-area-code',
      // International variants
      'intlphone', 'international-phone', 'countrycode'
    ],
    email: ['email', 'e-mail', 'emailaddress', 'email-address', 'mail', 'contact-email', 'useremail', 'emailid', 'email_id', 'user_email', 'user-email', 'your-email', 'primary-email', 'primary_email', 'login_email'],
    password: [
      // Common password field identifiers
      'password', 'pass', 'pwd', 'passwd', 'passw', 'secret', 'userpassword', 'user-password', 'user_password',
      // New password variants
      'newpassword', 'new-password', 'new_password', 'create-password', 'create_password', 'choose-password', 'password-new',
      // Security related
      'security-password', 'secretkey', 'passcode', 'pin', 'pincode', 'pin-code', 'password1',
      // Account registration specific
      'reg-password', 'reg_password', 'signup-password', 'signup_password', 'registration-password', 'account-password',
      'accountpassword', 'set-password', 'define-password', 'login-password', 'log-in-password'
    ],
    confirmPassword: ['confirm-password', 'confirmpassword', 'confirm_password', 'password-confirm', 'password_confirm', 'repeatpassword', 'repeat-password', 'password-repeat', 'passwordrepeat', 'verify-password', 'verifypassword', 'reenterpassword', 're-enter-password', 're_enter_password', 'password-verification', 'password-check', 'password_verify', 'password2', 'passwd2', 'reinput-password', 'password-reenter']
  };
  
  // Extract first and last name from the full name
  const nameParts = data.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  // Fill form fields
  fillMatchingFields();
  
  // Setup form submission listener to track when the form is submitted
  setupFormSubmissionListener(data);
  
  function fillMatchingFields() {
    // Find all input fields
    const inputFields = document.querySelectorAll('input, textarea');
    
    inputFields.forEach(field => {
      const fieldType = field.type ? field.type.toLowerCase() : '';
      const fieldId = (field.id || '').toLowerCase();
      const fieldName = (field.name || '').toLowerCase();
      const fieldPlaceholder = (field.placeholder || '').toLowerCase();
      const fieldClass = (field.className || '').toLowerCase();
      const fieldLabel = getAssociatedLabelText(field).toLowerCase();
      const fieldAriaLabel = (field.getAttribute('aria-label') || '').toLowerCase();
      const fieldAutocomplete = (field.getAttribute('autocomplete') || '').toLowerCase();
      
      const attributes = [fieldId, fieldName, fieldPlaceholder, fieldClass, fieldLabel, fieldAriaLabel, fieldAutocomplete];
      
      // Skip hidden, submit, button fields
      if (['hidden', 'submit', 'button', 'file'].includes(fieldType)) {
        return;
      }
      
      // Handle checkboxes for terms and conditions separately
      if (fieldType === 'checkbox') {
        const termsKeywords = ['agree', 'terms', 'condition', 'accept', 'policy', 'consent', 'privacy'];
        if (attributes.some(attr => termsKeywords.some(term => attr.includes(term)))) {
          field.checked = true;
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      
      // Check for specific HTML5 input types first (they take highest priority)
      if (fieldType === 'email' || fieldAutocomplete === 'email') {
        fillField(field, data.email);
        return;
      }
      
      if (fieldType === 'tel' || fieldAutocomplete === 'tel' || fieldAutocomplete === 'mobile' || fieldAutocomplete === 'phone') {
        fillField(field, data.phone);
        return;
      }
      
      if (fieldType === 'password' || fieldAutocomplete === 'new-password' || fieldAutocomplete === 'current-password') {
        // Check if this might be a confirmation password field
        if (attributes.some(attr => fieldMap.confirmPassword.some(term => attr.includes(term)))) {
          fillField(field, data.password); // Fill with the same password for confirmation
        } else {
          fillField(field, data.password);
        }
        return;
      }
      
      // Now check attributes against our field maps
      
      // Check for email fields
      if (attributes.some(attr => fieldMap.email.some(term => attr.includes(term) || term === attr))) {
        fillField(field, data.email);
        return;
      }
      
      // Enhanced check for phone fields
      if (attributes.some(attr => fieldMap.phone.some(term => attr.includes(term) || term === attr))) {
        fillField(field, data.phone);
        return;
      }
      
      // Enhanced check for password fields
      if (attributes.some(attr => fieldMap.password.some(term => attr.includes(term) || term === attr))) {
        // Double-check to make sure it's not a confirmation field
        if (attributes.some(attr => fieldMap.confirmPassword.some(term => attr.includes(term)))) {
          fillField(field, data.password);
        } else {
          fillField(field, data.password);
        }
        return;
      }
      
      // Check for confirmation password fields
      if (attributes.some(attr => fieldMap.confirmPassword.some(term => attr.includes(term) || term === attr))) {
        fillField(field, data.password);
        return;
      }
      
      // Check for other field types
      for (const [dataType, terms] of Object.entries(fieldMap)) {
        if (['email', 'password', 'confirmPassword', 'phone'].includes(dataType)) continue; // Already handled
        
        if (attributes.some(attr => terms.some(term => attr.includes(term) || term === attr))) {
          let valueToFill = data[dataType];
          
          // Special case for split names
          if (dataType === 'firstName') valueToFill = firstName;
          if (dataType === 'lastName') valueToFill = lastName;
          
          fillField(field, valueToFill);
          break;
        }
      }
    });
    
    // Also try to fill select fields (like country, state, etc.)
    fillSelectFields();
    
    // Look for special phone field patterns (separated fields for area code, etc.)
    fillPhoneFieldGroups();
  }
  
  function fillPhoneFieldGroups() {
    // Look for small input fields near each other that could be part of a phone number
    // This handles cases where phone is split into area code, prefix, line number, etc.
    
    // First, find potential area code fields
    const potentialPhonePartFields = Array.from(document.querySelectorAll('input[maxlength="3"], input[maxlength="4"], input[size="3"], input[size="4"]'));
    
    // Filter to likely phone fields based on ID, name, or nearby text
    const phoneMatches = ['phone', 'tel', 'mobile', 'area', 'prefix', 'suffix', 'cell'];
    
    potentialPhonePartFields.forEach(field => {
      const fieldId = (field.id || '').toLowerCase();
      const fieldName = (field.name || '').toLowerCase();
      const nearbyText = getNearbyText(field).toLowerCase();
      
      // If this looks like a phone field part
      if (phoneMatches.some(match => fieldId.includes(match) || fieldName.includes(match) || 
                                      nearbyText.includes(match) || nearbyText.includes('phone'))) {
        
        // Get the parent container to look for sibling fields
        const container = field.parentElement;
        const siblingInputs = Array.from(container.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"]'));
        
        if (siblingInputs.length >= 2 && siblingInputs.length <= 4) {
          // This is likely a grouped phone field
          const phoneDigits = data.phone.replace(/\D/g, ''); // Strip non-digits
          
          // Try to distribute the digits across fields based on maxlength
          let digitPosition = 0;
          
          siblingInputs.forEach(inputField => {
            const maxLen = inputField.maxLength || 4;
            if (maxLen > 0 && maxLen <= 4) {
              // This looks like a part of a phone number
              const partValue = phoneDigits.substr(digitPosition, maxLen);
              if (partValue) {
                fillField(inputField, partValue);
                digitPosition += maxLen;
              }
            }
          });
        }
      }
    });
  }
  
  function getNearbyText(element) {
    // Get text from nearby elements to help identify the field
    const parent = element.parentElement;
    return parent ? parent.innerText : '';
  }
  
  function fillSelectFields() {
    const selectFields = document.querySelectorAll('select');
    
    selectFields.forEach(select => {
      const selectId = (select.id || '').toLowerCase();
      const selectName = (select.name || '').toLowerCase();
      const selectLabel = getAssociatedLabelText(select).toLowerCase();
      
      // Try to handle common select fields
      if (selectId.includes('country') || selectName.includes('country') || selectLabel.includes('country')) {
        // Try to select a matching country option if available in the address
        const countryPart = data.address.split(',').pop().trim().toLowerCase();
        selectOptionByText(select, countryPart);
      } else if (selectId.includes('state') || selectName.includes('state') || selectLabel.includes('state') ||
                 selectId.includes('province') || selectName.includes('province') || selectLabel.includes('province')) {
        // Try to extract state from address if possible
        const addressParts = data.address.split(',');
        if (addressParts.length >= 2) {
          const statePart = addressParts[addressParts.length - 2].trim();
          selectOptionByText(select, statePart);
        }
      }
    });
  }
  
  function getAssociatedLabelText(field) {
    // Try to find a label that references this field
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent;
    }
    
    // Check for wrapping label
    let element = field;
    while (element && element.tagName !== 'FORM') {
      if (element.tagName === 'LABEL') {
        return element.textContent;
      }
      element = element.parentElement;
    }
    
    // Look for nearby labels without explicit 'for' attribute
    if (field.parentElement) {
      const siblings = field.parentElement.children;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].tagName === 'LABEL') {
          return siblings[i].textContent;
        }
      }
    }
    
    return '';
  }
  
  function fillField(field, value) {
    if (!value) return;
    
    // Set the value property
    field.value = value;
    
    // Dispatch events to trigger any listeners
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  
  function selectOptionByText(selectElement, textToMatch) {
    if (!textToMatch) return;
    
    textToMatch = textToMatch.toLowerCase();
    const options = selectElement.options;
    
    for (let i = 0; i < options.length; i++) {
      const optionText = options[i].text.toLowerCase();
      if (optionText.includes(textToMatch) || textToMatch.includes(optionText)) {
        selectElement.selectedIndex = i;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }
}

// Setup a listener for form submissions to keep track of when a form is submitted
function setupFormSubmissionListener(formData) {
  // Get all forms in the page
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Remove any existing listeners first
    form.removeEventListener('submit', handleFormSubmit);
    
    // Add a new listener
    form.addEventListener('submit', handleFormSubmit);
  });
  
  function handleFormSubmit(event) {
    // Store the email ID that was used in the form
    if (formData && formData.email) {
      chrome.runtime.sendMessage({ 
        action: "formSubmitted", 
        data: formData 
      });
    }
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    fillFormWithData(request.data);
    sendResponse({ success: true });
  }
});

// We're not creating the floating button anymore per user request