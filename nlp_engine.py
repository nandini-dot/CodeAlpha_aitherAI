import re
import math
import json

# Comprehensive English Stop Words Set (120+ common words)
STOP_WORDS = {
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
}

def clean_and_tokenize(text):
    """
    Lowercase text, remove special characters and punctuation,
    tokenize into words, filter stop words, and perform basic stemming.
    """
    if not text:
        return []
    
    # 1. Lowercase
    text = text.lower()
    
    # 2. Replace non-alphanumeric with space
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    
    # 3. Tokenize by splitting whitespace
    words = text.split()
    
    # 4. Filter stop words & apply a simple suffix stemmer
    tokens = []
    for word in words:
        if word in STOP_WORDS or len(word) < 2:
            continue
            
        # 5. Very lightweight suffix stemming to resolve singulars/plurals, basic tenses, and gerunds
        stemmed = word
        if stemmed.endswith("sses"):
            stemmed = stemmed[:-2]
        elif stemmed.endswith("ies"):
            stemmed = stemmed[:-3] + "y"
        elif stemmed.endswith("es") and not stemmed.endswith("ees") and not stemmed.endswith("oes"):
            stemmed = stemmed[:-1]
        elif stemmed.endswith("s") and not stemmed.endswith("ss") and not stemmed.endswith("us") and not stemmed.endswith("is") and not stemmed.endswith("as"):
            stemmed = stemmed[:-1]
            
        if stemmed.endswith("ing"):
            stemmed = stemmed[:-3]
        elif stemmed.endswith("ed") and len(stemmed) > 4:
            stemmed = stemmed[:-2]
            if stemmed.endswith("i"):
                stemmed = stemmed[:-1] + "y"
                
        tokens.append(stemmed)
        
        # Semantic enrichment: if the token starts with 'work' (e.g., 'workspace'), 
        # also index the root 'work' to allow compound-word matches.
        if stemmed.startswith("work") and stemmed != "work":
            tokens.append("work")
        
    return tokens

class FAQMatcher:
    def __init__(self, faq_data_list):
        self.faqs = faq_data_list
        self.doc_count = len(self.faqs)
        
        # Tokenize all FAQ questions
        self.faq_tokens = []
        for faq in self.faqs:
            tokens = clean_and_tokenize(faq["question"])
            self.faq_tokens.append(tokens)
            
        # Compute vocabulary and document frequency (DF)
        self.vocab = set()
        self.df = {}
        
        for tokens in self.faq_tokens:
            unique_tokens = set(tokens)
            self.vocab.update(unique_tokens)
            for token in unique_tokens:
                self.df[token] = self.df.get(token, 0) + 1
                
        # Compute Inverse Document Frequency (IDF) for all vocabulary terms
        self.idf = {}
        for token in self.vocab:
            self.idf[token] = math.log((1 + self.doc_count) / (1 + self.df[token])) + 1.0
            
        # Vectorize all FAQ questions using TF-IDF (stored as sparse dicts)
        self.faq_vectors = []
        for tokens in self.faq_tokens:
            vec = self._vectorize_tokens(tokens)
            self.faq_vectors.append(vec)

    def _vectorize_tokens(self, tokens):
        """
        Creates a sparse TF-IDF vector (dict) for a list of tokens.
        """
        if not tokens:
            return {}
            
        # Term frequencies (TF) using raw counts
        tf = {}
        for token in tokens:
            if token in self.vocab:
                tf[token] = tf.get(token, 0) + 1
                
        # TF-IDF weights: count * idf
        tfidf_vec = {}
        for token, count in tf.items():
            tfidf_vec[token] = count * self.idf[token]
            
        return tfidf_vec

    def cosine_similarity(self, vec1, vec2):
        """
        Calculates a soft cosine similarity between two sparse vectors (dicts),
        with soft length normalization to prevent over-penalizing longer documents.
        """
        if not vec1 or not vec2:
            return 0.0
            
        # Dot product
        dot_product = 0.0
        smaller, larger = (vec1, vec2) if len(vec1) < len(vec2) else (vec2, vec1)
        for term, val in smaller.items():
            if term in larger:
                dot_product += val * larger[term]
                
        if dot_product == 0.0:
            return 0.0
            
        # L2 Norms
        norm1 = math.sqrt(sum(val ** 2 for val in vec1.values()))
        norm2 = math.sqrt(sum(val ** 2 for val in vec2.values()))
        
        # Soft document norm penalty (mitigates long sentence penalties in FAQ matching)
        mitigated_norm2 = math.pow(norm2, 0.5)
        
        return dot_product / (norm1 * mitigated_norm2)

    def match(self, query):
        """
        Finds the best matching FAQ for a user query.
        Returns a dict with the matched FAQ, the score, and other top suggestions.
        """
        query_tokens = clean_and_tokenize(query)
        if not query_tokens:
            return {
                "matched_faq": None,
                "score": 0.0,
                "suggestions": [faq["question"] for faq in self.faqs[:3]]
            }
            
        query_vec = self._vectorize_tokens(query_tokens)
        
        # Calculate similarity scores for all FAQs
        scores = []
        for i, faq_vec in enumerate(self.faq_vectors):
            score = self.cosine_similarity(query_vec, faq_vec)
            scores.append((score, i))
            
        # Sort by similarity score descending
        scores.sort(key=lambda x: x[0], reverse=True)
        
        best_score, best_idx = scores[0]
        best_faq = self.faqs[best_idx] if best_score > 0 else None
        
        # Generate suggestions from the next top FAQs
        suggestions = []
        suggestion_count = 0
        for score, idx in scores:
            if idx == best_idx:
                continue
            if score > 0.05 and suggestion_count < 3:
                suggestions.append(self.faqs[idx]["question"])
                suggestion_count += 1
                
        if len(suggestions) < 3:
            for faq in self.faqs:
                if best_faq and faq["id"] == best_faq["id"]:
                    continue
                if faq["question"] not in suggestions and len(suggestions) < 3:
                    suggestions.append(faq["question"])
                    
        return {
            "matched_faq": best_faq,
            "score": best_score,
            "suggestions": suggestions
        }

if __name__ == "__main__":
    with open("faq_data.json", "r") as f:
        data = json.load(f)
    matcher = FAQMatcher(data)
    
    test_queries = [
        "What is AetherAI?",
        "how secure are my files?",
        "Is there a free trial for pro?",
        "can I cancel my plan?",
        "does it work offline?",
        "do you train models on my data?"
    ]
    
    print("NLP ENGINE TESTING")
    print("==================")
    for q in test_queries:
        res = matcher.match(q)
        faq = res["matched_faq"]
        print(f"Query: '{q}'")
        if faq:
            print(f"Match: '{faq['question']}' (Score: {res['score']:.4f})")
        else:
            print("No Match Found.")
        print("-" * 40)
