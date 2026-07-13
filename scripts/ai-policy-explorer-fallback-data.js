// Snapshot captured 2026-07-13 from the source spreadsheet, used only if the live Google Sheet cannot be reached.
window.AI_POLICY_FALLBACK_SNAPSHOT = {
  "prohibited": [
    "Using GenAI to draft explanations, definitions, or comparisons of core theoretical concepts.",
    "Using GenAI to perform calculations, run simulations, or analyze raw datasets without manual verification.",
    "Using GenAI to synthesize theories or establish connections between disparate concepts.",
    "Using GenAI to draft collaborative contributions, mediate team communication, or simulate interpersonal dialogue.",
    "Using GenAI to generate personal reflections, self-assessments, journaling entries, or evidence of personal engagement.",
    "Using GenAI to formulate research designs, hypotheses, methodologies, or long-term research plans.",
    "Using GenAI to evaluate its own outputs, conduct validation tasks, or bypass human-in-the-loop oversight.",
    "Using GenAI to summarize, evaluate, or critique peer-reviewed literature and theoretical frameworks.",
    "Using GenAI to write original essays, construct primary models, or generate core creative and artistic assets.",
    "Using GenAI to draft ethical arguments, construct policy recommendations, or analyze systemic biases.",
    "Using GenAI to identify academic databases, construct search queries, or build literature matrices.",
    "Using GenAI to design artistic assets, theatrical blocking, or choreograph performances.",
    "Using GenAI to completely generate creative projects or override human artistic agency.",
    "Using GenAI to translate text, draft compositions, or correct grammatical errors in the target language."
  ],
  "allowed": [
    {
      "number": 1.0,
      "profile": "Socratic Tutor",
      "supports": "Explains complex, abstract concepts; provides alternative analogies and breakdowns.",
      "guardrail": "AI must not write explanations or definitions for graded submissions."
    },
    {
      "number": 2.0,
      "profile": "Code Explainer & Debugger",
      "supports": "Analyzes error messages and reviews syntax errors in scripts (Python, R, SPSS, etc.).",
      "guardrail": "AI must not write the initial code logic or execute the data analysis."
    },
    {
      "number": 3.0,
      "profile": "Pre-Research Brainstormer",
      "supports": "Generates high-level topic angles, conceptual connections, or keyword expansions.",
      "guardrail": "AI must not draft the thesis statement, paper outline, or final synthesis."
    },
    {
      "number": 4.0,
      "profile": "Project Logistics Architect",
      "supports": "Builds project management templates, Gantt chart structures, or milestone schedules.",
      "guardrail": "Core scientific/creative trajectories and content contributions must be human-driven."
    },
    {
      "number": 5.0,
      "profile": "Literature & Discovery Aggregator",
      "supports": "Summarizes technical papers or scans global developments to help find fields of interest.",
      "guardrail": "AI must not compile the final literature review or evaluate source validity."
    },
    {
      "number": 6.0,
      "profile": "Logical Sounding Board",
      "supports": "Scans proposed hypotheses or models for logical inconsistencies and missing edge cases.",
      "guardrail": "The final research question, hypothesis, or model design must be student-created."
    },
    {
      "number": 7.0,
      "profile": "Adversarial Roleplay Simulator",
      "supports": "Simulates a specific stakeholder perspective, historical figure, or critical panel to test student arguments.",
      "guardrail": "The student must independently synthesize their real-time defense or resolution."
    },
    {
      "number": 8.0,
      "profile": "Synthetic Scenario Generator",
      "supports": "Produces mock datasets, edge cases, or deepfake examples for students to systematically analyze.",
      "guardrail": "The analysis methodology, pattern detection, and final conclusions must be entirely human."
    },
    {
      "number": 9.0,
      "profile": "Routine Co-Pilot",
      "supports": "Handles baseline automation (e.g., mass parameter sweeps, routine script variations, asset filling).",
      "guardrail": "Student must establish the operational constraints and evaluate the final model validity."
    },
    {
      "number": 10.0,
      "profile": "Study Aid Architect",
      "supports": "Generates custom study flashcards, vocabulary drills, mnemonic devices, or mock quizzes.",
      "guardrail": "AI must not be used to look up or generate answers during actual testing/grading."
    },
    {
      "number": 11.0,
      "profile": "Software Configuration Guide",
      "supports": "Troubleshoots software environment setups, integration blockers, or missing plugin configurations.",
      "guardrail": "AI must not execute the task or software command on behalf of the student."
    },
    {
      "number": 12.0,
      "profile": "Language Conversation Partner",
      "supports": "Acts as an active text or speech dialogue partner in a target foreign language.",
      "guardrail": "Dialogue must be interactive; AI cannot generate script templates for live graded oral exams."
    },
    {
      "number": 13.0,
      "profile": "Linguistic Syntax Coach",
      "supports": "Identifies grammar errors in written target languages and explains underlying structural rules.",
      "guardrail": "AI must not write or translate whole sentences/paragraphs for graded submission."
    },
    {
      "number": 14.0,
      "profile": "Late-Stage Copy-Editor",
      "supports": "Suggests changes to syntax, citation formats, and prose to ensure readability of a student's fully completed draft.",
      "guardrail": "AI must not generate initial drafts, write paragraph transitions, or introduce new ideas."
    },
    {
      "number": 15.0,
      "profile": "Prompt-Engineering Target",
      "supports": "Serves as an environment to test how different prompt choices yield variable analytical outputs.",
      "guardrail": "The focus of assessment must be the student\u2019s evaluation of the prompt-to-output relationship."
    },
    {
      "number": 16.0,
      "profile": "Validation Target",
      "supports": "Intentionally generates imperfect reconstructions or models for the student to rigorously correct.",
      "guardrail": "The student must explicitly track and justify the errors they corrected using expert judgment."
    },
    {
      "number": 17.0,
      "profile": "Auxiliary Studio Assistant",
      "supports": "Generates secondary reference imagery, placeholder audio, or conceptual starter prompts in creative arts.",
      "guardrail": "The student must explicitly maintain and document their unique, human artistic agency."
    },
    {
      "number": 18.0,
      "profile": "Metacognitive Prompt Generator",
      "supports": "Suggests personalized reflection prompts based on rough notes or bullet points a student provides.",
      "guardrail": "The actual reflection or journal entry must be written organically by the student."
    },
    {
      "number": 19.0,
      "profile": "Search Syntax Architect",
      "supports": "Suggests advanced database search strings, Boolean operator layouts, or technical query parameters.",
      "guardrail": "The student must independently decide which databases to trust and evaluate the returned literature."
    }
  ]
};
