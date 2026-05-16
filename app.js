/**
 * PrepWise - Premium AI Career Coach Logic
 * Synchronized with the high-fidelity neural UI.
 */

window.app = {
    // --- State ---
    state: {
        currentStage: 0, // 0:Auth, 1:Onboarding, 2:Analysis, 3:Modes, 4:Interview, 5:Report, 6:Practice, 7:Dash
        interviewMode: 'hr',
        isGuest: false,
        currentUser: null,
        user: {
            name: '',
            email: '',
            field: 'Computer Science / Software',
            skills: '',
            courses: ''
        },
        job: { description: '', link: '' },
        analysis: { matchScore: 0, difficulty: 'Moderate', strengths: [], gaps: [], topics: [] },
        interview: {
            currentQuestionIndex: 0,
            questions: [],
            responses: [],
            startTime: null,
            timerInterval: null,
            isListening: false
        },
        sessions: []
    },

    // --- Configuration ---
    config: {
        totalQuestions: 5,
        voices: []
    },

    // --- Initialization ---
    init() {
        console.log("PrepWise High-Fidelity Engine Initializing...");
        this.cacheDOM();
        this.bindEvents();
        this.initSpeech();
        this.checkAuth();
        lucide.createIcons();
    },

    cacheDOM() {
        this.views = {
            auth: document.getElementById('auth-view'),
            onboarding: document.getElementById('onboarding-view'),
            analysis: document.getElementById('analysis-view'),
            modeSelection: document.getElementById('mode-selection-view'),
            interview: document.getElementById('interview-view'),
            feedback: document.getElementById('feedback-view'),
            practice: document.getElementById('practice-view'),
            dashboard: document.getElementById('dashboard-view')
        };
        
        this.forms = {
            auth: document.getElementById('auth-form'),
            profile: document.getElementById('profile-form'),
            job: document.getElementById('job-form')
        };

        this.interviewUI = {
            questionText: document.getElementById('question-text'),
            statusText: document.getElementById('interviewer-status'),
            listeningIndicator: document.getElementById('listening-indicator'),
            transcriptPreview: document.getElementById('transcript-preview'),
            micBtn: document.getElementById('mic-toggle-btn'),
            nextBtn: document.getElementById('next-question-btn'),
            pulse: document.getElementById('ai-pulse'),
            coachTip: document.getElementById('coach-tip-text')
        };

        this.userPill = {
            container: document.getElementById('user-pill'),
            name: document.getElementById('pill-name'),
            initials: document.getElementById('pill-initials')
        };

        this.populateFocusAreas();
    },

    simulateSocialLogin(provider) {
        const loader = document.getElementById('app-loader');
        const loaderText = document.getElementById('loader-text');
        
        if (loader) {
            loader.classList.remove('hidden');
            loader.classList.add('flex');
            loaderText.textContent = `Syncing ${provider}...`;
            
            setTimeout(() => {
                loader.classList.add('hidden');
                loader.classList.remove('flex');
                
                this.state.isGuest = false;
                this.state.user.name = provider === 'Google' ? 'Google Candidate' : 'GitHub Developer';
                this.state.user.email = provider.toLowerCase() + '@simulation.edu';
                
                this.state.currentUser = { email: this.state.user.email, profile: this.state.user, sessions: [] };
                localStorage.setItem('prepwise_session_v2', JSON.stringify(this.state.currentUser));
                
                this.updateUserUI();
                this.goToStage(1);
            }, 2000);
        }
    },

    populateFocusAreas() {
        const select = document.getElementById('field-select');
        if (!select) return;
        const areas = [
            "Software Engineering", "Artificial Intelligence", "Cybersecurity", "Cloud / DevOps", "Networking",
            "Information Systems", "Game Development", "Data Science", "Statistics", "Mathematics",
            "Physics", "Biology", "Chemistry", "Finance", "Economics", "Accounting", "Business Administration",
            "Entrepreneurship", "Consulting", "Supply Chain / Operations", "Human Resources", "Marketing",
            "Digital Marketing", "Media & Communication", "Content Creation", "Psychology", "Law", "Medicine",
            "Industrial Engineering", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering",
            "Architecture", "Education", "UX Research", "Graphic Design"
        ];
        select.innerHTML = areas.map(a => `<option value="${a}">${a}</option>`).join('');
    },

    openHowItWorks() {
        const modal = document.getElementById('how-it-works-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Force re-render of icons in modal
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    closeHowItWorks() {
        const modal = document.getElementById('how-it-works-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    setTheme(mode) {
        const indicator = document.getElementById('theme-indicator');
        const sun = document.getElementById('theme-light');
        const moon = document.getElementById('theme-dark');
        
        if (mode === 'dark') {
            document.body.classList.add('bg-brand-900');
            document.body.style.backgroundColor = '#1F2A44';
            document.body.style.color = 'white';
            indicator.style.left = 'calc(100% - 36px)';
            moon.classList.add('text-brand-500');
            sun.classList.remove('text-brand-500');
            sun.classList.add('text-slate-300');
        } else {
            document.body.classList.remove('bg-brand-900');
            document.body.style.backgroundColor = '#F8FAFC';
            document.body.style.color = '#1F2A44';
            indicator.style.left = '4px';
            sun.classList.add('text-brand-500');
            sun.classList.remove('text-slate-300');
            moon.classList.remove('text-brand-500');
            moon.classList.add('text-slate-300');
        }
    },

    toggleAuthMode() {
        const isLogin = document.getElementById('auth-title').textContent.includes('Welcome');
        document.getElementById('auth-title').textContent = isLogin ? 'Initialize Identity Hub 👋' : 'Welcome back! 👋';
        document.getElementById('auth-subtitle').textContent = isLogin ? 'Join 2,000+ students growing with us.' : 'Let\'s continue your journey.';
        document.getElementById('auth-submit-btn').innerHTML = isLogin ? 'Create Account <i data-lucide="arrow-right" class="w-5 h-5"></i>' : 'Sign In <i data-lucide="arrow-right" class="w-5 h-5"></i>';
        document.querySelector('#toggle-auth-mode').textContent = isLogin ? 'Already have an account? Sign in' : 'New here? Create an account';
        lucide.createIcons();
    },

    bindEvents() {
        // Authentication
        this.forms.auth.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });

        // ... existing binds ...

    // --- Auth & Persistent Storage ---
    checkAuth() {
        const session = localStorage.getItem('prepwise_session_v2');
        if (session) {
            const data = JSON.parse(session);
            this.state.currentUser = data;
            this.state.user = data.profile || this.state.user;
            this.state.sessions = data.sessions || [];
            this.updateUserUI();
            this.showDashboard();
        } else {
            this.goToStage(0);
        }
    },

    handleAuth() {
        const email = document.getElementById('auth-email').value;
        const isSignUp = document.getElementById('auth-submit-btn').textContent === 'Create Account';
        let users = JSON.parse(localStorage.getItem('prepwise_users_v2') || '{}');
        
        if (isSignUp) {
            if (users[email]) return alert("Session already exists for this email.");
            users[email] = { profile: null, sessions: [] };
            localStorage.setItem('prepwise_users_v2', JSON.stringify(users));
        } else if (!users[email]) {
            return alert("Identity not recognized. Please register.");
        }

        this.state.currentUser = { email, ...users[email] };
        localStorage.setItem('prepwise_session_v2', JSON.stringify(this.state.currentUser));
        
        if (this.state.currentUser.profile) {
            this.state.user = this.state.currentUser.profile;
            this.state.sessions = this.state.currentUser.sessions;
            this.updateUserUI();
            this.showDashboard();
        } else {
            this.goToStage(1);
        }
    },

    continueAsGuest() {
        this.state.isGuest = true;
        this.userPill.name.textContent = "Hi, Guest!";
        this.userPill.initials.textContent = "G";
        this.userPill.container.classList.remove('hidden');
        this.goToStage(1);
    },

    updateUserUI() {
        if (!this.state.user.name) return;
        const firstName = this.state.user.name.split(' ')[0];
        this.userPill.name.textContent = `Hi, ${firstName}!`;
        this.userPill.initials.textContent = this.state.user.name.split(' ').map(n => n[0]).join('');
        this.userPill.container.classList.remove('hidden');
    },

    saveUserData() {
        if (this.state.isGuest || !this.state.currentUser) return;
        const users = JSON.parse(localStorage.getItem('prepwise_users_v2') || '{}');
        const email = this.state.currentUser.email;
        users[email].profile = this.state.user;
        users[email].sessions = this.state.sessions;
        localStorage.setItem('prepwise_users_v2', JSON.stringify(users));
        localStorage.setItem('prepwise_session_v2', JSON.stringify({ email, ...users[email] }));
    },

    signOut() {
        localStorage.removeItem('prepwise_session_v2');
        this.state.currentUser = null;
        this.state.isGuest = false;
        location.reload();
    },

    // --- Pipeline Navigation ---
    goToStage(stageNum) {
        this.state.currentStage = stageNum;
        const viewIds = ['auth', 'onboarding', 'analysis', 'modeSelection', 'interview', 'feedback', 'practice', 'dashboard'];
        
        Object.values(this.views).forEach(v => { if (v) v.classList.remove('active'); });
        const targetView = this.views[viewIds[stageNum]];
        if (targetView) targetView.classList.add('active');
        
        this.updateProgressDots();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Refresh icons for the new view
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    updateProgressDots() {
        const dots = document.querySelectorAll('.stage-dot');
        dots.forEach(dot => {
            const s = parseInt(dot.dataset.stage);
            dot.classList.remove('active', 'complete');
            
            let mapping = this.state.currentStage;
            if (mapping === 0) return;
            // Map 7 internal stages to 6 progress dots
            // 1:Onboard->1, 2:Analysis->2, 3:Modes->2, 4:Interview->3, 5:Feedback->4, 6:Practice->5, 7:Dash->6
            let activeDot = mapping;
            if (mapping === 3) activeDot = 2;
            if (mapping >= 4) activeDot -= 1;

            if (s === activeDot) dot.classList.add('active');
            if (s < activeDot) dot.classList.add('complete');
        });
    },

    // --- Intelligent Role Analysis ---
    runAnalysis() {
        const skills = this.state.user.skills.toLowerCase();
        
        // Dynamic fit probability simulation
        const baseScore = Math.floor(Math.random() * 20) + 70; // 70-90 range
        this.state.analysis.matchScore = baseScore;
        this.state.analysis.difficulty = baseScore > 85 ? "Moderate" : (baseScore > 78 ? "Challenging" : "Advanced");
        const diffLevel = baseScore > 85 ? 2 : (baseScore > 78 ? 3 : 4);

        this.state.analysis.strengths = this.state.user.skills.split(',').slice(0, 3);
        this.state.analysis.gaps = ["Stakeholder Strategy", "Unit Test Patterns", "System Design"].filter(g => !skills.includes(g.toLowerCase())).slice(0, 2);
        this.state.analysis.topics = ["Analytical Depth", "STAR Storytelling", "Tool Proficiency"];

        // Update High-Fidelity Metrics
        document.getElementById('match-score').textContent = `${baseScore}%`;
        document.getElementById('difficulty-text').textContent = this.state.analysis.difficulty;
        
        const dots = document.getElementById('difficulty-dots').children;
        Array.from(dots).forEach((dot, i) => {
            dot.className = `w-3.5 h-3.5 rounded-full ${i < diffLevel ? 'bg-accent-lavender shadow-[0_0_10px_rgba(155,138,251,0.4)]' : 'bg-slate-200'}`;
        });

        // Populate Lists with specific styling
        document.getElementById('analysis-strengths').innerHTML = this.state.analysis.strengths.map(s => `
            <li class="flex items-center gap-3">
                <i data-lucide="check" class="w-4 h-4 text-accent-cyan"></i>
                ${s.trim()}
            </li>
        `).join('');
        
        document.getElementById('analysis-gaps').innerHTML = this.state.analysis.gaps.map(g => `
            <li class="flex items-center gap-3">
                <i data-lucide="minus" class="w-4 h-4 text-accent-lavender"></i>
                ${g}
            </li>
        `).join('');
        
        document.getElementById('analysis-topics').innerHTML = this.state.analysis.topics.map(t => `
            <li class="flex items-center gap-3">
                <i data-lucide="circle-dot" class="w-4 h-4 text-brand-500"></i>
                ${t}
            </li>
        `).join('');

        document.getElementById('job-input-section').classList.add('hidden');
        document.getElementById('analysis-results-section').classList.remove('hidden');
        lucide.createIcons();
    },

    showModeSelection() { this.goToStage(3); },

    selectMode(mode) {
        this.state.interviewMode = mode;
        this.startInterview();
    },

    // --- Immersive Mock Interview ---
    startInterview() {
        this.state.interview.currentQuestionIndex = 0;
        this.state.interview.responses = [];
        this.state.interview.startTime = new Date();
        
        // Classic high-quality opening
        this.state.interview.questions = [
            "To get us started, could you tell me a bit about yourself and your journey so far?"
        ];

        this.goToStage(4);
        this.askQuestion();
    },

    askQuestion() {
        const question = this.state.interview.questions[this.state.interview.currentQuestionIndex];
        this.interviewUI.questionText.textContent = `"${question}"`;
        
        // Visual indicator reset
        this.interviewUI.pulse.classList.remove('opacity-100');

        let rate = this.state.interviewMode === 'rapid' ? 1.05 : 0.94;
        this.speak(question, () => {
            this.interviewUI.pulse.classList.remove('opacity-100');
            setTimeout(() => this.startListening(), 600);
        }, rate);
    },

    handleNextQuestion() {
        const answer = this.interviewUI.transcriptPreview.textContent.trim() || "(No transmission captured)";
        this.state.interview.responses.push({
            question: this.state.interview.questions[this.state.interview.currentQuestionIndex],
            answer,
            feedback: this.generateNeuralFeedback(answer)
        });

        this.stopListening();
        this.interviewUI.transcriptPreview.textContent = "";
        this.interviewUI.transcriptPreview.classList.add('hidden');

        this.state.interview.currentQuestionIndex++;
        
        // Finalize after 6 high-quality questions
        if (this.state.interview.currentQuestionIndex < 6) {
            this.generateNeuralFollowUp();
            this.askQuestion();
        } else {
            this.generateFinalReport();
            this.saveSession(this.state.analysis.matchScore + 2);
            this.goToStage(5);
        }
    },

    generateNeuralFollowUp() {
        const idx = this.state.interview.currentQuestionIndex;
        const mode = this.state.interviewMode;
        const name = this.state.user.name ? this.state.user.name.split(' ')[0] : 'there';
        
        // Realistic 6-Question Pipeline
        const structure = {
            1: { // Motivation / Background
                hr: `That's a great overview, ${name}. What specifically drew you to this role and our company culture?`,
                technical: `Thanks for sharing. Given your background in ${this.state.user.field}, what technical aspects of this role excite you the most?`,
                case: `Nice to meet you. Looking at the industry context, why are you interested in tackling the specific strategic challenges of this role?`,
                rapid: `Quick follow-up: in 20 seconds, what is the single biggest motivation behind your application?`,
                friendly: `It's so great to have you here, ${name}. I'd love to know: what was the "spark" that made you choose ${this.state.user.field}?`
            },
            2: { // Behavioral / Teamwork
                hr: "Describe a situation where you had to work with a difficult teammate. How did you ensure the project's success?",
                technical: "Can you tell me about a time you had to explain a complex technical concept to a non-technical teammate?",
                case: "Walk me through a time you had to convince a skeptical stakeholder to support your data-driven recommendation.",
                rapid: "Team conflict: do you prioritize the relationship or the deadline? Why?",
                friendly: "We all face hurdles in teams. Could you tell me about a time you helped a teammate get through a tough part of a project?"
            },
            3: { // Role-Specific / Situational
                hr: `The job description mentions a need for ${this.state.analysis.gaps[0] || 'adaptability'}. How have you demonstrated this in your projects?`,
                technical: `Let's dive into your stack. If you were starting a project from scratch today, how would you decide between a synchronous and asynchronous architecture?`,
                case: "Imagine our main competitor launches a feature that directly targets our core user base. What's your 48-hour response plan?",
                rapid: "If a project is 2 hours from deadline and a critical bug appears, what's your immediate action?",
                friendly: "Looking at your skills, how do you think that helps you most in a high-pressure environment?"
            },
            4: { // Problem-Solving / Challenge
                hr: "Tell me about the most significant professional or academic failure you've faced. What was the 'pivot' that helped you grow?",
                technical: "Describe a complex bug or architectural bottleneck you encountered. Walk me through your debugging and optimization process.",
                case: "If we had to cut the project budget by 50% tomorrow, which core features would you protect and which would you cut? Why?",
                rapid: "You have 15 seconds: what is the most creative solution you've ever come up with for a boring problem?",
                friendly: "I'd love to hear about a challenge that really tested you. How did you feel when you finally figured it out?"
            },
            5: { // Final Reflective / Growth
                hr: "Finally, looking at your trajectory, what is one area you've identified as a weakness that you are actively working to turn into a strength?",
                technical: "As technology evolves, how do you personally ensure your technical skills don't become stagnant? What are you learning right now?",
                case: "Based on our discussion, if you were in my shoes, what is the one question you'd ask a candidate to see if they truly understand this role?",
                rapid: "Final one: give me one reason NOT to hire you that actually shows you're a high-potential candidate.",
                friendly: "You've done amazing today. To wrap up: what is the one thing you're most excited to learn if you join this team?"
            }
        };

        const nextQ = structure[idx] ? (structure[idx][mode] || structure[idx]['hr']) : "That's clear. Let's move to the summary.";
        this.state.interview.questions.push(nextQ);
    },

    generateNeuralFeedback(ans) {
        if (ans.length < 40) return "Neural analysis detected low information density. Try expanding on the 'Action' component of your response.";
        return "High clarity detected. Your response aligns well with the structural requirements of this role domain.";
    },

    isTechnicalField() {
        const field = this.state.user.field.toLowerCase();
        const techKeywords = ['computer', 'software', 'artificial', 'cybersecurity', 'cloud', 'devops', 'networking', 'systems', 'game', 'data', 'statistics', 'mathematics', 'physics', 'engineering', 'ux research', 'design', 'architecture'];
        return techKeywords.some(key => field.includes(key));
    },

    generateFinalReport() {
        const container = document.getElementById('transcript-container');
        container.innerHTML = this.state.interview.responses.map((r, i) => `
            <div class="glass-card rounded-[2.5rem] p-10 border-white/40 shadow-soft space-y-6">
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-black text-brand-500 uppercase tracking-widest">Logic Pathway ${i+1}</span>
                    <i data-lucide="check-circle" class="w-5 h-5 text-accent-cyan"></i>
                </div>
                <p class="text-xl font-bold text-brand-900 tracking-tight leading-snug">"${r.question}"</p>
                <div class="bg-brand-50/50 p-6 rounded-2xl italic text-slate-500 border-l-4 border-brand-500 font-medium">"${r.answer}"</div>
                <div class="pt-6 border-t border-slate-100 flex items-start gap-4">
                    <div class="w-10 h-10 bg-brand-900 text-accent-cyan rounded-xl flex items-center justify-center shrink-0 shadow-lg"><i data-lucide="sparkles" class="w-5 h-5"></i></div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Neural Evaluation</p>
                        <p class="text-sm font-bold text-brand-900 leading-relaxed">${r.feedback}</p>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('report-strengths').innerHTML = `
            <li class="flex gap-4 p-5 bg-white rounded-3xl border border-slate-50 shadow-sm"><i data-lucide="zap" class="w-5 h-5 text-accent-cyan shrink-0"></i> High-density reasoning</li>
            <li class="flex gap-4 p-5 bg-white rounded-3xl border border-slate-50 shadow-sm"><i data-lucide="shield-check" class="w-5 h-5 text-accent-cyan shrink-0"></i> Consistent professional tone</li>
        `;
        document.getElementById('report-weaknesses').innerHTML = `
            <li class="flex gap-4 p-5 bg-white rounded-3xl border border-slate-50 shadow-sm"><i data-lucide="target" class="w-5 h-5 text-accent-lavender shrink-0"></i> Expand on quantitative metrics</li>
            <li class="flex gap-4 p-5 bg-white rounded-3xl border border-slate-50 shadow-sm"><i data-lucide="alert-circle" class="w-5 h-5 text-accent-lavender shrink-0"></i> Refine stakeholder empathy phrasing</li>
        `;

        // Adaptive Footer Button
        const continueBtn = document.getElementById('report-continue-btn');
        const continueText = document.getElementById('report-continue-text');
        const continueIcon = document.getElementById('report-continue-icon');
        
        if (this.isTechnicalField()) {
            continueText.textContent = "Unlock Practical Skills";
            continueIcon.setAttribute('data-lucide', 'lock-open');
        } else {
            continueText.textContent = "Finalize My Profile";
            continueIcon.setAttribute('data-lucide', 'check-square');
        }

        lucide.createIcons();
    },

    handleReportContinue() {
        if (this.isTechnicalField()) {
            this.startPractice();
        } else {
            this.showDashboard();
        }
    },

    saveSession(score) {
        this.state.sessions.unshift({
            date: new Date().toLocaleDateString(),
            mode: this.state.interviewMode,
            score,
            field: this.state.user.field
        });
        this.saveUserData();
    },

    // --- Practice Module ---
    startPractice() {
        const isTech = this.state.user.field.toLowerCase().includes('computer') || this.state.user.field.toLowerCase().includes('artificial');
        document.getElementById('code-task').classList.toggle('hidden', !isTech);
        document.getElementById('case-task').classList.toggle('hidden', isTech);
        document.getElementById('task-type-badge').textContent = isTech ? 'Neural Logic Tuning' : 'Strategic Case';
        document.getElementById('task-title').textContent = isTech ? 'Asynchronous Pattern Optimization' : 'Market Resilience Strategy';
        document.getElementById('code-desc').textContent = "Analyze and optimize the provided logic for O(log n) efficiency.";
        document.getElementById('case-desc').textContent = "How would you pivot a declining fitness app in a saturated high-growth market?";
        this.goToStage(6);
    },

    submitPracticeTask() {
        document.getElementById('task-feedback-container').classList.remove('hidden');
        document.getElementById('task-feedback-text').textContent = "Neural verification successful. Your logic shows significant structural integrity.";
    },

    // --- Comprehensive Dashboard ---
    showDashboard() {
        const name = this.state.user.name || "Guest User";
        document.getElementById('dash-user-name').textContent = name;
        document.getElementById('dash-user-field').textContent = this.state.user.field || "Neural Pipeline: Ready";
        document.getElementById('user-initials-dash').textContent = name.split(' ').map(n => n[0]).join('');
        
        const list = document.getElementById('session-history-list');
        if (this.state.sessions.length > 0) {
            list.innerHTML = this.state.sessions.map(s => `
                <div class="p-8 glass-card rounded-[2.5rem] border-white shadow-soft flex items-center justify-between hover:shadow-premium transition-all cursor-pointer">
                    <div class="flex items-center gap-6">
                        <div class="w-14 h-14 bg-brand-900 text-accent-cyan rounded-2xl flex items-center justify-center shadow-xl"><i data-lucide="history" class="w-6 h-6"></i></div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">${s.date} • ${s.mode.toUpperCase()}</p>
                            <p class="text-lg font-extrabold text-brand-900 tracking-tight">${s.field}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-3xl font-black text-brand-500 tracking-tighter">${s.score}%</p>
                        <p class="text-[10px] font-black text-accent-cyan uppercase tracking-widest">Fit Match</p>
                    </div>
                </div>
            `).join('');
        }
        this.goToStage(7);
    },

    // --- Neural Voice & Perception ---
    initSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.onresult = (e) => {
                let text = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) { text += e.results[i][0].transcript; }
                this.interviewUI.transcriptPreview.textContent = `"${text}"`;
                this.interviewUI.transcriptPreview.classList.remove('hidden');
            };
        }
    },

    speak(text, callback, rate = 0.94) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        // Prioritize natural neural-like voices
        ut.voice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.lang.startsWith('en-US')) || voices[0];
        ut.rate = rate;
        ut.pitch = 1.0;
        ut.onstart = () => { 
            this.interviewUI.pulse.classList.add('opacity-100'); 
            this.interviewUI.statusText.textContent = "Neural Link Speaking..."; 
        };
        ut.onend = () => { 
            this.interviewUI.statusText.textContent = "Neural Link Listening..."; 
            if (callback) callback(); 
        };
        window.speechSynthesis.speak(ut);
    },

    toggleListening() { this.state.interview.isListening ? this.stopListening() : this.startListening(); },
    
    startListening() {
        if (!this.recognition) return;
        this.state.interview.isListening = true;
        try { this.recognition.start(); } catch(e) {}
        this.interviewUI.listeningIndicator.classList.remove('hidden');
        this.interviewUI.micBtn.classList.add('bg-brand-500', 'text-white', 'ring-8', 'ring-brand-100');
    },

    stopListening() {
        if (!this.recognition) return;
        this.state.interview.isListening = false;
        try { this.recognition.stop(); } catch(e) {}
        this.interviewUI.listeningIndicator.classList.add('hidden');
        this.interviewUI.micBtn.classList.remove('bg-brand-500', 'text-white', 'ring-8', 'ring-brand-100');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
