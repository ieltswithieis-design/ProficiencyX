import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = json.loads((ROOT / "database/tests/ielts_database.json").read_text(encoding="utf-8"))

errors = []
for section in ("reading", "listening", "writing", "speaking"):
    tests = DB.get(section)
    if not isinstance(tests, list) or not tests:
        errors.append(f"{section}: missing test collection")
        continue
    ids = [t.get("id") for t in tests]
    if len(ids) != len(set(ids)):
        errors.append(f"{section}: duplicate test IDs")

for test in DB["reading"]:
    if len(test.get("passages", [])) != 3:
        errors.append(f"reading #{test.get('id')}: must contain 3 passages")
    qs = test.get("questions", [])
    if len(qs) != 40:
        errors.append(f"reading #{test.get('id')}: must contain 40 questions")
    for q in qs:
        if not str(q.get("prompt", "")).strip() or q.get("correctAnswer") in (None, ""):
            errors.append(f"reading #{test.get('id')} q{q.get('questionNumber')}: missing prompt/answer")
        if q.get("type") == "multiple-choice-single" and q.get("correctAnswer") not in q.get("options", []):
            errors.append(f"reading #{test.get('id')} q{q.get('questionNumber')}: answer not in options")

for test in DB["listening"]:
    parts = test.get("parts", [])
    if len(parts) != 4:
        errors.append(f"listening #{test.get('id')}: must contain 4 parts")
    if sum(len(p.get("questions", [])) for p in parts) != 40:
        errors.append(f"listening #{test.get('id')}: must contain 40 questions")
    for p in parts:
        if len(p.get("questions", [])) != 10:
            errors.append(f"listening #{test.get('id')} part {p.get('part')}: must contain 10 questions")
        for q in p.get("questions", []):
            if not str(q.get("prompt", "")).strip() or q.get("correctAnswer") in (None, ""):
                errors.append(f"listening #{test.get('id')} part {p.get('part')} q{q.get('questionNumber')}: missing prompt/answer")
            if q.get("type") == "multiple-choice-single" and q.get("correctAnswer") not in q.get("options", []):
                errors.append(f"listening #{test.get('id')} part {p.get('part')} q{q.get('questionNumber')}: answer not in options")

for test in DB["writing"]:
    if not str(test.get("task1Prompt", "")).strip() or not str(test.get("task2Prompt", "")).strip():
        errors.append(f"writing #{test.get('id')}: missing Task 1 or Task 2")
    if not test.get("scoring", {}).get("criteria"):
        errors.append(f"writing #{test.get('id')}: missing scoring criteria")

for test in DB["speaking"]:
    p2 = test.get("part2", {})
    if not isinstance(p2, dict) or not str(p2.get("cueCard", "")).strip():
        errors.append(f"speaking #{test.get('id')}: missing Part 2 cue card")
    if len(test.get("part1", [])) < 1 or len(test.get("part3", [])) < 1:
        errors.append(f"speaking #{test.get('id')}: missing Part 1 or Part 3")
    if len(test.get("assessmentCriteria", [])) < 4:
        errors.append(f"speaking #{test.get('id')}: missing four assessment criteria")

for section in ("reading", "listening"):
    prompts = []
    if section == "reading":
        prompts = [q["prompt"] for t in DB[section] for q in t["questions"]]
    else:
        prompts = [q["prompt"] for t in DB[section] for p in t["parts"] for q in p["questions"]]
    duplicates = len(prompts) - len(set(prompts))
    if duplicates:
        errors.append(f"{section}: {duplicates} duplicate question prompts")

if errors:
    print("DATABASE VALIDATION FAILED")
    for e in errors:
        print("-", e)
    raise SystemExit(1)

print("DATABASE VALIDATION PASSED")
print("Reading:", len(DB["reading"]), "tests /", sum(len(t["questions"]) for t in DB["reading"]), "questions")
print("Listening:", len(DB["listening"]), "tests /", sum(len(p["questions"]) for t in DB["listening"] for p in t["parts"]), "questions")
print("Writing:", len(DB["writing"]), "tests")
print("Speaking:", len(DB["speaking"]), "tests")
