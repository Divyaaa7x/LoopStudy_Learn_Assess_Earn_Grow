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
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

class AchievementEngine {

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

    // ===== REST SERVER (built on the JDK's built-in com.sun.net.httpserver, no external deps) =====

    static void startRestServer() {
        int port = 8080;
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
            server.createContext("/api/achievements/validate-badges", new RestHandler("validate-badges"));
            server.createContext("/api/achievements/validate-achievements", new RestHandler("validate-achievements"));
            server.createContext("/api/achievements/level", new RestHandler("level"));
            server.createContext("/api/achievements/update-streak", new RestHandler("update-streak"));
            server.createContext("/api/achievements/health", new RestHandler("health"));
            server.setExecutor(null);
            server.start();
            System.out.println("Achievement Engine running on http://0.0.0.0:" + port);
            System.out.println("Endpoints:");
            System.out.println("  GET  /api/achievements/health");
            System.out.println("  POST /api/achievements/validate-badges");
            System.out.println("  POST /api/achievements/validate-achievements");
            System.out.println("  POST /api/achievements/level");
            System.out.println("  POST /api/achievements/update-streak");
        } catch (IOException e) {
            System.out.println("Failed to start REST server: " + e.getMessage());
        }
    }

    static class RestHandler implements HttpHandler {
        final String route;

        RestHandler(String route) {
            this.route = route;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                    sendJson(exchange, 204, null);
                    return;
                }
                if ("health".equals(route)) {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("status", "ok");
                    body.put("service", "achievement-engine");
                    sendJson(exchange, 200, body);
                    return;
                }

                Map<String, Object> input = readJsonBody(exchange);
                Object result;
                switch (route) {
                    case "validate-badges":
                        result = restValidateBadges(input);
                        break;
                    case "validate-achievements":
                        result = restValidateAchievements(input);
                        break;
                    case "level":
                        result = restLevel(input);
                        break;
                    case "update-streak":
                        result = restUpdateStreak(input);
                        break;
                    default:
                        sendJson(exchange, 404, err("Not found"));
                        return;
                }
                sendJson(exchange, 200, result);
            } catch (Exception e) {
                sendJson(exchange, 400, err(e.getMessage() == null ? "Bad request" : e.getMessage()));
            }
        }

        private Map<String, Object> err(String message) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("error", message);
            return m;
        }
    }

    // ===== REST-FACING LOGIC (operates on loosely-typed JSON maps sent by the frontend) =====

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> restValidateBadges(Map<String, Object> u) {
        int skillPoints = asInt(u.get("skillPoints"));
        int sessions = asList(u.get("completedSessions")).size();
        int streak = asInt(u.get("currentStreak"));
        List<Object> paths = asList(u.get("completedSubjectPaths"));
        boolean hasPerfect = asBool(u.get("hasPerfectScore"));
        String today = LocalDate.now().toString();

        List<Map<String, Object>> results = new ArrayList<>();
        for (Badge badge : BADGE_DEFINITIONS) {
            boolean unlocked;
            switch (badge.id) {
                case "python-beginner": unlocked = paths.contains("python-basics"); break;
                case "java-explorer": unlocked = paths.contains("java-basics"); break;
                case "web-dev-starter": unlocked = paths.contains("web-basics"); break;
                case "assessment-master": unlocked = hasPerfect; break;
                case "top-learner": unlocked = skillPoints >= 1000; break;
                case "top-mentor": unlocked = sessions >= 5; break;
                case "consistency-champion": unlocked = streak >= 7; break;
                case "skill-guru": unlocked = isSkillGuruPaths(paths); break;
                default: unlocked = false;
            }
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", badge.id);
            r.put("name", badge.name);
            r.put("icon", badge.icon);
            r.put("description", badge.description);
            r.put("requirement", badge.requirement);
            r.put("unlocked", unlocked);
            r.put("unlockedDate", unlocked ? today : null);
            results.add(r);
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> restValidateAchievements(Map<String, Object> u) {
        int skillPoints = asInt(u.get("skillPoints"));
        int sessions = asList(u.get("completedSessions")).size();
        int streak = asInt(u.get("currentStreak"));
        int quizzes = asList(u.get("completedQuizzes")).size();
        int modules = asList(u.get("completedModules")).size();
        int paths = asList(u.get("completedSubjectPaths")).size();
        int daily = asInt(u.get("dailyChallengesCompleted"));
        int weekly = asInt(u.get("weeklyChallengesCompleted"));
        boolean hasPerfect = asBool(u.get("hasPerfectScore"));
        boolean easyAll = asBool(u.get("completedEasyAll"));
        boolean mediumAll = asBool(u.get("completedMediumAll"));
        boolean hardAll = asBool(u.get("completedHardAll"));
        String today = LocalDate.now().toString();

        List<Map<String, Object>> results = new ArrayList<>();
        for (Achievement ach : ACHIEVEMENT_DEFINITIONS) {
            boolean unlocked;
            switch (ach.id) {
                case "first-quiz": unlocked = quizzes >= 1; break;
                case "quiz-perfect": unlocked = hasPerfect; break;
                case "quiz-streak-3": unlocked = quizzes >= 3 && streak >= 3; break;
                case "skill-path-starter": unlocked = modules >= 1; break;
                case "skill-path-complete": unlocked = paths >= 1; break;
                case "mentor-first": unlocked = sessions >= 1; break;
                case "mentor-five": unlocked = sessions >= 5; break;
                case "streak-3": unlocked = streak >= 3; break;
                case "streak-7": unlocked = streak >= 7; break;
                case "streak-30": unlocked = streak >= 30; break;
                case "assessment-easy-all": unlocked = easyAll; break;
                case "assessment-medium-all": unlocked = mediumAll; break;
                case "assessment-hard-all": unlocked = hardAll; break;
                case "challenge-first": unlocked = daily > 0 || weekly > 0; break;
                case "points-500": unlocked = skillPoints >= 500; break;
                default: unlocked = false;
            }
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", ach.id);
            r.put("name", ach.name);
            r.put("icon", ach.icon);
            r.put("description", ach.description);
            r.put("requirement", ach.requirement);
            r.put("skillPoints", ach.skillPoints);
            r.put("category", ach.category);
            r.put("unlocked", unlocked);
            r.put("unlockedDate", unlocked ? today : null);
            results.add(r);
        }
        return results;
    }

    static Map<String, Object> restLevel(Map<String, Object> body) {
        int skillPoints = asInt(body.get("skillPoints"));
        int level = calculateLevel(skillPoints);
        double progress = levelProgress(skillPoints);
        int pointsToNext = pointsToNextLevel(skillPoints);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("level", level);
        r.put("progress", Math.round(progress * 10.0) / 10.0);
        r.put("pointsToNext", pointsToNext);
        return r;
    }

    static Map<String, Object> restUpdateStreak(Map<String, Object> body) {
        Object lastActiveObj = body.get("lastActiveDate");
        int currentStreak = asInt(body.get("currentStreak"));
        Map<String, Object> r = new LinkedHashMap<>();
        if (lastActiveObj == null || String.valueOf(lastActiveObj).isEmpty()) {
            r.put("newStreak", 1);
            r.put("streakBroken", false);
            return r;
        }
        try {
            LocalDate last = LocalDate.parse(String.valueOf(lastActiveObj).substring(0, 10));
            long diffDays = ChronoUnit.DAYS.between(last, LocalDate.now());
            if (diffDays == 0) {
                r.put("newStreak", currentStreak);
                r.put("streakBroken", false);
            } else if (diffDays == 1) {
                r.put("newStreak", currentStreak + 1);
                r.put("streakBroken", false);
            } else {
                r.put("newStreak", 1);
                r.put("streakBroken", true);
                r.put("brokenStreak", currentStreak);
            }
        } catch (Exception e) {
            r.put("newStreak", 1);
            r.put("streakBroken", false);
        }
        return r;
    }

    private static boolean isSkillGuruPaths(List<Object> paths) {
        String[] pythonPaths = {"python-basics", "python-advanced"};
        String[] javaPaths = {"java-basics", "java-oop"};
        String[] webPaths = {"web-basics", "web-react"};
        long pythonDone = Arrays.stream(pythonPaths).filter(paths::contains).count();
        long javaDone = Arrays.stream(javaPaths).filter(paths::contains).count();
        long webDone = Arrays.stream(webPaths).filter(paths::contains).count();
        return pythonDone == pythonPaths.length || javaDone == javaPaths.length || webDone == webPaths.length;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> asList(Object o) {
        return o instanceof List ? (List<Object>) o : Collections.emptyList();
    }

    private static int asInt(Object o) {
        if (o instanceof Number) return ((Number) o).intValue();
        return 0;
    }

    private static boolean asBool(Object o) {
        return Boolean.TRUE.equals(o);
    }

    // ===== HTTP helpers =====

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readJsonBody(HttpExchange exchange) throws IOException {
        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int n;
        java.io.InputStream in = exchange.getRequestBody();
        while ((n = in.read(chunk)) != -1) buf.write(chunk, 0, n);
        String text = new String(buf.toByteArray(), StandardCharsets.UTF_8).trim();
        if (text.isEmpty()) return new LinkedHashMap<>();
        Object parsed = MiniJson.parse(text);
        return parsed instanceof Map ? (Map<String, Object>) parsed : new LinkedHashMap<>();
    }

    private static void sendJson(HttpExchange exchange, int status, Object data) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        byte[] out = data == null ? new byte[0] : MiniJson.write(data).getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, out.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(out);
        }
    }

    // ===== Minimal dependency-free JSON parser/writer =====

    static class MiniJson {
        static Object parse(String text) {
            Parser p = new Parser(text);
            Object result = p.parseValue();
            p.skipWhitespace();
            return result;
        }

        static String write(Object value) {
            StringBuilder sb = new StringBuilder();
            writeValue(value, sb);
            return sb.toString();
        }

        @SuppressWarnings("unchecked")
        private static void writeValue(Object value, StringBuilder sb) {
            if (value == null) {
                sb.append("null");
            } else if (value instanceof String) {
                writeString((String) value, sb);
            } else if (value instanceof Boolean || value instanceof Number) {
                sb.append(value.toString());
            } else if (value instanceof Map) {
                sb.append('{');
                boolean first = true;
                for (Map.Entry<String, Object> e : ((Map<String, Object>) value).entrySet()) {
                    if (!first) sb.append(',');
                    first = false;
                    writeString(e.getKey(), sb);
                    sb.append(':');
                    writeValue(e.getValue(), sb);
                }
                sb.append('}');
            } else if (value instanceof List) {
                sb.append('[');
                boolean first = true;
                for (Object item : (List<Object>) value) {
                    if (!first) sb.append(',');
                    first = false;
                    writeValue(item, sb);
                }
                sb.append(']');
            } else {
                writeString(value.toString(), sb);
            }
        }

        private static void writeString(String s, StringBuilder sb) {
            sb.append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"': sb.append("\\\""); break;
                    case '\\': sb.append("\\\\"); break;
                    case '\n': sb.append("\\n"); break;
                    case '\r': sb.append("\\r"); break;
                    case '\t': sb.append("\\t"); break;
                    default:
                        if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                        else sb.append(c);
                }
            }
            sb.append('"');
        }

        private static class Parser {
            final String s;
            int i = 0;

            Parser(String s) {
                this.s = s;
            }

            void skipWhitespace() {
                while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
            }

            Object parseValue() {
                skipWhitespace();
                if (i >= s.length()) return null;
                char c = s.charAt(i);
                if (c == '{') return parseObject();
                if (c == '[') return parseArray();
                if (c == '"') return parseString();
                if (c == 't' || c == 'f') return parseBoolean();
                if (c == 'n') {
                    i += 4;
                    return null;
                }
                return parseNumber();
            }

            Map<String, Object> parseObject() {
                Map<String, Object> map = new LinkedHashMap<>();
                i++; // {
                skipWhitespace();
                if (i < s.length() && s.charAt(i) == '}') {
                    i++;
                    return map;
                }
                while (true) {
                    skipWhitespace();
                    String key = parseString();
                    skipWhitespace();
                    i++; // :
                    Object value = parseValue();
                    map.put(key, value);
                    skipWhitespace();
                    if (i < s.length() && s.charAt(i) == ',') {
                        i++;
                        continue;
                    }
                    break;
                }
                skipWhitespace();
                if (i < s.length() && s.charAt(i) == '}') i++;
                return map;
            }

            List<Object> parseArray() {
                List<Object> list = new ArrayList<>();
                i++; // [
                skipWhitespace();
                if (i < s.length() && s.charAt(i) == ']') {
                    i++;
                    return list;
                }
                while (true) {
                    list.add(parseValue());
                    skipWhitespace();
                    if (i < s.length() && s.charAt(i) == ',') {
                        i++;
                        continue;
                    }
                    break;
                }
                skipWhitespace();
                if (i < s.length() && s.charAt(i) == ']') i++;
                return list;
            }

            String parseString() {
                StringBuilder sb = new StringBuilder();
                i++; // opening quote
                while (i < s.length() && s.charAt(i) != '"') {
                    char c = s.charAt(i);
                    if (c == '\\' && i + 1 < s.length()) {
                        char next = s.charAt(i + 1);
                        switch (next) {
                            case 'n': sb.append('\n'); break;
                            case 'r': sb.append('\r'); break;
                            case 't': sb.append('\t'); break;
                            case '"': sb.append('"'); break;
                            case '\\': sb.append('\\'); break;
                            case '/': sb.append('/'); break;
                            case 'u':
                                String hex = s.substring(i + 2, i + 6);
                                sb.append((char) Integer.parseInt(hex, 16));
                                i += 4;
                                break;
                            default: sb.append(next);
                        }
                        i += 2;
                    } else {
                        sb.append(c);
                        i++;
                    }
                }
                i++; // closing quote
                return sb.toString();
            }

            Boolean parseBoolean() {
                if (s.startsWith("true", i)) {
                    i += 4;
                    return Boolean.TRUE;
                }
                i += 5;
                return Boolean.FALSE;
            }

            Double parseNumber() {
                int start = i;
                while (i < s.length() && (Character.isDigit(s.charAt(i)) || "+-.eE".indexOf(s.charAt(i)) >= 0)) i++;
                return Double.parseDouble(s.substring(start, i));
            }
        }
    }
}
