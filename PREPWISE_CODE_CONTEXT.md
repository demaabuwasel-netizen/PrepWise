# PREPWISE CODE CONTEXT

## 1. Tech Stack
- **Frontend**: Plain HTML5 and Vanilla JavaScript (ES6+).
- **Styling**: Tailwind CSS via CDN. Custom styles are defined in a `<style>` block in `index.html`.
- **Icons**: Lucide Icons (loaded via script).
- **Routing**: A custom Single Page Application (SPA) routing system using `window.location.hash` and a `goToStage(stageNum)` function in `app.js`.
- **AI Integration**: Integration with a local **Ollama** server (defaulting to `qwen3` and `gemma3` models). It includes a robust fallback to a `getMockAIResponse` system in `app.js` for offline/demo use.
- **PDF Parsing**: Uses **PDF.js** for client-side CV text extraction.
- **Data Persistence**: Uses `localStorage` (keys: `prepwise_session_v3`, `prepwise_users_v3`, `prepwise_mouse_logs`).

## 2. Project Structure
The project is flat and lives in a single directory:
- `index.html`: The core entry point containing all HTML views (Dashboard, Profile, Interview, etc.).
- `app.js`: The "brain" of the app. Contains state management, AI prompt generation, routing logic, and DOM manipulation.
- `config.js`: Stores API keys (e.g., Gemini) in a global `window.PREPWISE_CONFIG` object.
- `logging.js`: Contains a `Logger` utility for tracking user events and sending them to a Google Sheet.
- `apps-script.gs`: The backend code meant to be deployed as a Google Apps Script Web App to receive and log events.
- `verify-improvements.md`: Documentation summarizing implemented features.

## 3. Dashboard Files
- **`index.html`**:
    - `id="view-dashboard"`: The HTML structure for the dashboard.
    - Contains the Hero section, the three main stat cards (Readiness, Focus Area, New Interview), and the "Last Session" activity card.
- **`app.js`**:
    - `showDashboard()`: Dynamically populates all dashboard data, calculates profile strength, and handles the "empty vs active" states for history.
    - `nav-user-avatar`: Managed within `updateUserUI()`.

## 4. Interview Flow Files
- **`index.html`**:
    - `id="view-setup"`: Configuration wizard (Goal → Style → Mood → Preview).
    - `id="view-interview"`: The active chat interface with mic and skip controls.
    - `id="view-completion"`: The "Analyzing..." loading screen.
    - `id="view-report"`: The detailed performance feedback page.
- **`app.js`**:
    - `startInterview()`: Resets state, generates the opening AI question, and navigates to the interview view.
    - `handleNextQuestion()`: Captures user answer, appends it to the transcript, and fetches the next AI follow-up.
    - `skipQuestion()`: Handles skipping logic by marking the answer as skipped and fetching the next AI prompt.
    - `generateFinalReport()`: Triggers the final AI evaluation based on the full transcript.
    - `loadSessionReport(index)`: Allows users to click a past interview in History and view the full report page.

## 5. Existing Tracking/Analytics
**Tracking exists but requires configuration.**
- **File**: `logging.js`
    - Contains a `Logger` object with methods like `logCVSubmission`, `logInterviewStart`, `logQuestion`, and `logInterviewComplete`.
    - It uses `fetch` to send JSON payloads to `GOOGLE_SHEET_URL`.
- **File**: `apps-script.gs`
    - Contains the corresponding server-side logic to receive these `POST` requests and append them as rows to a Google Spreadsheet.
- **Status**: The `GOOGLE_SHEET_URL` in `logging.js` is currently a placeholder (`YOUR_DEPLOYMENT_ID_HERE`).

## 6. Environment/Security
- **API Key names**: `GEMINI_API_KEY` (configured in `config.js`).
- **Session storage**: `prepwise_session_v3`.
- **Tracking URL**: `GOOGLE_SHEET_URL`.

## 7. Files to send to the AI
To add or improve Google Sheets journey tracking, you should provide:
1. `app.js` (to see where the flow events happen).
2. `logging.js` (to modify the tracking client).
3. `apps-script.gs` (to update the sheet receiver logic).
4. `index.html` (to understand the UI triggers for tracking).
