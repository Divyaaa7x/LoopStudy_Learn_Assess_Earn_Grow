// ============================================================
// achievement_engine.java - Achievement & Badge Validation Engine
// ============================================================
// Run standalone: javac achievement_engine.java && java AchievementEngine
// Or deploy as Spring Boot service (see main() for REST mode)

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

public class AchievementEngine {

    // ===== DATA MODELS =====

    static class UserProfile {
        String userId;
        String name;
        String college;
        boolean isMentor;
        int skillPoints;
        int level;
        int currentStreak;
        int longestStreak;
        String lastActiveDate;
        List<String> completedModules;
        List<String> completedSubjectPaths;
        List<String> completedSessions;
        List<String> completedQuizzes;
        Map<String, Map<String, List<Integer>>> quizScores; // subject -> difficulty -> [scores]
        int dailyChallengesCompleted;
        int weeklyChallengesCompleted;

        UserProfile(String userId) {
            this.userId = userId;
            this.skillPoints = 0;
            this.level = 1;
            this.currentStreak = 0;
            this.longestStreak = 0;
            this.completedModules = new ArrayList<>();
            this.completedSubjectPaths = new ArrayList<>();
            this.completedSessions = new ArrayList<>();
            this.completedQuizzes = new ArrayList<>();
            this.quizScores = new HashMap<>();
            this.dailyChallengesCompleted = 0;
            this.weeklyChallengesCompleted = 0;
        }
    }

    static class Badge {
        String id;
        String name;
        String icon;
        String description;
        String requirement;
        boolean unlocked;
        String unlockedDate;

        Badge(String id, String name, String icon, String description, String requirement) {
            this.id = id;
            this.name = name;
            this.icon = icon;
            this.description = description;
            this.requirement = requirement;
            this.unlocked = false;
            this.unlockedDate = null;
        }
    }

    static class Achievement {
        String id;
        String name;
        String description;
        String icon;
        int skillPoints;
        String requirement;
        String category;
        boolean unlocked;
        String unlockedDate;

        Achievement(String id, String name, String description, String icon,
                    int skillPoints, String requirement, String category) {
            this.id = id;
            this.name = name;
            this.icon = icon;
            this.description = description;
            this.skillPoints = skillPoints;
            this.requirement = requirement;
            this.category = category;
            this.unlocked = false;
            this.unlockedDate = null;
        }
    }

    // ===== BADGE DEFINITIONS =====

    static final List<Badge> BADGE_DEFINITIONS = Arrays.asList(
        new Badge("python-beginner", "Python Beginner", "\uD83D\uDC0D",
            "Completed the Python Basics skill path",
            "Finish all modules in Python Basics skill path"),
        new Badge("java-explorer", "Java Explorer", "\u2615",
            "Completed the Java Basics skill path",
            "Finish all modules in Java Basics skill path"),
        new Badge("web-dev-starter", "Web Dev Starter", "\uD83C\uDF10",
            "Completed the Web Dev Basics skill path",
            "Finish all modules in Web Dev Basics skill path"),
        new Badge("assessment-master", "Assessment Master", "\uD83C\uDF93",
            "Scored 100% on any subject assessment",
            "Achieve a perfect score in any assessment"),
        new Badge("top-learner", "Top Learner", "\uD83C\uDFC6",
            "Earned 1000 total SkillPoints",
            "Accumulate 1000 SkillPoints from all sources"),
        new Badge("top-mentor", "Top Mentor", "\uD83C\uDF1F",
            "Completed 5 mentorship sessions",
            "Attend 5 mentorship sessions with any mentor"),
        new Badge("consistency-champion", "Consistency Champion", "\uD83D\uDD25",
            "Maintained a 7-day learning streak",
            "Complete at least one activity daily for 7 consecutive days"),
        new Badge("skill-guru", "Skill Guru", "\uD83E\uDDD1\u200D\uD83C\uDF93",
            "Completed all skill paths in one subject",
            "Finish every skill path within a single subject")
    );

