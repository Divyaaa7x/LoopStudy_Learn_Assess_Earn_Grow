// ============================================================
// storage.js - Complete LocalStorage state management layer
// Replaces all 9 React Context providers for LoopStudy
// ============================================================

// ===== CONSTANTS =====
const STREAK_BONUSES = { 7: 50, 30: 200, 100: 500 };

const BADGE_DEFINITIONS = [
  { id: 'python-beginner', name: 'Python Beginner', icon: '\ud83d\udc0d', description: 'Completed the Python Basics skill path', requirement: 'Finish all modules in Python Basics skill path' },
  { id: 'java-explorer', name: 'Java Explorer', icon: '\u2615', description: 'Completed the Java Basics skill path', requirement: 'Finish all modules in Java Basics skill path' },
  { id: 'web-dev-starter', name: 'Web Dev Starter', icon: '\ud83c\udf10', description: 'Completed the Web Dev Basics skill path', requirement: 'Finish all modules in Web Dev Basics skill path' },
  { id: 'assessment-master', name: 'Assessment Master', icon: '\ud83c\udf93', description: 'Scored 100% on any subject assessment', requirement: 'Achieve a perfect score in any assessment (easy, medium, or hard)' },
  { id: 'top-learner', name: 'Top Learner', icon: '\ud83c\udfc6', description: 'Earned 1000 total SkillPoints', requirement: 'Accumulate 1000 SkillPoints from all sources' },
  { id: 'top-mentor', name: 'Top Mentor', icon: '\ud83c\udf1f', description: 'Completed 5 mentorship sessions', requirement: 'Attend 5 mentorship sessions with any mentor' },
  { id: 'consistency-champion', name: 'Consistency Champion', icon: '\ud83d\udd25', description: 'Maintained a 7-day learning streak', requirement: 'Complete at least one activity daily for 7 consecutive days' },
  { id: 'skill-guru', name: 'Skill Guru', icon: '\ud83e\uddd1\u200d\ud83c\udf93', description: 'Completed all skill paths in one subject', requirement: 'Finish every skill path within a single subject (e.g., all Python paths)' },
];

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first-quiz', name: 'First Steps', description: 'Complete your first quiz', icon: '\ud83c\udfc1', skillPoints: 10, requirement: 'Submit any quiz for the first time', category: 'learning' },
  { id: 'quiz-perfect', name: 'Perfect Score', description: 'Get all answers correct in any quiz', icon: '\ud83c\udfaf', skillPoints: 50, requirement: 'Score 100% on any assessment', category: 'assessment' },
  { id: 'quiz-streak-3', name: 'Quiz Hat Trick', description: 'Complete 3 quizzes in a row', icon: '\ud83c\udff0', skillPoints: 30, requirement: 'Finish 3 quizzes without skipping a day', category: 'streak' },
  { id: 'skill-path-starter', name: 'Pathfinder', description: 'Complete your first skill path module', icon: '\ud83d\udee1\ufe0f', skillPoints: 25, requirement: 'Finish any single module in a skill path', category: 'learning' },
  { id: 'skill-path-complete', name: 'Skill Seeker', description: 'Complete an entire skill path', icon: '\ud83d\udcdc', skillPoints: 100, requirement: 'Finish all modules in any skill path', category: 'learning' },
  { id: 'mentor-first', name: 'Mentorship Begins', description: 'Attend your first mentorship session', icon: '\ud83e\udd1d', skillPoints: 20, requirement: 'Book and complete one mentorship session', category: 'social' },
  { id: 'mentor-five', name: 'Networker', description: 'Attend 5 mentorship sessions', icon: '\ud83d\udcac', skillPoints: 75, requirement: 'Complete 5 mentorship sessions', category: 'social' },
  { id: 'streak-3', name: 'Getting Consistent', description: 'Maintain a 3-day learning streak', icon: '\ud83d\udd1b', skillPoints: 15, requirement: 'Log in and complete activities for 3 consecutive days', category: 'streak' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: '\ud83d\udcaa', skillPoints: 60, requirement: 'Log in and complete activities for 7 consecutive days', category: 'streak' },
  { id: 'streak-30', name: 'Monthly Legend', description: 'Maintain a 30-day learning streak', icon: '\ud83c\udfc5', skillPoints: 200, requirement: 'Log in and complete activities for 30 consecutive days', category: 'streak' },
  { id: 'assessment-easy-all', name: 'Easy Does It', description: 'Complete all easy assessments', icon: '\ud83e\udee7', skillPoints: 40, requirement: 'Finish easy-level assessments for all subjects', category: 'assessment' },
  { id: 'assessment-medium-all', name: 'Middle Ground', description: 'Complete all medium assessments', icon: '\ud83d\udfe0', skillPoints: 80, requirement: 'Finish medium-level assessments for all subjects', category: 'assessment' },
  { id: 'assessment-hard-all', name: 'Hardcore Learner', description: 'Complete all hard assessments', icon: '\ud83d\udd34', skillPoints: 150, requirement: 'Finish hard-level assessments for all subjects', category: 'assessment' },
  { id: 'challenge-first', name: 'Challenge Accepted', description: 'Complete your first daily or weekly challenge', icon: '\u26a1', skillPoints: 20, requirement: 'Finish any challenge', category: 'learning' },
  { id: 'points-500', name: 'Points Collector', description: 'Earn 500 total SkillPoints', icon: '\ud83d\udcb0', skillPoints: 0, requirement: 'Accumulate 500 SkillPoints across all activities', category: 'learning' },
];

