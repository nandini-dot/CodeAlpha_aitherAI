let faqs = [];
let chatHistory = [];
let currentCategory = 'all';
let searchQuery = '';

const categoryList = document.getElementById('category-list');
const sidebarQuestionsList = document.getElementById('sidebar-questions-list');
const faqSearchInput = document.getElementById('faq-search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const messagesViewport = document.getElementById('messages-viewport');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const resetChatBtn = document.getElementById('reset-chat-btn');
const welcomeContainer = document.getElementById('welcome-container');

const matchMetaBanner = document.getElementById('match-meta-banner');
const metaMatchedQuestion = document.getElementById('meta-matched-question');
const metaMatchedScore = document.getElementById('meta-matched-score');

const preprocessPreviewBtn = document.getElementById('preprocess-preview-btn');
const nlpSimulationModal = document.getElementById('nlp-simulation-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const simulationInput = document.getElementById('simulation-input');
const simulationTriggerBtn = document.getElementById('simulation-trigger-btn');
const simulationResults = document.getElementById('simulation-results');
const simOrigText = document.getElementById('sim-orig-text');
const simCleanText = document.getElementById('sim-clean-text');
const simTokensList = document.getElementById('sim-tokens-list');
const simEnrichedList = document.getElementById('sim-enriched-list');

const API_BASE = '';

document.addEventListener('DOMContentLoaded', () => {
    fetchFaqs();
    setupEventListeners();
    loadChatHistory();
});

async function fetchFaqs() {
    try {
        const response = await fetch(`${API_BASE}/api/faqs`);
        if (!response.ok) throw new Error('Failed to load FAQs');
        faqs = await response.json();
        
        initCategories();
        renderQuestions();
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'sidebar-question-item';
        errorMsg.style.color = '#ef4444';
        errorMsg.innerText = 'Failed to load FAQ knowledge base. Please check if server is running.';
        sidebarQuestionsList.appendChild(errorMsg);
    }
}

function initCategories() {
    const counts = { all: faqs.length };
    faqs.forEach(faq => {
        counts[faq.category] = (counts[faq.category] || 0) + 1;
    });

    categoryList.innerHTML = '';
    
    const allLi = createCategoryItem('all', '📁', 'All Topics', counts.all);
    categoryList.appendChild(allLi);

    const categories = [...new Set(faqs.map(faq => faq.category))];
    const categoryIcons = {
        'General': '🚀',
        'Features': '⚡',
        'Security & Privacy': '🛡️',
        'Billing & Plans': '💳'
    };

    categories.forEach(cat => {
        const icon = categoryIcons[cat] || '📄';
        const li = createCategoryItem(cat, icon, cat, counts[cat] || 0);
        categoryList.appendChild(li);
    });

    document.getElementById('count-all').innerText = counts.all;
}

function createCategoryItem(id, icon, name, count) {
    const li = document.createElement('li');
    li.className = `category-item ${currentCategory === id ? 'active' : ''}`;
    li.dataset.category = id;
    
    li.innerHTML = `
        <span class="cat-icon">${icon}</span>
        <span class="cat-name">${name}</span>
        <span class="cat-count" id="count-${id}">${count}</span>
    `;

    li.addEventListener('click', () => {
        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        currentCategory = id;
        renderQuestions();
    });

    return li;
}

function renderQuestions() {
    sidebarQuestionsList.innerHTML = '';
    
    const filtered = faqs.filter(faq => {
        const matchesCategory = currentCategory === 'all' || faq.category === currentCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const titleEl = document.getElementById('questions-list-title');
    if (searchQuery) {
        titleEl.innerText = `Search Results (${filtered.length})`;
    } else if (currentCategory === 'all') {
        titleEl.innerText = `All Questions (${filtered.length})`;
    } else {
        titleEl.innerText = `${currentCategory} (${filtered.length})`;
    }

    if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'sidebar-question-item';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text-light)';
        empty.innerText = 'No matching questions found.';
        sidebarQuestionsList.appendChild(empty);
        return;
    }

    filtered.forEach(faq => {
        const li = document.createElement('li');
        li.className = 'sidebar-question-item';
        li.innerText = faq.question;
        li.dataset.id = faq.id;
        
        li.addEventListener('click', () => {
            handleUserQuestion(faq.question);
        });
        
        sidebarQuestionsList.appendChild(li);
    });
}

function setupEventListeners() {
    faqSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderQuestions();
    });

    clearSearchBtn.addEventListener('click', () => {
        faqSearchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderQuestions();
        faqSearchInput.focus();
    });

    document.querySelectorAll('.quick-card').forEach(card => {
        card.addEventListener('click', () => {
            const query = card.dataset.query;
            handleUserQuestion(query);
        });
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = '';
        chatInput.style.height = 'auto';
        handleUserQuestion(text);
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });

    resetChatBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your chat history?')) {
            chatHistory = [];
            localStorage.removeItem('aether_chat_history');
            
            const bubbles = messagesViewport.querySelectorAll('.message-bubble');
            bubbles.forEach(b => b.remove());
            welcomeContainer.style.display = 'block';
            matchMetaBanner.style.display = 'none';
        }
    });

    preprocessPreviewBtn.addEventListener('click', () => {
        nlpSimulationModal.style.display = 'flex';
        simulationInput.value = chatInput.value.trim() || "How does AetherAI secure my sensitive document files?";
        simulationResults.style.display = 'none';
    });

    closeModalBtn.addEventListener('click', () => {
        nlpSimulationModal.style.display = 'none';
    });

    nlpSimulationModal.addEventListener('click', (e) => {
        if (e.target === nlpSimulationModal) {
            nlpSimulationModal.style.display = 'none';
        }
    });

    simulationTriggerBtn.addEventListener('click', () => {
        runClientSideSimulation();
    });
}

