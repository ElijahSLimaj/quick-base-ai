(function() {
  'use strict';
  
  // Load marked library for markdown rendering
  function loadMarked() {
    return new Promise((resolve, reject) => {
      if (window.marked) {
        resolve(window.marked);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js';
      script.onload = () => resolve(window.marked);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  const CONFIG = {
    websiteId: null,
    apiUrl: (function() {
      // Try to get API URL from environment or fall back to QuickBase AI domain
      const script = document.currentScript;
      const apiUrl = script && script.getAttribute('data-api-url');
      if (apiUrl) return apiUrl;

      // Use QuickBase AI production domain
      return 'https://quick-base-ai.vercel.app/api/query';
    })(),
    widgetId: 'quickbase-ai-widget',
    buttonId: 'quickbase-ai-button',
    iframeId: 'quickbase-ai-iframe',
    settings: {}
  };

  function init() {
    // Find the script tag with QuickBase AI attributes
    let script = document.currentScript;

    // Fallback if currentScript is null (happens with dynamic loading)
    if (!script) {
      const scripts = document.getElementsByTagName('script');
      // Look for the most recently added script with embed.js
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.includes('embed.js') && 
            scripts[i].hasAttribute('data-website-id')) {
          script = scripts[i];
          break;
        }
      }
    }

    if (!script) {
      console.error('QuickBase AI: Could not find script tag with data-website-id');
      return;
    }

    CONFIG.websiteId = script.getAttribute('data-website-id');

    // Load custom settings if provided
    const settingsAttr = script.getAttribute('data-settings');
    if (settingsAttr) {
      try {
        CONFIG.settings = JSON.parse(settingsAttr);
      } catch (error) {
        console.warn('QuickBase AI: Invalid settings JSON');
      }
    }

    // Update API URL if provided
    const apiUrl = script.getAttribute('data-api-url');
    if (apiUrl) {
      CONFIG.apiUrl = apiUrl;
    }

    if (!CONFIG.websiteId) {
      console.error('QuickBase AI: Website ID is required');
      console.log('QuickBase AI: Available script attributes:', {
        'data-website-id': script.getAttribute('data-website-id'),
        'data-api-url': script.getAttribute('data-api-url'),
        'data-settings': script.getAttribute('data-settings')
      });
      return;
    }

    console.log('QuickBase AI: Initialized with website ID:', CONFIG.websiteId);

    createWidget();
  }

  function createWidget() {
    if (document.getElementById(CONFIG.widgetId)) return;

    // Apply settings defaults
    const settings = {
      primaryColor: '#2563eb',
      secondaryColor: '#ffffff',
      welcomeMessage: 'How can I help you today?',
      position: 'bottom-right',
      showBranding: true,
      maxWidth: 350,
      borderRadius: 12,
      ...CONFIG.settings
    };

    const positionClass = getPositionClass(settings.position);

    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;
    widget.innerHTML = `
      <div id="${CONFIG.buttonId}" class="qb-ai-button ${positionClass}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div id="${CONFIG.iframeId}" class="qb-ai-iframe ${positionClass}" style="display: none; width: ${settings.maxWidth}px; border-radius: ${settings.borderRadius}px;">
        <div class="qb-ai-header" style="background: ${settings.primaryColor};">
          <h3>AI Support</h3>
          <button class="qb-ai-close">&times;</button>
        </div>
        <div class="qb-ai-content">
          <div class="qb-ai-messages">
            ${settings.welcomeMessage ? `<div class="qb-ai-message ai">${settings.welcomeMessage}</div>` : ''}
          </div>
          <div class="qb-ai-input-container">
            <input type="text" placeholder="Ask a question..." class="qb-ai-input">
            <button class="qb-ai-send" style="background: ${settings.primaryColor};">Send</button>
          </div>
          ${settings.showBranding ? '<div class="qb-ai-branding">Powered by QuickBase AI</div>' : ''}
        </div>
      </div>
    `;

    const styles = `
      .qb-ai-button {
        position: fixed;
        width: 60px;
        height: 60px;
        background: #2563eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        transition: all 0.3s ease;
        color: white;
        border: none;
      }

      .qb-ai-button.qb-bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .qb-ai-button.qb-bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .qb-ai-button.qb-top-right {
        top: 20px;
        right: 20px;
      }

      .qb-ai-button.qb-top-left {
        top: 20px;
        left: 20px;
      }

      .qb-ai-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .qb-ai-iframe {
        position: fixed;
        height: 500px;
        background: white;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .qb-ai-iframe.qb-bottom-right {
        bottom: 90px;
        right: 20px;
      }

      .qb-ai-iframe.qb-bottom-left {
        bottom: 90px;
        left: 20px;
      }

      .qb-ai-iframe.qb-top-right {
        top: 90px;
        right: 20px;
      }

      .qb-ai-iframe.qb-top-left {
        top: 90px;
        left: 20px;
      }
      
      .qb-ai-header {
        background: #2563eb;
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .qb-ai-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: white !important;
      }
      
      .qb-ai-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qb-ai-close:hover {
        opacity: 0.8;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      .qb-ai-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: calc(500px - 60px);
      }
      
      .qb-ai-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8fafc;
        max-height: 350px;
        min-height: 200px;
      }
      
      .qb-ai-message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
        word-wrap: break-word;
        line-height: 1.4;
      }
      
      .qb-ai-message.user {
        background: #2563eb;
        color: white;
        margin-left: auto;
      }
      
      .qb-ai-message.ai {
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;
      }
      
      /* Markdown styling for AI messages */
      .qb-ai-message.ai h1,
      .qb-ai-message.ai h2,
      .qb-ai-message.ai h3,
      .qb-ai-message.ai h4,
      .qb-ai-message.ai h5,
      .qb-ai-message.ai h6 {
        margin: 8px 0 4px 0;
        font-weight: 600;
        color: #1f2937;
      }
      
      .qb-ai-message.ai h1 { font-size: 1.25em; }
      .qb-ai-message.ai h2 { font-size: 1.125em; }
      .qb-ai-message.ai h3 { font-size: 1em; }
      
      .qb-ai-message.ai p {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .qb-ai-message.ai strong {
        font-weight: 600;
        color: #1f2937;
      }
      
      .qb-ai-message.ai em {
        font-style: italic;
      }
      
      .qb-ai-message.ai ul,
      .qb-ai-message.ai ol {
        margin: 8px 0;
        padding-left: 20px;
      }
      
      .qb-ai-message.ai li {
        margin: 2px 0;
        line-height: 1.4;
      }
      
      .qb-ai-message.ai code {
        background: #f3f4f6;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
      }
      
      .qb-ai-message.ai pre {
        background: #f3f4f6;
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
        margin: 8px 0;
      }
      
      .qb-ai-message.ai pre code {
        background: none;
        padding: 0;
      }
      
      .qb-ai-message.ai a {
        color: #2563eb;
        text-decoration: underline;
      }
      
      .qb-ai-message.ai a:hover {
        color: #1d4ed8;
      }
      
      .qb-ai-input-container {
        padding: 16px;
        display: flex;
        gap: 8px;
        background: white;
        border-top: 1px solid #e5e7eb;
      }
      
      .qb-ai-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
      }
      
      .qb-ai-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .qb-ai-send {
        padding: 8px 16px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }
      
      .qb-ai-send:hover {
        background: #1d4ed8;
      }
      
      .qb-ai-send:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .qb-ai-branding {
        padding: 8px 16px;
        text-align: center;
        font-size: 11px;
        color: #6b7280;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
      }

      .qb-ai-error {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        font-size: 14px;
      }

      .qb-ai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 14px;
      }

      .qb-ai-loading::after {
        content: '';
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Escalation Button Styles */
      .qb-ai-escalation {
        margin: 12px 0;
        padding: 12px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #0ea5e9;
        border-radius: 8px;
      }

      .qb-ai-escalation-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .qb-ai-escalation-text {
        font-size: 14px;
        color: #0c4a6e;
        line-height: 1.4;
      }

      .qb-ai-escalation-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        align-self: flex-start;
      }

      .qb-ai-escalation-btn:hover {
        background: #0284c7;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(14, 165, 233, 0.3);
      }

      /* Upgrade Message Styles */
      .qb-ai-upgrade {
        margin: 12px 0;
        padding: 12px;
        background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
        border: 1px solid #f59e0b;
        border-radius: 8px;
      }

      .qb-ai-upgrade-content {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .qb-ai-upgrade-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .qb-ai-upgrade-text {
        font-size: 13px;
        color: #92400e;
        line-height: 1.4;
      }

      /* Modal Styles */
      .qb-ai-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }

      .qb-ai-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }

      .qb-ai-modal-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .qb-ai-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .qb-ai-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .qb-ai-modal-close:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .qb-ai-modal-content {
        padding: 24px;
      }

      .qb-ai-modal-content p {
        margin: 0 0 20px 0;
        color: #6b7280;
        line-height: 1.5;
      }

      .qb-ai-escalation-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .qb-ai-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .qb-ai-form-group label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .qb-ai-form-group input,
      .qb-ai-form-group textarea {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s ease;
      }

      .qb-ai-form-group input:focus,
      .qb-ai-form-group textarea:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .qb-ai-form-group textarea {
        resize: vertical;
        min-height: 80px;
      }

      .qb-ai-form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .qb-ai-btn-primary {
        padding: 10px 20px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .qb-ai-btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
      }

      .qb-ai-btn-primary:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .qb-ai-btn-secondary {
        padding: 10px 20px;
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .qb-ai-btn-secondary:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      .qb-ai-escalation-error {
        padding: 12px;
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 14px;
        margin-bottom: 16px;
      }

      .qb-ai-success-message {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .qb-ai-success-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .qb-ai-success-message h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: #059669;
      }

      .qb-ai-success-message p {
        margin: 0 0 4px 0;
        color: #374151;
      }

      .qb-ai-success-note {
        font-size: 13px;
        color: #6b7280;
        font-style: italic;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    document.body.appendChild(widget);

    setupEventListeners();
  }

  function getPositionClass(position) {
    switch (position) {
      case 'bottom-left': return 'qb-bottom-left';
      case 'top-right': return 'qb-top-right';
      case 'top-left': return 'qb-top-left';
      default: return 'qb-bottom-right';
    }
  }

  function setupEventListeners() {
    const button = document.getElementById(CONFIG.buttonId);
    const iframe = document.getElementById(CONFIG.iframeId);
    const closeBtn = iframe.querySelector('.qb-ai-close');
    const input = iframe.querySelector('.qb-ai-input');
    const sendBtn = iframe.querySelector('.qb-ai-send');

    button.addEventListener('click', () => {
      iframe.style.display = iframe.style.display === 'none' ? 'flex' : 'none';
      if (iframe.style.display !== 'none') {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      iframe.style.display = 'none';
    });

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  async function sendMessage() {
    const input = document.querySelector('.qb-ai-input');
    const messages = document.querySelector('.qb-ai-messages');
    const sendBtn = document.querySelector('.qb-ai-send');
    const question = input.value.trim();

    if (!question) return;

    // Clear any existing errors
    const existingError = messages.querySelector('.qb-ai-error');
    if (existingError) existingError.remove();

    input.value = '';
    sendBtn.disabled = true;

    await addMessage(question, 'user');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'qb-ai-loading';
    loadingDiv.textContent = 'AI is thinking...';
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log('QuickBase AI: Sending request to:', CONFIG.apiUrl);
      console.log('QuickBase AI: Website ID:', CONFIG.websiteId);

      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          websiteId: CONFIG.websiteId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('QuickBase AI: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('QuickBase AI: API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('QuickBase AI: Response data:', data);
      loadingDiv.remove();

      if (data.answer) {
        // Ensure marked library is loaded before rendering AI message
        try {
          await loadMarked();
        } catch (error) {
          console.warn('QuickBase AI: Failed to load markdown library:', error);
        }
        await addMessage(data.answer, 'ai');

        // Check if escalation is available and show "Talk to Human" button
        if (data.canEscalateToHuman && (data.lowConfidence || data.escalationAvailable)) {
          addEscalationButton(data);
        } else if (!data.canEscalateToHuman && data.lowConfidence && data.upgradeForTicketing) {
          addUpgradeMessage(data.upgradeForTicketing);
        }
      } else {
        throw new Error('No answer received from the server');
      }
    } catch (error) {
      loadingDiv.remove();

      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        console.error('QuickBase AI: Request was aborted - possible timeout or network issue');
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        console.error('QuickBase AI: Network error - check API URL:', CONFIG.apiUrl);
      } else if (error.message.includes('404')) {
        errorMessage = 'Service not found. Please contact support.';
        console.error('QuickBase AI: 404 error - API endpoint not found:', CONFIG.apiUrl);
      } else if (error.message.includes('401')) {
        errorMessage = 'Invalid project configuration. Please contact support.';
        console.error('QuickBase AI: 401 error - authentication issue');
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please try again later.';
        console.error('QuickBase AI: 500 error - server-side issue');
      }

      addError(errorMessage);
      console.error('QuickBase AI Error:', error);
    } finally {
      sendBtn.disabled = false;
    }
  }

  function addEscalationButton(data) {
    const messages = document.querySelector('.qb-ai-messages');

    // Remove any existing escalation buttons
    const existingEscalation = messages.querySelector('.qb-ai-escalation');
    if (existingEscalation) existingEscalation.remove();

    const escalationDiv = document.createElement('div');
    escalationDiv.className = 'qb-ai-escalation';

    const confidenceText = data.lowConfidence
      ? 'I might not have the best answer for your question.'
      : 'Need more help?';

    escalationDiv.innerHTML = `
      <div class="qb-ai-escalation-content">
        <div class="qb-ai-escalation-text">
          ${confidenceText} Would you like to talk to a human expert?
        </div>
        <button class="qb-ai-escalation-btn" onclick="window.quickbaseAI.escalateToHuman(${JSON.stringify(data.escalationContext).replace(/"/g, '&quot;')})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Talk to Human
        </button>
      </div>
    `;

    messages.appendChild(escalationDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      messages.scrollTop = messages.scrollHeight;
    }, 10);
  }

  function addUpgradeMessage(upgradeMessage) {
    const messages = document.querySelector('.qb-ai-messages');

    // Remove any existing upgrade messages
    const existingUpgrade = messages.querySelector('.qb-ai-upgrade');
    if (existingUpgrade) existingUpgrade.remove();

    const upgradeDiv = document.createElement('div');
    upgradeDiv.className = 'qb-ai-upgrade';
    upgradeDiv.innerHTML = `
      <div class="qb-ai-upgrade-content">
        <div class="qb-ai-upgrade-icon">🚀</div>
        <div class="qb-ai-upgrade-text">
          <strong>Need human support?</strong><br>
          ${upgradeMessage}
        </div>
      </div>
    `;

    messages.appendChild(upgradeDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      messages.scrollTop = messages.scrollHeight;
    }, 10);
  }

  window.quickbaseAI = {
    escalateToHuman: function(escalationContext) {
      showEscalationDialog(escalationContext);
    }
  };

  function showEscalationDialog(escalationContext) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'qb-ai-modal-overlay';

    overlay.innerHTML = `
      <div class="qb-ai-modal">
        <div class="qb-ai-modal-header">
          <h3>Talk to Human Expert</h3>
          <button class="qb-ai-modal-close">&times;</button>
        </div>
        <div class="qb-ai-modal-content">
          <p>Please provide your contact information and we'll connect you with a human expert.</p>
          <form class="qb-ai-escalation-form">
            <div class="qb-ai-form-group">
              <label for="escalation-name">Your Name</label>
              <input type="text" id="escalation-name" name="name" required>
            </div>
            <div class="qb-ai-form-group">
              <label for="escalation-email">Email Address</label>
              <input type="email" id="escalation-email" name="email" required>
            </div>
            <div class="qb-ai-form-group">
              <label for="escalation-message">Additional Message (Optional)</label>
              <textarea id="escalation-message" name="message" rows="3" placeholder="Is there anything specific you'd like our expert to know?"></textarea>
            </div>
            <div class="qb-ai-form-actions">
              <button type="button" class="qb-ai-btn-secondary" onclick="this.closest('.qb-ai-modal-overlay').remove()">Cancel</button>
              <button type="submit" class="qb-ai-btn-primary">Create Support Ticket</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Setup form submission
    const form = overlay.querySelector('.qb-ai-escalation-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitEscalation(escalationContext, form, overlay);
    });

    // Setup close button
    overlay.querySelector('.qb-ai-modal-close').addEventListener('click', () => {
      overlay.remove();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  async function submitEscalation(escalationContext, form, overlay) {
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Ticket...';

    try {
      const escalationData = {
        ...escalationContext,
        customerName: formData.get('name'),
        customerEmail: formData.get('email'),
        customerMessage: formData.get('message')
      };

      const response = await fetch(CONFIG.apiUrl.replace('/query', '/query/escalate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(escalationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create support ticket');
      }

      // Show success message
      overlay.innerHTML = `
        <div class="qb-ai-modal">
          <div class="qb-ai-modal-header">
            <h3>Support Ticket Created</h3>
            <button class="qb-ai-modal-close" onclick="this.closest('.qb-ai-modal-overlay').remove()">&times;</button>
          </div>
          <div class="qb-ai-modal-content">
            <div class="qb-ai-success-message">
              <div class="qb-ai-success-icon">✅</div>
              <div>
                <h4>Ticket #${data.ticket.number} Created</h4>
                <p>${data.message}</p>
                <p class="qb-ai-success-note">You should receive an email confirmation shortly.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Auto-close after 5 seconds
      setTimeout(() => {
        overlay.remove();
      }, 5000);

    } catch (error) {
      console.error('Escalation Error:', error);

      // Show error message
      const errorDiv = form.querySelector('.qb-ai-escalation-error') || document.createElement('div');
      errorDiv.className = 'qb-ai-escalation-error';
      errorDiv.textContent = error.message || 'Failed to create support ticket. Please try again.';

      if (!form.querySelector('.qb-ai-escalation-error')) {
        form.insertBefore(errorDiv, form.querySelector('.qb-ai-form-actions'));
      }

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  async function addMessage(text, type) {
    const messages = document.querySelector('.qb-ai-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `qb-ai-message ${type}`;
    
    // Render markdown for AI messages, plain text for user messages
    if (type === 'ai' && window.marked) {
      try {
        messageDiv.innerHTML = window.marked.parse(text);
      } catch (error) {
        console.warn('QuickBase AI: Markdown parsing failed, falling back to plain text:', error);
        messageDiv.textContent = text;
      }
    } else {
      messageDiv.textContent = text;
    }
    
    messages.appendChild(messageDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      messages.scrollTop = messages.scrollHeight;
    }, 10);
  }

  function addError(text) {
    const messages = document.querySelector('.qb-ai-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'qb-ai-error';
    errorDiv.textContent = text;
    messages.appendChild(errorDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
      messages.scrollTop = messages.scrollHeight;
    }, 10);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