const CHALLENGE_TEMPLATES = {
  daily: [
    { id: 'daily-1', title: 'Quick Quiz', description: 'Complete any one easy assessment today', requirement: 'Finish an easy-level quiz in any subject', reward: 15 },
    { id: 'daily-2', title: 'Code Streak', description: 'Write code for 20 minutes today', requirement: 'Spend at least 20 minutes on any coding activity', reward: 10 },
    { id: 'daily-3', title: 'Mentor Connect', description: 'Send a question or message to any mentor', requirement: 'Interact with a mentor through the platform', reward: 20 },
    { id: 'daily-4', title: 'Topic Master', description: 'Score at least 80% on a medium assessment', requirement: 'Get 4 out of 5 correct in a medium-level quiz', reward: 25 },
    { id: 'daily-5', title: 'Path Progress', description: 'Complete one module in any skill path', requirement: 'Finish a single module from any skill path', reward: 30 },
    { id: 'daily-6', title: 'Review Relay', description: 'Leave a review for a mentor after a session', requirement: 'Submit a rating and review for any mentor', reward: 10 },
  ],
  weekly: [
    { id: 'weekly-1', title: 'Weekly Warrior', description: 'Complete 5 daily challenges this week', requirement: 'Finish any 5 daily challenges within the week', reward: 100 },
    { id: 'weekly-2', title: 'Subject Explorer', description: 'Take assessments in 3 different subjects', requirement: 'Complete at least one quiz in Python, Java, and Web Development', reward: 80 },
    { id: 'weekly-3', title: 'Deep Dive', description: 'Complete 2 hard-level assessments', requirement: 'Finish two hard-level quizzes in any subjects', reward: 120 },
    { id: 'weekly-4', title: 'Skill Progression', description: 'Complete 3 modules across any skill paths', requirement: 'Finish a total of 3 modules from any skill paths', reward: 150 },
  ],
};

