(function () {
  const DEFAULT_CONFIG = {
    apiUrl: window.location.origin.includes(":8000") ? window.location.origin : "http://localhost:8000",
    title: "AdroBot",
    subtitle: "Online Assistant",
    greeting: "Hello! I am AdroBot, your assistant for AdroIT Technologies. How can I help you today with our courses, training programs, or company details?"
  };

  const STARTER_PROMPTS = [
    "What courses and skill levels do you offer?",
    "Who are your industrial partners?",
    "What software products does AdroIT develop?",
    "What services do you provide to colleges and companies?"
  ];

  const ICONS = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
    robot: '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h4V5.72c-.6-.34-1-.98-1-1.72a2 2 0 0 1 2-2m-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-6.5 5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
  };

  class ChatWidget {
    constructor(customConfig = {}) {
      this.config = Object.assign({}, DEFAULT_CONFIG, customConfig);
      this.isOpen = false;
      this.isSending = false;
      this.initElements();
      this.attachEvents();
    }

    initElements() {
      this.toggleButton = document.createElement("button");
      this.toggleButton.className = "adrobot-toggle-btn";
      this.toggleButton.setAttribute("aria-label", "Open Chatbot");
      this.toggleButton.innerHTML = ICONS.chat;

      this.window = document.createElement("div");
      this.window.className = "adrobot-window";
      this.window.innerHTML = `
        <div class="adrobot-header">
          <div class="adrobot-header-info">
            <div class="adrobot-avatar">${ICONS.robot}</div>
            <div class="adrobot-title-wrap">
              <span class="adrobot-title">${this.config.title}</span>
              <span class="adrobot-status"><span class="adrobot-status-dot"></span>${this.config.subtitle}</span>
            </div>
          </div>
          <div class="adrobot-header-actions">
            <button class="adrobot-icon-btn" id="adrobot-btn-reset" aria-label="Reset chat">${ICONS.refresh}</button>
            <button class="adrobot-icon-btn" id="adrobot-btn-close" aria-label="Close chat">${ICONS.close}</button>
          </div>
        </div>
        <div class="adrobot-messages" id="adrobot-messages-box">
          <div class="adrobot-bubble adrobot-bubble-assistant">${this.config.greeting}</div>
          <div class="adrobot-pills" id="adrobot-pills-box"></div>
        </div>
        <form class="adrobot-form" id="adrobot-form">
          <input type="text" class="adrobot-input" id="adrobot-input" placeholder="Ask about our courses, programs..." autocomplete="off" />
          <button type="submit" class="adrobot-send-btn" id="adrobot-send" aria-label="Send message">${ICONS.send}</button>
        </form>
      `;

      document.body.appendChild(this.toggleButton);
      document.body.appendChild(this.window);

      this.messagesContainer = this.window.querySelector("#adrobot-messages-box");
      this.pillsContainer = this.window.querySelector("#adrobot-pills-box");
      this.input = this.window.querySelector("#adrobot-input");
      this.form = this.window.querySelector("#adrobot-form");
      this.sendButton = this.window.querySelector("#adrobot-send");
      this.resetButton = this.window.querySelector("#adrobot-btn-reset");
      this.closeButton = this.window.querySelector("#adrobot-btn-close");

      this.renderPills();
    }

    renderPills() {
      this.pillsContainer.innerHTML = "";
      STARTER_PROMPTS.forEach((promptText) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "adrobot-pill";
        pill.textContent = promptText;
        pill.addEventListener("click", () => {
          this.input.value = promptText;
          this.handleSend();
        });
        this.pillsContainer.appendChild(pill);
      });
      this.pillsContainer.classList.remove("adrobot-pills-hidden");
    }

    hidePills() {
      this.pillsContainer.classList.add("adrobot-pills-hidden");
    }

    attachEvents() {
      this.toggleButton.addEventListener("click", () => this.toggle());
      this.closeButton.addEventListener("click", () => this.close());
      this.resetButton.addEventListener("click", () => this.reset());

      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSend();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isOpen) {
          this.close();
        }
      });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.window.classList.add("adrobot-open");
      this.toggleButton.innerHTML = ICONS.close;
      setTimeout(() => this.input.focus(), 150);
      this.scrollToBottom();
    }

    close() {
      this.isOpen = false;
      this.window.classList.remove("adrobot-open");
      this.toggleButton.innerHTML = ICONS.chat;
    }

    reset() {
      this.messagesContainer.innerHTML = `
        <div class="adrobot-bubble adrobot-bubble-assistant">${this.config.greeting}</div>
        <div class="adrobot-pills" id="adrobot-pills-box"></div>
      `;
      this.pillsContainer = this.messagesContainer.querySelector("#adrobot-pills-box");
      this.renderPills();
      this.input.value = "";
    }

    appendMessage(text, role, isError = false) {
      const bubble = document.createElement("div");
      let className = "adrobot-bubble";
      if (role === "user") {
        className += " adrobot-bubble-user";
      } else if (isError) {
        className += " adrobot-bubble-error";
      } else {
        className += " adrobot-bubble-assistant";
      }
      bubble.className = className;
      bubble.textContent = text;
      this.messagesContainer.appendChild(bubble);
      this.scrollToBottom();
      return bubble;
    }

    showTyping() {
      this.typingIndicator = document.createElement("div");
      this.typingIndicator.className = "adrobot-typing";
      this.typingIndicator.innerHTML = `
        <span class="adrobot-dot"></span>
        <span class="adrobot-dot"></span>
        <span class="adrobot-dot"></span>
      `;
      this.messagesContainer.appendChild(this.typingIndicator);
      this.scrollToBottom();
    }

    hideTyping() {
      if (this.typingIndicator && this.typingIndicator.parentNode) {
        this.typingIndicator.parentNode.removeChild(this.typingIndicator);
      }
      this.typingIndicator = null;
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async handleSend() {
      const question = this.input.value.trim();
      if (!question || this.isSending) return;

      this.hidePills();
      this.appendMessage(question, "user");
      this.input.value = "";
      this.isSending = true;
      this.sendButton.disabled = true;
      this.showTyping();

      try {
        const response = await fetch(`${this.config.apiUrl}/api/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ question })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          this.hideTyping();
          const detail = errData.detail || "Unable to get an answer right now. Please try again.";
          this.appendMessage(detail, "assistant", true);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantBubble = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payloadStr = trimmed.slice(5).trim();
            if (payloadStr === "[DONE]") continue;

            try {
              const data = JSON.parse(payloadStr);
              if (data.token) {
                if (!assistantBubble) {
                  this.hideTyping();
                  assistantBubble = document.createElement("div");
                  assistantBubble.className = "adrobot-bubble adrobot-bubble-assistant";
                  this.messagesContainer.appendChild(assistantBubble);
                }
                assistantBubble.textContent += data.token;
                this.scrollToBottom();
              } else if (data.error) {
                this.hideTyping();
                this.appendMessage(data.error, "assistant", true);
              }
            } catch (e) {
            }
          }
        }
      } catch (err) {
        this.hideTyping();
        this.appendMessage("Connection error. Please verify the chatbot server is running.", "assistant", true);
      } finally {
        this.hideTyping();
        this.isSending = false;
        this.sendButton.disabled = false;
        this.input.focus();
      }
    }
  }

  window.AdroBotWidget = {
    init: function (options) {
      return new ChatWidget(options);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const currentScript = document.currentScript || document.querySelector("script[src*='chat-widget.js']");
      const apiUrl = currentScript ? currentScript.getAttribute("data-api-url") : null;
      window.AdroBotWidget.init(apiUrl ? { apiUrl } : {});
    });
  } else {
    const currentScript = document.currentScript || document.querySelector("script[src*='chat-widget.js']");
    const apiUrl = currentScript ? currentScript.getAttribute("data-api-url") : null;
    window.AdroBotWidget.init(apiUrl ? { apiUrl } : {});
  }
})();
