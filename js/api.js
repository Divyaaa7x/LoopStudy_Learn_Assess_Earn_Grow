// ============================================================
// api.js - API communication layer for LoopStudy
// Handles communication with Python & Java backend services
// Falls back to localStorage when backend is unavailable
// ============================================================

const API = {
  // ===== CONFIGURATION =====
  config: {
    assessmentEngine: {
      baseUrl: 'http://localhost:8000',
      timeout: 10000,
    },
    achievementEngine: {
      baseUrl: 'http://localhost:8080',
      timeout: 10000,
    },
    useLocalFallback: true,
  },

  // ===== GENERIC HTTP HELPERS =====

  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || 10000;
    const timer = setTimeout(() => controller.abort(), timeout);

    const defaults = {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    };

    try {
      const response = await fetch(url, { ...defaults, ...options });
      clearTimeout(timer);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  },

  _getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('loopstudy_currentUser'));
      return user ? user.id || user.email : null;
    } catch {
      return null;
    }
  },

  _getProfile(userId) {
    try {
      return JSON.parse(localStorage.getItem(`loopstudy_profile_${userId}`)) || {};
    } catch {
      return {};
    }
  },

  _saveProfile(userId, profile) {
    localStorage.setItem(`loopstudy_profile_${userId}`, JSON.stringify(profile));
  },

  // ===== ASSESSMENT ENGINE API (Python) =====

  assessment: {
    async getQuestions(subject, difficulty) {
      const url = `${API.config.assessmentEngine.baseUrl}/api/questions?subject=${subject}&difficulty=${difficulty}`;
      try {
        const result = await API._fetch(url);
        if (result.status === 'ok') return result.data;
        throw new Error('Invalid response from assessment engine');
      } catch (error) {
        console.warn('Assessment engine unavailable, using local fallback:', error.message);
        return API.assessment._localQuestions(subject, difficulty);
      }
    },

    async getTimeLimit(difficulty) {
      const url = `${API.config.assessmentEngine.baseUrl}/api/time-limit?difficulty=${difficulty}`;
      try {
        const result = await API._fetch(url);
        if (result.status === 'ok') return result.timeLimit;
        throw new Error('Invalid response');
      } catch (error) {
        const limits = { easy: 600, medium: 900, hard: 1200 };
        return limits[difficulty] || 600;
      }
    },

    async submitScore(subject, difficulty, answers) {
      const url = `${API.config.assessmentEngine.baseUrl}/api/score`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify({ subject, difficulty, answers }),
        });
        if (result.status === 'ok') return result.result;
        throw new Error('Invalid response');
      } catch (error) {
        console.warn('Assessment engine unavailable, scoring locally:', error.message);
        return API.assessment._localScore(subject, difficulty, answers);
      }
    },

    async evaluate(scores, completedSubjects) {
      const url = `${API.config.assessmentEngine.baseUrl}/api/evaluate`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify({ scores, completedSubjects }),
        });
        if (result.status === 'ok') return result.evaluation;
        throw new Error('Invalid response');
      } catch (error) {
        console.warn('Evaluation engine unavailable:', error.message);
        return {
          unmetRequirements: {},
          recommendations: ['Complete assessments in all subjects'],
          eligibleForCertificate: false,
          skillGaps: 3,
        };
      }
    },

    health() {
      const url = `${API.config.assessmentEngine.baseUrl}/api/health`;
      return API._fetch(url).catch(() => ({ status: 'unavailable' }));
    },
  },

  // ===== ACHIEVEMENT ENGINE API (Java) =====

  achievement: {
    async validateBadges(userData) {
      const url = `${API.config.achievementEngine.baseUrl}/api/achievements/validate-badges`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify(userData),
        });
        return result;
      } catch (error) {
        console.warn('Achievement engine unavailable, validating locally:', error.message);
        return API.achievement._localBadges(userData);
      }
    },

    async validateAchievements(userData) {
      const url = `${API.config.achievementEngine.baseUrl}/api/achievements/validate-achievements`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify(userData),
        });
        return result;
      } catch (error) {
        console.warn('Achievement engine unavailable, validating locally:', error.message);
        return API.achievement._localAchievements(userData);
      }
    },

    async calculateLevel(skillPoints) {
      const url = `${API.config.achievementEngine.baseUrl}/api/achievements/level`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify({ skillPoints }),
        });
        return result;
      } catch (error) {
        return API.achievement._localLevel(skillPoints);
      }
    },

    async updateStreak(lastActiveDate, currentStreak) {
      const url = `${API.config.achievementEngine.baseUrl}/api/achievements/update-streak`;
      try {
        const result = await API._fetch(url, {
          method: 'POST',
          body: JSON.stringify({ lastActiveDate, currentStreak }),
        });
        return result;
      } catch (error) {
        return API.achievement._localStreak(lastActiveDate, currentStreak);
      }
    },

    health() {
      const url = `${API.config.achievementEngine.baseUrl}/api/achievements/health`;
      return API._fetch(url).catch(() => ({ status: 'unavailable' }));
    },
  },

  // ===== LOCAL FALLBACKS =====

  _localQuestionBank: {
    python: {
      easy: [
        { id: 'p-e-1', question: 'What is the output of print(2 ** 3)?', options: ['5', '6', '8', '9'], answer: 2 },
        { id: 'p-e-2', question: 'Which keyword is used to define a function in Python?', options: ['func', 'def', 'function', 'define'], answer: 1 },
        { id: 'p-e-3', question: 'What is the correct file extension for Python files?', options: ['.pyt', '.py', '.pt', '.pyth'], answer: 1 },
        { id: 'p-e-4', question: 'Which of the following is a mutable data type in Python?', options: ['tuple', 'int', 'list', 'string'], answer: 2 },
        { id: 'p-e-5', question: 'What does the len() function do?', options: ['Returns length', 'Converts to int', 'Prints output', 'Creates list'], answer: 0 },
      ],
      medium: [
        { id: 'p-m-1', question: 'What will be the output of list(range(5))?', options: ['[1,2,3,4,5]', '[0,1,2,3,4]', '[0,1,2,3,4,5]', '[1,2,3,4]'], answer: 1 },
        { id: 'p-m-2', question: 'Which of the following statements will raise an exception?', options: ["int('10')", "int('10.5')", "float('10.5')", "str(10)"], answer: 1 },
        { id: 'p-m-3', question: 'What is the output of {x: x**2 for x in range(3)}?', options: ['{0:0,1:1,2:4}', '{0:0,1:1,4:2}', '{0:0,1:1,2:4,3:9}', 'Error'], answer: 0 },
        { id: 'p-m-4', question: 'What does the __init__ method do in a Python class?', options: ['Destructor', 'Constructor', 'String representation', 'Comparison'], answer: 1 },
        { id: 'p-m-5', question: 'Which is NOT a valid way to handle exceptions?', options: ['try-except', 'try-finally', 'except-else', 'catch-throw'], answer: 3 },
      ],
      hard: [
        { id: 'p-h-1', question: 'What will be the output of (lambda x: x + 1)(5)?', options: ['5', '6', 'SyntaxError', 'TypeError'], answer: 1 },
        { id: 'p-h-2', question: 'Time complexity of accessing a dict item?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], answer: 0 },
        { id: 'p-h-3', question: 'What does @property decorator do?', options: ['Creates class property', 'Creates getter method', 'Marks method as static', 'Sets instance variable'], answer: 1 },
        { id: 'p-h-4', question: 'Which method adds items to a set?', options: ['.append()', '.add()', '.insert()', '.push()'], answer: 1 },
        { id: 'p-h-5', question: 'Output of print(all([1, 0, 2]))?', options: ['True', 'False', '1', 'Error'], answer: 1 },
      ],
    },
    java: {
      easy: [
        { id: 'j-e-1', question: 'Which is NOT a Java primitive type?', options: ['int', 'float', 'String', 'boolean'], answer: 2 },
        { id: 'j-e-2', question: 'Entry point of a Java program?', options: ['main()', 'start()', 'run()', 'init()'], answer: 0 },
        { id: 'j-e-3', question: 'What does JVM stand for?', options: ['Java Virtual Machine', 'Java Variable Manager', 'Java Version Module', 'Java Visual Machine'], answer: 0 },
        { id: 'j-e-4', question: 'String concatenation operator?', options: ['+', '&', '.', ','], answer: 0 },
        { id: 'j-e-5', question: 'Size of int in Java?', options: ['8 bits', '16 bits', '32 bits', '64 bits'], answer: 2 },
      ],
      medium: [
        { id: 'j-m-1', question: 'Keyword to inherit a class in Java?', options: ['inherits', 'extends', 'implements', 'super'], answer: 1 },
        { id: 'j-m-2', question: 'Output of System.out.println(10 + 20 + "30")?', options: ['102030', '3030', '60', 'Compilation Error'], answer: 1 },
        { id: 'j-m-3', question: 'Which is NOT an access modifier?', options: ['public', 'private', 'protected', 'static'], answer: 3 },
        { id: 'j-m-4', question: 'What does final keyword do on a class?', options: ['No instantiation', 'No inheritance', 'No extension', 'B and C'], answer: 2 },
        { id: 'j-m-5', question: 'Which collection guarantees ordered iteration?', options: ['HashSet', 'HashMap', 'TreeSet', 'LinkedHashSet'], answer: 3 },
      ],
      hard: [
        { id: 'j-h-1', question: 'Output of: int x=5; x++ + ++x?', options: ['10', '11', '12', '13'], answer: 2 },
        { id: 'j-h-2', question: 'Which pattern does InputStream wrapping use?', options: ['Factory', 'Decorator', 'Singleton', 'Observer'], answer: 1 },
        { id: 'j-h-3', question: 'Default GC algorithm in modern Java?', options: ['Serial GC', 'Parallel GC', 'G1 GC', 'Z GC'], answer: 2 },
        { id: 'j-h-4', question: 'Which method must be implemented for a functional interface?', options: ['All methods', 'Default methods', 'Abstract method', 'Static methods'], answer: 2 },
        { id: 'j-h-5', question: 'Purpose of the volatile keyword?', options: ['Optimize memory', 'Ensure thread visibility', 'Prevent serialization', 'Enable caching'], answer: 1 },
      ],
    },
    web: {
      easy: [
        { id: 'w-e-1', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Language'], answer: 0 },
        { id: 'w-e-2', question: 'Which tag creates a hyperlink?', options: ['<link>', '<a>', '<href>', '<url>'], answer: 1 },
        { id: 'w-e-3', question: 'Correct way to include CSS in HTML?', options: ['<css>', '<style>', '<script>', '<stylesheet>'], answer: 1 },
        { id: 'w-e-4', question: 'Which CSS property changes text color?', options: ['text-color', 'color', 'font-color', 'foreground'], answer: 1 },
        { id: 'w-e-5', question: 'What does var do in JavaScript?', options: ['Declares variable', 'Declares constant', 'Declares function', 'Declares class'], answer: 0 },
      ],
      medium: [
        { id: 'w-m-1', question: 'What does box-sizing: border-box do?', options: ['Excludes padding from width', 'Includes padding in width', 'Adds border to width', 'Removes margin'], answer: 1 },
        { id: 'w-m-2', question: 'Purpose of the fetch() API?', options: ['DOM manipulation', 'Making HTTP requests', 'File system access', 'Database queries'], answer: 1 },
        { id: 'w-m-3', question: 'HTTP status code for Not Found?', options: ['200', '301', '404', '500'], answer: 2 },
        { id: 'w-m-4', question: 'What does localStorage provide?', options: ['Server-side storage', 'Persistent client-side storage', 'Session-only storage', 'Database storage'], answer: 1 },
        { id: 'w-m-5', question: 'Pseudo-class for first child element?', options: [':first-child', ':first', ':nth-child(0)', ':first-of-type'], answer: 0 },
      ],
      hard: [
        { id: 'w-h-1', question: 'DOM event propagation order?', options: ['Target->Capture->Bubble', 'Capture->Target->Bubble', 'Bubble->Target->Capture', 'Target->Bubble->Capture'], answer: 1 },
        { id: 'w-h-2', question: 'What does defer attribute do on a script?', options: ['Pauses execution', 'Delays until HTML parsed', 'Runs immediately', 'Caches the script'], answer: 1 },
        { id: 'w-h-3', question: 'Which is a JavaScript closure?', options: ['Anonymous function', 'Function with outer scope access', 'IIFE', 'Async function'], answer: 1 },
        { id: 'w-h-4', question: 'Purpose of CORS?', options: ['Cross-origin security', 'Code optimization', 'CSS rendering', 'Cache management'], answer: 0 },
        { id: 'w-h-5', question: 'What does "this" refer to in an arrow function?', options: ['The function itself', 'Global object', 'Enclosing context', 'Calling object'], answer: 2 },
      ],
    },
  },

  assessment: {
    _localQuestions(subject, difficulty) {
      const bank = API._localQuestionBank;
      if (!bank[subject]) return [];
      if (!bank[subject][difficulty]) return [];
      return bank[subject][difficulty].map(q => ({ ...q }));
    },

    _localScore(subject, difficulty, answers) {
      const questions = this._localQuestions(subject, difficulty);
      let correct = 0;
      const total = questions.length;
      const results = [];

      for (const q of questions) {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.answer;
        if (isCorrect) correct++;
        results.push({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.answer,
          userAnswer,
          isCorrect,
        });
      }

      const scorePct = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
      const passed = scorePct >= 40;
      const points = correct * 10;

      return {
        subject,
        difficulty,
        totalQuestions: total,
        correctAnswers: correct,
        scorePercentage: scorePct,
        passed,
        pointsEarned: passed ? points : 0,
        details: results,
        timestamp: new Date().toISOString(),
      };
    },
  },

  achievement: {
    _levelThresholds: [0, 100, 300, 600, 1000, 2000],

    _localLevel(skillPoints) {
      const thresholds = this._levelThresholds;
      let level = 1;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (skillPoints >= thresholds[i]) {
          level = i + 1;
          break;
        }
      }
      const currentThreshold = thresholds[level - 1] || 0;
      const nextThreshold = thresholds[level] || thresholds[thresholds.length - 1];
      const range = nextThreshold - currentThreshold;
      const progress = skillPoints - currentThreshold;
      const progressPct = range > 0 ? Math.min(100, (progress / range) * 100) : 100;
      const pointsToNext = range > 0 ? nextThreshold - skillPoints : 0;

      return { level, progress: Math.round(progressPct * 10) / 10, pointsToNext };
    },

    _localBadges(userData) {
      const badgeDefs = [
        { id: 'python-beginner', name: 'Python Beginner', icon: '\uD83D\uDC0D', description: 'Completed the Python Basics skill path', requirement: 'Finish all modules in Python Basics skill path' },
        { id: 'java-explorer', name: 'Java Explorer', icon: '\u2615', description: 'Completed the Java Basics skill path', requirement: 'Finish all modules in Java Basics skill path' },
        { id: 'web-dev-starter', name: 'Web Dev Starter', icon: '\uD83C\uDF10', description: 'Completed the Web Dev Basics skill path', requirement: 'Finish all modules in Web Dev Basics skill path' },
        { id: 'assessment-master', name: 'Assessment Master', icon: '\uD83C\uDF93', description: 'Scored 100% on any subject assessment', requirement: 'Achieve a perfect score in any assessment' },
        { id: 'top-learner', name: 'Top Learner', icon: '\uD83C\uDFC6', description: 'Earned 1000 total SkillPoints', requirement: 'Accumulate 1000 SkillPoints' },
        { id: 'top-mentor', name: 'Top Mentor', icon: '\uD83C\uDF1F', description: 'Completed 5 mentorship sessions', requirement: 'Attend 5 mentorship sessions' },
        { id: 'consistency-champion', name: 'Consistency Champion', icon: '\uD83D\uDD25', description: 'Maintained a 7-day learning streak', requirement: 'Complete at least one activity daily for 7 consecutive days' },
        { id: 'skill-guru', name: 'Skill Guru', icon: '\uD83E\uDDD1\u200D\uD83C\uDF93', description: 'Completed all skill paths in one subject', requirement: 'Finish every skill path within a single subject' },
      ];

      const sp = userData.skillPoints || 0;
      const sessions = (userData.completedSessions || []).length;
      const streak = userData.currentStreak || 0;
      const paths = userData.completedSubjectPaths || [];
      const today = new Date().toISOString().split('T')[0];

      return badgeDefs.map(b => ({
        ...b,
        unlocked: (b.id === 'top-learner' && sp >= 1000) ||
          (b.id === 'top-mentor' && sessions >= 5) ||
          (b.id === 'consistency-champion' && streak >= 7) ||
          (b.id === 'python-beginner' && paths.includes('python-basics')) ||
          (b.id === 'java-explorer' && paths.includes('java-basics')) ||
          (b.id === 'web-dev-starter' && paths.includes('web-basics')) ||
          (b.id === 'skill-guru' && paths.filter(p => p.includes('python')).length >= 2) ||
          (b.id === 'assessment-master' && (userData.hasPerfectScore || false)),
        unlockedDate: null,
      }));
    },

    _localAchievements(userData) {
      const achDefs = [
        { id: 'first-quiz', name: 'First Steps', icon: '\uD83C\uDFC1', sp: 10, req: (u) => (u.completedQuizzes || []).length >= 1 },
        { id: 'quiz-perfect', name: 'Perfect Score', icon: '\uD83C\uDFAF', sp: 50, req: (u) => u.hasPerfectScore || false },
        { id: 'quiz-streak-3', name: 'Quiz Hat Trick', icon: '\uD83C\uDFF0', sp: 30, req: (u) => (u.completedQuizzes || []).length >= 3 && (u.currentStreak || 0) >= 3 },
        { id: 'skill-path-starter', name: 'Pathfinder', icon: '\uD83D\uDEE1\uFE0F', sp: 25, req: (u) => (u.completedModules || []).length >= 1 },
        { id: 'skill-path-complete', name: 'Skill Seeker', icon: '\uD83D\uDCDC', sp: 100, req: (u) => (u.completedSubjectPaths || []).length >= 1 },
        { id: 'mentor-first', name: 'Mentorship Begins', icon: '\uD83E\uDD1D', sp: 20, req: (u) => (u.completedSessions || []).length >= 1 },
        { id: 'mentor-five', name: 'Networker', icon: '\uD83D\uDCAC', sp: 75, req: (u) => (u.completedSessions || []).length >= 5 },
        { id: 'streak-3', name: 'Getting Consistent', icon: '\uD83D\uDD1B', sp: 15, req: (u) => (u.currentStreak || 0) >= 3 },
        { id: 'streak-7', name: 'Week Warrior', icon: '\uD83D\uDCAA', sp: 60, req: (u) => (u.currentStreak || 0) >= 7 },
        { id: 'streak-30', name: 'Monthly Legend', icon: '\uD83C\uDFC5', sp: 200, req: (u) => (u.currentStreak || 0) >= 30 },
        { id: 'assessment-easy-all', name: 'Easy Does It', icon: '\uD83E\uDEE7', sp: 40, req: (u) => (u.completedEasyAll || false) },
        { id: 'assessment-medium-all', name: 'Middle Ground', icon: '\uD83D\uDFE0', sp: 80, req: (u) => (u.completedMediumAll || false) },
        { id: 'assessment-hard-all', name: 'Hardcore Learner', icon: '\uD83D\uDD34', sp: 150, req: (u) => (u.completedHardAll || false) },
        { id: 'challenge-first', name: 'Challenge Accepted', icon: '\u26A1', sp: 20, req: (u) => (u.dailyChallengesCompleted || 0) > 0 || (u.weeklyChallengesCompleted || 0) > 0 },
        { id: 'points-500', name: 'Points Collector', icon: '\uD83D\uDCB0', sp: 0, req: (u) => (u.skillPoints || 0) >= 500 },
      ];

      const today = new Date().toISOString().split('T')[0];
      return achDefs.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        skillPoints: a.sp,
        unlocked: a.req(userData),
        unlockedDate: a.req(userData) ? today : null,
      }));
    },

    _localStreak(lastActiveDate, currentStreak) {
      if (!lastActiveDate) return { newStreak: 1, streakBroken: false };
      const last = new Date(lastActiveDate);
      const today = new Date();
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return { newStreak: currentStreak, streakBroken: false };
      if (diffDays === 1) return { newStreak: currentStreak + 1, streakBroken: false };
      return { newStreak: 1, streakBroken: true, brokenStreak: currentStreak };
    },
  },

  // ===== CONFIGURATION HELPERS =====

  setAssessmentUrl(url) {
    API.config.assessmentEngine.baseUrl = url;
  },

  setAchievementUrl(url) {
    API.config.achievementEngine.baseUrl = url;
  },

  setLocalFallback(enabled) {
    API.config.useLocalFallback = enabled;
  },
};

// Export for module bundlers (ESM)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API };
}
if (typeof window !== 'undefined') {
  window.API = API;
}