const REWARDS_DATA = [
  { id: 'dark-theme', name: 'Dark Mode Theme', description: 'Unlock a sleek dark mode theme for your profile', cost: 80, icon: '\ud83c\udf19', category: 'theme', available: true },
  { id: 'ocean-theme', name: 'Ocean Blue Theme', description: 'A calming ocean blue color scheme', cost: 100, icon: '\ud83c\udf0a', category: 'theme', available: true },
  { id: 'sunset-theme', name: 'Sunset Theme', description: 'Warm sunset gradient theme for your dashboard', cost: 120, icon: '\ud83c\udf05', category: 'theme', available: true },
  { id: 'gold-frame', name: 'Gold Profile Frame', description: 'A premium gold border for your profile picture', cost: 150, icon: '\ud83c\udff7\ufe0f', category: 'frame', available: true },
  { id: 'neon-frame', name: 'Neon Glow Frame', description: 'A glowing neon frame for your avatar', cost: 130, icon: '\ud83d\udca1', category: 'frame', available: true },
  { id: 'star-frame', name: 'Star Studded Frame', description: 'A frame with animated stars around your photo', cost: 110, icon: '\u2b50', category: 'frame', available: true },
  { id: 'title-novice', name: 'Title: Novice', description: "Display 'Novice Programmer' title on your profile", cost: 50, icon: '\ud83e\uddea', category: 'title', available: true },
  { id: 'title-coder', name: 'Title: Coder', description: "Display 'Coder' title on your profile", cost: 150, icon: '\ud83d\udcbb', category: 'title', available: true },
  { id: 'title-sage', name: 'Title: Code Sage', description: "Display 'Code Sage' title on your profile", cost: 400, icon: '\ud83e\uddd9', category: 'title', available: true },
  { id: 'mentor-premium', name: 'Premium Mentor Access', description: 'Get priority booking with top-rated mentors', cost: 200, icon: '\ud83c\udf1f', category: 'mentor-access', available: true },
  { id: 'mentor-unlimited', name: 'Unlimited Mentorship', description: 'Unlimited mentorship sessions for one month', cost: 500, icon: '\ud83d\udce1', category: 'mentor-access', available: true },
  { id: 'badge-showcase', name: 'Badge Showcase', description: 'Display your badges prominently on your profile', cost: 75, icon: '\ud83c\udfc6', category: 'profile-decoration', available: true },
  { id: 'custom-status', name: 'Custom Status Message', description: 'Set a custom status message visible on your profile', cost: 60, icon: '\ud83d\udcdd', category: 'profile-decoration', available: true },
  { id: 'achievement-wall', name: 'Achievement Wall', description: 'Showcase your achievements in a dedicated wall layout', cost: 90, icon: '\ud83e\uddf8', category: 'profile-decoration', available: true },
  { id: 'animated-avatar', name: 'Animated Avatar Border', description: 'An animated gradient border around your avatar', cost: 180, icon: '\u2728', category: 'profile-decoration', available: true },
];

const COLLEGES_DATA = [
  { id: 1, name: 'Anurag University', students: 5230, totalSkillPoints: 142800 },
  { id: 2, name: 'Srinidhi University', students: 3450, totalSkillPoints: 98400 },
  { id: 3, name: 'Nalla Malla Reddy University', students: 4120, totalSkillPoints: 112600 },
  { id: 4, name: 'Malla Reddy University', students: 4890, totalSkillPoints: 128300 },
  { id: 5, name: 'Indian Institute of Technology Bombay', students: 8456, totalSkillPoints: 284500 },
  { id: 6, name: 'Indian Institute of Technology Delhi', students: 8231, totalSkillPoints: 271200 },
  { id: 7, name: 'National Institute of Technology Trichy', students: 7120, totalSkillPoints: 198400 },
  { id: 8, name: 'Vellore Institute of Technology', students: 12450, totalSkillPoints: 312800 },
  { id: 9, name: 'SRM Institute of Science and Technology', students: 15200, totalSkillPoints: 289100 },
  { id: 10, name: 'Manipal Institute of Technology', students: 6450, totalSkillPoints: 174600 },
  { id: 11, name: 'International Institute of Information Technology Hyderabad', students: 2150, totalSkillPoints: 95600 },
];

// ===== HELPERS =====
function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

function getTodayDateString() {
  return new Date().toDateString();
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

function lsGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getYesterdayDateString() {
  const d = new Date(Date.now() - 86400000);
  return d.toDateString();
}

function calculateLevel(skillPoints) {
  return Math.min(Math.floor(skillPoints / 500) + 1, 5);
}

// ===== TOAST SYSTEM =====
let _toasts = [];
let _toastIdCounter = 0;
let _toastListeners = [];

function notifyToastListeners() {
  _toastListeners.forEach(fn => fn(_toasts));
}

function onToastsChange(fn) {
  _toastListeners.push(fn);
  return () => {
    _toastListeners = _toastListeners.filter(f => f !== fn);
  };
}

function getToasts() {
  return _toasts;
}

function showToast(message, type = 'info') {
  const id = ++_toastIdCounter;
  _toasts = [..._toasts, { id, message, type }];
  notifyToastListeners();
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    notifyToastListeners();
  }, 3500);
}