    // ===== ACHIEVEMENT DEFINITIONS =====

    static final List<Achievement> ACHIEVEMENT_DEFINITIONS = Arrays.asList(
        new Achievement("first-quiz", "First Steps", "Complete your first quiz",
            "\uD83C\uDFC1", 10, "Submit any quiz for the first time", "learning"),
        new Achievement("quiz-perfect", "Perfect Score", "Get all answers correct in any quiz",
            "\uD83C\uDFAF", 50, "Score 100% on any assessment", "assessment"),
        new Achievement("quiz-streak-3", "Quiz Hat Trick", "Complete 3 quizzes in a row",
            "\uD83C\uDFF0", 30, "Finish 3 quizzes without skipping a day", "streak"),
        new Achievement("skill-path-starter", "Pathfinder", "Complete your first skill path module",
            "\uD83D\uDEE1\uFE0F", 25, "Finish any single module in a skill path", "learning"),
        new Achievement("skill-path-complete", "Skill Seeker", "Complete an entire skill path",
            "\uD83D\uDCDC", 100, "Finish all modules in any skill path", "learning"),
        new Achievement("mentor-first", "Mentorship Begins", "Attend your first mentorship session",
            "\uD83E\uDD1D", 20, "Book and complete one mentorship session", "social"),
        new Achievement("mentor-five", "Networker", "Attend 5 mentorship sessions",
            "\uD83D\uDCAC", 75, "Complete 5 mentorship sessions", "social"),
        new Achievement("streak-3", "Getting Consistent", "Maintain a 3-day learning streak",
            "\uD83D\uDD1B", 15, "Log in and complete activities for 3 consecutive days", "streak"),
        new Achievement("streak-7", "Week Warrior", "Maintain a 7-day learning streak",
            "\uD83D\uDCAA", 60, "Log in and complete activities for 7 consecutive days", "streak"),
        new Achievement("streak-30", "Monthly Legend", "Maintain a 30-day learning streak",
            "\uD83C\uDFC5", 200, "Log in and complete activities for 30 consecutive days", "streak"),
        new Achievement("assessment-easy-all", "Easy Does It", "Complete all easy assessments",
            "\uD83E\uDEE7", 40, "Finish easy-level assessments for all subjects", "assessment"),
        new Achievement("assessment-medium-all", "Middle Ground", "Complete all medium assessments",
            "\uD83D\uDFE0", 80, "Finish medium-level assessments for all subjects", "assessment"),
        new Achievement("assessment-hard-all", "Hardcore Learner", "Complete all hard assessments",
            "\uD83D\uDD34", 150, "Finish hard-level assessments for all subjects", "assessment"),
        new Achievement("challenge-first", "Challenge Accepted", "Complete your first daily or weekly challenge",
            "\u26A1", 20, "Finish any challenge", "learning"),
        new Achievement("points-500", "Points Collector", "Earn 500 total SkillPoints",
            "\uD83D\uDCB0", 0, "Accumulate 500 SkillPoints across all activities", "learning")
    );

    // ===== LEVEL THRESHOLDS =====

    static final int[] LEVEL_THRESHOLDS = {0, 100, 300, 600, 1000, 2000};

    // ===== CORE ENGINE METHODS =====

