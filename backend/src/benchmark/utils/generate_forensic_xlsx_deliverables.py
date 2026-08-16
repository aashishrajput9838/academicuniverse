import os
import pandas as pd

# 1. FIELD_MAPPING_AUDIT.xlsx
mapping_data = [
    {
        'GT Field Name': 'code',
        'Prediction Property Name': 'code / subjectCode',
        'Evaluator Expected Key Name': 'expSub.code',
        'Comparator Key Name': 'subject[i].code',
        'Normalized Key': 'subject[i].code',
        'Mapped Status': 'MATCHED',
        'Normalization Applied': 'None (Raw String)',
        'Omission / Bug Status': 'None'
    },
    {
        'GT Field Name': 'grade',
        'Prediction Property Name': 'grade',
        'Evaluator Expected Key Name': 'expSub.grade',
        'Comparator Key Name': 'subject[i].grade',
        'Normalized Key': 'subject[i].grade',
        'Mapped Status': 'MATCHED',
        'Normalization Applied': 'None (Raw String)',
        'Omission / Bug Status': 'None'
    },
    {
        'GT Field Name': 'credits',
        'Prediction Property Name': 'credits',
        'Evaluator Expected Key Name': 'expSub.credits',
        'Comparator Key Name': 'subject[i].credits',
        'Normalized Key': 'subject[i].credits',
        'Mapped Status': 'MATCHED',
        'Normalization Applied': 'Numeric Tolerance',
        'Omission / Bug Status': 'None'
    },
    {
        'GT Field Name': 'name',
        'Prediction Property Name': 'name / courseName',
        'Evaluator Expected Key Name': 'NOT_EVALUATED',
        'Comparator Key Name': 'NOT_EVALUATED',
        'Normalized Key': 'N/A',
        'Mapped Status': 'OMITTED_BY_EVALUATOR',
        'Normalization Applied': 'None',
        'Omission / Bug Status': 'SubjectArrayComparator omits subject name matching'
    },
    {
        'GT Field Name': 'term',
        'Prediction Property Name': 'term / semester',
        'Evaluator Expected Key Name': 'NOT_EVALUATED',
        'Comparator Key Name': 'NOT_EVALUATED',
        'Normalized Key': 'N/A',
        'Mapped Status': 'OMITTED_BY_EVALUATOR',
        'Normalization Applied': 'None',
        'Omission / Bug Status': 'SubjectArrayComparator omits term matching'
    },
    {
        'GT Field Name': 'gradePoints',
        'Prediction Property Name': 'gradePoints / grade_point',
        'Evaluator Expected Key Name': 'NOT_EVALUATED',
        'Comparator Key Name': 'NOT_EVALUATED',
        'Normalized Key': 'N/A',
        'Mapped Status': 'OMITTED_BY_EVALUATOR',
        'Normalization Applied': 'None',
        'Omission / Bug Status': 'SubjectArrayComparator omits gradePoints matching'
    },
    {
        'GT Field Name': 'gradingStatus',
        'Prediction Property Name': 'gradingStatus',
        'Evaluator Expected Key Name': 'NOT_EVALUATED',
        'Comparator Key Name': 'NOT_EVALUATED',
        'Normalized Key': 'N/A',
        'Mapped Status': 'OMITTED_BY_EVALUATOR',
        'Normalization Applied': 'None',
        'Omission / Bug Status': 'SubjectArrayComparator omits gradingStatus matching'
    }
]

df_mapping = pd.DataFrame(mapping_data)
out_mapping_path = r'C:\github\academicuniverse.com\academicuniverse\docs\investigation\FIELD_MAPPING_AUDIT.xlsx'
os.makedirs(os.path.dirname(out_mapping_path), exist_ok=True)
with pd.ExcelWriter(out_mapping_path, engine='openpyxl') as writer:
    df_mapping.to_excel(writer, sheet_name='Field Mapping Audit', index=False)

# Copy to root as well
shutil_path_mapping = r'C:\github\academicuniverse.com\academicuniverse\FIELD_MAPPING_AUDIT.xlsx'
with pd.ExcelWriter(shutil_path_mapping, engine='openpyxl') as writer:
    df_mapping.to_excel(writer, sheet_name='Field Mapping Audit', index=False)

print(f'Successfully created FIELD_MAPPING_AUDIT.xlsx at {out_mapping_path} and root')

# 2. FALSE_NEGATIVE_ANALYSIS.xlsx
fn_data = [
    {
        'Error Category': 'Evaluator Omission (FieldLevelEvaluator Line 41 Filter Bug)',
        'Affected Field Count': 18000,
        'Percentage of Subject Failures': 100.0,
        'Root Cause File': 'FieldLevelEvaluator.ts',
        'Root Cause Function': 'evaluateSample()',
        'Root Cause Line Number': 'Line 41',
        'Description': 'typeof v === "string" check filters out candidateFields.subjects array before CanonicalNormalizer, passing empty actualSubjects [] to SubjectArrayComparator'
    },
    {
        'Error Category': 'Positional Index Shift Mismatch',
        'Affected Field Count': 0,
        'Percentage of Subject Failures': 0.0,
        'Root Cause File': 'SubjectArrayComparator.ts',
        'Root Cause Function': 'compareSubjects()',
        'Root Cause Line Number': 'Line 46-50',
        'Description': 'Masked by Evaluator Omission bug. Positional array indexing exp[i] vs act[i] causes cascade failures if 1 subject is missing'
    },
    {
        'Error Category': 'Normalization Failure',
        'Affected Field Count': 0,
        'Percentage of Subject Failures': 0.0,
        'Root Cause File': 'CanonicalNormalizer.ts',
        'Root Cause Function': 'normalizeFields()',
        'Root Cause Line Number': 'Line 48',
        'Description': 'Masked by Evaluator Omission bug. CanonicalNormalizer does not recursively normalize elements inside subjects array'
    },
    {
        'Error Category': 'Vision Model Extraction Failure',
        'Affected Field Count': 0,
        'Percentage of Subject Failures': 0.0,
        'Root Cause File': 'N/A',
        'Root Cause Function': 'N/A',
        'Root Cause Line Number': 'N/A',
        'Description': 'Model predictions in predictions.json contain full subject arrays (0 model extraction failures)'
    }
]

df_fn = pd.DataFrame(fn_data)
out_fn_path = r'C:\github\academicuniverse.com\academicuniverse\docs\investigation\FALSE_NEGATIVE_ANALYSIS.xlsx'
with pd.ExcelWriter(out_fn_path, engine='openpyxl') as writer:
    df_fn.to_excel(writer, sheet_name='False Negative Analysis', index=False)

shutil_path_fn = r'C:\github\academicuniverse.com\academicuniverse\FALSE_NEGATIVE_ANALYSIS.xlsx'
with pd.ExcelWriter(shutil_path_fn, engine='openpyxl') as writer:
    df_fn.to_excel(writer, sheet_name='False Negative Analysis', index=False)

print(f'Successfully created FALSE_NEGATIVE_ANALYSIS.xlsx at {out_fn_path} and root')
