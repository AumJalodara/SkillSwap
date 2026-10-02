from app.matching.scoring import calculate_compatibility

# Mocking skill structures for simple logic test
class MockSkill:
    def __init__(self, skill_id, name):
        self.id = skill_id
        self.name = name

class MockUserSkill:
    def __init__(self, skill_id, name):
        self.skill_id = skill_id
        self.skill = MockSkill(skill_id, name)

def test_reciprocal_skill_match():
    # User A wants 2, has 1
    a_teaching = [MockUserSkill(1, "Java")]
    a_learning = [MockUserSkill(2, "UI/UX")]
    
    # User B wants 1, has 2
    b_teaching = [MockUserSkill(2, "UI/UX")]
    b_learning = [MockUserSkill(1, "Java")]
    
    score, reasons = calculate_compatibility(a_teaching, a_learning, b_teaching, b_learning)
    
    # High base score + baseline points + perfect match boost
    assert score >= 90.0
    assert len(reasons) >= 2
    assert "They can teach UI/UX" in reasons[0]
    assert "You can teach Java" in reasons[1]

def test_one_way_skill_match():
    # User A wants 2, has 1
    a_teaching = [MockUserSkill(1, "Java")]
    a_learning = [MockUserSkill(2, "UI/UX")]
    
    # User C wants 3, has 2
    c_teaching = [MockUserSkill(2, "UI/UX")]
    c_learning = [MockUserSkill(3, "Python")]
    
    score, reasons = calculate_compatibility(a_teaching, a_learning, c_teaching, c_learning)
    
    # Partial match (35) + baseline (22) = 57
    assert score >= 50.0
    assert score < 70.0
    assert len(reasons) == 1
    assert "They can teach UI/UX" in reasons[0]

def test_no_skill_match():
    a_teaching = [MockUserSkill(1, "Java")]
    a_learning = [MockUserSkill(2, "UI/UX")]
    
    d_teaching = [MockUserSkill(4, "Figma")]
    d_learning = [MockUserSkill(5, "C++")]
    
    score, reasons = calculate_compatibility(a_teaching, a_learning, d_teaching, d_learning)
    
    # Only baseline points for rating/availability
    assert score <= 25.0
    assert len(reasons) == 0
