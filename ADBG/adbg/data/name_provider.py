"""
ADBG Name Provider — Indian-locale student and parent name generation.

Faker is used as the internal implementation but is not exposed in the
interface. Future implementations could use real name datasets or
locale-specific name banks.
"""

from __future__ import annotations

from faker import Faker

from adbg.core.seed_manager import SeedManager
from adbg.data.providers import INameProvider

# Curated Indian first-name banks for higher authenticity than
# Faker's default en_IN locale, while remaining lightweight.
_MALE_FIRST_NAMES = (
    "Aarav", "Aditya", "Akash", "Amit", "Ankit", "Arjun", "Aryan",
    "Deepak", "Dev", "Dhruv", "Gaurav", "Harsh", "Himanshu", "Ishaan",
    "Karan", "Kunal", "Lakshay", "Manish", "Mohit", "Nakul", "Nikhil",
    "Prashant", "Pranav", "Rahul", "Rajat", "Ravi", "Rohit", "Sagar",
    "Sahil", "Sandeep", "Shivam", "Siddharth", "Saurabh", "Tarun",
    "Varun", "Vikram", "Vinay", "Vishal", "Vivek", "Yash",
)

_FEMALE_FIRST_NAMES = (
    "Aditi", "Anjali", "Ananya", "Anika", "Bhavna", "Diya", "Divya",
    "Esha", "Ishita", "Kavya", "Kriti", "Meera", "Neha", "Nisha",
    "Pallavi", "Pooja", "Priya", "Rashmi", "Riya", "Sakshi", "Shreya",
    "Simran", "Sneha", "Sonali", "Surbhi", "Swati", "Tanvi", "Tanya",
    "Trisha", "Vidya",
)

_LAST_NAMES = (
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy",
    "Rao", "Nair", "Joshi", "Mishra", "Chauhan", "Pandey", "Yadav",
    "Mehta", "Shah", "Malhotra", "Kapoor", "Iyer", "Chopra", "Bhat",
    "Saxena", "Tiwari", "Agarwal", "Das", "Sinha", "Pillai", "Desai",
    "Kulkarni", "Patil",
)


class FakerNameProvider(INameProvider):
    """
    Name provider backed by curated Indian name banks + Faker for edge cases.

    The provider selects from manually curated name lists for higher
    authenticity, with Faker used only for address and contact data
    that this provider does not directly handle.
    """

    def __init__(self) -> None:
        self._seed: SeedManager | None = None
        self._faker: Faker | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed
        self._faker = Faker("en_IN")
        self._faker.seed_instance(seed.child_seed_value())

    def _require_seed(self) -> SeedManager:
        if self._seed is None:
            raise RuntimeError("NameProvider not initialized. Call initialize() first.")
        return self._seed

    def generate_first_name(self) -> str:
        sm = self._require_seed()
        # Roughly equal gender distribution
        if sm.random_bool(0.5):
            return sm.pick(_MALE_FIRST_NAMES)
        return sm.pick(_FEMALE_FIRST_NAMES)

    def generate_last_name(self) -> str:
        return self._require_seed().pick(_LAST_NAMES)

    def generate_full_name(self) -> str:
        return f"{self.generate_first_name()} {self.generate_last_name()}"

    def generate_father_name(self, last_name: str) -> str:
        sm = self._require_seed()
        first = sm.pick(_MALE_FIRST_NAMES)
        return f"{first} {last_name}"

    def generate_mother_name(self, last_name: str) -> str:
        sm = self._require_seed()
        first = sm.pick(_FEMALE_FIRST_NAMES)
        return f"{first} {last_name}"
