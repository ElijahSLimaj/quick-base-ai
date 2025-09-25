(function() {
  'use strict';
  
  const CONFIG = {
    projectId: null,
    apiUrl: (function() {
      // Try to get API URL from environment or fall back to localhost for dev
      const script = document.currentScript;
      const apiUrl = script && script.getAttribute('data-api-url');
      return apiUrl || 'http://localhost:3001/api/query';
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
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.includes('embed.js') && scripts[i].hasAttribute('data-project-id')) {
          script = scripts[i];
          break;
        }
      }
    }

    if (!script) {
      console.error('QuickBase AI: Could not find script tag with data-project-id');
      return;
    }

    CONFIG.projectId = script.getAttribute('data-project-id');

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

    if (!CONFIG.projectId) {
      console.error('QuickBase AI: Project ID is required');
      return;
    }

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
      }
      
      .qb-ai-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8fafc;
      }
      
      .qb-ai-message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
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

    addMessage(question, 'user');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'qb-ai-loading';
    loadingDiv.textContent = 'AI is thinking...';
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          projectId: CONFIG.projectId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      loadingDiv.remove();

      if (data.answer) {
        addMessage(data.answer, 'ai');
      } else {
        throw new Error('No answer received from the server');
      }
    } catch (error) {
      loadingDiv.remove();

      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Service not found. Please contact support.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Invalid project configuration. Please contact support.';
      }

      addError(errorMessage);
      console.error('QuickBase AI Error:', error);
    } finally {
      sendBtn.disabled = false;
    }
  }

  function addMessage(text, type) {
    const messages = document.querySelector('.qb-ai-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `qb-ai-message ${type}`;
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function addError(text) {
    const messages = document.querySelector('.qb-ai-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'qb-ai-error';
    errorDiv.textContent = text;
    messages.appendChild(errorDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