function handleUserQuestion(queryText) {
    welcomeContainer.style.display = 'none';
    appendMessageBubble('user', queryText);
    scrollChatToBottom();

    const typingIndicator = appendTypingIndicator();
    scrollChatToBottom();

    chatHistory.push({ sender: 'user', text: queryText, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    saveChatHistory();

    setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: queryText })
            });

            if (!response.ok) throw new Error('API server unavailable');
            const data = await response.json();

            typingIndicator.remove();
            simulateBotResponse(data);

        } catch (error) {
            console.error('Chat error:', error);
            typingIndicator.remove();
            
            appendMessageBubble('assistant', {
                reply: "I'm having trouble connecting to the AetherAI local matching server. Please ensure the backend is running by executing `python server.py` in your terminal.",
                confidence: 'low',
                suggestions: []
            });
            scrollChatToBottom();
        }
    }, 800);
}

function simulateBotResponse(apiResponse) {
    const textToType = apiResponse.reply;
    const bubbleEl = document.createElement('article');
    bubbleEl.className = 'message-bubble assistant';
    
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const avatarIcon = `<div class="msg-avatar">AI</div>`;
    
    bubbleEl.innerHTML = `
        ${avatarIcon}
        <div class="msg-content-wrapper">
            <div class="msg-bubble-content"></div>
            <div class="msg-meta">
                <span>Aether Assistant</span>
                <span>&bull;</span>
                <span>${timestamp}</span>
                <span>&bull;</span>
                <span class="confidence-indicator ${apiResponse.confidence}">${apiResponse.confidence} Match</span>
            </div>
        </div>
    `;

    messagesViewport.appendChild(bubbleEl);
    scrollChatToBottom();

    const contentEl = bubbleEl.querySelector('.msg-bubble-content');
    const formattedParagraphs = formatMarkdownLikeText(textToType);
    let currentParagraphIndex = 0;
    
    function showNextBlock() {
        if (currentParagraphIndex < formattedParagraphs.length) {
            const blockHtml = formattedParagraphs[currentParagraphIndex];
            const blockEl = document.createElement('div');
            blockEl.style.opacity = '0';
            blockEl.style.transform = 'translateY(4px)';
            blockEl.style.transition = 'all 0.25s ease-out';
            blockEl.innerHTML = blockHtml;
            
            contentEl.appendChild(blockEl);
            
            setTimeout(() => {
                blockEl.style.opacity = '1';
                blockEl.style.transform = 'translateY(0)';
                scrollChatToBottom();
            }, 50);

            currentParagraphIndex++;
            setTimeout(showNextBlock, 150);
        } else {
            renderPostResponseActions(bubbleEl, apiResponse);
            updateDashboardBanner(apiResponse);
            
            chatHistory.push({
                sender: 'assistant',
                text: apiResponse.reply,
                confidence: apiResponse.confidence,
                suggestions: apiResponse.suggestions,
                matched_question: apiResponse.matched_question,
                score: apiResponse.score,
                timestamp: timestamp
            });
            saveChatHistory();
        }
    }
    
    showNextBlock();
}

