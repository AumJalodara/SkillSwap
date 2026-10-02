import sys
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.skill import Skill, UserSkill, SkillType
from app.core.security import get_password_hash
from app.services.credit_service import grant_initial_credits

def seed():
    db = SessionLocal()
    try:
        # Create users
        demo_user = User(
            name="Demo User",
            email="demo@skillswap.com",
            password_hash=get_password_hash("password"),
            bio="I'm a demo user.",
            role=UserRole.STUDENT
        )
        users = [demo_user]
        
        for i in range(1, 10):
            users.append(
                User(
                    name=f"Test User {i}",
                    email=f"test{i}@skillswap.com",
                    password_hash=get_password_hash("password"),
                    bio=f"Bio for test user {i}",
                    role=UserRole.STUDENT
                )
            )
        db.add_all(users)
        db.commit()
        
        # Grant credits
        for user in users:
            grant_initial_credits(db, user_id=user.id, amount=5)
            
        # Create skills
        skills_data = [
            ("Python", "Programming"),
            ("React", "Programming"),
            ("FastAPI", "Programming"),
            ("Node.js", "Programming"),
            ("SQL", "Database"),
            ("PostgreSQL", "Database"),
            ("MongoDB", "Database"),
            ("Machine Learning", "AI"),
            ("Data Science", "AI"),
            ("Docker", "DevOps"),
            ("Kubernetes", "DevOps"),
            ("AWS", "Cloud"),
            ("Figma", "Design"),
            ("UI/UX", "Design"),
            ("Photoshop", "Design"),
        ]
        skills = []
        for name, category in skills_data:
            skill = Skill(name=name, category=category)
            skills.append(skill)
            
        db.add_all(skills)
        db.commit()

        # Add UserSkills
        user_skills = [
            UserSkill(user_id=users[0].id, skill_id=skills[0].id, type=SkillType.TEACH, proficiency=4),
            UserSkill(user_id=users[0].id, skill_id=skills[1].id, type=SkillType.LEARN, proficiency=1),
            UserSkill(user_id=users[1].id, skill_id=skills[1].id, type=SkillType.TEACH, proficiency=5),
            UserSkill(user_id=users[1].id, skill_id=skills[0].id, type=SkillType.LEARN, proficiency=2),
            UserSkill(user_id=users[2].id, skill_id=skills[2].id, type=SkillType.TEACH, proficiency=4),
            UserSkill(user_id=users[2].id, skill_id=skills[3].id, type=SkillType.LEARN, proficiency=1),
            UserSkill(user_id=users[3].id, skill_id=skills[3].id, type=SkillType.TEACH, proficiency=5),
            UserSkill(user_id=users[3].id, skill_id=skills[2].id, type=SkillType.LEARN, proficiency=2),
            UserSkill(user_id=users[4].id, skill_id=skills[4].id, type=SkillType.TEACH, proficiency=4),
            UserSkill(user_id=users[4].id, skill_id=skills[5].id, type=SkillType.LEARN, proficiency=1),
            UserSkill(user_id=users[5].id, skill_id=skills[5].id, type=SkillType.TEACH, proficiency=5),
            UserSkill(user_id=users[5].id, skill_id=skills[4].id, type=SkillType.LEARN, proficiency=2),
            UserSkill(user_id=users[6].id, skill_id=skills[6].id, type=SkillType.TEACH, proficiency=4),
            UserSkill(user_id=users[6].id, skill_id=skills[7].id, type=SkillType.LEARN, proficiency=1),
            UserSkill(user_id=users[7].id, skill_id=skills[7].id, type=SkillType.TEACH, proficiency=5),
            UserSkill(user_id=users[7].id, skill_id=skills[6].id, type=SkillType.LEARN, proficiency=2),
            UserSkill(user_id=users[8].id, skill_id=skills[8].id, type=SkillType.TEACH, proficiency=4),
            UserSkill(user_id=users[8].id, skill_id=skills[9].id, type=SkillType.LEARN, proficiency=1),
            UserSkill(user_id=users[9].id, skill_id=skills[9].id, type=SkillType.TEACH, proficiency=5),
            UserSkill(user_id=users[9].id, skill_id=skills[8].id, type=SkillType.LEARN, proficiency=2),
        ]
        db.add_all(user_skills)
        db.commit()
        
        print("Seeded successfully!")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
