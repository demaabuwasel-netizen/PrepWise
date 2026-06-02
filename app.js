window.app = {
    state: {
        currentStage: 0,
        interviewMode: 'hr',
        isGuest: false,
        currentUser: null,
        user: { name: '', email: '', field: 'Computer Science / Software', skills: '', courses: '' },
        job: { description: '', link: '' },
        analysis: { matchScore: 0, difficulty: 'Moderate', strengths: [], gaps: [], topics: [] },
        interview: {
            currentQuestionIndex: 0, questions: [], responses: [],
            startTime: null, isListening: false, awaitingFollowUp: false
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
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
                this.state.currentUser = { email: this.state.user.email, profile: this.state.user, sessions: [] };
                localStorage.setItem('prepwise_session_v2', JSON.stringify(this.state.currentUser));
                this.updateUserUI();
                this.goToStage(1);
            }, 2000);
        }
    },

    // --- Auth ---
    checkAuth() {
        const session = localStorage.getItem('prepwise_session_v2');
        if (session) {
            try {
                const data = JSON.parse(session);
                this.state.currentUser = data;
                this.state.user = data.profile || this.state.user;
                this.state.sessions = data.sessions || [];
                this.updateUserUI();
                if (data.profile) { this.showDashboard(); } else { this.goToStage(1); }
            } catch(e) {
                localStorage.removeItem('prepwise_session_v2');
                this.goToStage(0);
            }
        } else {
            this.goToStage(0);
        }
    },

    handleAuth() {
        const emailEl = document.getElementById('auth-email');
        const btn = document.getElementById('auth-submit-btn');
        if (!emailEl) return;
        const email = emailEl.value.trim();
        if (!email) return;
        const isSignUp = btn && btn.dataset.mode === 'signup';
        let users = JSON.parse(localStorage.getItem('prepwise_users_v2') || '{}');
        if (isSignUp) {
            if (users[email]) return alert("An account already exists for this email. Please sign in.");
            users[email] = { profile: null, sessions: [] };
            localStorage.setItem('prepwise_users_v2', JSON.stringify(users));
        } else {
            if (!users[email]) {
                users[email] = { profile: null, sessions: [] };
                localStorage.setItem('prepwise_users_v2', JSON.stringify(users));
            }
        }
        this.state.currentUser = { email, ...users[email] };
        localStorage.setItem('prepwise_session_v2', JSON.stringify(this.state.currentUser));
        if (this.state.currentUser.profile) {
            this.state.user = this.state.currentUser.profile;
            this.state.sessions = this.state.currentUser.sessions || [];
            this.updateUserUI();
            this.showDashboard();
        } else {
            this.goToStage(1);
        }
    },

    handleProfileSubmit() {
        const nameEl = document.getElementById('name-input');
        const fieldEl = document.getElementById('field-select');
        const skillsEl = document.getElementById('skills-input');
        const coursesEl = document.getElementById('courses-input');
        this.state.user.name = nameEl ? nameEl.value.trim() : '';
        this.state.user.field = fieldEl ? fieldEl.value : 'Software Engineering';
        this.state.user.skills = skillsEl ? skillsEl.value.trim() : '';
        this.state.user.courses = coursesEl ? coursesEl.value.trim() : '';
        this.saveUserData();
        this.updateUserUI();
        this.goToStage(2);
    },

    handleJobSubmit() {
        const descEl = document.getElementById('job-desc-input');
        this.state.job.description = descEl ? descEl.value.trim() : '';
        this.runAnalysis();
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
        if (this.state.isGuest) {
            if (pillName) pillName.textContent = 'Hi, Guest!';
            if (pillInitials) pillInitials.textContent = 'G';
            if (pill) pill.classList.remove('hidden');
            return;
        }
        if (!this.state.user.name) return;
        const firstName = this.state.user.name.split(' ')[0];
        if (pillName) pillName.textContent = `Hi, ${firstName}!`;
        if (pillInitials) pillInitials.textContent = this.state.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        if (pill) pill.classList.remove('hidden');
    },

    saveUserData() {
        if (this.state.isGuest || !this.state.currentUser) return;
        const users = JSON.parse(localStorage.getItem('prepwise_users_v2') || '{}');
        const email = this.state.currentUser.email;
        if (!users[email]) users[email] = { profile: null, sessions: [] };
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
        this.state.currentStage = stageNum;
        const viewKeys = ['auth', 'onboarding', 'analysis', 'modeSelection', 'interview', 'feedback', 'practice', 'dashboard'];
        Object.values(this.views).forEach(v => { if (v) v.classList.remove('active'); });
        const key = viewKeys[stageNum];
        if (this.views[key]) this.views[key].classList.add('active');
        this.updateBreadcrumb(stageNum);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    updateBreadcrumb(stage) {
        const nav = document.getElementById('breadcrumb-nav');
        if (!nav) return;
        if (stage === 0) { nav.classList.add('hidden'); return; }
        nav.classList.remove('hidden');

        const steps = [
            { label: 'Home', stage: 7, icon: 'home', action: 'window.app.handleLogoClick()' },
            { label: 'Profile', stage: 1, icon: 'user', action: 'window.app.goToStage(1)' },
            { label: 'Analysis', stage: 2, icon: 'zap', action: 'window.app.goToStage(2)' },
            { label: 'Interview', stage: 4, icon: 'mic', action: null },
            { label: 'Report', stage: 5, icon: 'file-text', action: 'window.app.goToStage(5)' },
        ];

        nav.innerHTML = steps.map((s, i) => {
            const isActive = (stage === s.stage) || (stage === 3 && s.stage === 4) || (stage === 6 && s.stage === 5);
            const isPast = stage > s.stage && s.stage !== 7;
            const isHome = s.stage === 7;
            const clickable = s.action && !isActive;
            const cls = isActive
                ? 'text-brand-500 font-black'
                : (clickable || isHome) ? 'text-slate-400 hover:text-brand-500 cursor-pointer transition-colors' : 'text-slate-200 font-bold';
            const handler = clickable ? `onclick="${s.action}"` : '';
            return `
                ${i > 0 ? '<span class="text-slate-200 text-xs">/</span>' : ''}
                <span class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${cls}" ${handler}>
                    <i data-lucide="${s.icon}" class="w-3 h-3"></i>${s.label}
                </span>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- Analysis ---
    runAnalysis() {
        const jobDesc = this.state.job.description.toLowerCase();
        const userSkills = this.state.user.skills.toLowerCase();
        const userField = this.state.user.field.toLowerCase();

        // Extract key requirements from job description
        const jobKeywords = this.extractJobKeywords(jobDesc);
        const userSkillsList = this.state.user.skills.split(',').map(s => s.trim()).filter(Boolean);

        // Calculate match score based on skill overlap and field relevance
        const matchScore = this.calculateMatchScore(jobKeywords, userSkillsList, userField, jobDesc);
        this.state.analysis.matchScore = matchScore;

        // Determine difficulty based on match score and gap count
        const gaps = this.identifySkillGaps(jobKeywords, userSkillsList);
        this.state.analysis.difficulty = this.getDifficultyLevel(matchScore, gaps.length);
        const diffLevel = matchScore > 85 ? 2 : (matchScore > 70 ? 3 : 4);

        // Extract strengths from what user has that job needs
        this.state.analysis.strengths = this.extractStrengths(jobKeywords, userSkillsList, userField);

        // Identify gaps based on job requirements
        this.state.analysis.gaps = gaps.slice(0, 2);

        // Focus topics based on gaps and job requirements
        this.state.analysis.topics = this.generateFocusTopics(jobKeywords, gaps, userField);

        const el = (id) => document.getElementById(id);
        if (el('match-score')) el('match-score').textContent = `${matchScore}%`;
        if (el('difficulty-text')) el('difficulty-text').textContent = this.state.analysis.difficulty;
        if (el('difficulty-dots')) {
            Array.from(el('difficulty-dots').children).forEach((dot, i) => {
                dot.className = `w-3.5 h-3.5 rounded-full ${i < diffLevel ? 'bg-accent-lavender shadow-[0_0_10px_rgba(155,138,251,0.4)]' : 'bg-slate-200'}`;
            });
        }
        if (el('analysis-strengths')) el('analysis-strengths').innerHTML = this.state.analysis.strengths.map(s => `<li class="flex items-center gap-3"><i data-lucide="check" class="w-4 h-4 text-accent-cyan"></i>${s}</li>`).join('');
        if (el('analysis-gaps')) el('analysis-gaps').innerHTML = this.state.analysis.gaps.map(g => `<li class="flex items-center gap-3"><i data-lucide="minus" class="w-4 h-4 text-accent-lavender"></i>${g}</li>`).join('');
        if (el('analysis-topics')) el('analysis-topics').innerHTML = this.state.analysis.topics.map(t => `<li class="flex items-center gap-3"><i data-lucide="circle-dot" class="w-4 h-4 text-brand-500"></i>${t}</li>`).join('');
        if (el('job-input-section')) el('job-input-section').classList.add('hidden');
        if (el('analysis-results-section')) el('analysis-results-section').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    extractJobKeywords(jobDesc) {
        const techSkills = ['python', 'javascript', 'java', 'sql', 'react', 'node', 'aws', 'docker', 'kubernetes', 'typescript', 'c++', 'go', 'rust', 'scala', 'spring', 'django', 'flask', 'angular', 'vue', 'backend', 'frontend', 'fullstack', 'devops', 'cloud', 'api', 'rest', 'graphql', 'microservices', 'databases', 'mongodb', 'postgres', 'mysql', 'redis', 'elasticsearch', 'machine learning', 'data analysis', 'analytics', 'ai', 'gcp', 'azure'];
        const softSkills = ['communication', 'leadership', 'teamwork', 'collaboration', 'problem solving', 'critical thinking', 'project management', 'agile', 'scrum', 'stakeholder management', 'mentoring', 'mentorship', 'presentation', 'negotiation', 'strategic thinking', 'analytical'];
        const responsibilities = ['design', 'architect', 'develop', 'build', 'implement', 'debug', 'test', 'optimize', 'analyze', 'research', 'manage', 'lead', 'mentor', 'review', 'document'];

        const found = { tech: [], soft: [], responsibilities: [] };

        techSkills.forEach(s => { if (jobDesc.includes(s)) found.tech.push(s); });
        softSkills.forEach(s => { if (jobDesc.includes(s)) found.soft.push(s); });
        responsibilities.forEach(r => { if (jobDesc.includes(r)) found.responsibilities.push(r); });

        return found;
    },

    calculateMatchScore(jobKeywords, userSkillsList, userField, jobDesc) {
        let score = 50;
        const userSkillsLower = userSkillsList.map(s => s.toLowerCase());

        // Score technical skill matches
        jobKeywords.tech.forEach(skill => {
            if (userSkillsLower.some(us => us.includes(skill) || skill.includes(us.split(' ')[0]))) {
                score += 8;
            }
        });

        // Score soft skill matches
        jobKeywords.soft.forEach(skill => {
            if (userSkillsLower.some(us => us.includes(skill.split(' ')[0])) || jobDesc.includes('experience')) {
                score += 5;
            }
        });

        // Field relevance bonus
        if (userField.includes('software') || userField.includes('computer') || userField.includes('engineering')) {
            if (jobDesc.includes('engineer') || jobDesc.includes('developer') || jobDesc.includes('software')) {
                score += 10;
            }
        }

        // Penalize if major tech stack mismatch
        if (jobKeywords.tech.length > 0 && !userSkillsLower.some(s => jobKeywords.tech[0].includes(s) || s.includes(jobKeywords.tech[0].split(' ')[0]))) {
            score -= 15;
        }

        return Math.max(40, Math.min(95, score));
    },

    identifySkillGaps(jobKeywords, userSkillsList) {
        const userSkillsLower = userSkillsList.map(s => s.toLowerCase());
        const gaps = [];

        jobKeywords.tech.slice(0, 5).forEach(skill => {
            if (!userSkillsLower.some(us => us.includes(skill) || skill.includes(us.split(' ')[0]))) {
                gaps.push(skill.charAt(0).toUpperCase() + skill.slice(1));
            }
        });

        jobKeywords.soft.slice(0, 3).forEach(skill => {
            if (!userSkillsLower.some(us => us.toLowerCase().includes(skill.split(' ')[0]))) {
                gaps.push(skill.charAt(0).toUpperCase() + skill.slice(1) + ' Skills');
            }
        });

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

    showModeSelection() { this.goToStage(3); },

    selectMode(mode) {
        this.state.interviewMode = mode;
        this.startInterview();
    },

    // --- Interview ---
    startInterview() {
        this.state.interview.currentQuestionIndex = 0;
        this.state.interview.responses = [];
        this.state.interview.startTime = new Date();
        this.state.interview.awaitingFollowUp = false;
        this.state.interview.questions = ["To get us started, could you tell me a bit about yourself and your journey so far?"];
        this.goToStage(4);
        this.resetTranscriptState();
        setTimeout(() => this.askQuestion(), 400);
    },

    askQuestion() {
        const question = this.state.interview.questions[this.state.interview.currentQuestionIndex];
        const questionEl = document.getElementById('question-text');
        const statusEl = document.getElementById('interviewer-status');
        const pulseEl = document.getElementById('ai-pulse');
        const counterEl = document.getElementById('question-counter');

        if (questionEl) questionEl.textContent = `"${question}"`;
        if (pulseEl) pulseEl.classList.remove('opacity-100');

        const total = 6;
        const current = Math.min(this.state.interview.currentQuestionIndex + 1, total);
        if (counterEl) counterEl.textContent = `Question ${current} of ${total}`;

        this.resetTranscriptState();
        this.setMicState('idle');

        const rate = this.state.interviewMode === 'rapid' ? 1.05 : 0.94;
        this.speak(question, () => {
            if (statusEl) statusEl.textContent = 'Your turn — tap Speak to respond';
        }, rate);
    },

    handleNextQuestion() {
        const answer = this.getTranscribedAnswer();

        if (!answer || answer.length < 5) {
            const statusEl = document.getElementById('interviewer-status');
            if (statusEl) {
                statusEl.textContent = "Please share your response before continuing.";
                setTimeout(() => { statusEl.textContent = 'Your turn — tap Speak to respond'; }, 2500);
            }
            return;
        }

        this.stopListening();

        this.state.interview.responses.push({
            question: this.state.interview.questions[this.state.interview.currentQuestionIndex],
            answer,
            feedback: this.generateNeuralFeedback(answer)
        });

        this.state.interview.currentQuestionIndex++;

        if (this.state.interview.currentQuestionIndex < 6) {
            const ack = this.generateAIAcknowledgment(answer);
            this.showAIBridge(ack, () => {
                if (ack.injectAsNextQuestion) {
                    this.state.interview.questions.push(ack.followUpQuestion);
                } else {
                    this.generateNeuralFollowUp();
                }
                this.askQuestion();
            });
        } else {
            this.generateFinalReport();
            this.saveSession(this.state.analysis.matchScore + 2);
            this.goToStage(5);
        }
    },

    generateAIAcknowledgment(answer) {
        const name = this.state.user.name ? this.state.user.name.split(' ')[0] : '';
        const words = answer.trim().split(/\s+/).length;
        const hasExample = /(I |my |we |project|when |worked on|built|led |created|solved|implemented|experience)/i.test(answer);
        const hasResult = /(result|outcome|achieved|improved|increased|reduced|saved|learned|realized|impact)/i.test(answer);
        const hasDetail = words > 30 && hasExample;

        // Very short answer — inject a clarifying follow-up as the next question
        if (words < 12) {
            const followUps = [
                "That's a start. Could you walk me through a specific situation where you applied that?",
                "I'd like to understand better — can you give me a concrete example from your experience?",
                "Interesting. What was the context behind that, and what actions did you take?"
            ];
            return {
                text: `I want to dig a little deeper on that${name ? `, ${name}` : ''}.`,
                followUpQuestion: followUps[Math.floor(Math.random() * followUps.length)],
                injectAsNextQuestion: true,
                type: 'probe'
            };
        }

        // Has content but missing results — bridge to the next question
        if (hasExample && !hasResult) {
            const bridges = [
                `Good context${name ? `, ${name}` : ''}. I noticed you described the situation — what was the actual outcome or impact?`,
                "That's a solid example. I'm curious — what did you learn from that, and what would you do differently?",
                `Strong narrative. Let's keep going.`
            ];
            const text = bridges[Math.floor(Math.random() * bridges.length)];
            return { text, injectAsNextQuestion: false, type: 'bridge' };
        }

        // Good detailed answer — acknowledge and move forward
        const acks = [
            `That's a well-structured response${name ? `, ${name}` : ''}. Let's continue.`,
            "Clear and specific — exactly what interviewers want to hear. Moving on.",
            `Good. I can see you've thought this through. Next question.`,
            "Thank you for that detail. I'm getting a strong picture of your approach.",
            `Noted. That tells me a lot about how you think. Let me ask you something different.`
        ];
        return {
            text: acks[Math.floor(Math.random() * acks.length)],
            injectAsNextQuestion: false,
            type: 'acknowledge'
        };
    },

    showAIBridge(ack, callback) {
        const questionEl = document.getElementById('question-text');
        const statusEl = document.getElementById('interviewer-status');
        const pulseEl = document.getElementById('ai-pulse');
        const nextBtn = document.getElementById('next-question-btn');

        if (nextBtn) nextBtn.disabled = true;

        // Show thinking state
        if (statusEl) statusEl.textContent = 'Processing your response...';
        if (pulseEl) { pulseEl.classList.remove('opacity-0'); pulseEl.classList.add('opacity-100'); }

        setTimeout(() => {
            // Show acknowledgment
            if (questionEl) questionEl.textContent = `"${ack.text}"`;
            if (statusEl) statusEl.textContent = ack.type === 'probe' ? 'Follow-up incoming' : 'Interviewer responded';
            this.speak(ack.text, null, 0.96);

            const pause = ack.type === 'acknowledge' ? 2500 : 3000;
            setTimeout(() => {
                if (pulseEl) pulseEl.classList.remove('opacity-100');
                if (nextBtn) nextBtn.disabled = false;
                callback();
            }, pause);
        }, 800);
    },

    generateNeuralFollowUp() {
        const idx = this.state.interview.currentQuestionIndex;
        const mode = this.state.interviewMode;
        const name = this.state.user.name ? this.state.user.name.split(' ')[0] : 'there';
        const structure = {
            1: {
                hr: `Great. What specifically drew you to this kind of role, ${name}? Was it a particular experience or goal?`,
                technical: `Given your background in ${this.state.user.field}, what technical challenge excites you most about this position?`,
                case: `From a strategic lens — why are you interested in tackling the specific challenges this role involves?`,
                rapid: `Quick one: in 20 seconds, what is the single biggest motivation behind your application?`,
                friendly: `I'd love to know — what was the "spark" moment that made you pursue ${this.state.user.field}?`
            },
            2: {
                hr: "Describe a situation where you had to collaborate with a difficult teammate. How did you ensure the project succeeded?",
                technical: "Tell me about a time you had to explain a complex technical concept to a non-technical stakeholder.",
                case: "Walk me through a time you had to convince a skeptical stakeholder to support a data-driven recommendation.",
                rapid: "Team conflict: do you prioritize the relationship or the deadline? Give me a real example.",
                friendly: "Could you tell me about a time you helped a teammate through a genuinely tough situation?"
            },
            3: {
                hr: `The role requires ${this.state.analysis.gaps[0] || 'adaptability under pressure'}. Describe a moment you demonstrated exactly that.`,
                technical: "Walk me through how you'd architect a scalable system for a feature that suddenly needs to handle 10x the traffic.",
                case: "Our main competitor just launched a feature directly targeting our core users. What's your 48-hour response plan?",
                rapid: "Two hours from a deadline, a critical bug appears. What's your immediate action — exactly?",
                friendly: "Tell me about a high-pressure moment in a project. How did your skills help you stay grounded?"
            },
            4: {
                hr: "Tell me about the most significant professional setback you've faced. What was the turning point that helped you grow?",
                technical: "Describe the most complex bug or bottleneck you've ever debugged. Take me through your exact process.",
                case: "If we had to cut project budget by 50% tomorrow, which core features would you protect — and why?",
                rapid: "15 seconds: the most creative solution you've ever built for an unglamorous problem. Go.",
                friendly: "What's a challenge that really tested your resilience? How did it feel when you finally cracked it?"
            },
            5: {
                hr: "Looking honestly at your trajectory — what's one real weakness you're actively turning into a strength right now?",
                technical: "How do you personally make sure your technical skills don't stagnate? What are you actively learning?",
                case: "Based on our conversation — if you were me, what's the one question you'd ask to see if someone truly understands this role?",
                rapid: "Final rapid-fire: give me one reason NOT to hire you that actually signals you're a high-potential candidate.",
                friendly: "Last one — what's the one thing you're most excited to learn if you get to join this team?"
            }
        };
        const q = structure[idx] ? (structure[idx][mode] || structure[idx]['hr']) : "What else would you like the interviewer to know about you?";
        this.state.interview.questions.push(q);
    },

    generateNeuralFeedback(answer) {
        if (!answer || answer.trim().length === 0) return null;
        const words = answer.trim().split(/\s+/).length;
        const hasExample = /(project|when|worked|built|led|created|solved|implemented|experience)/i.test(answer);
        const hasResult = /(result|outcome|achieved|improved|increased|impact|learned)/i.test(answer);
        const hasSTAR = hasExample && hasResult;

        if (words < 15) return "Response was brief. In a real interview, aim to expand with the STAR method: Situation, Task, Action, Result.";
        if (!hasExample) return "The response would benefit from a concrete example. Ground your answers in real projects or experiences.";
        if (!hasResult) return "Good context and actions described. Strengthen this by stating the outcome — what changed, improved, or was learned?";
        if (hasSTAR && words > 50) return "Strong response. Specific situation, clear actions, and measurable outcome — this is what interviewers look for.";
        return "Solid response with relevant detail. You communicated clearly and stayed on topic.";
    },

    isTechnicalField() {
        const field = this.state.user.field.toLowerCase();
        return ['computer', 'software', 'artificial', 'cybersecurity', 'cloud', 'devops', 'networking', 'systems', 'game', 'data', 'statistics', 'mathematics', 'physics', 'engineering', 'ux', 'design', 'architecture'].some(k => field.includes(k));
    },

    generateFinalReport() {
        const container = document.getElementById('transcript-container');
        if (container) {
            container.innerHTML = this.state.interview.responses.map((r, i) => {
                const feedback = r.feedback || "No transcription was captured for this response.";
                const noResponse = !r.answer || r.answer === '(No response captured)' || r.answer.length < 5;
                return `
                    <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-soft space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-[9px] font-black text-brand-500 uppercase tracking-widest">Question ${i+1}</span>
                            <i data-lucide="${noResponse ? 'alert-circle' : 'check-circle'}" class="w-4 h-4 ${noResponse ? 'text-slate-300' : 'text-[#63D5C4]'}"></i>
                        </div>
                        <p class="text-sm font-bold text-brand-900 tracking-tight leading-snug">"${r.question}"</p>
                        <div class="bg-brand-50/50 p-4 rounded-lg ${noResponse ? 'italic text-slate-300' : 'text-slate-500 font-medium'} border-l-4 border-brand-500 text-xs leading-relaxed">
                            ${noResponse ? 'No response was recorded.' : `"${r.answer}"`}
                        </div>
                        <div class="pt-3 border-t border-slate-100 flex items-start gap-3">
                            <div class="w-7 h-7 bg-brand-900 text-[#63D5C4] rounded-lg flex items-center justify-center shrink-0">
                                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                            </div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Feedback</p>
                                <p class="text-xs font-bold text-brand-900 leading-relaxed">${feedback}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Compute dynamic strengths/weaknesses from actual responses
        const allAnswers = this.state.interview.responses.map(r => r.answer || '').join(' ');
        const wordCount = allAnswers.split(/\s+/).length;
        const hasExamples = /(project|worked|built|led|created|solved|implemented)/i.test(allAnswers);
        const hasResults = /(result|outcome|achieved|improved|increased|impact)/i.test(allAnswers);

        const strengthsEl = document.getElementById('report-strengths');
        const weakEl = document.getElementById('report-weaknesses');

        const strengths = [];
        const weaknesses = [];
        if (wordCount > 150) strengths.push({ icon: 'zap', text: 'Articulate and detailed responses' });
        if (hasExamples) strengths.push({ icon: 'shield-check', text: 'Grounded answers with real examples' });
        if (!hasExamples) weaknesses.push({ icon: 'target', text: 'Add more specific project examples' });
        if (!hasResults) weaknesses.push({ icon: 'alert-circle', text: 'Quantify outcomes and impact' });
        if (wordCount <= 100) weaknesses.push({ icon: 'target', text: 'Expand answers — aim for 50–100 words per response' });
        if (strengths.length === 0) strengths.push({ icon: 'zap', text: 'Completed the full interview' });
        if (weaknesses.length === 0) weaknesses.push({ icon: 'alert-circle', text: 'Refine stakeholder empathy phrasing' });

        if (strengthsEl) strengthsEl.innerHTML = strengths.map(s => `<li class="flex gap-3 p-3.5 bg-white rounded-lg border border-slate-100 text-xs font-bold text-brand-900"><i data-lucide="${s.icon}" class="w-4 h-4 text-[#63D5C4] shrink-0"></i>${s.text}</li>`).join('');
        if (weakEl) weakEl.innerHTML = weaknesses.map(w => `<li class="flex gap-3 p-3.5 bg-white rounded-lg border border-slate-100 text-xs font-bold text-brand-900"><i data-lucide="${w.icon}" class="w-4 h-4 text-[#A37BFF] shrink-0"></i>${w.text}</li>`).join('');

        const continueText = document.getElementById('report-continue-text');
        const continueIcon = document.getElementById('report-continue-icon');
        if (this.isTechnicalField()) {
            if (continueText) continueText.textContent = 'Unlock Practical Skills';
            if (continueIcon) continueIcon.setAttribute('data-lucide', 'lock-open');
        } else {
            if (continueText) continueText.textContent = 'Go to Dashboard';
            if (continueIcon) continueIcon.setAttribute('data-lucide', 'layout-dashboard');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    handleReportContinue() {
        if (this.isTechnicalField()) { this.startPractice(); } else { this.showDashboard(); }
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

    // --- Practice ---
    startPractice() {
        const isTech = this.isTechnicalField();
        const el = (id) => document.getElementById(id);
        if (el('code-task')) el('code-task').classList.toggle('hidden', !isTech);
        if (el('case-task')) el('case-task').classList.toggle('hidden', isTech);
        if (el('task-type-badge')) el('task-type-badge').textContent = isTech ? 'Neural Logic Tuning' : 'Strategic Case';
        if (el('task-title')) el('task-title').textContent = isTech ? 'Asynchronous Pattern Optimization' : 'Market Resilience Strategy';
        if (el('code-desc')) el('code-desc').textContent = "Analyze and optimize the provided logic for O(log n) efficiency.";
        if (el('case-desc')) el('case-desc').textContent = "How would you pivot a declining fitness app in a saturated high-growth market?";
        this.goToStage(6);
    },

    submitPracticeTask() {
        const el = (id) => document.getElementById(id);
        if (el('task-feedback-container')) el('task-feedback-container').classList.remove('hidden');
        if (el('task-feedback-text')) el('task-feedback-text').textContent = "Neural verification successful. Your logic shows significant structural integrity.";
    },

    // --- Dashboard ---
    showDashboard() {
        const el = (id) => document.getElementById(id);
        const name = this.state.user.name || 'Guest User';
        if (el('dash-user-name')) el('dash-user-name').textContent = name;
        if (el('dash-user-field')) el('dash-user-field').textContent = this.state.user.field || 'Neural Pipeline: Ready';
        if (el('user-initials-dash')) el('user-initials-dash').textContent = name.split(' ').map(n => n[0]).join('').toUpperCase();

        const list = el('session-history-list');
        if (list) {
            if (this.state.sessions.length > 0) {
                list.innerHTML = this.state.sessions.map(s => `
                    <div class="p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-white hover:shadow-soft transition-all cursor-pointer border border-transparent hover:border-slate-100">
                        <div class="flex items-center gap-4">
                            <div class="w-9 h-9 bg-brand-900 text-[#63D5C4] rounded-lg flex items-center justify-center shrink-0"><i data-lucide="history" class="w-4 h-4"></i></div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">${s.date} &bull; ${s.mode.toUpperCase()}</p>
                                <p class="text-sm font-extrabold text-brand-900 tracking-tight">${s.field}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="text-xl font-black text-brand-500 tracking-tighter">${s.score}%</p>
                            <p class="text-[9px] font-black text-[#63D5C4] uppercase tracking-widest">Fit Match</p>
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<p class="text-slate-300 font-bold text-xs text-center py-6">No sessions yet. Start your first interview!</p>';
            }
        }
        this.goToStage(7);
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
        const placeholder = document.getElementById('transcript-placeholder');
        const liveDiv = document.getElementById('transcript-live');
        const finalEl = document.getElementById('final-transcript-text');
        const interimEl = document.getElementById('interim-transcript-text');
        const cursor = document.getElementById('transcript-cursor');

        const hasFinal = !!this.state.transcriptState.final;
        const hasInterim = !!this.state.transcriptState.interim;

        if (placeholder) placeholder.classList.toggle('hidden', hasFinal || hasInterim);
        if (liveDiv) liveDiv.classList.toggle('hidden', !hasFinal && !hasInterim);
        if (finalEl) finalEl.textContent = this.state.transcriptState.final;
        if (interimEl) interimEl.textContent = this.state.transcriptState.interim;
        if (cursor) cursor.classList.toggle('hidden', !this.state.interview.isListening);
    },

    setMicState(state) {
        const dot = document.getElementById('mic-state-dot');
        const label = document.getElementById('mic-state-label');
        const wave = document.getElementById('mic-wave');
        const micBtn = document.getElementById('mic-toggle-btn');
        const micLabel = document.getElementById('mic-btn-label');
        const statusEl = document.getElementById('interviewer-status');
        const cursor = document.getElementById('transcript-cursor');

        const cfg = {
            idle:       { dot: 'bg-slate-200',              label: 'Waiting for your response',    wave: false, btnCls: 'border-slate-100 bg-white text-brand-900',   btnLabel: 'Speak',      status: 'Your turn — tap Speak to respond' },
            listening:  { dot: 'bg-red-400 animate-pulse',  label: 'Listening — speak now',        wave: true,  btnCls: 'border-red-300 bg-red-50 text-red-600',       btnLabel: 'Stop',       status: 'Listening...' },
            processing: { dot: 'bg-yellow-400',             label: 'Processing speech...',         wave: false, btnCls: 'border-slate-100 bg-white text-slate-400',    btnLabel: 'Speak',      status: 'Processing...' },
            done:       { dot: 'bg-[#63D5C4]',              label: 'Response captured ✓',          wave: false, btnCls: 'border-slate-100 bg-white text-brand-900',    btnLabel: 'Re-record',  status: 'Response captured' },
            denied:     { dot: 'bg-orange-400',             label: 'Microphone access denied',     wave: false, btnCls: 'border-orange-200 bg-white text-orange-400',  btnLabel: 'Type instead', status: 'Microphone unavailable — type below' },
            error:      { dot: 'bg-orange-400',             label: 'Recognition error — try again',wave: false, btnCls: 'border-orange-200 bg-white text-orange-400',  btnLabel: 'Retry',      status: 'Recognition error' }
        };

        const s = cfg[state] || cfg.idle;
        if (dot) dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 shrink-0 ${s.dot}`;
        if (label) label.textContent = s.label;
        if (wave) wave.classList.toggle('hidden', !s.wave);
        if (micBtn) {
            const base = 'flex items-center justify-center gap-3 py-6 px-8 rounded-3xl border-2 font-black transition-all text-sm uppercase tracking-widest min-w-[140px]';
            micBtn.className = `${base} ${s.btnCls}`;
        }
        if (micLabel) micLabel.textContent = s.btnLabel;
        if (statusEl) statusEl.textContent = s.status;
        if (cursor) cursor.classList.toggle('hidden', state !== 'listening');
    },

    resetTranscriptState() {
        this.state.transcriptState = { final: '', interim: '', isEditing: false };

        const el = (id) => document.getElementById(id);
        if (el('transcript-placeholder')) el('transcript-placeholder').classList.remove('hidden');
        if (el('transcript-live')) el('transcript-live').classList.add('hidden');
        if (el('final-transcript-text')) el('final-transcript-text').textContent = '';
        if (el('interim-transcript-text')) el('interim-transcript-text').textContent = '';
        if (el('transcript-cursor')) el('transcript-cursor').classList.add('hidden');
        if (el('transcript-actions')) el('transcript-actions').classList.add('hidden');
        if (el('transcript-edit-area')) { el('transcript-edit-area').classList.add('hidden'); el('transcript-edit-area').value = ''; }
        if (el('transcript-live')) el('transcript-live').classList.add('hidden');

        const editBtn = el('edit-transcript-btn');
        if (editBtn) editBtn.innerHTML = '<i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit';
    },

    getTranscribedAnswer() {
        if (this.state.transcriptState.isEditing) {
            const editArea = document.getElementById('transcript-edit-area');
            return editArea ? editArea.value.trim() : '';
        }
        return this.state.transcriptState.final.trim();
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
