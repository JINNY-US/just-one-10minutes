document.addEventListener('DOMContentLoaded', () => {
    const chatDisplay = document.getElementById('chatDisplay');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const typingIndicator = document.getElementById('typingIndicator');

    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatDisplay.appendChild(messageElement);
        chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to bottom
    }

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        messageInput.value = ''; // Clear input

        typingIndicator.style.display = 'block'; // Show typing indicator

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            if (response.ok) {
                appendMessage('bot', data.response);
            } else {
                appendMessage('bot', `오류: ${data.error || '알 수 없는 오류가 발생했습니다.'}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            appendMessage('bot', `네트워크 오류: 서버에 연결할 수 없습니다.`);
        } finally {
            typingIndicator.style.display = 'none'; // Hide typing indicator
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
