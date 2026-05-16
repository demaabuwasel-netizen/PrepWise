/**
 * InterviewAI - Core Application Logic
 */

const app = {
    // --- State ---
    state: {
        user: {
            name: '',
            email: '',
            field: '',
            skills: '',
            courses: ''
        },
        job: {
            description: '',
            link: ''
        },
        interview: {
            currentQuestionIndex: 0,
            questions: [],
            responses: [],
            startTime: null,
            timerInterval: null,
            isListening: false
        }
    },

    // --- Configuration ---
    config: {
        totalQuestions: 5,
        voices: []
    },

    // --- Initialization ---
    init() {
        console.log("InterviewAI Initializing...");
        this.cacheDOM();
        this.bindEvents();
        this.initSpeech();
        lucide.createIcons();
    },

    cacheDOM() {
        this.views = {
            profile: document.getElementById('profile-view'),
            job: document.getElementById('job-view'),
            interview: document.getElementById('interview-view'),
            feedback: document.getElementById('feedback-view')
        };
        
        this.forms = {
            profile: document.getElementById('profile-form'),
            job: document.getElementById('job-form')
        };

        this.interviewUI = {
            questionText: document.getElementById('question-text'),
            statusText: document.getElementById('interviewer-status'),
            listeningIndicator: document.getElementById('listening-indicator'),
            transcriptPreview: document.getElementById('transcript-preview'),
            progressBar: document.getElementById('progress-bar'),
            progressVal: document.getElementById('progress-val'),
            timerText: document.getElementById('timer'),
            micBtn: document.getElementById('mic-toggle-btn'),
            nextBtn: document.getElementById('next-question-btn'),
            endBtn: document.getElementById('end-interview-btn')
        };
    },

    bindEvents() {
        // Form Submissions
        this.forms.profile.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.state.user = Object.fromEntries(formData.entries());
            this.showPage('job-view');
        });

        this.forms.job.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.state.job = Object.fromEntries(formData.entries());
            this.startInterview();
        });

        // Interview Controls
        this.interviewUI.micBtn.addEventListener('click', () => this.toggleListening());
        this.interviewUI.nextBtn.addEventListener('click', () => this.handleNextQuestion());
        this.interviewUI.endBtn.addEventListener('click', () => this.endInterview());
    },

    // --- Navigation ---
    showPage(pageId) {
        Object.values(this.views).forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(pageId);
        if (targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        lucide.createIcons();
    },

    // --- Speech Services ---
    initSpeech() {
        // Text-to-Speech Setup
        window.speechSynthesis.onvoiceschanged = () => {
            this.config.voices = window.speechSynthesis.getVoices();
        };

        // Speech-to-Text Setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                this.interviewUI.transcriptPreview.textContent = finalTranscript || interimTranscript;
                this.interviewUI.transcriptPreview.classList.remove('hidden');
            };

            this.recognition.onend = () => {
                if (this.state.interview.isListening) {
                    this.recognition.start();
                }
            };
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    },

    speak(text, callback) {
        window.speechSynthesis.cancel(); // Stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a professional sounding voice
        const preferredVoice = this.config.voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
                               || this.config.voices[0];
        
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            this.interviewUI.statusText.textContent = "Interviewer Speaking...";
            this.interviewUI.statusText.classList.add('text-brand-600');
        };

        utterance.onend = () => {
            this.interviewUI.statusText.textContent = "Your Turn";
            this.interviewUI.statusText.classList.remove('text-brand-600');
            if (callback) callback();
        };

        window.speechSynthesis.speak(utterance);
    },

    toggleListening() {
        if (!this.recognition) {
            alert("Speech recognition is not supported in your browser. Please type your answers (Feature coming soon).");
            return;
        }

        if (this.state.interview.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },

    startListening() {
        this.state.interview.isListening = true;
        this.recognition.start();
        this.interviewUI.listeningIndicator.classList.remove('hidden');
        this.interviewUI.micBtn.classList.add('bg-red-500', 'ring-4', 'ring-red-100');
        this.interviewUI.micBtn.innerHTML = '<i data-lucide="mic-off" class="w-6 h-6"></i>';
        lucide.createIcons();
    },

    stopListening() {
        this.state.interview.isListening = false;
        this.recognition.stop();
        this.interviewUI.listeningIndicator.classList.add('hidden');
        this.interviewUI.micBtn.classList.remove('bg-red-500', 'ring-4', 'ring-red-100');
        this.interviewUI.micBtn.innerHTML = '<i data-lucide="mic" class="w-6 h-6"></i>';
        lucide.createIcons();
    },

    // --- Interview Logic ---
    startInterview() {
        this.state.interview.currentQuestionIndex = 0;
        this.state.interview.responses = [];
        this.state.interview.startTime = new Date();
        this.generateQuestions();
        this.showPage('interview-view');
        this.startTimer();
        this.askQuestion();
    },

    generateQuestions() {
        // In a real app, this would be an API call to Gemini/OpenAI
        // Here we simulate AI generation based on user profile and job description
        const skills = this.state.user.skills.split(',');
        const firstSkill = skills[0].trim() || 'your background';
        
        this.state.interview.questions = [
            `Welcome ${this.state.user.name}. To start, could you tell me a bit about your experience with ${firstSkill} as it relates to this role?`,
            `The job description mentions specific requirements. How does your field of study in ${this.state.user.field} prepare you for these challenges?`,
            `Can you describe a specific project from your ${this.state.user.courses.split(',')[0]} course where you had to solve a complex problem?`,
            `What is your biggest professional strength, and how will it benefit our team?`,
            `Finally, why are you interested in this specific position and what do you hope to achieve here?`
        ];
    },

    askQuestion() {
        const index = this.state.interview.currentQuestionIndex;
        const question = this.state.interview.questions[index];
        
        this.interviewUI.questionText.textContent = `"${question}"`;
        this.updateProgress();

        // Speak the question, then automatically start listening
        this.speak(question, () => {
            setTimeout(() => this.startListening(), 500);
        });
    },

    handleNextQuestion() {
        // Save current response
        const responseText = this.interviewUI.transcriptPreview.textContent;
        this.state.interview.responses.push({
            question: this.state.interview.questions[this.state.interview.currentQuestionIndex],
            answer: responseText
        });

        // Reset UI
        this.stopListening();
        this.interviewUI.transcriptPreview.textContent = "";
        this.interviewUI.transcriptPreview.classList.add('hidden');

        // Move to next or end
        this.state.interview.currentQuestionIndex++;
        if (this.state.interview.currentQuestionIndex < this.state.interview.questions.length) {
            this.askQuestion();
        } else {
            this.endInterview();
        }
    },

    updateProgress() {
        const current = this.state.interview.currentQuestionIndex + 1;
        const total = this.state.interview.questions.length;
        const percent = (current / total) * 100;

        this.interviewUI.progressVal.textContent = `${current} / ${total}`;
        this.interviewUI.progressBar.style.width = `${percent}%`;
    },

    startTimer() {
        if (this.state.interview.timerInterval) clearInterval(this.state.interview.timerInterval);
        
        this.state.interview.timerInterval = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now - this.state.interview.startTime) / 1000);
            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            this.interviewUI.timerText.textContent = `${mins}:${secs}`;
        }, 1000);
    },

    endInterview() {
        clearInterval(this.state.interview.timerInterval);
        this.stopListening();
        window.speechSynthesis.cancel();
        
        // Generate Adaptive Next Task
        this.generateNextTask();
        
        this.showPage('feedback-view');
    },

    generateNextTask() {
        const field = this.state.user.field.toLowerCase();
        let title = "Problem Solving Challenge";
        let desc = "Analyze a real-world scenario relevant to your field and propose a structured solution.";

        if (field.includes('computer') || field.includes('software') || field.includes('tech')) {
            title = "Coding Challenge: Logic & Efficiency";
            desc = "Based on your technical background, we recommend practicing algorithm efficiency. Task: Implement a solution for 'Finding the closest pair of points' in a 2D plane.";
        } else if (field.includes('business') || field.includes('management')) {
            title = "Case Study: Market Entry Strategy";
            desc = "Develop a 5-step market entry strategy for a sustainable tech startup expanding into Southeast Asia.";
        } else if (field.includes('design') || field.includes('ui') || field.includes('ux')) {
            title = "Critique: User Onboarding Flow";
            desc = "Review a popular app's onboarding flow and identify 3 friction points with proposed design fixes.";
        }

        document.getElementById('task-title').textContent = title;
        document.getElementById('task-desc').textContent = desc;
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => app.init());