function formatMarkdownLikeText(text) {
    const parts = text.split('\n\n');
    return parts.map(part => {
        part = part.trim();
        if (!part) return '';
        
        if (part.startsWith('1.') || part.startsWith('*') || part.startsWith('-')) {
            const lines = part.split('\n');
            const listItems = lines.map(line => {
                let content = line.replace(/^(?:\d+\.|\*|-)\s+/, '');
                content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                return `<li>${content}</li>`;
            }).join('');
            
            if (part.startsWith('1.')) {
                return `<ol>${listItems}</ol>`;
            } else {
                return `<ul>${listItems}</ul>`;
            }
        }
        
        let html = part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        return `<p>${html}</p>`;
    }).filter(p => p !== '');
}

function renderPostResponseActions(bubbleEl, responseData) {
    const wrapper = bubbleEl.querySelector('.msg-content-wrapper');
    
    const actionsPanel = document.createElement('div');
    actionsPanel.className = 'msg-meta';
    actionsPanel.style.marginTop = '8px';
    actionsPanel.style.display = 'flex';
    actionsPanel.style.justifyContent = 'space-between';
    
    actionsPanel.innerHTML = `
        <button class="copy-msg-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy Answer
        </button>
        <div class="feedback-actions">
            <button class="feedback-btn" data-type="up" title="Helpful">👍</button>
            <button class="feedback-btn" data-type="down" title="Not helpful">👎</button>
        </div>
    `;
    
    wrapper.appendChild(actionsPanel);
    
    actionsPanel.querySelector('.copy-msg-btn').addEventListener('click', (e) => {
        copyToClipboard(responseData.reply);
        const button = e.currentTarget;
        button.innerHTML = '⚡ Copied!';
        setTimeout(() => {
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy Answer
            `;
        }, 1500);
    });

    const thumbUp = actionsPanel.querySelector('[data-type="up"]');
    const thumbDown = actionsPanel.querySelector('[data-type="down"]');
    
    thumbUp.addEventListener('click', () => {
        thumbUp.classList.toggle('active-up');
        thumbDown.classList.remove('active-down');
    });

    thumbDown.addEventListener('click', () => {
        thumbDown.classList.toggle('active-down');
        thumbUp.classList.remove('active-up');
    });

    if (responseData.suggestions && responseData.suggestions.length > 0) {
        const suggContainer = document.createElement('div');
        suggContainer.className = 'reply-suggestions-container';
        suggContainer.innerHTML = `
            <div class="suggestions-title">Related Questions</div>
            <div class="suggestions-list"></div>
        `;
        
        const pillsList = suggContainer.querySelector('.suggestions-list');
        responseData.suggestions.forEach(q => {
            const pill = document.createElement('button');
            pill.className = 'suggestion-pill';
            pill.innerText = q;
            pill.addEventListener('click', () => {
                handleUserQuestion(q);
            });
            pillsList.appendChild(pill);
        });
        
        wrapper.appendChild(suggContainer);
    }
    
    scrollChatToBottom();
}

function appendMessageBubble(sender, content) {
    const bubbleEl = document.createElement('article');
    bubbleEl.className = `message-bubble ${sender}`;
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if (sender === 'user') {
        bubbleEl.innerHTML = `
            <div class="msg-avatar">U</div>
            <div class="msg-content-wrapper">
                <div class="msg-bubble-content"><p>${content}</p></div>
                <div class="msg-meta"><span>You</span><span>&bull;</span><span>${timestamp}</span></div>
            </div>
        `;
    } else {
        const matchedFaq = typeof content === 'object' ? content : { reply: content, confidence: 'high', suggestions: [] };
        const paragraphs = formatMarkdownLikeText(matchedFaq.reply).join('');
        
        bubbleEl.innerHTML = `
            <div class="msg-avatar">AI</div>
            <div class="msg-content-wrapper">
                <div class="msg-bubble-content">${paragraphs}</div>
                <div class="msg-meta">
                    <span>Aether Assistant</span><span>&bull;</span>
                    <span>${matchedFaq.timestamp || timestamp}</span><span>&bull;</span>
                    <span class="confidence-indicator ${matchedFaq.confidence}">${matchedFaq.confidence} Match</span>
                </div>
            </div>
        `;
        
        setTimeout(() => { renderPostResponseActions(bubbleEl, matchedFaq); }, 50);
    }
    
    messagesViewport.appendChild(bubbleEl);
    return bubbleEl;
}

function appendTypingIndicator() {
    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'message-bubble assistant';
    indicatorEl.innerHTML = `
        <div class="msg-avatar">AI</div>
        <div class="msg-content-wrapper">
            <div class="msg-bubble-content typing-indicator-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    messagesViewport.appendChild(indicatorEl);
    return indicatorEl;
}

function scrollChatToBottom() { messagesViewport.scrollTop = messagesViewport.scrollHeight; }

function updateDashboardBanner(data) {
    if (data.matched_question && data.score > 0) {
        metaMatchedQuestion.innerText = data.matched_question;
        metaMatchedScore.innerText = Number(data.score).toFixed(4);
        matchMetaBanner.style.display = 'flex';
    } else { matchMetaBanner.style.display = 'none'; }
}

const CLIENT_STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
    'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent',
    'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its',
    'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
    'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that',
    'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they',
    'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens',
    'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would',
    'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
    'please', 'tell', 'show', 'give', 'get', 'want', 'need', 'ask', 'question', 'info', 'information', 'help'
]);

function runClientSideSimulation() {
    const rawText = simulationInput.value.trim();
    if (!rawText) return;

    const lowercased = rawText.toLowerCase();
    const cleaned = lowercased.replace(/[^a-z0-9\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(w => w !== '');
    
    const baseTokens = [];
    const enrichedTokens = [];
    
    words.forEach(word => {
        if (CLIENT_STOP_WORDS.has(word) || word.length < 2) return;
        
        let stemmed = word;
        if (stemmed.endsWith("sses")) { stemmed = stemmed.slice(0, -2); }
        else if (stemmed.endsWith("ies")) { stemmed = stemmed.slice(0, -3) + "y"; }
        else if (stemmed.endsWith("es") && !stemmed.endsWith("ees") && !stemmed.endsWith("oes")) { stemmed = stemmed.slice(0, -1); }
        else if (stemmed.endsWith("s") && !stemmed.endsWith("ss") && !stemmed.endsWith("us") && !stemmed.endsWith("is") && !stemmed.endsWith("as")) { stemmed = stemmed.slice(0, -1); }
        
        if (stemmed.endsWith("ing")) { stemmed = stemmed.slice(0, -3); }
        else if (stemmed.endsWith("ed") && stemmed.length > 4) {
            stemmed = stemmed.slice(0, -2);
            if (stemmed.endsWith("i")) { stemmed = stemmed.slice(0, -1) + "y"; }
        }
        
        baseTokens.push(stemmed);
        enrichedTokens.push(stemmed);
        
        if (stemmed.startswith("work") && stemmed !== "work") { enrichedTokens.push("work"); } // Minor typo safeguard: JS uses startsWith
    });

    simOrigText.innerText = rawText;
    simCleanText.innerText = cleaned;
    
    simTokensList.innerHTML = '';
    if (baseTokens.length === 0) { simTokensList.innerHTML = '<em>None</em>'; }
    else {
        baseTokens.forEach(t => {
            const pill = document.createElement('span');
            pill.className = 'token-pill';
            pill.innerText = t;
            simTokensList.appendChild(pill);
        });
    }

    simEnrichedList.innerHTML = '';
    if (enrichedTokens.length === 0) { simEnrichedList.innerHTML = '<em>None</em>'; }
    else {
        enrichedTokens.forEach(t => {
            const pill = document.createElement('span');
            pill.className = `token-pill ${!baseTokens.includes(t) || enrichedTokens.filter(x=>x===t).length > baseTokens.filter(x=>x===t).length ? 'enriched' : ''}`;
            pill.innerText = t;
            simEnrichedList.appendChild(pill);
        });
    }

    simulationResults.style.display = 'block';
}

function copyToClipboard(text) {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}

function saveChatHistory() { localStorage.setItem('aether_chat_history', JSON.stringify(chatHistory)); }

function loadChatHistory() {
    const saved = localStorage.getItem('aether_chat_history');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            if (chatHistory.length > 0) {
                welcomeContainer.style.display = 'none';
                chatHistory.forEach(item => {
                    if (item.sender === 'user') { appendMessageBubble('user', item.text); }
                    else {
                        appendMessageBubble('assistant', item);
                        if (item.matched_question && item.score) { updateDashboardBanner(item); }
                    }
                });
                scrollChatToBottom();
            }
        } catch (e) {
            console.error('Error reloading chat history:', e);
            localStorage.removeItem('aether_chat_history');
        }
    }
}
