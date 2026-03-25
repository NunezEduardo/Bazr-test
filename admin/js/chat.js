/**
 * MVP Admin — Chat UI (admin/js/chat.js)
 * ========================================
 * Renders messages, handles input, types responses.
 * Exposes: AdminChat.init(), AdminChat.appendMsg(), AdminChat.typeMsg()
 */
'use strict';

const AdminChat = (() => {

    let _log     = document.getElementById('chat-log');
    let _input   = null;
    let _sendBtn = null;
    let _onSend  = null; // callback(text) registered by commands.js

    function init(onSend) {
        _log     = document.getElementById('chat-log');
        _input   = document.getElementById('chat-input');
        _sendBtn = document.getElementById('chat-send-btn');
        _onSend  = onSend;

        _sendBtn?.addEventListener('click', _handleSend);
        _input?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _handleSend();
            }
        });

        // Auto-resize textarea
        _input?.addEventListener('input', () => {
            _input.style.height = 'auto';
            _input.style.height = Math.min(_input.scrollHeight, 140) + 'px';
        });
    }

    function _handleSend() {
        if (!_input) return;
        const text = _input.value.trim();
        if (!text) return;
        appendMsg('user', text);
        _input.value = '';
        _input.style.height = 'auto';
        _input.focus();
        if (_onSend) _onSend(text);
    }

    /**
     * Append a message bubble to the chat.
     * @param {'user'|'bot'|'system'|'error'} role
     * @param {string} text — plain text or HTML (for bot)
     */
    function appendMsg(role, text) {
        if (!_log) return;
        const wrap = document.createElement('div');
        wrap.className = `msg msg--${role}`;

        if (role === 'user') {
            wrap.innerHTML = `
              <div class="msg-avatar msg-avatar--user">T</div>
              <div class="msg-bubble">${MvpUtils.escapeHtml(text)}</div>`;
        } else if (role === 'bot') {
            wrap.innerHTML = `
              <div class="msg-avatar msg-avatar--bot">⚡</div>
              <div class="msg-bubble msg-bubble--bot">${text}</div>`;
        } else if (role === 'system') {
            wrap.innerHTML = `<div class="msg-system">${text}</div>`;
        } else if (role === 'error') {
            wrap.innerHTML = `<div class="msg-error">⚠️ ${MvpUtils.escapeHtml(text)}</div>`;
        }

        _log.appendChild(wrap);
        _log.scrollTop = _log.scrollHeight;
        return wrap;
    }

    /**
     * Show a typing indicator, then replace with actual message.
     * @param {string|Function} textOrFn — final HTML, or async fn returning it
     * @returns {Promise<void>}
     */
    async function typeMsg(textOrFn) {
        const typingWrap = appendMsg('system', '<span class="typing-dots"><span></span><span></span><span></span></span>');

        const text = typeof textOrFn === 'function' ? await textOrFn() : textOrFn;

        // Small delay for feel
        await new Promise(r => setTimeout(r, 320));

        if (typingWrap) typingWrap.remove();
        appendMsg('bot', text);
    }

    return { init, appendMsg, typeMsg };
})();

window.AdminChat = AdminChat;
