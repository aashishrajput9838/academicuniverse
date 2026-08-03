"""
ADBG Academic Data Fabricator — High-level dataset fabricator orchestrating providers.

Decoupled from specific implementations via `IDataProvider` interfaces.
Allows custom provider dependency injection (e.g. for Hindi/regional providers or real datasets).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from adbg.core.interfaces import (
    DocumentData,
    SemesterRecord,
    StudentProfile,
)
from adbg.core.seed_manager import SeedManager
from adbg.data.course_provider import YamlCourseProvider
from adbg.data.date_provider import StandardDateProvider
from adbg.data.grade_provider import StandardGradeProvider
from adbg.data.name_provider import FakerNameProvider
from adbg.data.providers import (
    ICourseProvider,
    IDateProvider,
    IGradeProvider,
    INameProvider,
    IRollNumberProvider,
    IUniversityProvider,
)
from adbg.data.roll_number_provider import PatternRollNumberProvider
from adbg.data.university_provider import YamlUniversityProvider


class AcademicDataFabricator:
    """
    Orchestrates data fabrication for document generation.

    Receives pluggable providers for names, universities, courses, roll numbers,
    grades, and dates.
    """

    def __init__(
        self,
        name_provider: INameProvider | None = None,
        university_provider: IUniversityProvider | None = None,
        course_provider: ICourseProvider | None = None,
        roll_number_provider: IRollNumberProvider | None = None,
        grade_provider: IGradeProvider | None = None,
        date_provider: IDateProvider | None = None,
    ) -> None:
        self.name_provider = name_provider or FakerNameProvider()
        self.university_provider = university_provider or YamlUniversityProvider()
        self.course_provider = course_provider or YamlCourseProvider()
        self.roll_number_provider = roll_number_provider or PatternRollNumberProvider()
        self.grade_provider = grade_provider or StandardGradeProvider()
        self.date_provider = date_provider or StandardDateProvider()

    def fabricate_document_data(
        self,
        seed: SeedManager,
        document_type: str,
        template_id: str,
        template_version: str = "1.0.0",
        university_id: str | None = None,
        quality_profile: str = "clean_pdf",
        schema_version: str = "1.0.0",
        generator_version: str = "1.0.0",
        benchmark_version: str = "1.0.0",
        dataset_version: str = "1.0.0",
        experiment_id: str = "exp_default",
        locale: str = "en_IN",
    ) -> DocumentData:
        """
        Fabricate a complete DocumentData structure deterministically.
        """
        # Initialize providers with child seeds
        self.name_provider.initialize(seed.child())
        self.university_provider.initialize(seed.child())
        self.course_provider.initialize(seed.child())
        self.roll_number_provider.initialize(seed.child())
        self.grade_provider.initialize(seed.child())
        self.date_provider.initialize(seed.child())

        # Select university
        if university_id:
            university = self.university_provider.get_university(university_id)
        else:
            university = self.university_provider.get_random_university()

        # Select branch
        branch = self.university_provider.get_random_branch(university)

        # Generate student profile
        last_name = self.name_provider.generate_last_name()
        first_name = self.name_provider.generate_first_name()
        student_name = f"{first_name} {last_name}"
        father_name = self.name_provider.generate_father_name(last_name)
        mother_name = self.name_provider.generate_mother_name(last_name)

        grad_year = seed.random_int(2022, 2025)
        start_year = grad_year - 4
        batch_years = f"{start_year} - {grad_year}"

        seq_num = seed.random_int(1, 999)
        roll_num = self.roll_number_provider.generate(
            university.roll_number_pattern,
            year=start_year,
            branch_code=branch.code,
            sequence=seq_num,
        )

        enrollment_pattern = getattr(university, "enrollment_pattern", "EN{year}{sequence:05d}")
        enrollment_num = self.roll_number_provider.generate_enrollment(
            enrollment_pattern,
            year=start_year,
            sequence=seq_num,
        )

        dob = self.date_provider.generate_date_of_birth(1998, 2004)
        issue_date = self.date_provider.generate_issue_date(grad_year, grad_year)

        blood_group = seed.pick(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"])
        email = f"{first_name.lower()}.{last_name.lower()}{seq_num}@{university.short_code.lower()}.edu.in"
        phone = f"+91 98{seed.random_int(10000000, 99999999)}"
        address = f"House No. {seed.random_int(1, 400)}, Sector {seed.random_int(1, 50)}, {university.address.get('city', 'New Delhi')}"

        student = StudentProfile(
            student_name=student_name,
            roll_number=roll_num,
            enrollment_number=enrollment_num,
            degree_name=f"Bachelor of Technology in {branch.name}",
            branch_name=branch.name,
            batch_years=batch_years,
            father_name=father_name,
            mother_name=mother_name,
            date_of_birth=dob,
            email=email,
            phone=phone,
            address=address,
            blood_group=blood_group,
        )

        # Generate semester records (for marksheets)
        num_semesters = 8 if document_type == "marksheet" else 1
        semester_records: list[SemesterRecord] = []

        for sem_idx in range(1, num_semesters + 1):
            courses = self.course_provider.get_courses(branch.code, count=5)
            sem_rec = self.grade_provider.generate_semester_record(
                courses=courses,
                semester_number=sem_idx,
                semester_naming=university.semester_naming,
                scheme=university.grading_scheme,
            )
            semester_records.append(sem_rec)

        cgpa = self.grade_provider.compute_cgpa(semester_records)

        # Generate full 128-bit integer deterministically from 4 32-bit child seed values
        v1 = seed.child_seed_value()
        v2 = seed.child_seed_value()
        v3 = seed.child_seed_value()
        v4 = seed.child_seed_value()
        uuid_int = (v1 << 96) | (v2 << 64) | (v3 << 32) | v4
        doc_uuid = str(uuid.UUID(int=uuid_int))
        doc_id = f"DOC-{doc_uuid[:8].upper()}"
        gen_timestamp = datetime.now(UTC).isoformat()

        return DocumentData(
            document_id=doc_id,
            document_uuid=doc_uuid,
            document_type=document_type,
            template_id=template_id,
            template_version=template_version,
            schema_version=schema_version,
            generator_version=generator_version,
            benchmark_version=benchmark_version,
            dataset_version=dataset_version,
            experiment_id=experiment_id,
            locale=locale,
            university=university,
            seed=seed.entropy,
            student=student,
            semester_records=tuple(semester_records),
            cgpa=cgpa,
            issue_date=issue_date,
            quality_profile=quality_profile,
            generation_timestamp=gen_timestamp,
        )
