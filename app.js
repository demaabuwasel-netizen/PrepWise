const STAGE_HASHES = ['', '#dashboard', '#profile', '#setup', '#interview', '#completion', '#report', '#practice', '#history'];
const HASH_TO_STAGE = Object.fromEntries(STAGE_HASHES.map((h, i) => [h, i]).filter(([h]) => h));

window.app = {
    // --- AI Intelligence Core (Ollama Integration) ---
    async callModelAPI(promptOrMessages, systemInstruction = "", isJson = false) {
        // Handle native message array or fallback to single string prompt
        let messagesArray = [];
        if (Array.isArray(promptOrMessages)) {
            messagesArray = promptOrMessages;
        } else {
            messagesArray = [{ role: "user", content: promptOrMessages }];
        }
        
        // Prepend System Instruction
        if (systemInstruction) {
            messagesArray.unshift({ role: "system", content: systemInstruction });
        }

        const model = this.getModelForMode();
        const url = 'http://localhost:11434/api/chat';
        
        const body = {
            model: model,
            messages: messagesArray,
            stream: false,
            options: {
                temperature: isJson ? 0.1 : 0.7,
                num_predict: 2048
            }
        };

        if (isJson) {
            body.format = 'json';
        }

        try {
            const response = await fetch(url, { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify(body) 
            });
            
            if (!response.ok) {
                throw new Error(`Ollama Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.message?.content || this.getMockAIResponse(JSON.stringify(messagesArray));
        } catch (error) {
            console.error("Ollama Connection Error, falling back to Mock AI:", error);
            return this.getMockAIResponse(JSON.stringify(messagesArray));
        }
    },

    getModelForMode() {
        const mode = this.state.interviewMode;
        switch(mode) {
            case 'technical':
            case 'case':
                return 'qwen3:14b'; // Best for reasoning and technical
            case 'friendly':
                return 'gemma3:12b'; // Best for conversational
            case 'rapid':
                return 'qwen3:8b'; // Fast for rapid fire
            case 'hr':
            default:
                return 'qwen3:14b'; // Balanced for HR
        }
    },

    getInterviewSystemPrompt() {
        const moodPrompts = {
            'professional': 'Maintain a formal, professional, and slightly reserved tone. Act like a senior recruiter at a Fortune 500 company.',
            'friendly': 'Maintain a warm, encouraging, and supportive tone. Act like a helpful mentor or a friendly peer.',
            'hard': 'Maintain a challenging, skeptical, and high-pressure tone. Ask tough follow-up questions and drill down into every detail. Act like a demanding technical lead.',
            'casual': 'Maintain a relaxed, informal, and conversational tone. Use "tech-bro" or startup-style language. Act like you are meeting for coffee.'
        };
        const moodInstruction = moodPrompts[this.state.interviewerMood] || moodPrompts['professional'];

        return `
            You are the AI Interviewer for a mock interview training platform.
            Your goal is to conduct a realistic, human-like, and highly conversational interview.

            MOOD/PERSONALITY: ${moodInstruction}

            JOB DESCRIPTION: ${this.state.job.description}
            STUDENT PROFILE: ${this.state.user.name} - ${this.state.user.field}
            INTERVIEW TYPE: ${this.state.interviewMode}

            STRICT BEHAVIOR RULES:
            1. You are engaging in a back-and-forth conversation. You are reading the full conversation history.
            2. ALWAYS base your next question directly on the student's LAST answer. 
            3. Acknowledge what they just said naturally before asking the next question (e.g., "That makes sense. When you mentioned...").
            4. Ask ONLY ONE question at a time.
            5. DO NOT REPEAT previous questions or topics. Keep the conversation moving forward or deeper.
            6. If an answer is vague, ask for a specific example. If it is detailed, probe deeper into a specific technical or behavioral point they mentioned.
            7. Do not act like a robot running down a checklist. Act like a senior hiring manager having a natural dialogue.
            8. Output ONLY your next spoken message to the student. Do not output internal thoughts, JSON, or formatting.
        `;
    },

    // --- Mock AI for Demo Mode (No API Key Required) ---
    getMockAIResponse(prompt) {
        console.log("Using Mock AI Response for prompt:", prompt.substring(0, 100) + "...");
        const p = prompt.toLowerCase();
        
        // 1. Mock Job Profile Analysis
        if (p.includes('job description') && p.includes('match')) {
            return JSON.stringify({
                "matchScore": 82,
                "strengths": ["Technical Knowledge", "Problem Solving", "Experience"],
                "gaps": ["Specific Frameworks", "System Design"],
                "topics": ["Algorithm Optimization", "Team Collaboration"],
                "difficulty": "Moderate"
            });
        }

        // 2. Mock Report (Priority)
        if (p.includes('career coach') && p.includes('transcript')) {
            return JSON.stringify({
                "score": 8,
                "strengths": ["Clear communication", "Practical examples", "Good technical foundation"],
                "improvements": ["Be more specific about metrics", "Structure the STAR method better", "elaborate on trade-offs"],
                "bestAnswer": "Your explanation of the React state management was very clear.",
                "weakestAnswer": "The answer about teamwork could have used a more concrete example.",
                "starExample": "In my React project, users were losing data on refresh. I implemented local storage sync. This reduced data loss complaints by 90%."
            });
        }

        // 3. Mock Practice Question & Feedback
        if (p.includes('practicing') || p.includes('evaluation')) {
            return "That was a solid improvement! You addressed the core of the question much more clearly this time. One thing you did well was linking your past experience directly to the challenge. To make it even stronger, try to include a specific metric or result next time.";
        }
        if (p.includes('practice') && (p.includes('weakest area') || p.includes('weakness'))) {
            const area = this.state.currentPracticeWeakness || "Communication";
            return `I noticed that ${area} is an area you want to work on. Can you tell me about a time when you struggled with this, and what you did to overcome it?`;
        }

        // 4. Mock Report (Fallback)
        if (p.includes('report')) {
            return JSON.stringify({
                "score": 8,
                "strengths": ["Clear communication", "Practical examples", "Good technical foundation"],
                "improvements": ["Be more specific about metrics", "Structure the STAR method better", "elaborate on trade-offs"],
                "bestAnswer": "Your explanation of the React state management was very clear.",
                "weakestAnswer": "The answer about teamwork could have used a more concrete example.",
                "starExample": "In my React project, users were losing data on refresh. I implemented local storage sync. This reduced data loss complaints by 90%."
            });
        }

        // 4. Mock Interviewer Generator
        if (p.includes('start the interview') || this.state.interview.transcript.length === 0) {
            return "Hi! It's great to meet you today. To start things off, could you tell me a bit about your background and what specifically interests you about this role?";
        }
        
        const followups = [
            "That's interesting. You mentioned working on the frontend — what was one specific feature you built that you're proud of?",
            "I see. When you said authentication was difficult, what exactly made it a challenge for you?",
            "Before we move on, I'd like to understand your role in that project more clearly. What were your main responsibilities?",
            "Got it. Can you walk me through a specific time when you had to debug a difficult problem in that system?"
        ];
        return followups[Math.floor(Math.random() * followups.length)];
    },

    state: {
        currentStage: 0,
        interviewMode: 'hr',
        interviewerMood: 'professional',
        isGuest: false,
        isEditingProfile: false,
        currentUser: null,
        wizard: { step: 1, goal: 'specific', jobDesc: '', style: 'hr', mood: 'professional', method: 'text' },
        user: { name: '', email: '', field: 'Software Engineering', skills: '', courses: '', experience: '', linkedin: '' },
        job: { description: '', link: '' },
        analysis: { matchScore: 0, difficulty: 'Moderate', strengths: [], gaps: [], topics: [] },
        interview: {
            currentQuestionIndex: 0,
            questions: [],
            responses: [],
            startTime: null,
            isListening: false,
            awaitingFollowUp: false,

            // New Stateful Logic Fields
            currentPhase: 'opening',
            currentTopic: 'introduction',
            previousQuestion: '',
            latestAnswer: '',
            transcript: [],
            plan: [],
            transcriptSummary: '',
            studentFactsMentioned: [],
            openFollowUps: [],
            coveredTopics: [],
            unansweredPoints: [],
            askedQuestions: [],
            answerQuality: {
                answeredQuestion: 'unclear',
                specificity: 'okay',
                relevance: 'strong',
                confidence: 'medium'
            },
            nextAction: 'ask_follow_up'
        },
        transcriptState: { final: '', interim: '', isEditing: false },
        sessions: []
    },

    // --- Init ---
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initSpeech();
        this.checkAuth();
        this.initRouting();
        this.setupPopstateListener();
        if (typeof Logger !== 'undefined') Logger.startMouseTracking();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    cacheDOM() {
        this.views = {
            auth: document.getElementById('auth-view'),
            dashboard: document.getElementById('view-dashboard'),
            profile: document.getElementById('view-profile'),
            setup: document.getElementById('view-setup'),
            interview: document.getElementById('view-interview'),
            completion: document.getElementById('view-completion'),
            report: document.getElementById('view-report'),
            practice: document.getElementById('view-practice'),
            history: document.getElementById('view-history')
        };
        this.nav = document.getElementById('app-nav');
        this.forms = {
            auth: document.getElementById('auth-form'),
            profile: document.getElementById('profile-form'),
            job: document.getElementById('job-form')
        };
        this.populateFocusAreas();
    },

    bindEvents() {
        if (this.forms.auth) {
            this.forms.auth.addEventListener('submit', (e) => { e.preventDefault(); this.handleAuth(); });
        }
        if (this.forms.profile) {
            this.forms.profile.addEventListener('submit', (e) => { e.preventDefault(); this.handleProfileSubmit(); });
        }
        if (this.forms.job) {
            this.forms.job.addEventListener('submit', (e) => { e.preventDefault(); this.handleJobSubmit(); });
        }
    },

    populateFocusAreas() {
        const areas = [
            "Software Engineering", "Artificial Intelligence", "Cybersecurity", "Cloud / DevOps", "Networking",
            "Information Systems", "Game Development", "Data Science", "Statistics", "Mathematics",
            "Physics", "Biology", "Chemistry", "Finance", "Economics", "Accounting", "Business Administration",
            "Entrepreneurship", "Consulting", "Supply Chain / Operations", "Human Resources", "Marketing",
            "Digital Marketing", "Media & Communication", "Content Creation", "Psychology", "Law", "Medicine",
            "Industrial Engineering", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering",
            "Architecture", "Education", "UX Research", "Graphic Design"
        ];
        
        const selects = ['field-select', 'prof-field'].map(id => document.getElementById(id)).filter(Boolean);
        selects.forEach(select => {
            select.innerHTML = areas.map(a => `<option value="${a}">${a}</option>`).join('');
        });
    },

    // --- Modal & Theme ---
    openHowItWorks() {
        const modal = document.getElementById('how-it-works-modal');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    closeHowItWorks() {
        const modal = document.getElementById('how-it-works-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    },

    setTheme(mode) {
        const isDark = mode === 'dark';
        const indicator = document.getElementById('theme-indicator');
        const sun = document.getElementById('theme-light');
        const moon = document.getElementById('theme-dark');

        document.body.classList.toggle('dark', isDark);
        // Clear any inline style overrides so CSS class takes precedence
        document.body.style.backgroundColor = '';
        document.body.style.color = '';

        if (indicator) indicator.style.left = isDark ? 'calc(100% - 36px)' : '4px';
        if (isDark) {
            if (moon) { moon.classList.add('text-brand-500'); moon.classList.remove('text-slate-300'); }
            if (sun) { sun.classList.remove('text-brand-500'); sun.classList.add('text-slate-300'); }
        } else {
            if (sun) { sun.classList.add('text-brand-500'); sun.classList.remove('text-slate-300'); }
            if (moon) { moon.classList.remove('text-brand-500'); moon.classList.add('text-slate-300'); }
        }
    },

    toggleAuthMode() {
        const btn = document.getElementById('auth-submit-btn');
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const toggleBtn = document.getElementById('toggle-auth-mode');
        const isLogin = btn.dataset.mode !== 'signup';
        if (isLogin) {
            btn.dataset.mode = 'signup';
            if (title) title.textContent = 'Create Account 👋';
            if (subtitle) subtitle.textContent = 'Join 2,000+ students growing with us.';
            btn.innerHTML = 'Create Account <i data-lucide="arrow-right" class="w-5 h-5 ml-1 inline"></i>';
            if (toggleBtn) toggleBtn.textContent = 'Already have an account? Sign in';
        } else {
            btn.dataset.mode = 'login';
            if (title) title.textContent = 'Welcome back! 👋';
            if (subtitle) subtitle.textContent = "Let's continue your journey.";
            btn.innerHTML = 'Sign In <i data-lucide="arrow-right" class="w-5 h-5 ml-1 inline"></i>';
            if (toggleBtn) toggleBtn.textContent = 'New here? Create an account';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    simulateSocialLogin(provider) {
        const loader = document.getElementById('app-loader');
        const loaderText = document.getElementById('loader-text');
        if (loader) {
            loader.classList.remove('hidden'); loader.classList.add('flex');
            if (loaderText) loaderText.textContent = `Syncing ${provider}...`;
            setTimeout(() => {
                loader.classList.add('hidden'); loader.classList.remove('flex');
                this.state.user.name = provider === 'Google' ? 'Google Candidate' : 'GitHub Developer';
                this.state.user.email = provider.toLowerCase() + '@simulation.edu';
                this.state.currentUser = { email: this.state.user.email, profile: this.state.user, sessions: [], isGuest: false };
                localStorage.setItem('prepwise_session_v3', JSON.stringify(this.state.currentUser));
                this.updateUserUI();
                this.showDashboard();
            }, 2000);
        }
    },

    // --- Auth ---
    checkAuth() {
        const session = localStorage.getItem('prepwise_session_v3');
        if (session) {
            try {
                const data = JSON.parse(session);
                this.state.currentUser = data;
                this.state.user = data.profile || this.state.user;
                this.state.sessions = data.sessions || [];
                this.state.isGuest = data.isGuest || false;
                this.updateUserUI();
                this.showDashboard();
            } catch(e) {
                this.goToStage(0);
            }
        } else {
            this.goToStage(0);
        }
    },

    continueAsGuest() {
        this.createGuestSession();
    },

    createGuestSession() {
        this.state.isGuest = true;
        this.state.user = { name: 'Guest User', email: 'guest@prepwise.ai', field: 'Software Engineering', skills: 'React, Node', courses: '', experience: '', linkedin: '' };
        this.state.currentUser = { email: this.state.user.email, profile: this.state.user, sessions: [], isGuest: true };
        localStorage.setItem('prepwise_session_v3', JSON.stringify(this.state.currentUser));
        this.updateUserUI();
        this.showDashboard();
    },

    initRouting() {
        const hash = window.location.hash;
        const stage = HASH_TO_STAGE[hash];
        if (stage && this.state.currentUser) {
            this._navigateToStage(stage);
        }
        history.replaceState({ stage: this.state.currentStage }, '', window.location.hash || '');
    },

    setupPopstateListener() {
        window.addEventListener('popstate', (e) => {
            if (e.state && typeof e.state.stage === 'number') {
                const target = e.state.stage;
                this._navigateToStage(target);
            } else {
                const hash = window.location.hash;
                const stage = HASH_TO_STAGE[hash];
                if (stage !== undefined && this.state.currentUser) {
                    this._navigateToStage(stage);
                } else {
                    this._navigateToStage(0);
                }
            }
        });
    },

    handleAuth() {
        const emailEl = document.getElementById('auth-email');
        const btn = document.getElementById('auth-submit-btn');
        if (!emailEl) return;
        const email = emailEl.value.trim();
        if (!email) return;
        const isSignUp = btn && btn.dataset.mode === 'signup';
        let users = JSON.parse(localStorage.getItem('prepwise_users_v3') || '{}');
        if (isSignUp) {
            if (users[email]) return alert("An account already exists for this email. Please sign in.");
            users[email] = { profile: null, sessions: [] };
            localStorage.setItem('prepwise_users_v3', JSON.stringify(users));
        } else {
            if (!users[email]) {
                users[email] = { profile: null, sessions: [] };
                localStorage.setItem('prepwise_users_v3', JSON.stringify(users));
            }
        }
        this.state.currentUser = { email, ...users[email], isGuest: false };
        localStorage.setItem('prepwise_session_v3', JSON.stringify(this.state.currentUser));
        if (this.state.currentUser.profile) {
            this.state.user = this.state.currentUser.profile;
            this.state.sessions = this.state.currentUser.sessions || [];
            this.updateUserUI();
            this.showDashboard();
        } else {
            this.showDashboard();
        }
    },

    handleProfileSubmit() {
        this.saveProfile();
    },

    saveProfile() {
        const nameEl = document.getElementById('prof-name');
        const fieldEl = document.getElementById('prof-field');
        const skillsEl = document.getElementById('prof-skills');
        const coursesEl = document.getElementById('prof-courses');
        const experienceEl = document.getElementById('prof-experience');
        const linkedinEl = document.getElementById('prof-linkedin');
        
        this.state.user.name = nameEl ? nameEl.value.trim() : '';
        this.state.user.field = fieldEl ? fieldEl.value.trim() : 'Software Engineering';
        this.state.user.skills = skillsEl ? skillsEl.value.trim() : '';
        this.state.user.courses = coursesEl ? coursesEl.value.trim() : '';
        this.state.user.experience = experienceEl ? experienceEl.value.trim() : '';
        this.state.user.linkedin = linkedinEl ? linkedinEl.value.trim() : '';
        
        this.saveUserData();
        this.updateUserUI();
        this.showDashboard();
    },

    openEditProfile() {
        const nameEl = document.getElementById('prof-name');
        const fieldEl = document.getElementById('prof-field');
        const skillsEl = document.getElementById('prof-skills');
        const coursesEl = document.getElementById('prof-courses');
        const experienceEl = document.getElementById('prof-experience');
        const linkedinEl = document.getElementById('prof-linkedin');

        if (nameEl) nameEl.value = this.state.user.name || '';
        if (fieldEl) fieldEl.value = this.state.user.field || '';
        if (skillsEl) skillsEl.value = this.state.user.skills || '';
        if (coursesEl) coursesEl.value = this.state.user.courses || '';
        if (experienceEl) experienceEl.value = this.state.user.experience || '';
        if (linkedinEl) linkedinEl.value = this.state.user.linkedin || '';
        
        this.goToStage(2);
    },

    updateOnboardingUI() {
    },

    toggleCVImport() {
        const body = document.getElementById('cv-import-body');
        const chevron = document.getElementById('cv-chevron');
        if (!body) return;
        const isOpen = !body.classList.contains('hidden');
        body.classList.toggle('hidden', isOpen);
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    },

    switchCVTab(tab) {
        const isUpload = tab === 'upload';
        const uploadPanel = document.getElementById('cv-upload-panel');
        const pastePanel = document.getElementById('cv-paste-panel');
        const tabUpload = document.getElementById('cv-tab-upload');
        const tabPaste = document.getElementById('cv-tab-paste');
        
        if (uploadPanel) uploadPanel.classList.toggle('hidden', !isUpload);
        if (pastePanel) pastePanel.classList.toggle('hidden', isUpload);
        
        if (tabUpload) {
            tabUpload.classList.toggle('border-brand-500', isUpload);
            tabUpload.classList.toggle('text-brand-600', isUpload);
            tabUpload.classList.toggle('border-transparent', !isUpload);
            tabUpload.classList.toggle('text-slate-400', !isUpload);
        }
        if (tabPaste) {
            tabPaste.classList.toggle('border-brand-500', !isUpload);
            tabPaste.classList.toggle('text-brand-600', !isUpload);
            tabPaste.classList.toggle('border-transparent', isUpload);
            tabPaste.classList.toggle('text-slate-400', isUpload);
        }
    },

    async handleCVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const nameEl = document.getElementById('cv-file-name');
        const parseBtn = document.getElementById('btn-parse-pdf');
        
        if (nameEl) {
            nameEl.textContent = file.name;
            nameEl.classList.remove('hidden');
        }
        if (parseBtn) parseBtn.disabled = false;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const typedarray = new Uint8Array(e.target.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }
                this._pendingCVText = fullText;
                console.log("PDF text extracted successfully.");
            } catch (err) {
                console.error("Error parsing PDF:", err);
                alert("Failed to parse PDF. Please try pasting the text instead.");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    autofillFromCV() {
        const cvText = this._pendingCVText || (document.getElementById('cv-text-input') || {}).value || '';
        if (!cvText.trim()) return;

        const parsed = this.parseCVText(cvText);

        // Store extracted data for review
        this._cvExtracted = parsed._extracted || {};
        this._cvRawParsed = parsed;

        // Show review dialog with extracted data
        this.showCVReviewModal(parsed);
    },

    showCVReviewModal(parsed) {
        // Create modal HTML for reviewing extracted CV data
        const modal = document.createElement('div');
        modal.id = 'cv-review-modal';
        modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div class="sticky top-0 bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white">
                    <h2 class="text-2xl font-black">Review Extracted Information</h2>
                    <p class="text-sm opacity-90 mt-1">Check that the information was extracted correctly. Edit if needed.</p>
                </div>

                <div class="p-6 space-y-5">
                    <!-- Name -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                        <input type="text" id="cv-review-name" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none" value="${parsed.name || ''}" placeholder="Your full name">
                    </div>

                    <!-- Field -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Field of Work</label>
                        <select id="cv-review-field" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none">
                            <option>${parsed.field || 'Select field'}</option>
                        </select>
                    </div>

                    <!-- LinkedIn -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">LinkedIn URL</label>
                        <input type="url" id="cv-review-linkedin" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none" value="${parsed.linkedin || ''}" placeholder="https://linkedin.com/in/yourprofile">
                    </div>

                    <!-- Skills -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Skills (${(parsed.skills || '').split(', ').filter(Boolean).length} found)
                        </label>
                        <textarea id="cv-review-skills" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-24" placeholder="Skills, separated by commas">${parsed.skills || ''}</textarea>
                        <p class="text-[9px] text-slate-400 mt-1">Separate skills with commas. Edit or remove any that were incorrectly extracted.</p>
                    </div>

                    <!-- Education -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Education (${this._cvExtracted.education?.length || 0} found)
                        </label>
                        <textarea id="cv-review-education" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-24" placeholder="Your degrees and educational background">${(this._cvExtracted.education || []).join('\n') || ''}</textarea>
                    </div>

                    <!-- Experience -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Experience</label>
                        <textarea id="cv-review-experience" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-32" placeholder="Your work experience and professional background">${parsed.experience || ''}</textarea>
                    </div>

                    <!-- Courses -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Relevant Courses (${(parsed.courses || '').split(', ').filter(Boolean).length} found)
                        </label>
                        <textarea id="cv-review-courses" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-20" placeholder="Relevant courses, separated by commas">${parsed.courses || ''}</textarea>
                    </div>

                    <!-- Projects -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Projects (${this._cvExtracted.projects?.length || 0} found)
                        </label>
                        <textarea id="cv-review-projects" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-24" placeholder="Key projects you've worked on">${(this._cvExtracted.projects || []).join('\n') || ''}</textarea>
                    </div>

                    <!-- Certifications -->
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Certifications (${this._cvExtracted.certifications?.length || 0} found)
                        </label>
                        <textarea id="cv-review-certifications" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none resize-none h-20" placeholder="Professional certifications and awards">${(this._cvExtracted.certifications || []).join('\n') || ''}</textarea>
                    </div>
                </div>

                <div class="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3">
                    <button onclick="window.app.closeCVReviewModal()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.app.applyCVExtracted()" class="flex-1 btn-gradient text-white font-bold rounded-lg transition-all">
                        Apply to Profile
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Populate field select with options
        this.populateFocusAreas();
        const fieldSelect = document.getElementById('cv-review-field');
        if (fieldSelect) {
            const areas = Array.from(document.getElementById('field-select')?.options || []).map(o => o.value);
            fieldSelect.innerHTML = areas.map(a => `<option value="${a}" ${a === parsed.field ? 'selected' : ''}>${a}</option>`).join('');
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    closeCVReviewModal() {
        const modal = document.getElementById('cv-review-modal');
        if (modal) modal.remove();
    },

    applyCVExtracted() {
        // Get values from review modal
        const name = document.getElementById('cv-review-name')?.value || '';
        const field = document.getElementById('cv-review-field')?.value || '';
        const skills = document.getElementById('cv-review-skills')?.value || '';
        const experience = document.getElementById('cv-review-experience')?.value || '';
        const courses = document.getElementById('cv-review-courses')?.value || '';
        const linkedin = document.getElementById('cv-review-linkedin')?.value || '';

        // Apply to form fields (matching index.html IDs)
        const nameEl = document.getElementById('prof-name');
        const fieldEl = document.getElementById('prof-field');
        const skillsEl = document.getElementById('prof-skills');
        const coursesEl = document.getElementById('prof-courses');
        const experienceEl = document.getElementById('prof-experience');
        const linkedinEl = document.getElementById('prof-linkedin');

        if (nameEl && name) nameEl.value = name;
        if (fieldEl && field) fieldEl.value = field;
        if (skillsEl && skills) skillsEl.value = skills;
        if (coursesEl && courses) coursesEl.value = courses;
        if (experienceEl && experience) experienceEl.value = experience;
        if (linkedinEl && linkedin) linkedinEl.value = linkedin;

        if (typeof Logger !== 'undefined') {
            Logger.logCVSubmission(this.state.user, this._cvExtracted || {});
        }

        // Show success message
        const status = document.getElementById('cv-import-status');
        if (status) {
            status.textContent = '✓ CV information applied to your profile.';
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 3000);
        }

        this.closeCVReviewModal();
    },

    switchCVTab(tab) {
        const isUpload = tab === 'upload';
        const uploadPanel = document.getElementById('cv-upload-panel');
        const pastePanel = document.getElementById('cv-paste-panel');
        const tabUpload = document.getElementById('cv-tab-upload');
        const tabPaste = document.getElementById('cv-tab-paste');
        if (uploadPanel) uploadPanel.classList.toggle('hidden', !isUpload);
        if (pastePanel) pastePanel.classList.toggle('hidden', isUpload);
        if (tabUpload) {
            tabUpload.className = `flex-1 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-colors ${isUpload ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`;
        }
        if (tabPaste) {
            tabPaste.className = `flex-1 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-colors ${!isUpload ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`;
        }
    },

    async handleCVFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const statusEl = document.getElementById('cv-upload-status');
        if (statusEl) {
            statusEl.textContent = 'Reading file...';
            statusEl.classList.remove('hidden');
        }
        try {
            let text = '';
            if (file.name.endsWith('.txt')) {
                text = await file.text();
            } else if (file.name.endsWith('.pdf')) {
                await this.loadPDFJS();
                const buffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
            }
            this._pendingCVText = text;
            if (statusEl) {
                statusEl.textContent = `✓ ${file.name} loaded — click Auto-fill to extract`;
                statusEl.classList.remove('hidden');
            }
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'Could not read file. Try pasting the text instead.';
                statusEl.classList.remove('hidden');
            }
        }
    },

    async loadPDFJS() {
        if (window.pdfjsLib) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    },

    // Improved CV parsing with better extraction
    parseCVText(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const textLower = text.toLowerCase();

        const extracted = {
            name: this.extractName(text, lines),
            field: this.detectField(textLower),
            linkedin: this.extractLinkedIn(text),
            skills: this.extractSkills(text, textLower),
            education: this.extractEducation(text, lines, textLower),
            experience: this.extractExperience(text, lines, textLower),
            courses: this.extractCourses(text, textLower),
            projects: this.extractProjects(text, lines, textLower),
            certifications: this.extractCertifications(text, textLower),
            languages: this.extractLanguages(text, textLower),
            tools: this.extractTools(text, textLower)
        };

        // Format for legacy compatibility
        return {
            name: extracted.name,
            field: extracted.field,
            linkedin: extracted.linkedin,
            skills: extracted.skills.join(', '),
            experience: extracted.experience,
            courses: extracted.courses.join(', '),
            // Store structured data for review
            _extracted: extracted
        };
    },

    extractLinkedIn(text) {
        const match = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/);
        return match ? 'https://www.' + match[0] : '';
    },

    extractName(text, lines) {
        // First line is often the name
        const firstLine = lines[0] || '';
        if (firstLine && firstLine.length < 50 && !firstLine.match(/^\d/) && !firstLine.match(/^[A-Z\s]+$/)) {
            // Check if it looks like a name (no special symbols, reasonable length)
            if (!firstLine.match(/[|•·]/)) {
                return firstLine;
            }
        }
        return '';
    },

    extractSkills(text, textLower) {
        const skills = [];
        const seenSkills = new Set();

        // Technical skills library (comprehensive)
        const TECH_SKILLS = [
            // Languages
            'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
            'R', 'MATLAB', 'Scala', 'Perl', 'Haskell', 'Elixir', 'Clojure',
            // Frontend
            'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Ember', 'Backbone',
            'HTML', 'CSS', 'Sass', 'Bootstrap', 'Tailwind', 'Material UI',
            // Backend
            'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'ASP.NET',
            'Laravel', 'Ruby on Rails', 'Gin', 'Echo', 'Rocket',
            // Databases
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch',
            'Oracle', 'SQLite', 'MariaDB', 'Neo4j', 'Firestore',
            // Data & Analytics
            'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'Matplotlib',
            'Plotly', 'Tableau', 'Power BI', 'Looker', 'Qlik', 'Excel',
            // Cloud & DevOps
            'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'DigitalOcean',
            'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI',
            'Terraform', 'Ansible', 'CloudFormation',
            // Data Tools
            'Jupyter', 'Apache Spark', 'Hadoop', 'Kafka', 'RabbitMQ', 'Airflow',
            'Databricks', 'Snowflake', 'BigQuery', 'Redshift',
            // Version Control & Tools
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
            'Jira', 'Confluence', 'Linear', 'Asana', 'Monday.com',
            // APIs & Protocols
            'REST', 'GraphQL', 'gRPC', 'SOAP', 'WebSocket',
            // Other
            'Linux', 'Windows', 'macOS', 'Unix',
            'Agile', 'Scrum', 'Kanban', 'Waterfall',
            'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Collaboration',
            'Analysis', 'Design', 'Testing', 'Debugging', 'Optimization'
        ];

        // Look for skills section first
        const skillsPattern = /(?:technical\s+)?skills?\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n(?:[A-Z][a-z]+\s*:|\w+\s+(?:Experience|History|Projects|Education)))/im;
        const skillsMatch = text.match(skillsPattern);

        if (skillsMatch && skillsMatch[1]) {
            const skillsText = skillsMatch[1];
            const skillLines = skillsText.split(/\n|,|;|•|·/).map(s => s.trim()).filter(Boolean);

            skillLines.forEach(line => {
                TECH_SKILLS.forEach(skill => {
                    if (line.toLowerCase().includes(skill.toLowerCase())) {
                        if (!seenSkills.has(skill)) {
                            skills.push(skill);
                            seenSkills.add(skill);
                        }
                    }
                });
            });
        }

        // Fallback: scan entire CV for tech skills
        if (skills.length === 0) {
            TECH_SKILLS.forEach(skill => {
                if (textLower.includes(skill.toLowerCase()) && !seenSkills.has(skill)) {
                    skills.push(skill);
                    seenSkills.add(skill);
                }
            });
        }

        return skills.slice(0, 15);
    },

    extractEducation(text, lines, textLower) {
        const education = [];

        // Find education section
        const eduPattern = /(?:education|academic|university|school|degree)\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n(?:[A-Z][a-z]+\s*:))/im;
        const eduMatch = text.match(eduPattern);

        if (eduMatch && eduMatch[1]) {
            const eduText = eduMatch[1];
            const eduLines = eduText.split('\n').map(l => l.trim()).filter(Boolean);

            eduLines.forEach((line, idx) => {
                // Look for degree/school patterns
                if (line.length > 15 && line.length < 150) {
                    if (/(bachelor|master|phd|diploma|certificate|degree|b\.s\.|m\.s\.|b\.a\.|m\.a\.|b\.tech|m\.tech)/i.test(line)) {
                        education.push(line);
                    } else if (idx < eduLines.length - 1 && /(university|college|school|institute)/i.test(line)) {
                        education.push(line);
                    }
                }
            });
        }

        return education.slice(0, 5);
    },

    extractExperience(text, lines, textLower) {
        // Extract detailed work experience
        const expPattern = /(?:work\s+)?experience|employment|professional\s+background\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n(?:[A-Z][a-z]+\s*:|\w+\s+(?:Projects|Skills|Education)))/im;
        const expMatch = text.match(expPattern);

        if (expMatch && expMatch[1]) {
            const expText = expMatch[1];
            // Take first 600 chars of experience section
            let cleaned = expText.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 10)
                .slice(0, 6)
                .join(' ');
            return cleaned.substring(0, 600);
        }
        return '';
    },

    extractCourses(text, textLower) {
        const courses = [];
        const seenCourses = new Set();

        const courseKeywords = [
            'data structures', 'algorithms', 'database design', 'web development', 'software engineering',
            'machine learning', 'deep learning', 'statistics', 'probability', 'linear algebra', 'calculus',
            'discrete mathematics', 'operating systems', 'computer networks', 'distributed systems',
            'data science', 'big data', 'cloud computing', 'cybersecurity', 'cryptography',
            'artificial intelligence', 'computer vision', 'natural language processing', 'reinforcement learning',
            'system design', 'design patterns', 'agile', 'devops', 'full stack'
        ];

        const coursesPattern = /(?:relevant\s+)?coursework|relevant\s+courses|courses?\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n[A-Z][a-z]+\s*:)/im;
        const coursesMatch = text.match(coursesPattern);

        if (coursesMatch && coursesMatch[1]) {
            const coursesText = coursesMatch[1];
            const courseLines = coursesText.split(/\n|,|;/).map(s => s.trim()).filter(Boolean);

            courseLines.forEach(line => {
                courseKeywords.forEach(kw => {
                    if (line.toLowerCase().includes(kw)) {
                        if (!seenCourses.has(kw)) {
                            courses.push(kw);
                            seenCourses.add(kw);
                        }
                    }
                });
            });
        } else {
            // Fallback: look in entire text
            courseKeywords.forEach(kw => {
                if (textLower.includes(kw) && !seenCourses.has(kw)) {
                    courses.push(kw);
                    seenCourses.add(kw);
                }
            });
        }

        return courses.slice(0, 8);
    },

    extractProjects(text, lines, textLower) {
        const projects = [];

        const projectPattern = /(?:projects?|portfolio)\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n[A-Z][a-z]+\s*:)/im;
        const projectMatch = text.match(projectPattern);

        if (projectMatch && projectMatch[1]) {
            const projectText = projectMatch[1];
            const projectLines = projectText.split('\n').map(l => l.trim()).filter(l => l.length > 15 && l.length < 150);

            projectLines.forEach(line => {
                if (!line.match(/^\d/) && !line.match(/^[-•*]/)) {
                    projects.push(line);
                }
            });
        }

        return projects.slice(0, 5);
    },

    extractCertifications(text, textLower) {
        const certs = [];

        const certPattern = /(?:certifications?|certificates?|licenses?|awards?)\s*:?\s*\n([\s\S]*?)(?:\n\n|$|\n[A-Z][a-z]+\s*:)/im;
        const certMatch = text.match(certPattern);

        if (certMatch && certMatch[1]) {
            const certText = certMatch[1];
            const certLines = certText.split(/\n|,/).map(s => s.trim()).filter(s => s.length > 5 && s.length < 100);
            return certLines.slice(0, 5);
        }
        return certs;
    },

    extractLanguages(text, textLower) {
        const languages = [];
        const langPattern = /(?:language|languages?)\s*:?\s*\n?([\s\S]*?)(?:\n\n|$|\n[A-Z][a-z]+\s*:)/im;
        const langMatch = text.match(langPattern);

        if (langMatch && langMatch[1]) {
            const langText = langMatch[1];
            const langList = langText.split(/\n|,/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30);
            return langList.slice(0, 5);
        }
        return languages;
    },

    extractTools(text, textLower) {
        const tools = [];
        const seenTools = new Set();

        const TOOLS = [
            'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Framer',
            'Photoshop', 'Illustrator', 'After Effects',
            'Slack', 'Teams', 'Discord', 'Zoom',
            'Notion', 'Obsidian', 'OneNote',
            'VS Code', 'IntelliJ', 'Visual Studio', 'Xcode',
            'Postman', 'Insomnia', 'Thunder Client',
            'Figma', 'Adobe Analytics', 'Mixpanel', 'Amplitude',
            'Stripe', 'Twilio', 'SendGrid', 'Auth0'
        ];

        TOOLS.forEach(tool => {
            if (textLower.includes(tool.toLowerCase()) && !seenTools.has(tool)) {
                tools.push(tool);
                seenTools.add(tool);
            }
        });

        return tools.slice(0, 8);
    },

    detectField(textLower) {
        const FIELD_MAP = [
            { keywords: ['machine learning', 'deep learning', 'neural', 'nlp', 'computer vision', 'tensorflow', 'pytorch'], field: 'Artificial Intelligence' },
            { keywords: ['data science', 'data analyst', 'pandas', 'numpy', 'tableau', 'power bi', 'analytics'], field: 'Data Science' },
            { keywords: ['software engineer', 'backend', 'frontend', 'fullstack', 'web developer', 'mobile app'], field: 'Software Engineering' },
            { keywords: ['cybersecurity', 'penetration', 'ethical hack', 'infosec', 'security'], field: 'Cybersecurity' },
            { keywords: ['devops', 'kubernetes', 'terraform', 'ci/cd', 'infrastructure', 'cloud engineer'], field: 'Cloud / DevOps' },
            { keywords: ['ux ', 'ui ', 'user experience', 'user research', 'usability', 'figma'], field: 'UX Research' },
            { keywords: ['finance', 'investment', 'portfolio', 'equity', 'accounting'], field: 'Finance' },
            { keywords: ['marketing', 'seo', 'campaigns', 'brand', 'content', 'digital marketing'], field: 'Digital Marketing' },
            { keywords: ['product manager', 'product management', 'roadmap', 'go-to-market'], field: 'Business Administration' },
        ];

        for (const { keywords, field } of FIELD_MAP) {
            if (keywords.some(k => textLower.includes(k))) {
                return field;
            }
        }

        return 'Software Engineering'; // default
    },

    async handleJobSubmit() {
        const descEl = document.getElementById('job-desc-input');
        this.state.job.description = descEl ? descEl.value.trim() : '';
        await this.runAnalysis();
    },

    continueAsGuest() {
        this.state.isGuest = true;
        this.updateUserUI();
        this.goToStage(1);
    },

    updateUserUI() {
        const pill = document.getElementById('user-pill');
        const pillName = document.getElementById('pill-name');
        const pillInitials = document.getElementById('pill-initials');
        const navAvatar = document.getElementById('nav-user-avatar');
        
        const name = this.state.user.name || (this.state.isGuest ? 'Guest User' : '');
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';

        if (navAvatar) navAvatar.textContent = initials;

        if (this.state.isGuest) {
            if (pillName) pillName.textContent = 'Hi, Guest!';
            if (pillInitials) pillInitials.textContent = 'G';
            if (pill) pill.classList.remove('hidden');
            return;
        }
        
        if (!this.state.user.name) return;
        
        const firstName = this.state.user.name.split(' ')[0];
        if (pillName) pillName.textContent = `Hi, ${firstName}!`;
        if (pillInitials) pillInitials.textContent = initials;
        if (pill) pill.classList.remove('hidden');
    },

    saveUserData() {
        if (this.state.isGuest || !this.state.currentUser) return;
        const users = JSON.parse(localStorage.getItem('prepwise_users_v3') || '{}');
        const email = this.state.currentUser.email;
        if (!users[email]) users[email] = { profile: null, sessions: [] };
        users[email].profile = this.state.user;
        users[email].sessions = this.state.sessions;
        localStorage.setItem('prepwise_users_v3', JSON.stringify(users));
        localStorage.setItem('prepwise_session_v3', JSON.stringify({ email, ...users[email] }));
    },

    signOut() {
        localStorage.removeItem('prepwise_session_v3');
        this.state.currentUser = null;
        this.state.isGuest = false;
        location.reload();
    },

    deleteAccount() {
        if (!this.state.currentUser || !this.state.currentUser.email) {
            alert('No account to delete.');
            return;
        }
        const confirmed = confirm('Delete your account?\n\nThis will permanently remove your profile and all session history. This cannot be undone.');
        if (!confirmed) return;
        const email = this.state.currentUser.email;
        const users = JSON.parse(localStorage.getItem('prepwise_users_v3') || '{}');
        delete users[email];
        localStorage.setItem('prepwise_users_v3', JSON.stringify(users));
        localStorage.removeItem('prepwise_session_v3');
        location.reload();
    },

    // --- Navigation ---
    handleLogoClick() {
        if (this.state.currentStage === 0) return;
        if (this.state.currentStage === 4) {
            if (!confirm("Leave the interview? Your progress will not be saved.")) return;
            this.stopListening();
            window.speechSynthesis && window.speechSynthesis.cancel();
        }
        if (this.state.currentUser && this.state.currentUser.profile) {
            this.showDashboard();
        } else {
            this.goToStage(0);
        }
    },

    goBack() {
        const stage = this.state.currentStage;
        if (stage === 4) {
            if (!confirm("Leave the interview? Your progress will not be saved.")) return;
            this.stopListening();
            window.speechSynthesis && window.speechSynthesis.cancel();
            this.goToStage(3);
        } else if (stage === 5) {
            this.showDashboard();
        } else if (stage === 6) {
            this.goToStage(5);
        } else if (stage > 0) {
            this.goToStage(stage - 1);
        }
    },

    goToStage(stageNum) {
        if (stageNum === 3) {
            this.state.wizard.step = 1;
            this.renderWizardStep();
        }
        this._navigateToStage(stageNum);
        const hash = STAGE_HASHES[stageNum] || '';
        if (stageNum === 0) {
            history.replaceState({ stage: stageNum }, '', window.location.pathname);
        } else {
            history.pushState({ stage: stageNum }, '', hash);
        }
    },

    _navigateToStage(stageNum) {
        this.state.currentStage = stageNum;
        const viewKeys = ['auth', 'dashboard', 'profile', 'setup', 'interview', 'completion', 'report', 'practice', 'history'];
        Object.values(this.views).forEach(v => { if (v) v.classList.remove('active'); });
        const key = viewKeys[stageNum];
        if (this.views[key]) this.views[key].classList.add('active');
        
        // Show/Hide App Navigation
        if (this.nav) {
            if (stageNum === 0) {
                this.nav.classList.add('hidden');
            } else {
                this.nav.classList.remove('hidden');
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (stageNum === 8) this.showHistory();

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },



    extractRequirements(jobDesc) {
        const softSkillWords = [
            'communication', 'interpersonal', 'leadership', 'teamwork', 'collaboration',
            'adaptability', 'time management', 'organizational', 'work ethic', 'multitask',
            'self-starter', 'proactive', 'driven', 'motivated', 'enthusiasm', 'passionate',
            'attention to detail', 'critical thinking', 'problem solving', 'fast paced',
            'fast learner', 'team player', 'verbal', 'written communication', 'positive attitude',
            'strong work ethic', 'ability to work', 'ability to communicate', 'people skills',
            'relationship', 'initiative', 'flexible', 'reliable', 'responsible'
        ];
        const techKeywords = [
            'python', 'javascript', 'java', 'sql', 'react', 'node', 'aws', 'docker',
            'kubernetes', 'typescript', 'api', 'database', 'machine learning', 'data',
            'framework', 'library', 'algorithm', 'software', 'system', 'architecture',
            'bachelor', 'master', 'degree', 'major', 'gpa', 'course', 'graduate',
            'engineering', 'computer science', 'mathematics', 'statistics', 'physics',
            'research', 'thesis', 'publication', 'internship', 'project', 'build',
            'develop', 'design', 'implement', 'deploy', 'cloud', 'git', 'linux',
            'analysis', 'model', 'network', 'security', 'devops', 'backend', 'frontend',
            'mobile', 'ios', 'android', 'html', 'css', 'php', 'ruby', 'c++', 'scala',
            'testing', 'agile', 'scrum', 'ci/cd', 'microservice', 'rest', 'graphql'
        ];

        const isSoftSkillOnly = (line) => {
            const lower = line.toLowerCase();
            const hasTech = techKeywords.some(kw => lower.includes(kw));
            if (hasTech) return false;
            const hasSoft = softSkillWords.some(kw => lower.includes(kw));
            return hasSoft;
        };

        const lines = jobDesc.split('\n').map(l => l.trim()).filter(Boolean);
        const reqLines = lines.filter(l =>
            /^[-•*]|^\d+\.|experience|proficien|knowledge|familiar|skill|must|required|ability/i.test(l)
        );
        const requirements = reqLines
            .filter(l => !isSoftSkillOnly(l))
            .map(l => l.replace(/^[-•*\d.]+\s*/, '').replace(/\(.*?\)/g, '').trim())
            .filter(l => l.length > 5 && l.length < 120);
        return requirements;
    },

    matchRequirements(requirements, userSkillsList) {
        const userLower = userSkillsList.map(s => s.toLowerCase());
        const matched = [], missing = [];
        requirements.forEach(req => {
            const reqLower = req.toLowerCase();
            const isMatch = userLower.some(skill =>
                reqLower.includes(skill) || skill.split(' ').some(word => word.length > 3 && reqLower.includes(word))
            );
            if (isMatch) matched.push(req);
            else missing.push(req);
        });
        return { matched, missing };
    },

    // --- Analysis ---
    async runAnalysis() {
        const jobDesc = this.state.job.description;
        const userProfile = JSON.stringify(this.state.user);

        const el = (id) => document.getElementById(id);
        const statusEl = el('job-desc-status') || el('interviewer-status');
        
        // Safety check for API key
        const apiKey = window.PREPWISE_CONFIG?.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
        if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') {
            alert("API Key missing! Please open config.js and paste your Gemini API key.");
            return;
        }

        if (statusEl) statusEl.textContent = 'AI is analyzing job requirements...';

        try {
            const prompt = `
                Analyze the following Job Description and Candidate Profile.
                Job Description: ${jobDesc}
                Candidate Profile: ${userProfile}

                Provide a detailed match analysis in JSON format:
                {
                    "matchScore": number (0-100),
                    "strengths": ["string", "string", ... max 4],
                    "gaps": ["string", "string", ... max 6],
                    "topics": ["string", "string", ... max 3 focus topics for practice],
                    "difficulty": "Easy" | "Moderate" | "Challenging" | "Expert"
                }
            `;

            const geminiResponseText = await this.callModelAPI(prompt, "You are a senior technical recruiter. Always respond in valid JSON.", true);
            if (!geminiResponseText) throw new Error("No response from AI");

            const jsonMatch = geminiResponseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Invalid AI response format");
            
            const result = JSON.parse(jsonMatch[0]);

            this.state.analysis = {
                matchScore: result.matchScore || 50,
                strengths: result.strengths || [],
                gaps: result.gaps || [],
                topics: result.topics || [],
                difficulty: result.difficulty || "Moderate"
            };

            const matchScore = this.state.analysis.matchScore;
            const diffLevel = matchScore > 85 ? 2 : (matchScore > 70 ? 3 : 4);

            if (el('match-score')) el('match-score').textContent = `${matchScore}%`;
            if (el('difficulty-text')) el('difficulty-text').textContent = this.state.analysis.difficulty;
            if (el('difficulty-dots')) {
                Array.from(el('difficulty-dots').children).forEach((dot, i) => {
                    dot.className = `w-3.5 h-3.5 rounded-full ${i < diffLevel ? 'bg-accent-lavender shadow-[0_0_10px_rgba(155,138,251,0.4)]' : 'bg-slate-200'}`;
                });
            }

            const renderRequirement = (req, icon, iconColor) => `
                <li class="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-brand-900 leading-snug">
                    <i data-lucide="${icon}" class="w-3.5 h-3.5 ${iconColor} mt-0.5 shrink-0"></i>
                    ${req}
                </li>
            `;

            if (el('analysis-strengths')) el('analysis-strengths').innerHTML = this.state.analysis.strengths.map(s => renderRequirement(s, 'check', 'text-[#63D5C4]')).join('');
            if (el('analysis-gaps')) el('analysis-gaps').innerHTML = this.state.analysis.gaps.map(g => renderRequirement(g, 'minus', 'text-red-400')).join('');
            if (el('analysis-topics')) el('analysis-topics').innerHTML = this.state.analysis.topics.map(t => renderRequirement(t, 'circle-dot', 'text-brand-500')).join('');

            if (el('job-input-section')) el('job-input-section').classList.add('hidden');
            if (el('analysis-results-section')) el('analysis-results-section').classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error("Analysis Error:", error);
            if (statusEl) statusEl.textContent = 'Error: ' + error.message;
            alert("AI Analysis failed. Check your API key and connection.");
        }
    },

    extractJobKeywords(jobDesc) {
        const techSkills = ['python', 'javascript', 'java', 'sql', 'react', 'node.js', 'node', 'aws', 'docker', 'kubernetes', 'typescript', 'c++', 'go', 'rust', 'scala', 'spring', 'django', 'flask', 'angular', 'vue', 'backend', 'frontend', 'fullstack', 'devops', 'cloud', 'api', 'rest', 'graphql', 'microservices', 'databases', 'mongodb', 'postgres', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'machine learning', 'data analysis', 'analytics', 'ai', 'gcp', 'azure', 'terraform', 'jenkins', 'git', 'html', 'css'];
        const softSkills = ['communication', 'leadership', 'teamwork', 'collaboration', 'problem solving', 'critical thinking', 'project management', 'agile', 'scrum', 'stakeholder', 'mentoring', 'presentation', 'negotiation', 'strategic', 'organizational'];
        const responsibilities = ['design', 'architect', 'develop', 'build', 'implement', 'debug', 'test', 'optimize', 'analyze', 'research', 'manage', 'lead', 'mentor', 'review', 'document', 'maintain', 'improve', 'create'];

        const found = { tech: [], soft: [], responsibilities: [] };

        techSkills.forEach(s => { if (jobDesc.includes(s)) found.tech.push(s); });
        softSkills.forEach(s => { if (jobDesc.includes(s)) found.soft.push(s); });
        responsibilities.forEach(r => { if (jobDesc.includes(r)) found.responsibilities.push(r); });

        return found;
    },

    calculateMatchScore(jobKeywords, userSkillsList, userField, jobDesc) {
        let score = 50;
        const userSkillsLower = userSkillsList.map(s => s.toLowerCase());
        const jobDescLower = jobDesc.toLowerCase();

        // Count how many job tech skills user has
        const userHasTechSkills = jobKeywords.tech.filter(skill =>
            userSkillsLower.some(us => us.includes(skill) || skill.includes(us.split(' ')[0]))
        ).length;

        // More sophisticated tech skill matching
        const techCoverage = jobKeywords.tech.length > 0 ? (userHasTechSkills / jobKeywords.tech.length) : 0;
        if (techCoverage > 0.8) score += 25;
        else if (techCoverage > 0.6) score += 18;
        else if (techCoverage > 0.4) score += 12;
        else if (techCoverage > 0.2) score += 6;
        else if (techCoverage > 0) score += 2;

        // Soft skills - more lenient, assume people have communication
        const userHasSoftSkills = jobKeywords.soft.filter(skill =>
            userSkillsLower.some(us => us.toLowerCase().includes(skill.split(' ')[0].toLowerCase()))
        ).length;
        const softCoverage = jobKeywords.soft.length > 0 ? (userHasSoftSkills / Math.min(jobKeywords.soft.length, 3)) : 0;
        if (softCoverage > 0.5) score += 5;

        // Field relevance - important bonus
        const fieldMatch = userField.toLowerCase();
        if ((fieldMatch.includes('software') || fieldMatch.includes('computer') || fieldMatch.includes('engineering') || fieldMatch.includes('data')) &&
            (jobDescLower.includes('engineer') || jobDescLower.includes('developer') || jobDescLower.includes('scientist') || jobDescLower.includes('analyst'))) {
            score += 15;
        }

        // Years of experience check
        const expMatch = jobDesc.match(/(\d+)\+?\s*(years?|yrs)/i);
        if (expMatch) {
            const reqYears = parseInt(expMatch[1]);
            if (reqYears <= 3) score += 5;
            else if (reqYears <= 5) score += 3;
        }

        return Math.max(35, Math.min(95, score));
    },

    identifySkillGaps(jobKeywords, userSkillsList) {
        const userSkillsLower = userSkillsList.map(s => s.toLowerCase());
        const gaps = [];

        // Identify most important missing tech skills (first 3-4 mentioned in job desc)
        const missingTechSkills = jobKeywords.tech.filter(skill =>
            !userSkillsLower.some(us => us.includes(skill) || skill.includes(us.split(' ')[0]))
        );

        // Prioritize by frequency in job description (more important = more mentioned)
        // Add top missing tech skills
        missingTechSkills.slice(0, 2).forEach(skill => {
            const formatted = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (!gaps.includes(formatted)) gaps.push(formatted);
        });

        // Add missing soft skills if very few matches
        const missingSoftSkills = jobKeywords.soft.filter(skill =>
            !userSkillsLower.some(us => us.toLowerCase().includes(skill.split(' ')[0]))
        );

        if (missingSoftSkills.length > 0 && gaps.length < 3) {
            missingSoftSkills.slice(0, 1).forEach(skill => {
                const formatted = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                if (!gaps.includes(formatted)) gaps.push(formatted);
            });
        }

        return gaps.slice(0, 3);
    },

    getDifficultyLevel(matchScore, gapCount) {
        if (matchScore >= 80) return 'Moderate';
        if (matchScore >= 65) return 'Challenging';
        return 'Advanced';
    },

    extractStrengths(jobKeywords, userSkillsList, userField) {
        const strengths = [];
        const userSkillsLower = userSkillsList.map(s => s.toLowerCase());

        // Add user's relevant skills that match job
        userSkillsList.slice(0, 2).forEach(skill => {
            if (jobKeywords.tech.some(t => skill.toLowerCase().includes(t) || t.includes(skill.toLowerCase().split(' ')[0]))) {
                strengths.push(skill);
            }
        });

        // Add field-specific strengths
        if (userField.includes('software') || userField.includes('computer')) {
            strengths.push('Technical Foundation');
        }
        if (userField.includes('data') || userField.includes('machine')) {
            strengths.push('Analytical Thinking');
        }

        // Generic professional strengths
        if (strengths.length < 3) {
            const genericStrengths = ['Problem Solving', 'Collaboration', 'Learning Agility', 'Communication'];
            genericStrengths.forEach(s => {
                if (strengths.length < 3 && !strengths.includes(s)) {
                    strengths.push(s);
                }
            });
        }

        return strengths.slice(0, 3);
    },

    generateFocusTopics(jobKeywords, gaps, userField) {
        const topics = [];

        // Add top tech skill gap as focus topic
        if (jobKeywords.tech.length > 0) {
            topics.push(jobKeywords.tech[0].charAt(0).toUpperCase() + jobKeywords.tech[0].slice(1) + ' Proficiency');
        }

        // Add soft skill focus
        if (jobKeywords.soft.length > 0) {
            topics.push(jobKeywords.soft[0].charAt(0).toUpperCase() + jobKeywords.soft[0].slice(1));
        }

        // Add role-specific focus
        if (jobKeywords.responsibilities.length > 0) {
            topics.push(jobKeywords.responsibilities[0].charAt(0).toUpperCase() + jobKeywords.responsibilities[0].slice(1) + ' Best Practices');
        }

        // Ensure we have 3 topics
        const fallbacks = ['System Design Patterns', 'STAR Method Storytelling', 'Real-world Problem Solving'];
        fallbacks.forEach(f => {
            if (topics.length < 3 && !topics.includes(f)) {
                topics.push(f);
            }
        });

        return topics.slice(0, 3);
    },

    tryDifferentRole() {
        this.state.job.description = '';
        const jobInput = document.getElementById('job-desc-input');
        if (jobInput) jobInput.value = '';
        const jobSection = document.getElementById('job-input-section');
        const resultsSection = document.getElementById('analysis-results-section');
        if (jobSection) jobSection.classList.remove('hidden');
        if (resultsSection) resultsSection.classList.add('hidden');
    },

    // --- Setup Wizard ---
    selectWizOption(category, value, el) {
        try {
            console.log(`[Wizard] Selecting ${category}: ${value}`);
            
            // Use explicit app reference for state safety
            if (window.app && window.app.state && window.app.state.wizard) {
                window.app.state.wizard[category] = value;
            }

            // Find the parent wizard-step container to clear sibling selections
            const stepContainer = el.closest('.wizard-step');
            if (stepContainer) {
                const options = stepContainer.querySelectorAll('.wizard-option');
                options.forEach(opt => {
                    opt.classList.remove('selected', 'ring-4', 'ring-brand-500/20');
                    // Add a light border back to unselected
                    opt.style.borderColor = '#e2e8f0';
                });
            }
            
            // Apply selection styles to the clicked element
            el.classList.add('selected', 'ring-4', 'ring-brand-500/20');
            el.style.borderColor = '#3b82f6';
            
            // Specific overrides
            if (category === 'mood') window.app.state.interviewerMood = value;
            if (category === 'style') window.app.state.interviewMode = value;

            console.log(`[Wizard] State updated:`, window.app.state.wizard);
        } catch (err) {
            console.error("[Wizard Error] Failed to select option:", err);
        }
    },

    wizardNext() {
        if (this.state.wizard.step === 1 && this.state.wizard.goal === 'specific') {
            this.state.wizard.step = 2;
        } else if (this.state.wizard.step === 1 && this.state.wizard.goal === 'general') {
            this.state.wizard.step = 3;
        } else if (this.state.wizard.step === 2) {
            this.state.wizard.step = 3;
        } else if (this.state.wizard.step === 3) {
            this.state.wizard.step = 4;
        } else if (this.state.wizard.step === 4) {
            this.state.wizard.step = 5;
            this.updateWizardPreview();
        } else if (this.state.wizard.step === 5) {
            this.startWizardInterview();
            return;
        }
        this.renderWizardStep();
    },

    wizardBack() {
        if (this.state.wizard.step === 5) {
            this.state.wizard.step = 4;
        } else if (this.state.wizard.step === 4) {
            this.state.wizard.step = 3;
        } else if (this.state.wizard.step === 3 && this.state.wizard.goal === 'specific') {
            this.state.wizard.step = 2;
        } else if (this.state.wizard.step === 3 && this.state.wizard.goal === 'general') {
            this.state.wizard.step = 1;
        } else if (this.state.wizard.step === 2) {
            this.state.wizard.step = 1;
        }
        this.renderWizardStep();
    },

    renderWizardStep() {
        const step = this.state.wizard.step;
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
        document.getElementById(`wiz-step-${step}`).classList.remove('hidden');
        
        const prog = document.getElementById('wizard-progress');
        if (prog) prog.style.width = `${(step / 5) * 100}%`;

        const backBtn = document.getElementById('wiz-back-btn');
        const nextBtn = document.getElementById('wiz-next-btn');
        
        if (backBtn) backBtn.classList.toggle('invisible', step === 1);
        
        if (nextBtn) {
            if (step === 5) {
                nextBtn.innerHTML = 'Start Interview <i data-lucide="play" class="w-4 h-4 ml-1 inline"></i>';
                nextBtn.classList.add('bg-green-500', 'hover:bg-green-600', 'border-green-600');
                nextBtn.classList.remove('bg-brand-600', 'hover:bg-brand-700');
            } else {
                nextBtn.innerHTML = 'Next <i data-lucide="arrow-right" class="w-4 h-4 ml-1 inline"></i>';
                nextBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'border-green-600');
                nextBtn.classList.add('bg-brand-600', 'hover:bg-brand-700');
            }
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    updateWizardPreview() {
        const styleMap = { 'hr': 'HR / Behavioral', 'technical': 'Technical Deep-Dive', 'project': 'Project Deep-Dive', 'friendly': 'Friendly / Relaxed' };
        const moodMap = { 'professional': 'Professional', 'friendly': 'Friendly', 'hard': 'Challenging', 'casual': 'Casual' };
        const contextMap = { 'specific': 'Specific Job', 'general': 'General Practice' };
        
        const styleEl = document.getElementById('wiz-prev-style');
        const moodEl = document.getElementById('wiz-prev-mood');
        const contextEl = document.getElementById('wiz-prev-context');
        
        if (styleEl) styleEl.textContent = styleMap[this.state.wizard.style] || 'HR / Behavioral';
        if (moodEl) moodEl.textContent = moodMap[this.state.wizard.mood] || 'Professional';
        if (contextEl) contextEl.textContent = contextMap[this.state.wizard.goal] || 'Specific Job';
    },

    startWizardInterview() {
        this.state.interviewMode = this.state.wizard.style;
        this.state.interviewerMood = this.state.wizard.mood;
        const jobDescInput = document.getElementById('wiz-job-desc');
        this.state.job.description = (this.state.wizard.goal === 'specific' && jobDescInput) ? jobDescInput.value : 'General role matching the student profile.';
        this.startInterview();
    },

    showModeSelection() {
        const score = this.state.analysis.matchScore;
        const recommended = score >= 75 ? 'technical' : score >= 55 ? 'hr' : 'friendly';
        document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('ring-2', 'ring-brand-500'));
        const rec = document.getElementById(`mode-card-${recommended}`);
        if (rec) rec.classList.add('ring-2', 'ring-brand-500');
        document.querySelectorAll('.mode-recommended-badge').forEach(b => b.classList.add('hidden'));
        const badge = document.getElementById(`badge-${recommended}`);
        if (badge) badge.classList.remove('hidden');
        this.goToStage(3);
    },

    selectMode(mode) {
        this.state.interviewMode = mode;
        this.startInterview();
    },

    // --- Realistic Job Interview System ---
    // Technical question library for different domains
    technicalQuestionLibrary() {
        return {
            python: [
                "How would you read a CSV file with pandas and handle missing values?",
                "Can you explain the difference between a list and a dictionary in Python?",
                "How would you write a function to remove duplicates from a list?",
                "What's the difference between == and is in Python?",
                "How would you use list comprehension to filter data?"
            ],
            sql: [
                "How would you write a SQL query to find duplicate records in a table?",
                "What's the difference between a LEFT JOIN and an INNER JOIN?",
                "How would you use GROUP BY and HAVING to summarize data?",
                "Can you explain what an aggregate function like COUNT, SUM, or AVG does?",
                "How would you optimize a slow SQL query?"
            ],
            excel: [
                "How would you use VLOOKUP or INDEX-MATCH to find data in Excel?",
                "Can you explain how you would create a pivot table to summarize sales data?",
                "How would you use conditional formatting to highlight important values?",
                "What formulas would you use to clean data with inconsistent formatting?",
                "How would you calculate summary statistics like mean, median, and standard deviation?"
            ],
            dataVisualization: [
                "When would you use a bar chart versus a line chart?",
                "How would you design a dashboard for a sales manager?",
                "What makes a visualization effective for a non-technical audience?",
                "How would you handle outliers when creating a visualization?",
                "What's important when choosing colors and scales for a chart?"
            ],
            statistics: [
                "Can you explain what correlation means and how it's different from causation?",
                "How would you identify outliers in a dataset?",
                "What's the difference between mean, median, and mode?",
                "When would you use a hypothesis test?",
                "How would you explain statistical significance to a business stakeholder?"
            ],
            dataAnalysis: [
                "Walk me through your process for analyzing a new dataset.",
                "How would you approach a problem where the data shows something unexpected?",
                "Can you describe a time you found an error in data and how you handled it?",
                "How do you validate that your analysis is correct?",
                "What tools and techniques do you use to explore data quickly?"
            ]
        };
    },

    // Question templates for different interview types
    behavioralQuestionTemplates() {
        return [
            "Tell me about a time when you had to work with incomplete or messy data. How did you handle it?",
            "Describe a situation where you had to explain a technical concept to someone without a technical background.",
            "Can you give me an example of when you identified a problem in a process and how you solved it?",
            "Tell me about a time when you had to prioritize multiple tasks. How did you decide what to focus on?",
            "Describe a situation where your first approach didn't work. What did you do?",
            "Can you tell me about a time when you received critical feedback? How did you respond?",
            "Tell me about a project where you had to collaborate with others. What was your role?",
            "Describe a time when you had to learn something new quickly. How did you approach it?"
        ];
    },

    // Scenario-based questions for different roles
    scenarioQuestionTemplates() {
        return {
            dataRole: [
                "You receive a dataset that shows a sudden drop in key metrics last week. Walk me through how you would investigate.",
                "A manager wants to understand why one region is underperforming compared to others. What data would you look at?",
                "You notice that two different reports from the same data show different numbers. How would you find the discrepancy?",
                "You're asked to create a dashboard for executives who want to monitor real-time performance. What would you include?"
            ],
            adminRole: [
                "A staff member asks you to create a new process for reporting hours. How would you approach this?",
                "You discover that important patient/client records are disorganized. How would you fix this?",
                "You need to schedule complex meetings with multiple people. How would you organize this efficiently?",
                "Someone questions a process you implemented. How would you respond?"
            ],
            communicationRole: [
                "You need to explain a complex policy change to team members who are resistant. How would you approach this?",
                "A client is upset with a service. How would you handle the conversation?",
                "You need to present data to a group with mixed technical knowledge. How would you structure it?",
                "You're coordinating a project across multiple departments. How would you keep everyone informed?"
            ]
        };
    },

    // Analyze job description to extract key requirements
    analyzeJobDescription() {
        const jobDesc = this.state.job.description.toLowerCase();
        const skills = {
            python: jobDesc.includes('python'),
            sql: jobDesc.includes('sql'),
            excel: jobDesc.includes('excel') || jobDesc.includes('spreadsheet'),
            dataVisualization: jobDesc.includes('dashboard') || jobDesc.includes('visualization') || jobDesc.includes('tableau') || jobDesc.includes('power bi'),
            statistics: jobDesc.includes('statistical') || jobDesc.includes('statistics'),
            communication: jobDesc.includes('communication') || jobDesc.includes('stakeholder'),
            teamwork: jobDesc.includes('team') || jobDesc.includes('collaboration'),
            problemSolving: jobDesc.includes('problem') || jobDesc.includes('analytical'),
            leadership: jobDesc.includes('lead') || jobDesc.includes('manage'),
            timeManagement: jobDesc.includes('priorit') || jobDesc.includes('multitask')
        };

        const roleType = this.determineRoleType(jobDesc);
        return { skills, roleType };
    },

    determineRoleType(jobDesc) {
        if (jobDesc.includes('data') || jobDesc.includes('analysis') || jobDesc.includes('analyst')) return 'dataRole';
        if (jobDesc.includes('admin') || jobDesc.includes('administrative') || jobDesc.includes('office')) return 'adminRole';
        if (jobDesc.includes('project') || jobDesc.includes('manager')) return 'managerRole';
        if (jobDesc.includes('sales') || jobDesc.includes('account') || jobDesc.includes('customer')) return 'communicationRole';
        if (jobDesc.includes('marketing')) return 'marketingRole';
        return 'generalRole';
    },

    // Detect if user is asking for clarification
    isClarificationRequest(text) {
        const clarificationPatterns = [
            /what do you mean|can you clarify|can you explain|what are you asking|do you mean|repeat that|didn't understand|i'm not sure i understood|are you asking about|could you rephrase|one more time/i
        ];
        return clarificationPatterns.some(pattern => pattern.test(text));
    },

    getTranscribedAnswer() {
        const editArea = document.getElementById('int-answer-area');
        return editArea ? editArea.value.trim() : '';
    },

    clearAnswer() {
        const editArea = document.getElementById('int-answer-area');
        if (editArea) editArea.value = '';
    },

    submitInterviewAnswer() {
        this.handleNextQuestion();
    },

    toggleDictation() {
        const micBtn = document.getElementById('int-mic-btn');
        const micLabel = document.getElementById('int-mic-label');

        if (this.state.interview.isListening) {
            this.stopListening();
            if (micLabel) micLabel.textContent = 'Dictate';
            if (micBtn) micBtn.classList.remove('bg-red-50', 'text-red-600', 'border-red-200');
        } else {
            this.startListening();
            if (micLabel) micLabel.textContent = 'Listening...';
            if (micBtn) micBtn.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
        }
    },

    updateTranscriptDisplay() {
        const editArea = document.getElementById('int-answer-area');
        if (editArea && this.state.transcriptState.final) {
            editArea.value = this.state.transcriptState.final + this.state.transcriptState.interim;
            editArea.scrollTop = editArea.scrollHeight;
        }
    },

    updateInterviewProgress() {
        const timeline = document.getElementById('int-progress-timeline');
        if (!timeline) return;

        const currentIdx = this.state.interview.currentQuestionIndex;
        const total = 6;
        let html = '';

        for (let i = 0; i < total; i++) {
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;

            let icon = 'circle';
            let colorCls = 'bg-slate-800 border-slate-700 text-slate-500';

            if (isPast) {
                icon = 'check';
                colorCls = 'bg-brand-500 border-brand-500 text-white';
            } else if (isCurrent) {
                icon = 'loader';
                colorCls = 'bg-slate-800 border-brand-500 text-brand-500 ring-4 ring-brand-500/20';
            }

            html += `
                <div class="relative flex items-center gap-4">
                    <div class="w-6 h-6 rounded-full border-2 ${colorCls} flex items-center justify-center relative z-10 shrink-0">
                        <i data-lucide="${icon}" class="w-3 h-3 ${isCurrent ? 'animate-spin' : ''}"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold ${isCurrent ? 'text-white' : (isPast ? 'text-slate-300' : 'text-slate-500')}">Question ${i + 1}</p>
                    </div>
                </div>
            `;
        }
        timeline.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- Interview Logic ---
    askQuestion() {
        const qText = document.getElementById('interviewer-question-text');
        const counter = document.getElementById('int-q-counter');
        const typeLabel = document.getElementById('int-type-label');
        const nextBtn = document.getElementById('int-submit-btn');
        const editArea = document.getElementById('int-answer-area');

        const currentQ = this.state.interview.questions[this.state.interview.currentQuestionIndex];

        if (qText) qText.textContent = currentQ;
        
        if (typeof Logger !== 'undefined') {
            Logger.logQuestion(this.state.interview.currentQuestionIndex + 1, currentQ, this.state.interviewMode);
        }
        
        this.state.interview.questionStartTime = new Date();

        if (counter) {
            const count = this.state.interview.currentQuestionIndex + 1;
            counter.textContent = `Question ${count} of 6`;
        }
        if (typeLabel) {
            typeLabel.textContent = this.state.interviewMode + ' Interview';
        }

        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = 'Submit Answer <i data-lucide="send" class="w-4 h-4 ml-1 inline"></i>';
        }

        if (editArea) {
            editArea.value = '';
            editArea.focus();
        }

        this.updateInterviewProgress();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    showAIBridge(data, callback) {
        if (callback) callback();
    },

    async skipQuestion() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        this.stopListening();
        const nextBtn = document.getElementById('int-submit-btn');
        const qText = document.getElementById('interviewer-question-text');

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Skipping...';
        }
        if (qText) qText.textContent = 'Generating next question...';

        const previousQuestion = this.state.interview.questions[this.state.interview.currentQuestionIndex];

        const answer = "(Student skipped this question)";
        this.state.interview.latestAnswer = answer;
        this.state.interview.previousQuestion = previousQuestion;
        this.state.interview.transcript.push({ role: "user", content: answer });

        if (typeof Logger !== 'undefined') {
            const duration = Math.round((new Date() - this.state.interview.questionStartTime) / 1000);
            Logger.logAnswer(this.state.interview.currentQuestionIndex + 1, answer, duration);
        }

        const messages = this.state.interview.transcript.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const aiMessage = await this.callModelAPI(messages, this.getInterviewSystemPrompt());

        if (aiMessage) {
            this.state.interview.responses.push({ question: previousQuestion, answer, feedback: "Skipped" });
            this.state.interview.transcript.push({ role: "assistant", content: aiMessage });
            this.state.interview.askedQuestions.push(aiMessage);

            this.state.interview.questions.push(aiMessage);
            this.state.interview.currentQuestionIndex++;
            this.resetTranscriptState();

            if (aiMessage.toLowerCase().includes("thank you for your time") || this.state.interview.currentQuestionIndex > 5) {
                this.goToStage(5);
                setTimeout(() => {
                    this.generateFinalReport();
                }, 2000);
            } else {
                this.askQuestion();
            }
        } else {
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Submit Answer <i data-lucide="send" class="w-4 h-4 ml-1 inline"></i>';
            }
        }
    },

    async handleNextQuestion() {
        const answer = this.getTranscribedAnswer();
        if (!answer || answer.length < 5) return;

        this.stopListening();
        const nextBtn = document.getElementById('int-submit-btn');
        const qText = document.getElementById('interviewer-question-text');

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Crafting next question...';
        }

        const previousQuestion = this.state.interview.questions[this.state.interview.currentQuestionIndex];

        this.state.interview.latestAnswer = answer;
        this.state.interview.previousQuestion = previousQuestion;
        this.state.interview.transcript.push({ role: "user", content: answer });

        if (typeof Logger !== 'undefined') {
            const duration = Math.round((new Date() - this.state.interview.questionStartTime) / 1000);
            Logger.logAnswer(this.state.interview.currentQuestionIndex + 1, answer, duration);
        }

        if (qText) qText.textContent = 'Crafting next question...';
        
        const messages = this.state.interview.transcript.map(msg => ({ role: msg.role, content: msg.content }));

        const aiMessage = await this.callModelAPI(messages, this.getInterviewSystemPrompt());

        if (aiMessage) {
            this.state.interview.responses.push({ question: previousQuestion, answer, feedback: "Analyzed" });
            this.state.interview.transcript.push({ role: "assistant", content: aiMessage });
            this.state.interview.askedQuestions.push(aiMessage);

            this.state.interview.questions.push(aiMessage);
            this.state.interview.currentQuestionIndex++;
            this.resetTranscriptState();

            if (aiMessage.toLowerCase().includes("thank you for your time") || this.state.interview.currentQuestionIndex > 5) {
                this.goToStage(5);
                setTimeout(() => {
                    this.generateFinalReport();
                }, 2000);
            } else {
                this.askQuestion();
            }
        } else {
            if (qText) qText.textContent = 'AI Generation failed. Check connection.';
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Submit Answer <i data-lucide="send" class="w-4 h-4 ml-1 inline"></i>';
            }
        }
    },

    async startInterview() {
        // Reset Stateful Interview Object
        this.state.interview = {
            currentQuestionIndex: 0,
            questions: [],
            responses: [],
            startTime: new Date(),
            isListening: false,
            awaitingFollowUp: false,
            previousQuestion: '',
            latestAnswer: '',
            transcript: [],
            askedQuestions: []
        };

        const statusEl = document.getElementById('interviewer-status');
        if (statusEl) statusEl.textContent = 'Starting interview...';

        if (typeof Logger !== 'undefined') {
            Logger.logInterviewStart(this.state.user, this.state.interviewMode, this.state.job.description);
        }

        const opening = await this.callModelAPI(
            "Start the interview. Introduce yourself briefly and ask the first question.", 
            this.getInterviewSystemPrompt()
        );

        if (opening) {
            this.state.interview.questions.push(opening);
            this.state.interview.transcript.push({ role: "assistant", content: opening });
            this.state.interview.askedQuestions.push(opening);
        } else {
            const fallback = `Hi! Tell me about yourself and your background in ${this.state.user.field}.`;
            this.state.interview.questions.push(fallback);
            this.state.interview.transcript.push({ role: "assistant", content: fallback });
            this.state.interview.askedQuestions.push(fallback);
        }

        this.goToStage(4);
        this.resetTranscriptState();
        setTimeout(() => this.askQuestion(), 400);
    },
    async generateFinalReport() {
        const responses = this.state.interview.responses;
        const transcript = responses.map(r => `Interviewer: ${r.question}\nCandidate: ${r.answer}`).join('\n');
        
        const reportPrompt = `
            The interview is complete. Analyze the following transcript and provide a detailed career coach evaluation.
            
            TRANSCRIPT:
            ${transcript}
            
            Follow these rules for the evaluation:
            1. Overall score: X/10
            2. Strong points: List 3 key strengths.
            3. Needs improvement: List 3 specific areas to work on.
            4. Action plan: Create 3 practical tasks for them to improve before their next interview.
            5. Best answer: Mention which answer was best and why.
            6. Weakest answer: Mention which answer was weakest and how to improve it gently.
            7. Practical improvement: Rewrite the weakest answer using the STAR method (Situation, Task, Action, Result) as an example.
            
            Format your response as a JSON object:
            {
                "score": number,
                "strengths": ["string", "string", "string"],
                "improvements": ["string", "string", "string"],
                "actionPlan": ["string", "string", "string"],
                "bestAnswer": "string",
                "weakestAnswer": "string",
                "starExample": "string"
            }
        `;

        const statusEl = document.getElementById('completion-status-text');
        if (statusEl) statusEl.textContent = 'Analyzing your performance...';

        const aiReportRaw = await this.callModelAPI(reportPrompt, "You are an expert career coach. Always respond in valid JSON.", true);
        
        try {
            const jsonMatch = aiReportRaw.match(/\{[\s\S]*\}/);
            const aiReport = JSON.parse(jsonMatch ? jsonMatch[0] : aiReportRaw);

            const el = (id) => document.getElementById(id);
            
            if (el('rep-score')) el('rep-score').textContent = aiReport.score;
            if (el('rep-score-label')) {
                const s = aiReport.score;
                el('rep-score-label').textContent = s >= 9 ? 'Excellent' : (s >= 7 ? 'Good' : (s >= 5 ? 'Needs Practice' : 'Beginner'));
            }
            if (el('rep-strengths')) el('rep-strengths').innerHTML = (aiReport.strengths || []).map(s => `<li><i data-lucide="check" class="w-3.5 h-3.5 text-green-500 inline mr-1"></i> ${s}</li>`).join('');
            if (el('rep-weaknesses')) el('rep-weaknesses').innerHTML = (aiReport.improvements || []).map(i => `<li><i data-lucide="x" class="w-3.5 h-3.5 text-orange-400 inline mr-1"></i> ${i}</li>`).join('');
            if (el('rep-action-plan')) el('rep-action-plan').innerHTML = (aiReport.actionPlan || aiReport.improvements || []).map(a => `<li class="flex gap-2 items-start"><i data-lucide="arrow-right-circle" class="w-4 h-4 text-brand-500 mt-0.5 shrink-0"></i> <span>${a}</span></li>`).join('');
            
            if (el('rep-best-answer')) el('rep-best-answer').textContent = `"${aiReport.bestAnswer}"`;
            if (el('rep-worst-answer')) el('rep-worst-answer').textContent = `"${aiReport.weakestAnswer}"`;
            if (el('rep-star-example')) el('rep-star-example').textContent = aiReport.starExample;

            const qReviewContainer = el('rep-q-review');
            if (qReviewContainer) {
                qReviewContainer.innerHTML = responses.map((r, i) => {
                    const noResponse = !r.answer || r.answer.length < 5 || r.answer.includes("skipped");
                    return `
                        <div class="card space-y-3">
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Question ${i+1}</p>
                            <p class="text-sm font-bold text-slate-800 leading-relaxed">${r.question}</p>
                            <div class="bg-slate-50 p-4 rounded-xl border-l-4 ${noResponse ? 'border-orange-300 italic text-slate-400' : 'border-brand-500 text-slate-700'} text-sm leading-relaxed">
                                ${noResponse ? 'Skipped or no response recorded.' : r.answer}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            this.saveSession(aiReport);

            if (typeof Logger !== 'undefined') {
                const totalDuration = Math.round((new Date() - this.state.interview.startTime) / 1000);
                Logger.logInterviewComplete(aiReport, aiReport.improvements?.join(', '), totalDuration);
            }

            // Show continue button on completion screen
            if (statusEl) statusEl.textContent = 'Analysis Complete!';
            const continueBtn = document.getElementById('btn-continue-report');
            if (continueBtn) continueBtn.classList.remove('hidden');

        } catch (e) {
            console.error("Failed to parse AI report:", e);
            if (statusEl) statusEl.textContent = 'Analysis failed. Please try again.';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    handleReportContinue() {
        this.showInsights();
    },

    showInsights() {
        const el = (id) => document.getElementById(id);
        const name = this.state.user.name || 'User';
        const firstName = name.split(' ')[0];

        if (el('insights-user-name')) el('insights-user-name').textContent = `${firstName}'s AI Insights`;
        
        // Populate random/mock market value for fun
        if (el('insights-market-value')) {
            const baseValue = 85000;
            const extra = this.state.sessions.length * 1500;
            const value = baseValue + extra;
            el('insights-market-value').textContent = `$${value.toLocaleString()}`;
        }

        this.goToStage(8);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    saveSession(aiReport) {
        this.state.sessions.unshift({
            date: new Date().toLocaleDateString(),
            mode: this.state.interviewMode,
            score: aiReport.score,
            field: this.state.user.field,
            strengths: aiReport.strengths || [],
            weaknesses: aiReport.improvements || [],
            actionPlan: aiReport.actionPlan || [],
            bestAnswer: aiReport.bestAnswer || '',
            weakestAnswer: aiReport.weakestAnswer || '',
            starExample: aiReport.starExample || '',
            responses: JSON.parse(JSON.stringify(this.state.interview.responses))
        });
        this.saveUserData();
    },

    // --- Practice ---
    async startPractice() {
        const el = (id) => document.getElementById(id);
        const latestSession = this.state.sessions[0];
        const weakness = (latestSession && latestSession.weaknesses && latestSession.weaknesses.length > 0) 
                         ? latestSession.weaknesses[0] 
                         : "General Communication";

        this.state.currentPracticeWeakness = weakness;

        // Reset UI
        if (el('practice-weakness-name')) el('practice-weakness-name').textContent = weakness;
        if (el('practice-answer-input')) el('practice-answer-input').value = '';
        if (el('practice-feedback-container')) el('practice-feedback-container').classList.add('hidden');
        if (el('practice-container')) el('practice-container').classList.add('hidden');
        if (el('practice-loading')) el('practice-loading').classList.remove('hidden');

        this.goToStage(7);

        try {
            const prompt = `
                The student wants to practice their weakest area: "${weakness}".
                Based on this area, generate ONE specific, challenging interview question that would help them improve.
                
                Respond with ONLY the question text.
            `;
            
            const question = await this.callModelAPI(prompt, "You are an expert career coach helping a student improve a specific interview weakness.");
            
            if (el('practice-question')) el('practice-question').textContent = question || `How do you specifically handle challenges related to ${weakness}?`;
            
            if (el('practice-loading')) el('practice-loading').classList.add('hidden');
            if (el('practice-container')) el('practice-container').classList.remove('hidden');
        } catch (err) {
            console.error("Failed to generate practice question:", err);
            if (el('practice-question')) el('practice-question').textContent = `Can you give me an example of how you've demonstrated strong ${weakness} in the past?`;
            if (el('practice-loading')) el('practice-loading').classList.add('hidden');
            if (el('practice-container')) el('practice-container').classList.remove('hidden');
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async submitPracticeAnswer() {
        const el = (id) => document.getElementById(id);
        const answer = el('practice-answer-input')?.value.trim();
        if (!answer || answer.length < 5) return alert("Please type a more detailed response.");

        const btn = el('btn-submit-practice');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Analyzing...';
        }

        try {
            const prompt = `
                The student is practicing their growth area: "${this.state.currentPracticeWeakness}".
                
                QUESTION ASKED: ${el('practice-question').textContent}
                STUDENT ANSWER: ${answer}
                
                Provide a brief, encouraging, and highly actionable evaluation of this answer. 
                Point out one thing they did well and one specific thing they could still improve.
                Keep it under 100 words.
            `;
            
            const feedback = await this.callModelAPI(prompt, "You are an expert career coach providing instant feedback on a practice answer.");
            
            if (el('practice-feedback-text')) el('practice-feedback-text').innerHTML = `<p>${feedback.replace(/\n/g, '<br>')}</p>`;
            if (el('practice-feedback-container')) el('practice-feedback-container').classList.remove('hidden');
            
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } catch (err) {
            console.error("Failed to analyze practice answer:", err);
            alert("Connection error. Please try again.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Analyze Performance <i data-lucide="sparkles" class="w-4 h-4 group-hover:rotate-12 transition-transform"></i>';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    openLatestReport() {
        if (this.state.sessions.length > 0) {
            this.loadSessionReport(0);
        }
    },

    loadSessionReport(index) {
        const s = this.state.sessions[index];
        if (!s) return;

        const el = (id) => document.getElementById(id);
        
        // Switch to report stage
        this.goToStage(6);

        // Populate values
        if (el('rep-score')) el('rep-score').textContent = s.score;
        if (el('rep-score-label')) {
            el('rep-score-label').textContent = s.score >= 9 ? 'Excellent' : (s.score >= 7 ? 'Good' : (s.score >= 5 ? 'Needs Practice' : 'Beginner'));
        }
        
        if (el('rep-strengths')) el('rep-strengths').innerHTML = (s.strengths || []).map(str => `<li><i data-lucide="check" class="w-3.5 h-3.5 text-green-500 inline mr-1"></i> ${str}</li>`).join('');
        if (el('rep-weaknesses')) el('rep-weaknesses').innerHTML = (s.weaknesses || []).map(w => `<li><i data-lucide="x" class="w-3.5 h-3.5 text-orange-400 inline mr-1"></i> ${w}</li>`).join('');
        if (el('rep-action-plan')) el('rep-action-plan').innerHTML = (s.actionPlan || s.weaknesses || []).map(a => `<li class="flex gap-2 items-start"><i data-lucide="arrow-right-circle" class="w-4 h-4 text-brand-500 mt-0.5 shrink-0"></i> <span>${a}</span></li>`).join('');
        
        if (el('rep-best-answer')) el('rep-best-answer').textContent = s.bestAnswer ? `"${s.bestAnswer}"` : "N/A";
        if (el('rep-worst-answer')) el('rep-worst-answer').textContent = s.weakestAnswer ? `"${s.weakestAnswer}"` : "N/A";
        if (el('rep-star-example')) el('rep-star-example').textContent = s.starExample || "N/A";

        const qReviewContainer = el('rep-q-review');
        if (qReviewContainer && s.responses) {
            qReviewContainer.innerHTML = s.responses.map((r, i) => {
                const noResponse = !r.answer || r.answer.length < 5 || r.answer.includes("skipped");
                return `
                    <div class="card space-y-3">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Question ${i+1}</p>
                        <p class="text-sm font-bold text-slate-800 leading-relaxed">${r.question}</p>
                        <div class="bg-slate-50 p-4 rounded-xl border-l-4 ${noResponse ? 'border-orange-300 italic text-slate-400' : 'border-brand-500 text-slate-700'} text-sm leading-relaxed">
                            ${noResponse ? 'Skipped or no response recorded.' : r.answer}
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- Dashboard ---
    showDashboard() {
        const el = (id) => document.getElementById(id);
        const name = this.state.user.name || 'Guest';
        const firstName = name.split(' ')[0];

        if (el('dash-greeting')) el('dash-greeting').textContent = `Hi ${firstName} — let's get you interview-ready.`;
        if (el('nav-user-avatar')) el('nav-user-avatar').textContent = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        // Profile Completeness
        let pct = 0;
        let missing = [];
        if (this.state.user.name) pct += 20; else missing.push('Name');
        if (this.state.user.field) pct += 20;
        if (this.state.user.skills) pct += 20; else missing.push('Skills');
        if (this.state.user.courses) pct += 20;
        if (this.state.user.experience) pct += 20; else missing.push('Projects');
        
        if (el('dash-profile-pct')) el('dash-profile-pct').textContent = `${pct}%`;
        if (el('dash-profile-bar')) el('dash-profile-bar').style.width = `${pct}%`;
        
        if (el('dash-profile-missing')) {
            if (missing.length === 0) {
                el('dash-profile-missing').innerHTML = `<li class="flex items-center gap-2 text-green-600 font-bold uppercase text-[9px] tracking-widest"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Profile Complete</li>`;
            } else {
                el('dash-profile-missing').innerHTML = missing.map(m => `<li class="flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-widest"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> ${m}</li>`).join('');
            }
        }

        // Readiness Score Card
        const hasInterviews = this.state.sessions.length > 0;
        if (!hasInterviews) {
            if (el('dash-readiness-score')) el('dash-readiness-score').textContent = "--";
            if (el('dash-readiness-score')) el('dash-readiness-score').className = "text-6xl font-black text-slate-200 tracking-tighter";
            if (el('dash-readiness-desc')) el('dash-readiness-desc').textContent = "Complete an interview to unlock your score.";
            if (el('dash-score-btn')) el('dash-score-btn').textContent = "Start interview";
        } else {
            const avgScore = Math.round(this.state.sessions.slice(0, 3).reduce((acc, s) => acc + s.score, 0) / Math.min(this.state.sessions.length, 3) * 10);
            if (el('dash-readiness-score')) {
                el('dash-readiness-score').textContent = avgScore;
                el('dash-readiness-score').className = "text-6xl font-black text-brand-600 tracking-tighter";
            }
            if (el('dash-readiness-desc')) el('dash-readiness-desc').textContent = `Based on your last ${Math.min(this.state.sessions.length, 3)} sessions.`;
            if (el('dash-score-btn')) el('dash-score-btn').textContent = "View reports";
        }

        // Focus Area Card
        if (!hasInterviews) {
            if (el('dash-focus-area-title')) el('dash-focus-area-title').textContent = "Focus Area";
            if (el('dash-focus-area-desc')) el('dash-focus-area-desc').textContent = "Complete your first interview to see your focus areas.";
            if (el('dash-focus-btn')) el('dash-focus-btn').textContent = "Practice this";
        } else {
            const latest = this.state.sessions[0];
            if (latest.weaknesses && latest.weaknesses.length > 0) {
                if (el('dash-focus-area-title')) el('dash-focus-area-title').textContent = latest.weaknesses[0];
                if (el('dash-focus-area-desc')) el('dash-focus-area-desc').textContent = "Work on this specific area to improve your overall readiness score.";
                if (el('dash-focus-btn')) el('dash-focus-btn').textContent = "Practice this";
            }
        }

        // Recommended Next Session Card
        if (!hasInterviews) {
            if (el('dash-session-suggestion-title')) el('dash-session-suggestion-title').textContent = "Start an Interview";
            if (el('dash-session-suggestion-desc')) el('dash-session-suggestion-desc').textContent = "Start a general practice session to get your baseline score.";
            if (el('dash-suggestion-btn')) el('dash-suggestion-btn').textContent = "Start now";
        } else {
            const latest = this.state.sessions[0];
            let nextMode = 'technical';
            let recommendation = 'Technical Round';
            let reason = 'Based on your field, a technical deep-dive is recommended.';
            
            if (latest.mode === 'technical') {
                nextMode = 'hr';
                recommendation = 'Behavioral Round';
                reason = 'You recently did a technical round. Let\'s polish your behavioral answers.';
            } else if (latest.mode === 'hr') {
                nextMode = 'project';
                recommendation = 'Project Deep-Dive';
                reason = 'Time to drill down into the specifics of your past projects.';
            }

            if (el('dash-session-suggestion-title')) el('dash-session-suggestion-title').textContent = "Start an Interview";
            if (el('dash-session-suggestion-desc')) el('dash-session-suggestion-desc').textContent = `Recommended: ${recommendation}. ${reason}`;
            if (el('dash-suggestion-btn')) el('dash-suggestion-btn').textContent = "Start session";
            if (el('dash-suggestion-btn')) el('dash-suggestion-btn').onclick = () => {
                this.state.wizard.style = nextMode;
                this.goToStage(3);
            };
        }

        // Recent Interview
        if (hasInterviews) {
            const latest = this.state.sessions[0];
            if (el('dash-recent-interview')) el('dash-recent-interview').classList.remove('hidden');
            if (el('dash-recent-interview')) el('dash-recent-interview').classList.add('flex');
            if (el('dash-no-recent')) el('dash-no-recent').classList.add('hidden');
            
            if (el('dash-recent-type')) el('dash-recent-type').textContent = latest.mode;
            if (el('dash-recent-date')) el('dash-recent-date').textContent = latest.date;
            if (el('dash-recent-job')) el('dash-recent-job').textContent = latest.field;
            if (el('dash-recent-score')) el('dash-recent-score').textContent = `${latest.score}/10`;
        } else {
            if (el('dash-recent-interview')) {
                el('dash-recent-interview').classList.add('hidden');
                el('dash-recent-interview').classList.remove('flex');
            }
            if (el('dash-no-recent')) el('dash-no-recent').classList.remove('hidden');
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.goToStage(1);
    },

    // --- History ---
    showHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;

        if (this.state.sessions.length > 0) {
            list.innerHTML = this.state.sessions.map((s, i) => `
                <div class="group p-6 bg-white rounded-3xl shadow-soft border border-slate-100 hover:border-brand-200 transition-all cursor-default relative">
                    <button onclick="window.app.deleteSession(${i})" class="absolute top-4 right-4 w-8 h-8 bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" title="Delete Session">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    <div class="flex items-center justify-between mb-4 mr-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0">
                                <i data-lucide="message-square" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${s.date} &bull; ${s.mode}</p>
                                <p class="text-base font-black text-brand-900">${s.field}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="text-right">
                                <p class="text-2xl font-black text-brand-500">${s.score}<span class="text-sm opacity-40">/10</span></p>
                                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Score</p>
                            </div>
                            <button onclick="window.app.loadSessionReport(${i})" class="btn-primary py-2.5 px-6 text-[10px] uppercase tracking-widest rounded-xl shadow-lg">View Report</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-6 border-t border-slate-50 pt-6">
                        <div>
                            <p class="text-[9px] font-bold text-green-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1"><i data-lucide="arrow-up-circle" class="w-3 h-3"></i> Top Strength</p>
                            <p class="text-xs text-slate-500 font-medium">${s.strengths && s.strengths.length > 0 ? s.strengths[0] : 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Top Focus Area</p>
                            <p class="text-xs text-slate-500 font-medium">${s.weaknesses && s.weaknesses.length > 0 ? s.weaknesses[0] : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `
                <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                    <i data-lucide="ghost" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                    <p class="text-slate-500 font-medium">No interviews completed yet.</p>
                </div>
            `;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    deleteSession(index) {
        if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
        
        this.state.sessions.splice(index, 1);
        this.saveUserData();
        this.showHistory();
        
        // Show a brief status message if possible
        const statusEl = document.getElementById('history-status');
        if (statusEl) {
            statusEl.textContent = 'Session deleted.';
            statusEl.classList.remove('hidden');
            setTimeout(() => statusEl.classList.add('hidden'), 3000);
        }
    },

    // --- Live Speech Transcription ---
    initSpeech() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { this.recognition = null; return; }

        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (e) => {
            let newFinal = '';
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    newFinal += e.results[i][0].transcript + ' ';
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            if (newFinal) this.state.transcriptState.final += newFinal;
            this.state.transcriptState.interim = interim;
            this.updateTranscriptDisplay();
        };

        this.recognition.onerror = (e) => {
            if (e.error === 'not-allowed' || e.error === 'permission-denied') {
                this.setMicState('denied');
                this.showFallbackInput();
            } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
                this.setMicState('error');
            }
        };

        // Auto-restart if recognition ends unexpectedly while still supposed to listen
        this.recognition.onend = () => {
            if (this.state.interview.isListening) {
                try { this.recognition.start(); } catch(err) {}
            }
        };
    },

    updateTranscriptDisplay() {
        const editArea = document.getElementById('int-answer-area');

        const hasFinal = !!this.state.transcriptState.final;
        const hasInterim = !!this.state.transcriptState.interim;

        if (editArea && (hasFinal || hasInterim)) {
            editArea.value = this.state.transcriptState.final + this.state.transcriptState.interim;
            editArea.scrollTop = editArea.scrollHeight;
        }
    },

    setMicState(state) {
        const dot = document.getElementById('mic-state-dot');
        const label = document.getElementById('mic-state-label');
        const wave = document.getElementById('mic-wave');
        const micBtn = document.getElementById('int-mic-btn');
        const micLabel = document.getElementById('int-mic-label');
        const statusEl = document.getElementById('interviewer-status');

        const cfg = {
            idle:       { btnCls: 'bg-white text-slate-600 border-slate-200',   btnLabel: 'Dictate',      status: 'Your turn — type or dictate your response' },
            listening:  { btnCls: 'bg-red-50 text-red-600 border-red-200',       btnLabel: 'Listening...',       status: 'Listening...' },
            processing: { btnCls: 'bg-white text-slate-400 border-slate-100',    btnLabel: 'Dictate',      status: 'Processing...' },
            done:       { btnCls: 'bg-white text-slate-600 border-slate-200',    btnLabel: 'Dictate',  status: 'Response captured' },
            denied:     { btnCls: 'bg-orange-50 text-orange-600 border-orange-200',  btnLabel: 'Mic Denied', status: 'Microphone unavailable — type below' },
            error:      { btnCls: 'bg-orange-50 text-orange-600 border-orange-200',  btnLabel: 'Error - Retry',      status: 'Recognition error' }
        };

        const s = cfg[state] || cfg.idle;
        if (micBtn) {
            micBtn.className = `flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border-2 transition-colors ${s.btnCls}`;
        }
        if (micLabel) micLabel.textContent = s.btnLabel;
        if (statusEl) statusEl.textContent = s.status;
    },

    resetTranscriptState() {
        this.state.transcriptState = { final: '', interim: '', isEditing: false };

        const editArea = document.getElementById('int-answer-area');
        if (editArea) { editArea.value = ''; }
    },

    getTranscribedAnswer() {
        const editArea = document.getElementById('int-answer-area');
        return editArea ? editArea.value.trim() : '';
    },

    toggleListening() {
        this.state.interview.isListening ? this.stopListening() : this.startListening();
    },

    startListening() {
        if (!this.recognition) {
            this.showFallbackInput();
            return;
        }
        this.state.interview.isListening = true;
        try { this.recognition.start(); } catch(e) {}
        this.setMicState('listening');
        const actions = document.getElementById('transcript-actions');
        if (actions) actions.classList.add('hidden');
    },

    stopListening() {
        this.state.interview.isListening = false;
        if (this.recognition) { try { this.recognition.stop(); } catch(e) {} }

        this.state.transcriptState.interim = '';
        this.updateTranscriptDisplay();

        if (this.state.transcriptState.final.trim()) {
            this.setMicState('done');
            const actions = document.getElementById('transcript-actions');
            if (actions) actions.classList.remove('hidden');
        } else {
            this.setMicState('idle');
        }
    },

    reRecord() {
        this.stopListening();
        this.resetTranscriptState();
        this.setMicState('idle');
        setTimeout(() => this.startListening(), 200);
    },

    toggleTranscriptEdit() {
        const el = (id) => document.getElementById(id);
        this.state.transcriptState.isEditing = !this.state.transcriptState.isEditing;

        if (this.state.transcriptState.isEditing) {
            const editArea = el('transcript-edit-area');
            if (editArea) { editArea.value = this.state.transcriptState.final.trim(); editArea.classList.remove('hidden'); }
            if (el('transcript-live')) el('transcript-live').classList.add('hidden');
            if (el('edit-transcript-btn')) el('edit-transcript-btn').innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Done';
        } else {
            const editArea = el('transcript-edit-area');
            if (editArea) { this.state.transcriptState.final = editArea.value; editArea.classList.add('hidden'); }
            if (el('transcript-live')) el('transcript-live').classList.remove('hidden');
            if (el('edit-transcript-btn')) el('edit-transcript-btn').innerHTML = '<i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit';
            this.updateTranscriptDisplay();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    showFallbackInput() {
        this.setMicState('denied');
        this.state.transcriptState.isEditing = true;
        const editArea = document.getElementById('transcript-edit-area');
        const liveDiv = document.getElementById('transcript-live');
        const placeholder = document.getElementById('transcript-placeholder');
        const actions = document.getElementById('transcript-actions');
        if (editArea) { editArea.classList.remove('hidden'); editArea.focus(); }
        if (liveDiv) liveDiv.classList.add('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (actions) actions.classList.remove('hidden');
    },

    // --- Speech Synthesis ---
    speak(text, callback, rate = 0.94) {
        if (!window.speechSynthesis) { if (callback) callback(); return; }
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        ut.voice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.lang.startsWith('en-US')) || voices[0];
        ut.rate = rate; ut.pitch = 1.0;
        const pulseEl = document.getElementById('ai-pulse');
        const statusEl = document.getElementById('interviewer-status');
        ut.onstart = () => { if (pulseEl) pulseEl.classList.add('opacity-100'); if (statusEl) statusEl.textContent = 'Speaking...'; };
        ut.onend = () => { if (pulseEl) pulseEl.classList.remove('opacity-100'); if (callback) callback(); };
        window.speechSynthesis.speak(ut);
    }
};

document.addEventListener('DOMContentLoaded', () => window.app.init());