function removeToast(id) {
  _toasts = _toasts.filter(t => t.id !== id);
  notifyToastListeners();
}

// ===================================================================
// AUTH
// ===================================================================
function getUsers() {
  return lsGet('loopstudy_users') || [];
}

function saveUsers(users) {
  lsSet('loopstudy_users', users);
}

function getCurrentUser() {
  return lsGet('loopstudy_currentUser') || null;
}

function setCurrentUser(user) {
  if (user) {
    lsSet('loopstudy_currentUser', user);
  } else {
    localStorage.removeItem('loopstudy_currentUser');
  }
}

function logout() {
  localStorage.removeItem('loopstudy_currentUser');
}

function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('User not found');
  if (user.password !== password) throw new Error('Invalid password');
  const { password: _, ...safeUser } = user;
  lsSet('loopstudy_currentUser', safeUser);
  return safeUser;
}

function register(name, email, password, confirmPassword, college, skills) {
  if (password !== confirmPassword) throw new Error('Passwords do not match');
  const users = getUsers();
  if (users.find(u => u.email === email)) throw new Error('Email already registered');
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    college: college || '',
    skills: skills || [],
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    mentorStatus: false,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);
  const { password: _, ...safeUser } = newUser;
  lsSet('loopstudy_currentUser', safeUser);
  return safeUser;
}

function updateUserProfile(userId, data) {
  if (!userId) return null;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  saveUsers(users);
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const updated = { ...currentUser, ...data };
    lsSet('loopstudy_currentUser', updated);
    return updated;
  }
  const { password: _, ...safeUser } = users[idx];
  return safeUser;
}

// ===================================================================
// USER DATA / PROFILE
// ===================================================================
function getUserProfileKey(userId) {
  return `loopstudy_profile_${userId}`;
}

