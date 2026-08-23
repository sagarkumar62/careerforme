import json
from app.models.course import Course, CourseSkill, CoursePrerequisite


def test_course_skill_instantiation():
    cs = CourseSkill(skill_id="python", target_level=5.0)
    assert cs.skill_id == "python"
    assert cs.target_level == 5.0


def test_course_prerequisite_instantiation():
    cp = CoursePrerequisite(skill_id="python", minimum_level=5.0)
    assert cp.skill_id == "python"
    assert cp.minimum_level == 5.0


def test_course_model_full():
    c = Course(
        id="ml-fundamentals",
        title="Machine Learning Fundamentals",
        description="Master core ML algorithms.",
        skills=[CourseSkill(skill_id="machine-learning", target_level=7.0)],
        prerequisites=[
            CoursePrerequisite(skill_id="python", minimum_level=5.0),
            CoursePrerequisite(skill_id="statistics", minimum_level=5.0),
        ],
        difficulty="intermediate",
        duration_hours=30.0,
        category="Data Science",
        tags=["machine-learning", "python"]
    )

    assert c.id == "ml-fundamentals"
    assert c.title == "Machine Learning Fundamentals"
    assert len(c.skills) == 1
    assert c.skills[0].skill_id == "machine-learning"
    assert c.skills[0].target_level == 7.0
    assert len(c.prerequisites) == 2
    assert c.prerequisites[0].skill_id == "python"
    assert c.prerequisites[0].minimum_level == 5.0


def test_courses_json_deserialization():
    raw_json = """
    [
      {
        "id": "python-basics",
        "title": "Python Fundamentals",
        "description": "Learn programming fundamentals using Python.",
        "skills": [
          {
            "skill_id": "python",
            "target_level": 5
          }
        ],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 15,
        "category": "Programming",
        "tags": ["python", "programming"]
      }
    ]
    """
    data = json.loads(raw_json)
    courses = [Course(**item) for item in data]
    assert len(courses) == 1
    assert courses[0].id == "python-basics"
    assert courses[0].skills[0].skill_id == "python"
    assert courses[0].skills[0].target_level == 5.0


def test_all_courses_json_valid():
    from pathlib import Path
    courses_file = Path(__file__).resolve().parents[1] / "app" / "data" / "courses.json"
    assert courses_file.exists()
    
    content = courses_file.read_text(encoding="utf-8")
    data = json.loads(content)
    assert len(data) >= 50

    courses = [Course(**item) for item in data]
    assert len(courses) == len(data)
    for c in courses:
        assert isinstance(c.id, str) and len(c.id) > 0
        assert isinstance(c.title, str) and len(c.title) > 0
        for s in c.skills:
            assert isinstance(s.skill_id, str)
            assert isinstance(s.target_level, (int, float))
        for p in c.prerequisites:
            assert isinstance(p.skill_id, str)
            assert isinstance(p.minimum_level, (int, float))