    /**
     * Calculate level based on total SkillPoints.
     */
    public static int calculateLevel(int skillPoints) {
        for (int i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (skillPoints >= LEVEL_THRESHOLDS[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    /**
     * Get points required for next level.
     */
    public static int pointsToNextLevel(int skillPoints) {
        int currentLevel = calculateLevel(skillPoints);
        if (currentLevel >= LEVEL_THRESHOLDS.length) return 0;
        int currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
        int nextThreshold = LEVEL_THRESHOLDS[currentLevel];
        return nextThreshold - skillPoints;
    }

    /**
     * Get progress percentage toward next level.
     */
    public static double levelProgress(int skillPoints) {
        int currentLevel = calculateLevel(skillPoints);
        if (currentLevel >= LEVEL_THRESHOLDS.length) return 100.0;
        int currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
        int nextThreshold = LEVEL_THRESHOLDS[currentLevel];
        int range = nextThreshold - currentThreshold;
        int progress = skillPoints - currentThreshold;
        return Math.min(100.0, (progress * 100.0) / range);
    }

    /**
     * Validate which badges a user should have unlocked.
     */
    public static List<Map<String, Object>> validateBadges(UserProfile profile) {
        List<Map<String, Object>> results = new ArrayList<>();
        String today = LocalDate.now().toString();

        for (Badge badge : BADGE_DEFINITIONS) {
            boolean shouldUnlock = false;

            switch (badge.id) {
                case "python-beginner":
                    shouldUnlock = profile.completedSubjectPaths.contains("python-basics");
                    break;
                case "java-explorer":
                    shouldUnlock = profile.completedSubjectPaths.contains("java-basics");
                    break;
                case "web-dev-starter":
                    shouldUnlock = profile.completedSubjectPaths.contains("web-basics");
                    break;
                case "assessment-master":
                    shouldUnlock = hasPerfectScore(profile);
                    break;
                case "top-learner":
                    shouldUnlock = profile.skillPoints >= 1000;
                    break;
                case "top-mentor":
                    shouldUnlock = profile.completedSessions.size() >= 5;
                    break;
                case "consistency-champion":
                    shouldUnlock = profile.currentStreak >= 7;
                    break;
                case "skill-guru":
                    shouldUnlock = isSkillGuru(profile);
                    break;
            }

            Map<String, Object> result = new HashMap<>();
            result.put("id", badge.id);
            result.put("name", badge.name);
            result.put("icon", badge.icon);
            result.put("description", badge.description);
            result.put("requirement", badge.requirement);
            result.put("unlocked", shouldUnlock);
            result.put("unlockedDate", shouldUnlock ? today : null);
            results.add(result);
        }
        return results;
    }

    /**
     * Validate which achievements a user should have unlocked.
     */
    public static List<Map<String, Object>> validateAchievements(UserProfile profile) {
        List<Map<String, Object>> results = new ArrayList<>();
        String today = LocalDate.now().toString();

        for (Achievement ach : ACHIEVEMENT_DEFINITIONS) {
            boolean shouldUnlock = false;

            switch (ach.id) {
                case "first-quiz":
                    shouldUnlock = !profile.completedQuizzes.isEmpty();
                    break;
                case "quiz-perfect":
                    shouldUnlock = hasPerfectScore(profile);
                    break;
                case "quiz-streak-3":
                    shouldUnlock = profile.completedQuizzes.size() >= 3 && profile.currentStreak >= 3;
                    break;
                case "skill-path-starter":
                    shouldUnlock = !profile.completedModules.isEmpty();
                    break;
                case "skill-path-complete":
                    shouldUnlock = profile.completedSubjectPaths.size() >= 1;
                    break;
                case "mentor-first":
                    shouldUnlock = profile.completedSessions.size() >= 1;
                    break;
                case "mentor-five":
                    shouldUnlock = profile.completedSessions.size() >= 5;
                    break;
                case "streak-3":
                    shouldUnlock = profile.currentStreak >= 3;
                    break;
                case "streak-7":
                    shouldUnlock = profile.currentStreak >= 7;
                    break;
                case "streak-30":
                    shouldUnlock = profile.currentStreak >= 30;
                    break;
                case "assessment-easy-all":
                    shouldUnlock = hasCompletedAllEasy(profile);
                    break;
                case "assessment-medium-all":
                    shouldUnlock = hasCompletedAllMedium(profile);
                    break;
                case "assessment-hard-all":
                    shouldUnlock = hasCompletedAllHard(profile);
                    break;
                case "challenge-first":
                    shouldUnlock = profile.dailyChallengesCompleted > 0 || profile.weeklyChallengesCompleted > 0;
                    break;
                case "points-500":
                    shouldUnlock = profile.skillPoints >= 500;
                    break;
            }

            Map<String, Object> result = new HashMap<>();
            result.put("id", ach.id);
            result.put("name", ach.name);
            result.put("icon", ach.icon);
            result.put("description", ach.description);
            result.put("requirement", ach.requirement);
            result.put("skillPoints", ach.skillPoints);
            result.put("category", ach.category);
            result.put("unlocked", shouldUnlock);
            result.put("unlockedDate", shouldUnlock ? today : null);
            results.add(result);
        }
        return results;
    }

    /**
     * Calculate total points a user would earn from newly unlocked achievements.
     */
    public static int calculateNewAchievementPoints(UserProfile profile, List<Map<String, Object>> currentAchievements) {
        int total = 0;
        Set<String> alreadyUnlocked = currentAchievements.stream()
            .filter(a -> Boolean.TRUE.equals(a.get("unlocked")))
            .map(a -> (String) a.get("id"))
            .collect(Collectors.toSet());

        List<Map<String, Object>> freshValidated = validateAchievements(profile);
        for (Map<String, Object> ach : freshValidated) {
            if (Boolean.TRUE.equals(ach.get("unlocked")) && !alreadyUnlocked.contains(ach.get("id"))) {
                total += ((Number) ach.get("skillPoints")).intValue();
            }
        }
        return total;
    }

    // ===== HELPER METHODS =====

    private static boolean hasPerfectScore(UserProfile profile) {
        for (Map.Entry<String, Map<String, List<Integer>>> subjectEntry : profile.quizScores.entrySet()) {
            for (Map.Entry<String, List<Integer>> diffEntry : subjectEntry.getValue().entrySet()) {
                for (int score : diffEntry.getValue()) {
                    if (score == 100) return true;
                }
            }
        }
        return false;
    }

    private static boolean hasCompletedAllEasy(UserProfile profile) {
        Set<String> subjectsWithEasy = new HashSet<>();
        for (String subj : profile.quizScores.keySet()) {
            if (profile.quizScores.get(subj).containsKey("easy")) {
                List<Integer> scores = profile.quizScores.get(subj).get("easy");
                if (!scores.isEmpty() && scores.get(scores.size() - 1) >= 40) {
                    subjectsWithEasy.add(subj);
                }
            }
        }
        return subjectsWithEasy.containsAll(Arrays.asList("python", "java", "web"));
    }

    private static boolean hasCompletedAllMedium(UserProfile profile) {
        Set<String> subjectsWithMedium = new HashSet<>();
        for (String subj : profile.quizScores.keySet()) {
            if (profile.quizScores.get(subj).containsKey("medium")) {
                List<Integer> scores = profile.quizScores.get(subj).get("medium");
                if (!scores.isEmpty() && scores.get(scores.size() - 1) >= 40) {
                    subjectsWithMedium.add(subj);
                }
            }
        }
        return subjectsWithMedium.containsAll(Arrays.asList("python", "java", "web"));
    }

    private static boolean hasCompletedAllHard(UserProfile profile) {
        Set<String> subjectsWithHard = new HashSet<>();
        for (String subj : profile.quizScores.keySet()) {
            if (profile.quizScores.get(subj).containsKey("hard")) {
                List<Integer> scores = profile.quizScores.get(subj).get("hard");
                if (!scores.isEmpty() && scores.get(scores.size() - 1) >= 40) {
                    subjectsWithHard.add(subj);
                }
            }
        }
        return subjectsWithHard.containsAll(Arrays.asList("python", "java", "web"));
    }

    private static boolean isSkillGuru(UserProfile profile) {
        long totalPaths = Arrays.asList("python-basics", "python-advanced", "java-basics",
            "java-oop", "web-basics", "web-react").stream()
            .filter(p -> profile.completedSubjectPaths.contains(p))
            .count();

        String[] pythonPaths = {"python-basics", "python-advanced"};
        String[] javaPaths = {"java-basics", "java-oop"};
        String[] webPaths = {"web-basics", "web-react"};

        long pythonDone = Arrays.stream(pythonPaths).filter(p -> profile.completedSubjectPaths.contains(p)).count();
        long javaDone = Arrays.stream(javaPaths).filter(p -> profile.completedSubjectPaths.contains(p)).count();
        long webDone = Arrays.stream(webPaths).filter(p -> profile.completedSubjectPaths.contains(p)).count();

        return pythonDone == pythonPaths.length || javaDone == javaPaths.length || webDone == webPaths.length;
    }

    // ===== STREAK CALCULATION =====

    /**
     * Update streak based on last active date.
     */
    public static int updateStreak(String lastActiveDate, int currentStreak) {
        if (lastActiveDate == null || lastActiveDate.isEmpty()) return 1;
        try {
            LocalDate last = LocalDate.parse(lastActiveDate, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDate today = LocalDate.now();
            long daysBetween = ChronoUnit.DAYS.between(last, today);

            if (daysBetween == 0) return currentStreak;
            if (daysBetween == 1) return currentStreak + 1;
            return 1;
        } catch (Exception e) {
            return 1;
        }
    }

    // ===== MAIN - CLI & REST MODE =====

    public static void main(String[] args) {
        if (args.length > 0 && args[0].equals("--rest")) {
            startRestServer();
            return;
        }
        runCLI();
    }

    static void runCLI() {
        System.out.println("=== Achievement Engine ===");
        System.out.println();

        UserProfile demo = new UserProfile("demo-user");
        demo.skillPoints = 750;
        demo.currentStreak = 10;
        demo.longestStreak = 15;
        demo.completedQuizzes.addAll(Arrays.asList("quiz1", "quiz2", "quiz3"));
        demo.completedSubjectPaths.add("python-basics");
        demo.completedModules.add("module1");
        demo.completedSessions.add("session1");
        demo.dailyChallengesCompleted = 2;
        demo.lastActiveDate = LocalDate.now().minusDays(1).toString();

        Map<String, List<Integer>> pyScores = new HashMap<>();
        pyScores.put("easy", Arrays.asList(80, 100));
        pyScores.put("medium", Arrays.asList(70));
        demo.quizScores.put("python", pyScores);

        System.out.println("Demo User: " + demo.userId);
        System.out.println("SkillPoints: " + demo.skillPoints);
        System.out.println("Level: " + calculateLevel(demo.skillPoints));
        System.out.println("Level Progress: " + String.format("%.1f%%", levelProgress(demo.skillPoints)));
        System.out.println("Points to Next Level: " + pointsToNextLevel(demo.skillPoints));
        System.out.println("Current Streak: " + demo.currentStreak);
        System.out.println();

        System.out.println("--- Badges ---");
        for (Map<String, Object> b : validateBadges(demo)) {
            System.out.println((Boolean.TRUE.equals(b.get("unlocked")) ? "[X]" : "[ ]")
                + " " + b.get("name"));
        }
        System.out.println();

        System.out.println("--- Achievements ---");
        for (Map<String, Object> a : validateAchievements(demo)) {
            System.out.println((Boolean.TRUE.equals(a.get("unlocked")) ? "[X]" : "[ ]")
                + " " + a.get("name") + " (" + a.get("skillPoints") + " SP)");
        }
        System.out.println();

        System.out.println("--- Streak Update ---");
        System.out.println("New streak (1 day gap): " + updateStreak(
            LocalDate.now().minusDays(1).toString(), 10));
        System.out.println("Streak broken (3 day gap): " + updateStreak(
            LocalDate.now().minusDays(3).toString(), 10));
    }

    // ===== SIMPLE REST SERVER =====

    static void startRestServer() {
        System.out.println("Achievement Engine REST mode requires Spring Boot or similar.");
        System.out.println("Endpoints to implement:");
        System.out.println("  POST /api/achievements/validate-badges");
        System.out.println("  POST /api/achievements/validate-achievements");
        System.out.println("  POST /api/achievements/level");
        System.out.println("  POST /api/achievements/update-streak");
        System.out.println();
        System.out.println("Run CLI mode instead: java AchievementEngine");
        runCLI();
    }
}