function getDefaultUserData(userId, user) {
  return {
    profile: {
      name: user?.name || '',
      email: user?.email || '',
      college: user?.college || '',
      skills: user?.skills || [],
      bio: '',
      avatar: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}`,
      mentorStatus: user?.mentorStatus || false,
    },
    skillPoints: 0,
    level: 1,
    streak: { current: 0, best: 0, lastActive: null },
    sessionsCompleted: 0,
    assessmentsCompleted: 0,
    transactions: [],
  };
}

function getUserData(userId) {
  if (!userId) return null;
  const key = getUserProfileKey(userId);
  let data = lsGet(key);
  if (!data) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    data = getDefaultUserData(userId, user);
    lsSet(key, data);
  }
  return data;
}

function saveUserData(userId, data) {
  if (!userId) return false;
  const key = getUserProfileKey(userId);
  return lsSet(key, data);
}

function getSkillPoints(userId) {
  if (!userId) return 0;
  const data = getUserData(userId);
  return data?.skillPoints || 0;
}

function addSkillPoints(userId, amount, reason = '', source = '') {
  if (!userId || amount <= 0) return 0;
  const data = getUserData(userId);
  const newPoints = (data.skillPoints || 0) + amount;
  data.skillPoints = newPoints;
  data.level = calculateLevel(newPoints);
  data.transactions.push({
    id: generateId(),
    type: 'earned',
    amount,
    reason,
    date: new Date().toISOString(),
    source,
  });
  saveUserData(userId, data);
  return newPoints;
}

function spendSkillPoints(userId, amount, reason = '', source = '') {
  if (!userId) return false;
  const data = getUserData(userId);
  if ((data.skillPoints || 0) < amount) return false;
  data.skillPoints -= amount;
  data.level = calculateLevel(data.skillPoints);
  data.transactions.push({
    id: generateId(),
    type: 'spent',
    amount,
    reason,
    date: new Date().toISOString(),
    source,
  });
  saveUserData(userId, data);
  return true;
}

function getLevel(userId) {
  if (!userId) return 1;
  const data = getUserData(userId);
  return data?.level || calculateLevel(data?.skillPoints || 0);
}

function updateStreak(userId) {
  if (!userId) return null;
  const data = getUserData(userId);
  const today = getTodayDateString();
  const prevStreak = data.streak?.current || 0;
  if (data.streak?.lastActive === today) return data.streak;

  let newCurrent = 1;
  if (data.streak?.lastActive === getYesterdayDateString()) {
    newCurrent = (data.streak?.current || 0) + 1;
  }

  const newStreak = {
    current: newCurrent,
    best: Math.max(data.streak?.best || 0, newCurrent),
    lastActive: today,
  };
  data.streak = newStreak;
  saveUserData(userId, data);

  if (newCurrent > prevStreak && STREAK_BONUSES[newCurrent]) {
    const bonus = STREAK_BONUSES[newCurrent];
    addSkillPoints(userId, bonus, `Streak ${newCurrent} day milestone`, 'streak-bonus');
  }

  return newStreak;
}

function getTransactions(userId) {
  if (!userId) return [];
  const data = getUserData(userId);
  return data?.transactions || [];
}

function incrementSessions(userId) {
  if (!userId) return 0;
  const data = getUserData(userId);
  data.sessionsCompleted = (data.sessionsCompleted || 0) + 1;
  saveUserData(userId, data);
  return data.sessionsCompleted;
}

function incrementAssessments(userId) {
  if (!userId) return 0;
  const data = getUserData(userId);
  data.assessmentsCompleted = (data.assessmentsCompleted || 0) + 1;
  saveUserData(userId, data);
  return data.assessmentsCompleted;
}

// ===================================================================
// SESSIONS
// ===================================================================
function getSessions(userId) {
  if (!userId) return [];
  return lsGet(`loopstudy_sessions_${userId}`) || [];
}

function bookSession(userId, data) {
  if (!userId) return null;
  const sessions = getSessions(userId);
  const newSession = {
    id: generateId(),
    studentId: userId,
    mentorId: data.mentorId || '',
    mentorName: data.mentorName || '',
    skill: data.skill || '',
    date: data.date || new Date().toISOString().split('T')[0],
    timeSlot: data.timeSlot || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  sessions.push(newSession);
  lsSet(`loopstudy_sessions_${userId}`, sessions);
  return newSession;
}

function updateSessionStatus(sessionId, status) {
  if (!sessionId) return false;
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) return false;

  const users = getUsers();
  const keys = users.map(u => `loopstudy_sessions_${u.id}`);
  const uniqueKeys = [...new Set(keys)];
  uniqueKeys.push('loopstudy_sessions_unknown');

  for (const key of uniqueKeys) {
    const sessions = lsGet(key);
    if (!sessions) continue;
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = status;
      lsSet(key, sessions);
      return true;
    }
  }
  return false;
}

// ===================================================================
// ASSESSMENTS
// ===================================================================
function getResults(userId) {
  if (!userId) return [];
  return lsGet(`loopstudy_assessments_${userId}`) || [];
}

function submitResult(userId, result) {
  if (!userId) return null;
  const results = getResults(userId);
  const total = result.total || Object.keys(result.answers || {}).length || 0;
  const score = result.score || 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const newResult = {
    id: generateId(),
    subject: result.subject || '',
    difficulty: result.difficulty || 'easy',
    score,
    total,
    percentage,
    passed: percentage >= 40,
    answers: result.answers || {},
    questions: result.questions || [],
    date: result.date || new Date().toISOString(),
  };
  results.push(newResult);
  lsSet(`loopstudy_assessments_${userId}`, results);

  incrementAssessments(userId);
  return newResult;
}

function getAssessmentStats(userId) {
  if (!userId) return { total: 0, passed: 0, failed: 0, averageScore: 0, bestScore: 0, bySubject: {} };
  const results = getResults(userId);
  if (results.length === 0) {
    return { total: 0, passed: 0, failed: 0, averageScore: 0, bestScore: 0, bySubject: {} };
  }

  const passed = results.filter(r => r.passed).length;
  const totalScore = results.reduce((sum, r) => sum + r.percentage, 0);
  const bySubject = {};

  results.forEach(r => {
    if (!bySubject[r.subject]) {
      bySubject[r.subject] = { total: 0, passed: 0, totalPercentage: 0 };
    }
    bySubject[r.subject].total += 1;
    bySubject[r.subject].passed += r.passed ? 1 : 0;
    bySubject[r.subject].totalPercentage += r.percentage;
  });

  Object.keys(bySubject).forEach(subject => {
    bySubject[subject].averageScore = Math.round(
      bySubject[subject].totalPercentage / bySubject[subject].total
    );
    delete bySubject[subject].totalPercentage;
  });

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    averageScore: Math.round(totalScore / results.length),
    bestScore: Math.max(...results.map(r => r.percentage)),
    bySubject,
  };
}

// ===================================================================
// BADGES & ACHIEVEMENTS
// ===================================================================
function getBadges(userId) {
  if (!userId) return [];
  const stored = lsGet(`loopstudy_badges_${userId}`);
  if (stored) return stored;
  const initial = BADGE_DEFINITIONS.map(b => ({ ...b, unlocked: false, unlockedDate: null }));
  lsSet(`loopstudy_badges_${userId}`, initial);
  return initial;
}

function checkAndUnlockBadges(userId, stats) {
  if (!userId) return 0;
  const badges = getBadges(userId);
  const now = new Date().toISOString();
  let newlyUnlocked = 0;

  const updated = badges.map(badge => {
    if (badge.unlocked) return badge;
    let shouldUnlock = false;

    switch (badge.id) {
      case 'python-beginner':
        shouldUnlock = stats.completedSubjects?.includes('python');
        break;
      case 'java-explorer':
        shouldUnlock = stats.completedSubjects?.includes('java');
        break;
      case 'web-dev-starter':
        shouldUnlock = stats.completedSubjects?.includes('web development');
        break;
      case 'assessment-master':
        shouldUnlock = (stats.passedAssessments || 0) >= 3;
        break;
      case 'top-learner':
        shouldUnlock = (stats.skillPoints || 0) >= 500;
        break;
      case 'top-mentor':
        shouldUnlock = stats.mentorStatus && (stats.sessionsCompleted || 0) >= 10;
        break;
      case 'consistency-champion':
        shouldUnlock = (stats.streak || 0) >= 7;
        break;
      case 'skill-guru':
        shouldUnlock = (stats.level || 0) >= 3;
        break;
    }

    if (shouldUnlock) {
      newlyUnlocked++;
      return { ...badge, unlocked: true, unlockedDate: now };
    }
    return badge;
  });

  if (newlyUnlocked > 0) {
    lsSet(`loopstudy_badges_${userId}`, updated);
  }
  return newlyUnlocked;
}

function getAchievements(userId) {
  if (!userId) return [];
  const stored = lsGet(`loopstudy_achievements_${userId}`);
  if (stored) return stored;
  const initial = ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a, unlocked: false, unlockedDate: null }));
  lsSet(`loopstudy_achievements_${userId}`, initial);
  return initial;
}

function checkAndUnlockAchievements(userId, stats) {
  if (!userId) return 0;
  const achievements = getAchievements(userId);
  const now = new Date().toISOString();
  let totalReward = 0;

  const updated = achievements.map(achievement => {
    if (achievement.unlocked) return achievement;
    let shouldUnlock = false;

    switch (achievement.id) {
      case 'first-quiz':
        shouldUnlock = (stats.assessmentsCompleted || 0) >= 1;
        break;
      case 'quiz-perfect':
        shouldUnlock = stats.hasPerfectScore;
        break;
      case 'quiz-streak-3':
        shouldUnlock = stats.consecutiveQuizDays >= 3;
        break;
      case 'skill-path-starter':
        shouldUnlock = (stats.modulesCompleted || 0) >= 1;
        break;
      case 'skill-path-complete':
        shouldUnlock = (stats.pathsCompleted || 0) >= 1;
        break;
      case 'mentor-first':
        shouldUnlock = (stats.sessionsAsMentee || 0) >= 1;
        break;
      case 'mentor-five':
        shouldUnlock = (stats.sessionsAsMentee || 0) >= 5;
        break;
      case 'streak-3':
        shouldUnlock = (stats.streak || 0) >= 3;
        break;
      case 'streak-7':
        shouldUnlock = (stats.streak || 0) >= 7;
        break;
      case 'streak-30':
        shouldUnlock = (stats.streak || 0) >= 30;
        break;
      case 'assessment-easy-all':
        shouldUnlock = stats.allEasyCompleted;
        break;
      case 'assessment-medium-all':
        shouldUnlock = stats.allMediumCompleted;
        break;
      case 'assessment-hard-all':
        shouldUnlock = stats.allHardCompleted;
        break;
      case 'challenge-first':
        shouldUnlock = (stats.challengesCompleted || 0) >= 1;
        break;
      case 'points-500':
        shouldUnlock = (stats.skillPoints || 0) >= 500;
        break;
    }

    if (shouldUnlock) {
      totalReward += achievement.skillPoints || 0;
      return { ...achievement, unlocked: true, unlockedDate: now };
    }
    return achievement;
  });

  if (totalReward > 0) {
    lsSet(`loopstudy_achievements_${userId}`, updated);
    addSkillPoints(userId, totalReward, 'Achievement unlocked', 'achievement-reward');
  }
  return totalReward;
}

// ===================================================================
// CHALLENGES
// ===================================================================
function getChallenges(userId) {
  if (!userId) return { dailyChallenges: [], weeklyChallenges: [], lastFetchDate: null };
  const stored = lsGet(`loopstudy_challenges_${userId}`);
  if (stored) return stored;
  const initial = {
    dailyChallenges: CHALLENGE_TEMPLATES.daily.map(c => ({
      ...c, completed: false, progress: 0, date: getTodayDateString(),
    })),
    weeklyChallenges: CHALLENGE_TEMPLATES.weekly.map(c => ({
      ...c, completed: false, progress: 0, week: getWeekNumber(),
    })),
    lastFetchDate: getTodayDateString(),
  };
  lsSet(`loopstudy_challenges_${userId}`, initial);
  return initial;
}

function loadChallenges(userId) {
  if (!userId) return;
  const data = getChallenges(userId);
  const today = getTodayDateString();

  if (!data.lastFetchDate) {
    const fresh = {
      dailyChallenges: CHALLENGE_TEMPLATES.daily.map(c => ({
        ...c, completed: false, progress: 0, date: today,
      })),
      weeklyChallenges: CHALLENGE_TEMPLATES.weekly.map(c => ({
        ...c, completed: false, progress: 0, week: getWeekNumber(),
      })),
      lastFetchDate: today,
    };
    lsSet(`loopstudy_challenges_${userId}`, fresh);
    return;
  }

  if (data.lastFetchDate !== today) {
    data.dailyChallenges = CHALLENGE_TEMPLATES.daily.map(c => ({
      ...c, completed: false, progress: 0, date: today,
    }));
    data.lastFetchDate = today;
  }

  const currentWeek = getWeekNumber();
  const storedWeek = data.weeklyChallenges[0]?.week;
  if (storedWeek && storedWeek !== currentWeek) {
    data.weeklyChallenges = CHALLENGE_TEMPLATES.weekly.map(c => ({
      ...c, completed: false, progress: 0, week: currentWeek,
    }));
  }

  lsSet(`loopstudy_challenges_${userId}`, data);
}

function completeChallenge(userId, id, type) {
  if (!userId) return 0;
  const data = getChallenges(userId);
  let reward = 0;

  if (type === 'daily') {
    data.dailyChallenges = data.dailyChallenges.map(c => {
      if (c.id === id && !c.completed) {
        reward = c.reward;
        return { ...c, completed: true, progress: 1 };
      }
      return c;
    });
  } else if (type === 'weekly') {
    data.weeklyChallenges = data.weeklyChallenges.map(c => {
      if (c.id === id && !c.completed) {
        reward = c.reward;
        return { ...c, completed: true, progress: 1 };
      }
      return c;
    });
  }

  if (reward > 0) {
    lsSet(`loopstudy_challenges_${userId}`, data);
    addSkillPoints(userId, reward, `Completed ${type} challenge`, 'challenge-reward');
  }
  return reward;
}

// ===================================================================
// REWARDS
// ===================================================================
function getRewards(userId) {
  if (!userId) return { purchasedRewards: [], activeTheme: null, activeFrame: null, activeTitle: null };
  const stored = lsGet(`loopstudy_rewards_${userId}`);
  if (stored) return stored;
  const initial = { purchasedRewards: [], activeTheme: null, activeFrame: null, activeTitle: null };
  lsSet(`loopstudy_rewards_${userId}`, initial);
  return initial;
}

function purchaseReward(userId, rewardId, checkBalanceFn) {
  if (!userId) return { success: false, error: 'User not found' };
  const reward = REWARDS_DATA.find(r => r.id === rewardId);
  if (!reward) return { success: false, error: 'Reward not found' };
  const data = getRewards(userId);
  if (data.purchasedRewards.some(r => r.id === rewardId)) {
    return { success: false, error: 'Already purchased' };
  }
  if (checkBalanceFn && !checkBalanceFn(reward.cost)) {
    return { success: false, error: 'Insufficient SkillPoints' };
  }
  const purchase = {
    id: rewardId,
    name: reward.name,
    category: reward.category,
    cost: reward.cost,
    icon: reward.icon,
    purchasedDate: new Date().toISOString(),
  };
  data.purchasedRewards.push(purchase);
  lsSet(`loopstudy_rewards_${userId}`, data);
  return { success: true, purchase };
}

function equipReward(userId, rewardId, category) {
  if (!userId) return false;
  const data = getRewards(userId);
  if (!data.purchasedRewards.some(r => r.id === rewardId)) return false;

  switch (category) {
    case 'theme':
      data.activeTheme = rewardId;
      break;
    case 'frame':
      data.activeFrame = rewardId;
      break;
    case 'title':
      data.activeTitle = rewardId;
      break;
    default:
      return false;
  }
  lsSet(`loopstudy_rewards_${userId}`, data);
  return true;
}

// ===================================================================
// LEADERBOARD
// ===================================================================
function getLeaderboard() {
  const stored = lsGet('loopstudy_leaderboard');
  if (stored) return stored;
  const initial = { learners: [], mentors: [], colleges: COLLEGES_DATA };
  lsSet('loopstudy_leaderboard', initial);
  return initial;
}

function contributeToCollege(collegeName, amount) {
  if (amount <= 0) return;
  const data = getLeaderboard();
  data.colleges = data.colleges.map(c => {
    if (c.name === collegeName || c.id.toString() === collegeName.toString()) {
      return { ...c, totalSkillPoints: (c.totalSkillPoints || 0) + amount };
    }
    return c;
  });
  lsSet('loopstudy_leaderboard', data);
}

// ===================================================================
// INIT
// ===================================================================
function init(userId) {
  if (!userId) return;
  getUserData(userId);
  getBadges(userId);
  getAchievements(userId);
  getChallenges(userId);
  getRewards(userId);
  loadChallenges(userId);
}

// ===================================================================
// EXPORT
// ===================================================================
const Store = {
  getUsers,
  saveUsers,
  getCurrentUser,
  setCurrentUser,
  logout,
  login,
  register,
  updateUserProfile,

  getUserData,
  saveUserData,
  getSkillPoints,
  addSkillPoints,
  spendSkillPoints,
  getLevel,
  updateStreak,
  getTransactions,
  incrementSessions,
  incrementAssessments,

  getSessions,
  bookSession,
  updateSessionStatus,

  getResults,
  submitResult,
  getAssessmentStats,

  getBadges,
  checkAndUnlockBadges,
  getAchievements,
  checkAndUnlockAchievements,

  getChallenges,
  loadChallenges,
  completeChallenge,

  getRewards,
  purchaseReward,
  equipReward,

  getLeaderboard,
  contributeToCollege,

  showToast,
  get toasts() { return getToasts(); },

  init,

  REWARDS_DATA,
};

window.Store = Store;
