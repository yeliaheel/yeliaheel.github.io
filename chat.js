document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const messageArea = document.getElementById('messageArea');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const leaveChatButton = document.getElementById('leaveChat');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Conversation helper elements
    const conversationHelperBtn = document.getElementById('conversationHelperBtn');
    const promptsPopup = document.getElementById('promptsPopup');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const promptsList = document.getElementById('promptsList');
    
    // Conversation starter prompts
    const conversationStarters = [
        "I've been thinking a lot lately about what keeps showing up in my thoughts. Is there something that's been on your mind a lot these days?",
        "Sometimes I wonder where all my energy goes. What’s been taking up the most space in your days lately?",
        "I’ve realized that even small stresses can build up. Is there anything that’s been quietly bothering you?",
        "When I’m alone, my mind tends to circle back to the same things. Do you ever get stuck in certain thoughts when you're by yourself?",
        "There’s something I’ve been meaning to talk about but keep holding back. Have you ever felt like that?",
        "I get curious about the things people don’t usually say out loud. Can you share one thought you’ve never told anyone?",
        "Sometimes I catch myself pretending I’m fine when I’m really not. Do you ever do that too?",
        "I've noticed I feel the most tired when I’m trying too hard to keep it together. What wears you out these days?",
        "There are parts of me I don’t show to many people. Do you feel like there's a side of you others don’t really see?",
        "Lately I’ve been wondering what I really need, not just want. What do you feel like you truly need right now?",
        "There was a moment recently when I didn’t feel like myself at all. Have you had one of those lately?",
        "I sometimes forget to give myself credit. Have you done something lately that you felt quietly proud of?",
        "I think we all have something we wish we could just let go of. Is there something you’ve been wanting to release?",
        "Some thoughts linger longer than others. What’s one that’s been sitting with you recently?",
        "I keep coming back to this one question: what really matters to me right now? What about you?",
        "Lately I’ve been thinking about what makes me feel safe. Do you know what helps you feel that way?",
        "It's hard to find moments where I feel truly understood. When was the last time someone really got you?",
        "There’s something comforting about being able to just be. When do you feel most like yourself?",
        "I think we all have things we don’t say even to our closest people. Is there something you've been carrying quietly?",
        "I’ve learned that vulnerability can be heavy, but also freeing. What’s your relationship with it like?"
      ];
    
    // Populate prompts popup
    function populatePromptsPopup() {
        // Check if we have the elements
        if (!promptsList) {
            return;
        }
        
        // Clear list
        promptsList.innerHTML = '';
        
        // Add prompts
        conversationStarters.forEach(prompt => {
            const li = document.createElement('li');
            li.className = 'prompt-item';
            li.textContent = prompt;
            
            // Add click event to insert prompt into message input
            li.addEventListener('click', function() {
                messageInput.value = prompt;
                promptsPopup.classList.remove('visible');
                // Focus on input field
                messageInput.focus();
            });
            
            promptsList.appendChild(li);
        });
    }
    
    // Initialize prompts popup
    populatePromptsPopup();
    
    // Message storage array
    let messages = [];
    
    // Send message function
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            // Add user message
            addMessage('user', message);
            messageInput.value = '';
            
            // Auto scroll
            scrollToBottom();
            
            // Simulate partner typing response
            simulatePartnerTyping(message);
            
            // Focus back on the input field
            messageInput.focus();
        }
    }
    
    // Add message function
    function addMessage(sender, text) {
        // Add to messages array
        messages.push({ sender, text });
        
        // Create message element
        const bubble = document.createElement('div');
        
        // Apply appropriate class for long messages
        if (text.length > 100) {
            bubble.className = `chat-bubble ${sender} long-message`;
        } else {
            bubble.className = `chat-bubble ${sender}`;
        }
        
        const messageText = document.createElement('span');
        messageText.textContent = text;
        
        bubble.appendChild(messageText);
        messageArea.appendChild(bubble);
    }
    
    // Simulate partner typing
    function simulatePartnerTyping(userMessage) {
        // Show typing indicator
        showTypingIndicator();
        
        // Get response message
        let responseMessage = getResponseMessage(userMessage);
        
        // Calculate typing delay based on message length
        const typingDelay = Math.min(1000 + responseMessage.length * 50, 3000);
        
        // Show message after delay
        setTimeout(() => {
            // Hide typing indicator
            hideTypingIndicator();
            
            // Add response message
            addMessage('partner', responseMessage);
            
            // Auto scroll
            scrollToBottom();
        }, typingDelay);
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        typingIndicator.classList.add('visible');
    }
    
    // Hide typing indicator
    function hideTypingIndicator() {
        typingIndicator.classList.remove('visible');
    }
    
    // Generate response message
    function getResponseMessage(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // First message greeting
        if (messages.length <= 1) {
            return "Hi! Nice to meet you. What's on your mind today?";
        }
        
        // Simple response logic
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Nice to meet you! What do you think about this topic?";
        } else if (lowerMessage.includes('?')) {
            return "That's an interesting question. I think trust is really important when it comes to close relationships. What about you?";
        } else if (lowerMessage.length < 10) {
            return "Could you elaborate a bit more on that?";
        } else if (lowerMessage.includes('close') || lowerMessage.includes('trust') || lowerMessage.includes('friend')) {
            return "I agree. Trust and vulnerability seem to be key factors in feeling close to someone.";
        } else {
            const responses = [
                "That's an interesting perspective.",
                "I see what you mean. Do you think that applies to most relationships?",
                "Thanks for sharing that.",
                "I'm curious about what led you to that conclusion?",
                "That makes a lot of sense."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }
    
    // Auto scroll message area to bottom
    function scrollToBottom() {
        messageArea.scrollTop = messageArea.scrollHeight;
    }
    
    // Leave chat function
    function leaveChat() {
        if (confirm('Do you want to leave the room?')) {
            window.location.href = 'index.html'; // Return to home page
        }
    }
    
    // Toggle prompts popup
    function togglePromptsPopup() {
        promptsPopup.classList.toggle('visible');
    }
    
    // Close prompts popup
    function closePromptsPopup() {
        promptsPopup.classList.remove('visible');
    }
    
    // Handle window click (to close popup when clicking outside)
    function handleWindowClick(event) {
        if (promptsPopup && promptsPopup.classList.contains('visible')) {
            // Check if clicked element is outside popup and button
            if (!promptsPopup.contains(event.target) && event.target !== conversationHelperBtn) {
                closePromptsPopup();
            }
        }
    }
    
    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    leaveChatButton.addEventListener('click', leaveChat);
    
    // Conversation helper event listeners
    conversationHelperBtn.addEventListener('click', togglePromptsPopup);
    
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', closePromptsPopup);
    }
    
    window.addEventListener('click', handleWindowClick);
    
    // Add initial message
    setTimeout(() => {
        if (messages.length === 0) {
            addMessage('partner', "Hi! Nice to meet you. What's on your mind today?");
        }
    }, 500);
    
    // Set focus to input field
    setTimeout(() => {
        messageInput.focus();
    }, 100);
});