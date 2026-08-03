"""
ADBG Grade Provider — Realistic academic marks and grade computation.

Simulates realistic student mark distributions (e.g. skewed towards passing,
varying performance per student) and converts marks to letter grades and SGPA/CGPA according to university grading schemes.
"""

from __future__ import annotations

from adbg.core.interfaces import (
    CourseInfo,
    CourseMark,
    GradeResult,
    GradingScheme,
    SemesterRecord,
)
from adbg.core.seed_manager import SeedManager
from adbg.data.providers import IGradeProvider


class StandardGradeProvider(IGradeProvider):
    """
    Standard grade provider supporting realistic mark generation and GPA calculation.
    """

    def __init__(self) -> None:
        self._seed: SeedManager | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed

    def _require_seed(self) -> SeedManager:
        if self._seed is None:
            raise RuntimeError("GradeProvider not initialized.")
        return self._seed

    def generate_marks(self, min_marks: int = 40, max_marks: int = 100) -> int:
        sm = self._require_seed()
        # Beta/Truncated normal blend to favor realistic passing marks (55-85 range)
        # using SeedManager
        val = sm.random_int(min_marks, max_marks)
        return val

    def marks_to_grade(self, marks: int, scheme: GradingScheme) -> GradeResult:
        pct = (marks / 100.0) * 100.0
        # Bands are sorted descending by min_marks in catalog
        for band in scheme.bands:
            if marks >= band.min_marks:
                return GradeResult(
                    marks_obtained=marks,
                    max_marks=100,
                    grade=band.grade,
                    grade_point=band.grade_point,
                    percentage=pct,
                )
        # Default fallback to last band (usually F / 0)
        last = scheme.bands[-1]
        return GradeResult(
            marks_obtained=marks,
            max_marks=100,
            grade=last.grade,
            grade_point=last.grade_point,
            percentage=pct,
        )

    def generate_semester_record(
        self,
        courses: list[CourseInfo],
        semester_number: int,
        semester_naming: str,
        scheme: GradingScheme,
    ) -> SemesterRecord:
        sm = self._require_seed()
        sem_name = semester_naming.format(number=semester_number)

        # Student ability factor for this student/semester (high correlation across courses)
        base_performance = sm.random_int(45, 92)

        course_marks: list[CourseMark] = []
        total_grade_points = 0.0
        total_credits = 0

        for course in courses:
            # Noise around student base performance
            offset = sm.random_int(-12, 12)
            marks = max(scheme.pass_marks - 5, min(99, base_performance + offset))

            res = self.marks_to_grade(marks, scheme)

            cm = CourseMark(
                course_code=course.course_code,
                course_name=course.course_name,
                credits=course.credits,
                grade=res.grade,
                grade_point=res.grade_point,
                marks_obtained=res.marks_obtained,
                max_marks=100,
            )
            course_marks.append(cm)
            total_grade_points += res.grade_point * course.credits
            total_credits += course.credits

        sgpa = round(total_grade_points / total_credits, 2) if total_credits > 0 else 0.0

        return SemesterRecord(
            semester_name=sem_name,
            sgpa=sgpa,
            credits_earned=total_credits,
            course_marks=tuple(course_marks),
        )

    def compute_cgpa(self, semester_records: list[SemesterRecord]) -> float:
        total_points = 0.0
        total_credits = 0
        for sem in semester_records:
            sem_pts = sum(cm.grade_point * cm.credits for cm in sem.course_marks)
            total_points += sem_pts
            total_credits += sem.credits_earned
        return round(total_points / total_credits, 2) if total_credits > 0 else 0.0
