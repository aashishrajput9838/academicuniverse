"""
Tests for ADBG Phase 2 Data Fabrication and Providers.

Verifies:
    - IDataProvider abstraction layer and custom provider injection.
    - Deterministic academic data fabrication.
    - Configurable roll number pattern evaluation.
    - Realistic grade generation and SGPA/CGPA computation.
    - University catalog and subject library loading.
"""

from __future__ import annotations

from adbg.core.seed_manager import SeedManager
from adbg.data.course_provider import YamlCourseProvider
from adbg.data.fabricator import AcademicDataFabricator
from adbg.data.grade_provider import StandardGradeProvider
from adbg.data.name_provider import FakerNameProvider
from adbg.data.providers import INameProvider
from adbg.data.roll_number_provider import PatternRollNumberProvider
from adbg.data.university_provider import YamlUniversityProvider


class TestNameProvider:

    def test_name_generation_deterministic(self, seed_42: SeedManager) -> None:
        p1 = FakerNameProvider()
        p1.initialize(seed_42)

        p2 = FakerNameProvider()
        p2.initialize(SeedManager(seed=42))

        names1 = [p1.generate_full_name() for _ in range(10)]
        names2 = [p2.generate_full_name() for _ in range(10)]

        assert names1 == names2

    def test_custom_name_provider_injection(self, seed_42: SeedManager) -> None:
        class FixedNameProvider(INameProvider):
            def initialize(self, seed: SeedManager) -> None:
                pass
            def generate_first_name(self) -> str:
                return "CustomFirst"
            def generate_last_name(self) -> str:
                return "CustomLast"
            def generate_full_name(self) -> str:
                return "CustomFirst CustomLast"
            def generate_father_name(self, last_name: str) -> str:
                return f"Father {last_name}"
            def generate_mother_name(self, last_name: str) -> str:
                return f"Mother {last_name}"

        fab = AcademicDataFabricator(name_provider=FixedNameProvider())
        data = fab.fabricate_document_data(
            seed=seed_42,
            document_type="marksheet",
            template_id="marksheet_alpha",
        )
        assert data.student.student_name == "CustomFirst CustomLast"
        assert data.student.father_name == "Father CustomLast"


class TestRollNumberProvider:

    def test_roll_number_patterns(self, seed_42: SeedManager) -> None:
        provider = PatternRollNumberProvider()
        provider.initialize(seed_42)

        r1 = provider.generate("{year}{branch_code}{sequence:06d}", 2024, "CSE", 123)
        assert r1 == "2024CSE000123"

        r2 = provider.generate("{year_short}BT{branch_code}{sequence:04d}", 2024, "ECE", 45)
        assert r2 == "24BTECE0045"

        r3 = provider.generate("NIES{year_short}{branch_code}{sequence:04d}", 2023, "ME", 9)
        assert r3 == "NIES23ME0009"


class TestUniversityCatalogAndCourseLibrary:

    def test_university_provider_catalog_loading(self, seed_42: SeedManager) -> None:
        provider = YamlUniversityProvider()
        provider.initialize(seed_42)

        u_ids = provider.list_university_ids()
        assert len(u_ids) >= 4
        assert "university_alpha" in u_ids

        vtu = provider.get_university("university_alpha")
        assert vtu.short_code == "VTU"
        assert len(vtu.branches) >= 5
        assert vtu.grading_scheme.scale == 10.0

    def test_course_provider_subject_library(self, seed_42: SeedManager) -> None:
        provider = YamlCourseProvider()
        provider.initialize(seed_42)

        courses = provider.get_courses("CSE", count=5)
        assert len(courses) == 5
        for c in courses:
            assert hasattr(c, "course_code")
            assert hasattr(c, "course_name")
            assert hasattr(c, "credits")


class TestGradeProvider:

    def test_grade_computation(self, seed_42: SeedManager) -> None:
        uni_prov = YamlUniversityProvider()
        uni_prov.initialize(seed_42)
        vtu = uni_prov.get_university("university_alpha")

        grade_prov = StandardGradeProvider()
        grade_prov.initialize(seed_42)

        res95 = grade_prov.marks_to_grade(95, vtu.grading_scheme)
        assert res95.grade == "O"
        assert res95.grade_point == 10.0

        res65 = grade_prov.marks_to_grade(65, vtu.grading_scheme)
        assert res65.grade == "B+"
        assert res65.grade_point == 7.0

        res30 = grade_prov.marks_to_grade(30, vtu.grading_scheme)
        assert res30.grade == "F"
        assert res30.grade_point == 0.0


class TestAcademicDataFabricator:

    def test_fabricate_document_data_determinism(self, seed_42: SeedManager) -> None:
        fab1 = AcademicDataFabricator()
        data1 = fab1.fabricate_document_data(
            seed=seed_42,
            document_type="marksheet",
            template_id="marksheet_alpha",
        )

        fab2 = AcademicDataFabricator()
        data2 = fab2.fabricate_document_data(
            seed=SeedManager(seed=42),
            document_type="marksheet",
            template_id="marksheet_alpha",
        )

        assert data1.student.student_name == data2.student.student_name
        assert data1.student.roll_number == data2.student.roll_number
        assert data1.cgpa == data2.cgpa
        assert len(data1.semester_records) == len(data2.semester_records)
        assert data1.university.name == data2.university.name

        # Check new versioning and research fields
        assert data1.document_id.startswith("DOC-")
        assert len(data1.document_uuid) == 36  # Valid UUID format
        assert data1.schema_version == "1.0.0"
        assert data1.generator_version == "1.0.0"
        assert data1.benchmark_version == "1.0.0"
        assert data1.dataset_version == "1.0.0"
        assert data1.experiment_id == "exp_default"
        assert data1.locale == "en_IN"
