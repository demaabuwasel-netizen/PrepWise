const STAGE_HASHES = ['', '#profile', '#analysis', '#mode', '#interview', '#report', '#practice', '#dashboard'];
const HASH_TO_STAGE = Object.fromEntries(STAGE_HASHES.map((h, i) => [h, i]).filter(([h]) => h));

window.app = {
    state: {
        currentStage: 0,
        interviewMode: 'hr',
        isGuest: false,
        isEditingProfile: false,
        currentUser: null,
        user: { name: '', email: '', field: 'Software Engineering', skills: '', courses: '', experience: '', linkedin: '' },
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
        this.initRouting();
        this.setupPopstateListener();
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
                if (data.profile) { this.showDashboard(); } else { this._navigateToStage(1); }
            } catch(e) {
                localStorage.removeItem('prepwise_session_v2');
                this._navigateToStage(0);
            }
        } else {
            this._navigateToStage(0);
        }
    },

    initRouting() {
        const hash = window.location.hash;
        const stage = HASH_TO_STAGE[hash];
        if (stage && this.state.currentUser) {
            if (stage === 4 || stage === 6) {
                this._navigateToStage(7);
            } else {
                this._navigateToStage(stage);
            }
        }
        history.replaceState({ stage: this.state.currentStage }, '', window.location.hash || '');
    },

    setupPopstateListener() {
        window.addEventListener('popstate', (e) => {
            if (e.state && typeof e.state.stage === 'number') {
                const target = e.state.stage;
                if (target === 4 && this.state.interview.responses.length === 0) {
                    this._navigateToStage(3);
                    return;
                }
                if (target === 0 && this.state.currentUser) {
                    this._navigateToStage(7);
                    return;
                }
                this._navigateToStage(target);
            } else {
                const hash = window.location.hash;
                const stage = HASH_TO_STAGE[hash];
                if (stage !== undefined && this.state.currentUser) {
                    this._navigateToStage(stage);
                } else {
                    this._navigateToStage(this.state.currentUser ? 7 : 0);
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
        const experienceEl = document.getElementById('experience-input');
        const linkedinEl = document.getElementById('linkedin-input');
        this.state.user.name = nameEl ? nameEl.value.trim() : '';
        this.state.user.field = fieldEl ? fieldEl.value : 'Software Engineering';
        this.state.user.skills = skillsEl ? skillsEl.value.trim() : '';
        this.state.user.courses = coursesEl ? coursesEl.value.trim() : '';
        this.state.user.experience = experienceEl ? experienceEl.value.trim() : '';
        this.state.user.linkedin = linkedinEl ? linkedinEl.value.trim() : '';
        const wasEditing = this.state.isEditingProfile;
        this.state.isEditingProfile = false;
        this.saveUserData();
        this.updateUserUI();
        if (wasEditing) {
            this.showDashboard();
        } else {
            this.showDashboard();
        }
    },

    openEditProfile() {
        this.state.isEditingProfile = true;
        const u = this.state.user;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('name-input', u.name);
        set('field-select', u.field || 'Software Engineering');
        if (!document.getElementById('field-select').value) document.getElementById('field-select').value = 'Software Engineering';
        set('skills-input', u.skills);
        set('courses-input', u.courses);
        set('experience-input', u.experience);
        set('linkedin-input', u.linkedin);
        this.goToStage(1);
        this.updateOnboardingUI();
    },

    updateOnboardingUI() {
        const isEdit = this.state.isEditingProfile;
        const title = document.getElementById('onboarding-title');
        const subtitle = document.getElementById('onboarding-subtitle');
        const stepper = document.getElementById('onboarding-stepper');
        const backBtn = document.getElementById('onboarding-back-btn');
        const submitBtn = document.getElementById('onboarding-submit-btn');

        if (title) title.textContent = isEdit ? 'Edit Your Profile' : 'Your Profile';
        if (subtitle) subtitle.textContent = isEdit ? 'Update your details below.' : 'Help us personalize your experience.';
        if (stepper) stepper.classList.toggle('hidden', isEdit);
        if (backBtn) {
            backBtn.textContent = isEdit ? '← Back to Dashboard' : '← Back';
            backBtn.onclick = isEdit ? (() => { this.state.isEditingProfile = false; this.showDashboard(); }) : (() => this.goBack());
        }
        if (submitBtn) {
            submitBtn.innerHTML = isEdit ? 'Save Changes <i data-lucide="check" class="w-4 h-4 ml-1 inline"></i>' : 'Continue <i data-lucide="arrow-right" class="w-4 h-4 ml-1 inline"></i>';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    toggleCVImport() {
        const body = document.getElementById('cv-import-body');
        const chevron = document.getElementById('cv-chevron');
        if (!body) return;
        const isOpen = !body.classList.contains('hidden');
        body.classList.toggle('hidden', isOpen);
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
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
        const education = document.getElementById('cv-review-education')?.value || '';

        // Apply to form fields
        const nameEl = document.getElementById('name-input');
        const fieldEl = document.getElementById('field-select');
        const skillsEl = document.getElementById('skills-input');
        const coursesEl = document.getElementById('courses-input');
        const experienceEl = document.getElementById('experience-input');

        if (nameEl && name) nameEl.value = name;
        if (fieldEl && field) fieldEl.value = field;
        if (skillsEl && skills) skillsEl.value = skills;
        if (coursesEl && courses) coursesEl.value = courses;
        if (experienceEl && experience) experienceEl.value = experience;

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
            skills: extracted.skills.join(', '),
            experience: extracted.experience,
            courses: extracted.courses.join(', '),
            // Store structured data for review
            _extracted: extracted
        };
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

    deleteAccount() {
        if (!this.state.currentUser || !this.state.currentUser.email) {
            alert('No account to delete.');
            return;
        }
        const confirmed = confirm('Delete your account?\n\nThis will permanently remove your profile and all session history. This cannot be undone.');
        if (!confirmed) return;
        const email = this.state.currentUser.email;
        const users = JSON.parse(localStorage.getItem('prepwise_users_v2') || '{}');
        delete users[email];
        localStorage.setItem('prepwise_users_v2', JSON.stringify(users));
        localStorage.removeItem('prepwise_session_v2');
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
    runAnalysis() {
        const jobDesc = this.state.job.description;
        const userField = this.state.user.field.toLowerCase();
        const userSkillsList = this.state.user.skills.split(',').map(s => s.trim()).filter(Boolean);

        // Extract requirements and match
        const requirements = this.extractRequirements(jobDesc);
        let matchScore = 50;
        let strengths = [];
        let gaps = [];
        let topics = [];

        if (requirements.length > 0) {
            const { matched, missing } = this.matchRequirements(requirements, userSkillsList);
            matchScore = Math.max(20, Math.min(95, Math.round(matched.length / requirements.length * 100) + (Math.random() * 10 - 5)));

            strengths = matched.slice(0, 4);
            gaps = missing.slice(0, 6);
            topics = gaps.slice(0, 3);
        } else {
            // Fallback to old method if no requirements found
            const jobDescLower = jobDesc.toLowerCase();
            const jobKeywords = this.extractJobKeywords(jobDescLower);
            matchScore = this.calculateMatchScore(jobKeywords, userSkillsList, userField, jobDescLower);
            strengths = this.extractStrengths(jobKeywords, userSkillsList, userField);
            gaps = this.identifySkillGaps(jobKeywords, userSkillsList);
            topics = this.generateFocusTopics(jobKeywords, gaps, userField);
        }

        this.state.analysis.matchScore = matchScore;
        this.state.analysis.strengths = strengths;
        this.state.analysis.gaps = gaps;
        this.state.analysis.topics = topics;
        this.state.analysis.difficulty = this.getDifficultyLevel(matchScore, gaps.length);

        const diffLevel = matchScore > 85 ? 2 : (matchScore > 70 ? 3 : 4);

        const el = (id) => document.getElementById(id);
        if (el('match-score')) el('match-score').textContent = `${matchScore}%`;
        if (el('difficulty-text')) el('difficulty-text').textContent = this.state.analysis.difficulty;
        if (el('difficulty-dots')) {
            Array.from(el('difficulty-dots').children).forEach((dot, i) => {
                dot.className = `w-3.5 h-3.5 rounded-full ${i < diffLevel ? 'bg-accent-lavender shadow-[0_0_10px_rgba(155,138,251,0.4)]' : 'bg-slate-200'}`;
            });
        }

        // Render with pill backgrounds
        const renderRequirement = (req, icon, iconColor) => `
            <li class="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-brand-900 leading-snug">
                <i data-lucide="${icon}" class="w-3.5 h-3.5 ${iconColor} mt-0.5 shrink-0"></i>
                ${req}
            </li>
        `;

        if (el('analysis-strengths')) el('analysis-strengths').innerHTML = strengths.map(s => renderRequirement(s, 'check', 'text-[#63D5C4]')).join('');
        if (el('analysis-gaps')) el('analysis-gaps').innerHTML = gaps.map(g => renderRequirement(g, 'minus', 'text-red-400')).join('');
        if (el('analysis-topics')) el('analysis-topics').innerHTML = topics.map(t => renderRequirement(t, 'circle-dot', 'text-brand-500')).join('');

        if (el('job-input-section')) el('job-input-section').classList.add('hidden');
        if (el('analysis-results-section')) el('analysis-results-section').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
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

    // Detect user correction
    isUserCorrection(text) {
        const correctionPatterns = [
            /actually|i meant|sorry|let me correct|that's not right|i should say|i meant to say|not exactly|correction|i don't actually/i
        ];
        return correctionPatterns.some(pattern => pattern.test(text));
    },

    startInterview() {
        this.state.interview.currentQuestionIndex = 0;
        this.state.interview.responses = [];
        this.state.interview.startTime = new Date();
        this.state.interview.awaitingFollowUp = false;
        this.state.interview.questions = [];

        // Analyze job description
        const jobAnalysis = this.analyzeJobDescription();

        this.state.interview.conversationContext = {
            stage: 'opening',
            stagesCompleted: [],
            jobAnalysis: jobAnalysis,
            userSkills: this.extractUserSkills(),
            mentionedTopics: [],
            clarificationAsked: false,
            correctionMade: false,
            extractedInfo: {
                background: [],
                skills: [],
                experiences: [],
                challenges: [],
                projects: [],
                achievements: [],
                tools: [],
                goals: [],
                weknowledge: [],
                doesNotKnow: []
            },
            technicalAsked: 0,
            lastAnswerQuality: null,
            followUpCount: 0,
            maxFollowUpsPerStage: 2
        };

        // Generate opening question
        const openingQuestion = this.generateOpeningQuestion();
        this.state.interview.questions.push(openingQuestion);

        this.goToStage(4);
        this.resetTranscriptState();
        setTimeout(() => this.askQuestion(), 400);
    },

    extractUserSkills() {
        const skills = (this.state.user.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const experience = (this.state.user.experience || '').toLowerCase();

        return {
            mentioned: skills,
            hasPython: skills.some(s => s.includes('python')) || experience.includes('python'),
            hasSQL: skills.some(s => s.includes('sql')) || experience.includes('sql'),
            hasExcel: skills.some(s => s.includes('excel')) || experience.includes('excel'),
            hasAnalytics: skills.some(s => s.includes('analysis') || s.includes('analytics')) || experience.includes('analyz'),
            hasStatistics: skills.some(s => s.includes('statistic')) || experience.includes('statistic'),
            isTechnical: this.state.user.field && (this.state.user.field.toLowerCase().includes('engineer') || this.state.user.field.toLowerCase().includes('developer') || this.state.user.field.toLowerCase().includes('technical')),
            isDataRole: this.state.user.field && (this.state.user.field.toLowerCase().includes('data') || this.state.user.field.toLowerCase().includes('analyst')),
            isAdminRole: this.state.user.field && this.state.user.field.toLowerCase().includes('admin')
        };
    },

    generateOpeningQuestion() {
        const firstName = this.state.user.name ? this.state.user.name.split(' ')[0] : 'there';
        const hasJobDescription = this.state.job.description && this.state.job.description.trim().length > 10;

        if (hasJobDescription) {
            return `Hi ${firstName}! Thank you for taking the time to interview for this role. Before we dive into specifics, could you tell me a bit about your professional background and what drew you to this type of work?`;
        } else {
            return `Hi ${firstName}! To get us started, could you tell me about your professional background and experience in your field?`;
        }
    },

    askQuestion() {
        const question = this.state.interview.questions[this.state.interview.currentQuestionIndex];
        const questionEl = document.getElementById('question-text');
        const statusEl = document.getElementById('interviewer-status');
        const pulseEl = document.getElementById('ai-pulse');
        const counterEl = document.getElementById('question-counter');

        if (questionEl) questionEl.textContent = `"${question}"`;
        if (pulseEl) pulseEl.classList.remove('opacity-100');

        // Calculate progress based on interview stage
        const stageNames = ['Opening', 'Background', 'Skills', 'Behavioral', 'Growth', 'Role-Specific', 'Closing'];
        const currentStageIndex = Math.min(this.state.interview.currentQuestionIndex, stageNames.length - 1);
        const stageName = stageNames[currentStageIndex] || 'Interview';

        if (counterEl) {
            counterEl.textContent = `${stageName} — Question ${this.state.interview.currentQuestionIndex + 1}`;
        }

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
        const context = this.state.interview.conversationContext;
        const currentQuestion = this.state.interview.questions[this.state.interview.currentQuestionIndex];

        // Check if this is a clarification request
        if (this.isClarificationRequest(answer)) {
            // User is asking for clarification - don't record as answer, clarify the question
            const clarification = this.generateClarification(currentQuestion, answer);
            this.showAIBridge({
                text: clarification,
                type: 'clarification',
                injectAsNextQuestion: false
            }, () => {
                // Stay on same question, user can answer again
                this.resetTranscriptState();
                this.setMicState('idle');
            });
            return;
        }

        // Check if this is a user correction
        if (this.isUserCorrection(answer)) {
            // Handle correction
            const correctionResponse = this.handleUserCorrection(answer, context);
            this.showAIBridge({
                text: correctionResponse,
                type: 'correction',
                injectAsNextQuestion: false
            }, () => {
                // Reset and let user answer the current question
                this.resetTranscriptState();
                this.setMicState('idle');
            });
            return;
        }

        // Record answer as normal
        const analysis = this.analyzeAnswer(answer, this.state.interview.currentQuestionIndex);
        const feedback = this.generateNeuralFeedback(answer);

        this.state.interview.responses.push({
            question: currentQuestion,
            answer,
            analysis,
            feedback
        });

        // Check if this is candidate questions or closing
        if (context.stage === 'candidateQuestions' || context.stage === 'closing') {
            const ack = this.generateAdaptiveAcknowledgment(answer, analysis);
            this.showAIBridge(ack, () => {
                this.generateFinalReport();
                this.saveSession(this.state.analysis.matchScore + 2);
                this.goToStage(5);
            });
            return;
        }

        // Decide whether to follow up or move to next question
        let shouldFollowUp = analysis.shouldFollowUp && context.followUpCount < context.maxFollowUpsPerStage;

        // Generate acknowledgment
        const ack = this.generateAdaptiveAcknowledgment(answer, analysis);

        this.showAIBridge(ack, () => {
            if (shouldFollowUp && ack.followUpQuestion) {
                context.followUpCount++;
                this.state.interview.questions.push(ack.followUpQuestion);
            } else {
                context.followUpCount = 0;
                this.state.interview.currentQuestionIndex++;
                const nextQuestion = this.generateRealisticQuestion(answer, context);
                this.state.interview.questions.push(nextQuestion);
            }
            this.askQuestion();
        });
    },

    generateClarification(question, clarificationRequest) {
        // Detect what the user is confused about and clarify
        const isConfused = /what do you mean|can you explain|can you clarify|what are you asking/i.test(clarificationRequest);
        const isAskingForExample = /example|specific|concrete/i.test(clarificationRequest);
        const isAsking = /are you asking|do you mean|one or|which/i.test(clarificationRequest);

        if (isAskingForExample) {
            return `Of course. Let me give you some context. For example, this could be from your work experience, a project, your studies, or even from managing a task. Any situation where you used skills or made a decision would count. Does that help clarify?`;
        } else if (isAsking) {
            return `Let me rephrase that. I'm interested in your experience and how you approach this type of situation. Feel free to draw from any relevant experience you have. Can you give me an example?`;
        } else if (isConfused) {
            return `I understand. Let me reframe that. The core of what I'm asking is: Can you think of a real situation where you had to deal with this kind of challenge or decision?`;
        }
        return `Let me clarify. I'm asking about your experience with this type of situation. Any example you have would be helpful.`;
    },

    handleUserCorrection(answer, context) {
        context.correctionMade = true;

        // Extract what the user is correcting
        if (/don't know|not know|don't have/i.test(answer)) {
            return `Understood. That's helpful to know. I'll adjust the technical level of my questions based on what you do know. Let's focus on areas where you have experience.`;
        } else if (/meant to say|actually|i should say/i.test(answer)) {
            return `Thanks for clarifying that. I've got it. Please go ahead with your corrected answer.`;
        } else if (/wrong|incorrect|that's not right/i.test(answer)) {
            return `Got it, thanks for the correction. Let me adjust my understanding. Can you tell me what the correct information is?`;
        }
        return `Thanks for that correction. I appreciate the clarity.`;
    },

    analyzeAnswer(answer, questionIndex) {
        if (!answer || answer.trim().length === 0) return { quality: 'empty', shouldFollowUp: true, extractedInfo: {} };

        const words = answer.trim().split(/\s+/).length;
        const answerLower = answer.toLowerCase();

        // Classify answer quality
        let quality = 'complete';
        if (words < 10) quality = 'tooShort';
        else if (words < 25) quality = 'brief';
        else if (words > 200) quality = 'tooLong';

        const hasExample = /(i |my |we |project|when |worked on|built|led |created|solved|implemented|experience|situation|team|responsibility)/i.test(answer);
        const hasMetric = /(\d+%|\d+x|increased|improved|reduced|saved|achieved)/i.test(answer);
        const hasResult = /(result|outcome|achieved|improved|increased|reduced|saved|learned|realized|impact|growth)/i.test(answer);
        const hasChallenge = /(challenge|difficult|struggled|learned|overcome|hard|problem|issue)/i.test(answer);

        let shouldFollowUp = false;
        let followUpType = null;

        if (quality === 'empty' || quality === 'tooShort') {
            shouldFollowUp = true;
            followUpType = 'clarification';
        } else if (hasExample && !hasResult && !hasMetric) {
            shouldFollowUp = true;
            followUpType = 'outcome';
        } else if (hasChallenge && !hasResult) {
            shouldFollowUp = true;
            followUpType = 'learning';
        }

        // Extract key information
        const extractedInfo = {};

        // Skill extraction
        const skillKeywords = ['python', 'javascript', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 'leadership', 'communication', 'teamwork', 'analysis', 'design', 'project management', 'typescript', 'java', 'c++', 'go', 'rust', 'angular', 'vue', 'git', 'agile', 'scrum'];
        extractedInfo.skills = skillKeywords.filter(s => answerLower.includes(s));

        // Experience/project extraction
        if (/(project|built|created|developed|designed|led|managed|worked on)/i.test(answer)) {
            extractedInfo.hasProjectExperience = true;
        }

        // Challenge extraction
        if (hasChallenge) {
            extractedInfo.mentionedChallenge = true;
        }

        // Achievement extraction
        if (hasMetric || hasResult) {
            extractedInfo.mentionedOutcome = true;
        }

        return {
            quality,
            words,
            hasExample,
            hasResult,
            hasMetric,
            hasChallenge,
            shouldFollowUp,
            followUpType,
            extractedInfo
        };
    },

    generateAdaptiveAcknowledgment(answer, analysis) {
        const { quality, followUpType, extractedInfo } = analysis;

        // More realistic interviewer acknowledgments
        const ackMap = {
            empty: {
                text: `I didn't quite catch that. Could you share a bit more?`,
                followUp: "Can you walk me through a specific example or situation?"
            },
            tooShort: {
                text: `I want to understand that a bit better.`,
                followUp: extractedInfo.mentionedChallenge ?
                    "Can you give me a specific example of how you handled that?"
                    : "Can you tell me more about that situation?"
            },
            brief: {
                text: followUpType === 'outcome' ?
                    "That gives me some context. What was the actual outcome or impact?"
                    : followUpType === 'learning' ?
                    "I see. What did you take away from that experience?"
                    : "Thank you. I appreciate that.",
                followUp: null
            },
            complete: {
                text: quality === 'tooLong' ?
                    "That's detailed. To focus on what matters most — what would you say was the key impact?"
                    : "That's helpful. I can see you have solid experience there.",
                followUp: null
            }
        };

        const ack = ackMap[quality] || ackMap.complete;
        return {
            text: ack.text,
            followUpQuestion: ack.followUp,
            injectAsNextQuestion: !!ack.followUp,
            type: followUpType ? 'probe' : 'acknowledge',
            shouldFollowUp: analysis.shouldFollowUp
        };
    },

    generateRealisticQuestion(prevAnswer, context) {
        const currentIndex = this.state.interview.currentQuestionIndex;
        const jobAnalysis = context.jobAnalysis;
        const userSkills = context.userSkills;
        const stage = context.stage;

        // Stage progression logic
        if (currentIndex === 1) {
            context.stage = 'background';
            return this.generateBackgroundQuestion(prevAnswer, jobAnalysis);
        } else if (currentIndex === 2) {
            context.stage = 'rolefit';
            return this.generateRoleFitQuestion(prevAnswer, jobAnalysis);
        } else if (currentIndex === 3) {
            context.stage = 'behavioral';
            return this.getBehavioralQuestion();
        } else if (currentIndex === 4) {
            context.stage = 'technical';
            return this.generateTechnicalQuestion(userSkills, jobAnalysis);
        } else if (currentIndex === 5) {
            context.stage = 'scenario';
            return this.generateScenarioQuestion(jobAnalysis, userSkills);
        } else if (currentIndex === 6) {
            context.stage = 'closing';
            return `Before we wrap up, do you have any questions for me about the role, team, or company?`;
        }

        // Fallback
        return `Is there anything else you'd like me to know about your experience with this type of work?`;
    },

    generateBackgroundQuestion(prevAnswer, jobAnalysis) {
        const prevLower = prevAnswer.toLowerCase();

        // If they mentioned a specific role or company, ask about it
        if (/worked|company|role|position|engineer|analyst|manager/i.test(prevAnswer)) {
            return `That's helpful. Can you tell me more about what you did in that role and what technologies or tools you worked with?`;
        }

        // If they mentioned education
        if (/studied|school|university|degree|graduate/i.test(prevAnswer)) {
            return `Good. Beyond your studies, can you describe a project or work experience where you applied what you learned?`;
        }

        // Generic follow-up to background
        return `I appreciate that context. What's the most relevant experience you have for this type of role?`;
    },

    generateRoleFitQuestion(prevAnswer, jobAnalysis) {
        const skills = jobAnalysis.skills;
        const roleType = jobAnalysis.roleType;
        const prevLower = prevAnswer.toLowerCase();

        // If job requires specific technical skills, ask about them
        if (skills.dataVisualization && !prevLower.includes('dashboard') && !prevLower.includes('visualization')) {
            return `This role involves creating dashboards and visualizations. What's your experience with tools like Excel, Tableau, Power BI, or similar visualization tools?`;
        }

        if (skills.sql && !prevLower.includes('sql') && !prevLower.includes('database')) {
            return `The position involves working with databases. How comfortable are you with SQL, and have you written SQL queries before?`;
        }

        if (skills.python && !prevLower.includes('python')) {
            return `This role mentions Python for data analysis. Do you have experience with Python, or is that something you're looking to develop?`;
        }

        if (skills.communication && !prevLower.includes('stakeholder') && !prevLower.includes('communication')) {
            return `The role requires communicating insights to non-technical stakeholders. Can you describe your experience explaining technical concepts to business teams?`;
        }

        // Role-specific questions
        if (roleType === 'dataRole') {
            return `For a data-focused role like this, can you walk me through your process for analyzing a new dataset from start to finish?`;
        }

        if (roleType === 'adminRole') {
            return `For an administrative role, can you describe how you've organized or improved a process or system in your previous experience?`;
        }

        return `Looking at the specific requirements of this role, what aspect of the work are you most excited about?`;
    },

    getBehavioralQuestion() {
        const templates = this.behavioralQuestionTemplates();
        const randomIndex = Math.floor(Math.random() * templates.length);
        return templates[randomIndex];
    },

    generateTechnicalQuestion(userSkills, jobAnalysis) {
        const library = this.technicalQuestionLibrary();
        const jobSkills = jobAnalysis.skills;

        // Ask about skills mentioned in both job and user profile
        if (jobSkills.python && userSkills.hasPython) {
            const questions = library.python;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (jobSkills.sql && userSkills.hasSQL) {
            const questions = library.sql;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (jobSkills.excel && userSkills.hasExcel) {
            const questions = library.excel;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (jobSkills.dataVisualization) {
            const questions = library.dataVisualization;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (jobSkills.statistics) {
            const questions = library.statistics;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        // If no specific match, ask about general problem-solving
        return `Let's talk about your problem-solving approach. Walk me through how you would tackle a complex problem in your domain.`;
    },

    generateScenarioQuestion(jobAnalysis, userSkills) {
        const roleType = jobAnalysis.roleType;
        const templates = this.scenarioQuestionTemplates();

        if (roleType === 'dataRole' && templates.dataRole) {
            const questions = templates.dataRole;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (roleType === 'adminRole' && templates.adminRole) {
            const questions = templates.adminRole;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        if (roleType === 'communicationRole' && templates.communicationRole) {
            const questions = templates.communicationRole;
            return questions[Math.floor(Math.random() * questions.length)];
        }

        // Generic scenario
        return `Let me give you a workplace scenario. You're working on a task and discover something unexpected or a problem you didn't anticipate. How would you handle it?`;
    },

    generateContextualQuestion(responseIndex, prevAnswer) {
        const context = this.state.interview.conversationContext;
        const mode = this.state.interviewMode;
        const field = this.state.user.field || 'your field';
        const prevAnalysis = responseIndex > 0 ? this.state.interview.responses[responseIndex - 1]?.analysis : null;

        // Stage 0: Opening - already asked
        // Stage 1: Background/motivation based on response 0
        if (responseIndex === 1) {
            context.stage = 'background';
            context.stagesCompleted.push('opening');

            if (prevAnalysis?.extractedInfo?.hasProjectExperience) {
                return `You mentioned working on projects. Can you walk me through one project you're particularly proud of and your specific role in it?`;
            } else if (prevAnswer && (prevAnswer.toLowerCase().includes('school') || prevAnswer.toLowerCase().includes('university'))) {
                return `You mentioned your academic background. Beyond coursework, can you describe a time when you applied what you learned in a practical or real-world situation?`;
            } else {
                return `What specifically drew you to ${field}, and can you describe one experience that really solidified that interest for you?`;
            }
        }

        // Stage 2: Skills/Strengths - deepen understanding
        if (responseIndex === 2) {
            context.stage = 'skills';
            context.stagesCompleted.push('background');

            if (prevAnalysis?.extractedInfo?.skills?.length > 0) {
                const skill = prevAnalysis.extractedInfo.skills[0];
                return `You mentioned ${skill}. How did you develop expertise in that area, and can you give me a specific example of when you used it to make a meaningful impact?`;
            } else {
                return `Looking at your overall background, what would you say are your 2-3 core strengths, and can you give me an example of how you've applied each one?`;
            }
        }

        // Stage 3: Behavioral/Teamwork
        if (responseIndex === 3) {
            context.stage = 'behavioral';
            context.stagesCompleted.push('skills');

            const hasTeamExperience = this.state.interview.responses.some(r =>
                /team|collaborated|worked with|group|together/i.test(r.answer)
            );

            if (!hasTeamExperience) {
                return `Tell me about a time when you had to work with others toward a common goal. How did you contribute to the team's success?`;
            } else {
                return `You mentioned working with teams. Tell me about a time when you disagreed with a teammate on the approach to something. How did you handle it?`;
            }
        }

        // Stage 4: Pressure/Resilience/Growth
        if (responseIndex === 4) {
            context.stage = 'growth';
            const hasChallengeAnswer = prevAnalysis?.hasChallenge;

            if (hasChallengeAnswer) {
                return `That's a good example of handling challenges. Now, tell me about a time when something didn't go as you expected. What did you learn from that experience?`;
            } else {
                return `Tell me about a time when you faced a significant challenge or setback. How did you work through it?`;
            }
        }

        // Stage 5: Role-specific or Technical
        if (responseIndex === 5) {
            context.stage = 'roleSpecific';
            context.stagesCompleted.push('growth');

            if (mode === 'technical' || mode === 'case') {
                return mode === 'technical' ?
                    `Let's do a technical scenario. You encounter a problem you've never faced before. Walk me through how you'd approach diagnosing and solving it.`
                    : `Here's a business scenario. You need to launch a new product feature but have limited resources. How would you approach this strategically?`;
            } else {
                return `Let me ask you a hypothetical. If you started here and encountered resistance to one of your ideas, how would you handle gaining buy-in?`;
            }
        }

        // Stage 6: Closing/Questions for interviewer
        if (responseIndex === 6) {
            context.stage = 'closing';
            context.stagesCompleted.push('roleSpecific');
            return `Before we wrap up, do you have any questions for me about the role, the team, or the company?`;
        }

        // Fallback
        return `Is there anything else you'd like me to know about you as a candidate?`;
    },

    generateAIAcknowledgment(answer) {
        const name = this.state.user.name ? this.state.user.name.split(' ')[0] : '';
        const words = answer.trim().split(/\s+/).length;
        const hasExample = /(I |my |we |project|when |worked on|built|led |created|solved|implemented|experience)/i.test(answer);
        const hasResult = /(result|outcome|achieved|improved|increased|reduced|saved|learned|realized|impact)/i.test(answer);

        // Very short answer — inject a clarifying follow-up
        if (words < 12) {
            const followUps = [
                "Could you walk me through a specific example of that?",
                "I'd like to hear more — can you give me a concrete situation?",
                "What's a real example from your experience where that came up?"
            ];
            return {
                text: `I want to dig a little deeper on that${name ? `, ${name}` : ''}.`,
                followUpQuestion: followUps[Math.floor(Math.random() * followUps.length)],
                injectAsNextQuestion: true,
                type: 'probe'
            };
        }

        // Has example but missing results — ask about outcome
        if (hasExample && !hasResult) {
            const bridges = [
                "That's helpful context. But what actually happened — what was the result?",
                "Good example. I'm curious about the outcome — what changed or improved?",
                "I see the situation. What was the impact of your actions?"
            ];
            const text = bridges[Math.floor(Math.random() * bridges.length)];
            return { text, injectAsNextQuestion: false, type: 'bridge' };
        }

        // Good detailed answer — acknowledge genuinely and move on
        const acks = [
            "That's really clear. I can see you have solid experience there.",
            "Solid — you've clearly thought about this.",
            "Good answer. That tells me something important about how you approach things.",
            "I like that. Shows real depth.",
            `That's well said${name ? `, ${name}` : ''}. Moving on.`
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
        const prevAnswer = idx > 0 ? (this.state.interview.responses[idx - 1]?.answer || '') : '';
        const structure = {
            1: {
                hr: `Interesting. You mentioned ${prevAnswer.substring(0, 30).toLowerCase().includes('experi') ? 'experience' : 'that'}. What specifically drew you to this kind of role, ${name}?`,
                technical: `Great foundation. Given your background in ${this.state.user.field}, what technical challenge excites you most about this position?`,
                case: `From a strategic lens — why are you interested in tackling the specific challenges this role involves?`,
                rapid: `Quick one: in 20 seconds, what's your biggest motivation here?`,
                friendly: `That's great context. What was the "spark" moment for you in ${this.state.user.field}?`
            },
            2: {
                hr: "Now let's talk about teamwork. Describe a situation where you had to collaborate with someone challenging. How did you make it work?",
                technical: "Tell me about a time you had to explain something technical to a non-technical person. How did you approach it?",
                case: "Walk me through a time you had to convince someone skeptical. What was your approach?",
                rapid: "Team conflict: relationship or deadline? Real example?",
                friendly: "Tell me about a time you really helped a teammate. What did you do?"
            },
            3: {
                hr: `You mentioned ${prevAnswer.substring(0, 20).toLowerCase()}. When have you shown that under real pressure?`,
                technical: "Imagine you suddenly need to handle 10x more traffic. How would you approach redesigning the system?",
                case: "A competitor launches a feature targeting your core users. Your 48-hour action plan?",
                rapid: "Critical bug, 2 hours to deadline. What's your first move?",
                friendly: "Tell me about a high-pressure moment. How did you handle it?"
            },
            4: {
                hr: "Tell me about a significant setback. What did you learn from it?",
                technical: "Describe the most complex technical challenge you've solved. Walk me through your process.",
                case: "Budget cuts of 50% tomorrow. Which features survive and why?",
                rapid: "Most creative solution you've built. 15 seconds.",
                friendly: "What challenge tested your resilience the most? How'd you overcome it?"
            },
            5: {
                hr: "What's one real weakness you're actively turning into a strength right now?",
                technical: "How do you keep your technical skills sharp? What are you learning?",
                case: "If you were interviewing for this role, what's the one question you'd ask?",
                rapid: "One reason NOT to hire you that actually signals high potential?",
                friendly: "What's one thing you're most excited to learn here?"
            }
        };
        const q = structure[idx] ? (structure[idx][mode] || structure[idx]['hr']) : "What else would you like me to know about you?";
        this.state.interview.questions.push(q);
    },

    generateNeuralFeedback(answer) {
        if (!answer || answer.trim().length === 0) return null;

        const words = answer.trim().split(/\s+/).length;
        const hasExample = /(project|when|worked|built|led|created|solved|implemented|experience|situation|team|responsibility|managed|developed)/i.test(answer);
        const hasResult = /(result|outcome|achieved|improved|increased|reduced|saved|impact|learned|growth|success)/i.test(answer);
        const hasMetric = /(\d+%|\d+x|increased|improved|reduced|saved|\d+\s*(hours|days|weeks|months|dollars|percent|people|users|records))/i.test(answer);
        const hasChallenge = /(challenge|difficult|struggled|overcome|hard|problem|issue|learned|mistake|failed|unexpected)/i.test(answer);
        const isSTARFormat = hasExample && hasResult;
        const lengthGood = words >= 40 && words <= 120;

        // Realistic interviewer feedback
        if (words < 12) {
            return "That response was quite brief. In a real interview, aim to provide more context and detail about your example and what you learned.";
        }
        if (words < 25 && !hasExample) {
            return "Your answer is a bit general. Try grounding it in a specific example or situation. Concrete stories are what interviewers remember.";
        }
        if (hasExample && !hasResult) {
            return "Good that you provided an example. To strengthen this, also explain what the outcome was or what you took from it. That shows impact.";
        }
        if (hasExample && hasResult && !hasMetric) {
            return "Solid response with a clear situation and outcome. If available, including specific numbers or metrics would make this even stronger.";
        }
        if (isSTARFormat && hasMetric && lengthGood) {
            return "Strong answer. You clearly described the situation, your actions, and measurable results. That's exactly what interviewers look for.";
        }
        if (hasChallenge && hasResult && lengthGood) {
            return "Excellent. You tackled a real challenge and explained what you learned. That demonstrates problem-solving and growth mindset.";
        }
        if (words > 180) {
            return "You provided great detail, but in an interview, aim for 50–100 words. This keeps the conversation flowing and shows you can be concise.";
        }
        if (lengthGood && hasExample) {
            return "That's a solid response. You gave enough context, were specific, and stayed concise. Good interviewing.";
        }

        return "You answered directly and provided relevant information. Good.";
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
                            <span class="text-[9px] font-black text-brand-500 uppercase tracking-widest">Q${i+1}</span>
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

        // Analyze interview performance based on actual responses
        const responses = this.state.interview.responses;
        const allAnswers = responses.map(r => r.answer || '').join(' ');
        const totalWords = allAnswers.split(/\s+/).length;
        const avgWordsPerAnswer = Math.round(totalWords / (responses.length || 1));

        // Count different characteristics
        let exampleCount = 0;
        let resultCount = 0;
        let metricsCount = 0;
        let challengeCount = 0;
        let shortAnswersCount = 0;

        responses.forEach(r => {
            if (!r.answer || r.answer.length < 25) shortAnswersCount++;
            if (/(project|worked|built|led|created|solved|implemented|situation)/i.test(r.answer)) exampleCount++;
            if (/(result|outcome|achieved|improved|increased|reduced|impact|learned)/i.test(r.answer)) resultCount++;
            if (/(\d+%|\d+x|increased|improved|reduced)/i.test(r.answer)) metricsCount++;
            if (/(challenge|difficult|overcome|problem)/i.test(r.answer)) challengeCount++;
        });

        const strengths = [];
        const weaknesses = [];

        // Dynamic strengths
        if (exampleCount >= responses.length * 0.7) {
            strengths.push({ icon: 'shield-check', text: 'Used specific examples throughout' });
        }
        if (resultCount >= responses.length * 0.7) {
            strengths.push({ icon: 'zap', text: 'Clearly articulated outcomes and impact' });
        }
        if (metricsCount >= responses.length * 0.5) {
            strengths.push({ icon: 'trending-up', text: 'Included measurable results' });
        }
        if (challengeCount >= 2) {
            strengths.push({ icon: 'award', text: 'Demonstrated growth through challenges' });
        }
        if (avgWordsPerAnswer >= 60) {
            strengths.push({ icon: 'message-square', text: 'Gave thoughtful, detailed answers' });
        }

        // Dynamic weaknesses
        if (shortAnswersCount >= 2) {
            weaknesses.push({ icon: 'target', text: 'Some answers were too brief — expand with more detail next time' });
        }
        if (exampleCount < responses.length * 0.5) {
            weaknesses.push({ icon: 'alert-circle', text: 'Use more specific, real examples from your experience' });
        }
        if (resultCount < responses.length * 0.5) {
            weaknesses.push({ icon: 'trending-down', text: 'Always mention the outcome — what changed or what you learned?' });
        }
        if (metricsCount < 2) {
            weaknesses.push({ icon: 'hash', text: 'Use metrics and numbers to quantify impact when possible' });
        }

        // Ensure at least one of each
        if (strengths.length === 0) {
            strengths.push({ icon: 'check-circle', text: 'Completed the full interview successfully' });
        }
        if (weaknesses.length === 0) {
            weaknesses.push({ icon: 'lightbulb', text: 'Challenge yourself with more complex scenarios in practice' });
        }

        const strengthsEl = document.getElementById('report-strengths');
        const weakEl = document.getElementById('report-weaknesses');

        if (strengthsEl) {
            strengthsEl.innerHTML = strengths.map(s => `<li class="flex gap-3 p-3.5 bg-white rounded-lg border border-slate-100 text-xs font-bold text-brand-900"><i data-lucide="${s.icon}" class="w-4 h-4 text-[#63D5C4] shrink-0"></i>${s.text}</li>`).join('');
        }
        if (weakEl) {
            weakEl.innerHTML = weaknesses.map(w => `<li class="flex gap-3 p-3.5 bg-white rounded-lg border border-slate-100 text-xs font-bold text-brand-900"><i data-lucide="${w.icon}" class="w-4 h-4 text-[#A37BFF] shrink-0"></i>${w.text}</li>`).join('');
        }

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
        const firstName = name.split(' ')[0];

        // Header and profile info
        if (el('dash-user-name')) el('dash-user-name').textContent = `Hi, ${firstName}!`;
        if (el('dash-full-name')) el('dash-full-name').textContent = name;
        if (el('dash-user-field')) el('dash-user-field').textContent = this.state.user.field || '';
        if (el('user-initials-dash')) el('user-initials-dash').textContent = name.split(' ').map(n => n[0]).join('').toUpperCase();

        // Skills tags
        const tagsContainer = el('dash-skills-tags');
        const noSkillsMsg = el('dash-no-skills');
        if (tagsContainer && noSkillsMsg) {
            const skills = (this.state.user.skills || '').split(',').map(s => s.trim()).filter(Boolean);
            if (skills.length > 0) {
                tagsContainer.innerHTML = skills.map(s => `<span class="inline-block px-2.5 py-1 bg-brand-50 text-brand-500 rounded-lg text-[8px] font-black uppercase tracking-wider border border-brand-100">${s}</span>`).join('');
                noSkillsMsg.classList.add('hidden');
            } else {
                tagsContainer.innerHTML = '';
                noSkillsMsg.classList.remove('hidden');
            }
        }

        // Experience section
        const expSection = el('dash-experience');
        const expText = el('dash-experience-text');
        if (expSection && expText) {
            const exp = (this.state.user.experience || '').trim();
            if (exp) {
                expText.textContent = exp;
                expSection.classList.remove('hidden');
            } else {
                expSection.classList.add('hidden');
            }
        }

        // LinkedIn link
        const linkedinLink = el('dash-linkedin-link');
        const linkedinText = el('dash-linkedin-text');
        if (linkedinLink) {
            const url = this.state.user.linkedin || '';
            if (url) {
                linkedinLink.href = url.startsWith('http') ? url : `https://${url}`;
                if (linkedinText) {
                    try { linkedinText.textContent = new URL(linkedinLink.href).hostname; }
                    catch { linkedinText.textContent = 'LinkedIn Profile'; }
                }
                linkedinLink.classList.remove('hidden');
                linkedinLink.classList.add('flex');
            } else {
                linkedinLink.classList.add('hidden');
                linkedinLink.classList.remove('flex');
            }
        }

        // Session history
        const list = el('session-history-list');
        const emptyCTA = el('dash-session-empty-cta');
        if (list) {
            if (this.state.sessions.length > 0) {
                if (emptyCTA) emptyCTA.classList.add('hidden');
                list.classList.remove('hidden');
                list.innerHTML = this.state.sessions.map(s => `
                    <div class="p-4 bg-slate-50 rounded-lg hover:bg-white hover:shadow-soft transition-all cursor-pointer border border-transparent hover:border-slate-100">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-8 h-8 bg-brand-900 text-[#63D5C4] rounded-lg flex items-center justify-center shrink-0">
                                    <i data-lucide="award" class="w-3.5 h-3.5"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${s.date} &bull; ${s.mode}</p>
                                    <p class="text-xs font-bold text-brand-900 truncate">${s.field}</p>
                                </div>
                            </div>
                            <div class="text-right shrink-0 ml-2">
                                <p class="text-lg font-black text-brand-500">${s.score}%</p>
                                <p class="text-[8px] font-black text-[#63D5C4] uppercase tracking-widest">Match</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '';
                list.classList.add('hidden');
                if (emptyCTA) emptyCTA.classList.remove('hidden');
            }
        }
        this.goToStage(7);
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
