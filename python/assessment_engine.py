import json
import random
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ============================================================
# assessment_engine.py - Assessment Generation & Scoring Engine
# ============================================================

QUESTION_BANK = {
    "python": {
        "easy": [
            {"id": "p-e-1", "question": "What is the output of print(2 ** 3)?", "options": ["5", "6", "8", "9"], "answer": 2},
            {"id": "p-e-2", "question": "Which keyword is used to define a function in Python?", "options": ["func", "def", "function", "define"], "answer": 1},
            {"id": "p-e-3", "question": "What is the correct file extension for Python files?", "options": [".pyt", ".py", ".pt", ".pyth"], "answer": 1},
            {"id": "p-e-4", "question": "Which of the following is a mutable data type in Python?", "options": ["tuple", "int", "list", "string"], "answer": 2},
            {"id": "p-e-5", "question": "What does the len() function do?", "options": ["Returns length", "Converts to int", "Prints output", "Creates list"], "answer": 0},
        ],
        "medium": [
            {"id": "p-m-1", "question": "What will be the output of list(range(5))?", "options": ["[1,2,3,4,5]", "[0,1,2,3,4]", "[0,1,2,3,4,5]", "[1,2,3,4]"], "answer": 1},
            {"id": "p-m-2", "question": "Which of the following statements will raise an exception?", "options": ["int('10')", "int('10.5')", "float('10.5')", "str(10)"], "answer": 1},
            {"id": "p-m-3", "question": "What is the output of {x: x**2 for x in range(3)}?", "options": ["{0:0,1:1,2:4}", "{0:0,1:1,4:2}", "{0:0,1:1,2:4,3:9}", "Error"], "answer": 0},
            {"id": "p-m-4", "question": "What does the __init__ method do in a Python class?", "options": ["Destructor", "Constructor", "String representation", "Comparison"], "answer": 1},
            {"id": "p-m-5", "question": "Which of the following is NOT a valid way to handle exceptions?", "options": ["try-except", "try-finally", "except-else", "catch-throw"], "answer": 3},
        ],
        "hard": [
            {"id": "p-h-1", "question": "What will be the output of print(lambda x: x + 1)(5)?", "options": ["5", "6", "SyntaxError", "TypeError"], "answer": 1},
            {"id": "p-h-2", "question": "What is the time complexity of accessing an item in a Python dict?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "answer": 0},
            {"id": "p-h-3", "question": "What does @property decorator do?", "options": ["Creates class property", "Creates getter method", "Marks method as static", "Sets instance variable"], "answer": 1},
            {"id": "p-h-4", "question": "Which method is used to add items to a set?", "options": [".append()", ".add()", ".insert()", ".push()"], "answer": 1},
            {"id": "p-h-5", "question": "What is the output of print(all([1, 0, 2]))?", "options": ["True", "False", "1", "Error"], "answer": 1},
        ],
    },
    "java": {
        "easy": [
            {"id": "j-e-1", "question": "Which of the following is NOT a Java primitive type?", "options": ["int", "float", "String", "boolean"], "answer": 2},
            {"id": "j-e-2", "question": "What is the entry point of a Java program?", "options": ["main()", "start()", "run()", "init()"], "answer": 0},
            {"id": "j-e-3", "question": "What does JVM stand for?", "options": ["Java Virtual Machine", "Java Variable Manager", "Java Version Module", "Java Visual Machine"], "answer": 0},
            {"id": "j-e-4", "question": "Which operator is used for string concatenation?", "options": ["+", "&", ".", ","], "answer": 0},
            {"id": "j-e-5", "question": "What is the size of int in Java?", "options": ["8 bits", "16 bits", "32 bits", "64 bits"], "answer": 2},
        ],
        "medium": [
            {"id": "j-m-1", "question": "Which keyword is used to inherit a class in Java?", "options": ["inherits", "extends", "implements", "super"], "answer": 1},
            {"id": "j-m-2", "question": "What is the output of System.out.println(10 + 20 + \"30\")?", "options": ["102030", "3030", "60", "Compilation Error"], "answer": 1},
            {"id": "j-m-3", "question": "Which of the following is NOT an access modifier?", "options": ["public", "private", "protected", "static"], "answer": 3},
            {"id": "j-m-4", "question": "What does the final keyword do when applied to a class?", "options": ["Class cannot be instantiated", "Class cannot be inherited", "Class cannot be extended", "Both B and C"], "answer": 2},
            {"id": "j-m-5", "question": "Which collection class guarantees ordered iteration?", "options": ["HashSet", "HashMap", "TreeSet", "LinkedHashSet"], "answer": 3},
        ],
        "hard": [
            {"id": "j-h-1", "question": "What is the output of: int x = 5; System.out.println(x++ + ++x);", "options": ["10", "11", "12", "13"], "answer": 2},
            {"id": "j-h-2", "question": "Which design pattern is used in Java's InputStream wrapping?", "options": ["Factory", "Decorator", "Singleton", "Observer"], "answer": 1},
            {"id": "j-h-3", "question": "What is the default garbage collection algorithm in modern Java?", "options": ["Serial GC", "Parallel GC", "G1 GC", "Z GC"], "answer": 2},
            {"id": "j-h-4", "question": "Which method must be implemented for a functional interface?", "options": ["All methods", "Only default methods", "Only abstract method", "Only static methods"], "answer": 2},
            {"id": "j-h-5", "question": "What is the purpose of the volatile keyword?", "options": ["Optimize memory", "Ensure thread visibility", "Prevent serialization", "Enable caching"], "answer": 1},
        ],
    },
    "web": {
        "easy": [
            {"id": "w-e-1", "question": "What does HTML stand for?", "options": ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Transfer Markup Language"], "answer": 0},
            {"id": "w-e-2", "question": "Which tag is used to create a hyperlink?", "options": ["<link>", "<a>", "<href>", "<url>"], "answer": 1},
            {"id": "w-e-3", "question": "What is the correct way to include CSS in HTML?", "options": ["<css>", "<style>", "<script>", "<stylesheet>"], "answer": 1},
            {"id": "w-e-4", "question": "Which CSS property changes text color?", "options": ["text-color", "color", "font-color", "foreground"], "answer": 1},
            {"id": "w-e-5", "question": "What does the var keyword do in JavaScript?", "options": ["Declares variable", "Declares constant", "Declares function", "Declares class"], "answer": 0},
        ],
        "medium": [
            {"id": "w-m-1", "question": "What does CSS box-sizing: border-box do?", "options": ["Excludes padding from width", "Includes padding in width", "Adds border to width", "Removes margin"], "answer": 1},
            {"id": "w-m-2", "question": "What is the purpose of the fetch() API?", "options": ["DOM manipulation", "Making HTTP requests", "File system access", "Database queries"], "answer": 1},
            {"id": "w-m-3", "question": "Which HTTP status code means 'Not Found'?", "options": ["200", "301", "404", "500"], "answer": 2},
            {"id": "w-m-4", "question": "What does the localStorage API provide?", "options": ["Server-side storage", "Persistent client-side storage", "Session-only storage", "Database storage"], "answer": 1},
            {"id": "w-m-5", "question": "Which pseudo-class selects the first child element?", "options": [":first-child", ":first", ":nth-child(0)", ":first-of-type"], "answer": 0},
        ],
        "hard": [
            {"id": "w-h-1", "question": "What is the event propagation order in the DOM?", "options": ["Target -> Capture -> Bubble", "Capture -> Target -> Bubble", "Bubble -> Target -> Capture", "Target -> Bubble -> Capture"], "answer": 1},
            {"id": "w-h-2", "question": "What does the 'defer' attribute do on a script tag?", "options": ["Pauses script execution", "Delays script until HTML parsed", "Runs script immediately", "Caches the script"], "answer": 1},
            {"id": "w-h-3", "question": "Which of the following is a JavaScript closure?", "options": ["A function with no name", "Function with access to outer scope", "A self-invoking function", "An async function"], "answer": 1},
            {"id": "w-h-4", "question": "What is the purpose of CORS?", "options": ["Cross-origin security", "Code optimization", "CSS rendering", "Cache management"], "answer": 0},
            {"id": "w-h-5", "question": "What does the 'this' keyword refer to in an arrow function?", "options": ["The function itself", "The global object", "The enclosing context", "The calling object"], "answer": 2},
        ],
    },
}

TIME_LIMITS = {"easy": 600, "medium": 900, "hard": 1200}

PASS_PERCENTAGE = 40

SCORE_MULTIPLIER = 10


class AssessmentHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_json(self, data, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        path = parsed.path.rstrip("/")

        if path == "/api/questions":
            subject = query.get("subject", [None])[0]
            difficulty = query.get("difficulty", [None])[0]

            if subject and subject not in QUESTION_BANK:
                self._send_json({"error": f"Unknown subject: {subject}"}, 400)
                return
            if difficulty and difficulty not in ["easy", "medium", "hard"]:
                self._send_json({"error": f"Unknown difficulty: {difficulty}"}, 400)
                return

            if subject and difficulty:
                questions = QUESTION_BANK[subject][difficulty]
            elif subject:
                questions = {d: QUESTION_BANK[subject][d] for d in QUESTION_BANK[subject]}
            else:
                questions = QUESTION_BANK

            self._send_json({"status": "ok", "data": questions})

        elif path == "/api/time-limit":
            difficulty = query.get("difficulty", ["easy"])[0]
            limit = TIME_LIMITS.get(difficulty, 600)
            self._send_json({"status": "ok", "timeLimit": limit})

        elif path == "/api/health":
            self._send_json({"status": "ok", "service": "assessment-engine"})

        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/score":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.read(content_length)) if content_length else {}

            subject = body.get("subject")
            difficulty = body.get("difficulty")
            answers = body.get("answers", [])

            if not subject or not difficulty or not answers:
                self._send_json({"error": "Missing required fields: subject, difficulty, answers"}, 400)
                return

            if subject not in QUESTION_BANK or difficulty not in QUESTION_BANK[subject]:
                self._send_json({"error": "Invalid subject or difficulty"}, 400)
                return

            questions = QUESTION_BANK[subject][difficulty]
            correct = 0
            total = len(questions)
            results = []

            for q in questions:
                user_answer = answers.get(q["id"])
                is_correct = user_answer == q["answer"]
                if is_correct:
                    correct += 1
                results.append({
                    "id": q["id"],
                    "question": q["question"],
                    "options": q["options"],
                    "correctAnswer": q["answer"],
                    "userAnswer": user_answer,
                    "isCorrect": is_correct,
                })

            score_pct = round((correct / total) * 100, 2) if total > 0 else 0
            passed = score_pct >= PASS_PERCENTAGE
            points = correct * SCORE_MULTIPLIER

            self._send_json({
                "status": "ok",
                "result": {
                    "subject": subject,
                    "difficulty": difficulty,
                    "totalQuestions": total,
                    "correctAnswers": correct,
                    "scorePercentage": score_pct,
                    "passed": passed,
                    "pointsEarned": points if passed else 0,
                    "details": results,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            })

        elif path == "/api/evaluate":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.read(content_length)) if content_length else {}

            needs = {}
            scores = body.get("scores", {})
            completed = body.get("completedSubjects", [])

            for subject in ["python", "java", "web"]:
                for diff in ["easy", "medium", "hard"]:
                    if subject not in scores or diff not in scores.get(subject, {}):
                        needs.setdefault(subject, []).append(diff)

            recommendations = []
            if "python" in needs:
                recommendations.append("Try Python Basics skill path first")
            if "java" in needs:
                recommendations.append("Consider starting with Java Fundamentals")
            if "web" in needs:
                recommendations.append("Review Web Dev Basics before assessments")

            all_three = len(set(completed).intersection(["python", "java", "web"])) >= 3
            has_hard = any(d == "hard" for sub in scores.values() for d in sub.keys())

            self._send_json({
                "status": "ok",
                "evaluation": {
                    "unmetRequirements": needs,
                    "recommendations": recommendations,
                    "eligibleForCertificate": all_three and has_hard,
                    "skillGaps": len(needs),
                },
            })

        else:
            self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        print(f"[{datetime.utcnow().isoformat()}] {args[0]} {args[1]} {args[2]}")


def run_server(port=8000):
    server = HTTPServer(("0.0.0.0", port), AssessmentHandler)
    print(f"Assessment Engine running on http://0.0.0.0:{port}")
    print(f"Endpoints:")
    print(f"  GET  /api/health")
    print(f"  GET  /api/questions?subject=python&difficulty=easy")
    print(f"  GET  /api/time-limit?difficulty=easy")
    print(f"  POST /api/score")
    print(f"  POST /api/evaluate")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
