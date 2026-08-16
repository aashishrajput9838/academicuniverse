# Manual Forensic Validation — 10 Sample Trace
# AU DIC Benchmark Execution
# Evaluator Fixes Post-Implementation Verification

---

## Overview

As mandated by the post-implementation protocol, 10 document evaluation traces were audited side-by-side to verify that Ground Truth subjects, Model Predictions, and Evaluator Matching align cleanly without subject loss or positional indexing errors.

---

### Sample 1: `DOC-70972707_scanner_copy` (Type: `certificate`, Profile: `scanner_copy`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | IT202 | IT202 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | HS101 | HS101 | F | F | 2 | 2 | **✅ MATCHED** |
| `subject[2]` | IT203 | IT203 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | MA102 | MA102 | C | C | 4 | 4 | **✅ MATCHED** |
| `subject[4]` | CH101 | CH101 | B+ | B+ | 3 | 3 | **✅ MATCHED** |

---

### Sample 2: `DOC-134502DE_mobile_camera` (Type: `marksheet`, Profile: `mobile_camera`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | HS101 | HS101 | A+ | A+ | 2 | 2 | **✅ MATCHED** |
| `subject[1]` | IT203 | IT203 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | PH101 | PH101 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | MA101 | MA101 | B+ | B+ | 4 | 4 | **✅ MATCHED** |
| `subject[4]` | MA102 | MA102 | A | A | 4 | 4 | **✅ MATCHED** |
| `subject[5]` | IT202 | IT202 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[6]` | IT301 | IT301 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[7]` | MA102 | MA102 | C | C | 4 | 4 | **✅ MATCHED** |
| `subject[8]` | ES101 | ES101 | B | B | 2 | 2 | **✅ MATCHED** |
| `subject[9]` | ME100 | ME100 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[10]` | CH101 | CH101 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[11]` | IT201 | IT201 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[12]` | IT301 | IT301 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[13]` | PH101 | PH101 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[14]` | MA101 | MA101 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[15]` | MA102 | MA102 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[16]` | ME100 | ME100 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[17]` | IT301 | IT301 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[18]` | IT201 | IT201 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[19]` | IT202 | IT202 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[20]` | IT205 | IT205 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[21]` | IT302 | IT302 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[22]` | IT204 | IT204 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[23]` | MA101 | MA101 | B+ | B+ | 4 | 4 | **✅ MATCHED** |
| `subject[24]` | PH101 | PH101 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[25]` | IT301 | IT301 | O | O | 3 | 3 | **✅ MATCHED** |
| `subject[26]` | IT201 | IT201 | A+ | A+ | 4 | 4 | **✅ MATCHED** |
| `subject[27]` | ME100 | ME100 | A+ | A+ | 3 | 3 | **✅ MATCHED** |
| `subject[28]` | ES101 | ES101 | O | O | 2 | 2 | **✅ MATCHED** |
| `subject[29]` | IT205 | IT205 | O | O | 3 | 3 | **✅ MATCHED** |
| `subject[30]` | IT201 | IT201 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[31]` | IT205 | IT205 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[32]` | ME100 | ME100 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[33]` | IT302 | IT302 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[34]` | ES101 | ES101 | A | A | 2 | 2 | **✅ MATCHED** |
| `subject[35]` | IT301 | IT301 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[36]` | ME100 | ME100 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[37]` | IT201 | IT201 | C | C | 4 | 4 | **✅ MATCHED** |
| `subject[38]` | IT203 | IT203 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[39]` | IT202 | IT202 | C | C | 3 | 3 | **✅ MATCHED** |

---

### Sample 3: `DOC-05582167_clean` (Type: `certificate`, Profile: `clean`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | IT202 | IT202 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | ME100 | ME100 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | IT302 | IT302 | F | F | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | IT301 | IT301 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[4]` | IT201 | IT201 | B+ | B+ | 4 | 4 | **✅ MATCHED** |

---

### Sample 4: `DOC-2AFE47B0_clean` (Type: `student_id`, Profile: `clean`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | CE204 | CE204 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | CE205 | CE205 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | CE202 | CE202 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | MA102 | MA102 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[4]` | CE301 | CE301 | B+ | B+ | 4 | 4 | **✅ MATCHED** |

---

### Sample 5: `DOC-27168935_mobile_camera` (Type: `marksheet`, Profile: `mobile_camera`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | HS101 | HS101 | A | A | 2 | 2 | **✅ MATCHED** |
| `subject[1]` | CH101 | CH101 | S | S | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | CS304 | CS304 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | PH101 | PH101 | S | S | 3 | 3 | **✅ MATCHED** |
| `subject[4]` | CS201 | CS201 | S | S | 4 | 4 | **✅ MATCHED** |
| `subject[5]` | MA102 | MA102 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[6]` | CS402 | CS402 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[7]` | PH101 | PH101 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[8]` | CS206 | CS206 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[9]` | CS203 | CS203 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[10]` | ME100 | ME100 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[11]` | CS204 | CS204 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[12]` | CS208 | CS208 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[13]` | MA101 | MA101 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[14]` | MA102 | MA102 | A | A | 4 | 4 | **✅ MATCHED** |
| `subject[15]` | HS101 | HS101 | E | E | 2 | 2 | **✅ MATCHED** |
| `subject[16]` | CS205 | CS205 | C | C | 4 | 4 | **✅ MATCHED** |
| `subject[17]` | CS403 | CS403 | D | D | 3 | 3 | **✅ MATCHED** |
| `subject[18]` | ES101 | ES101 | D | D | 2 | 2 | **✅ MATCHED** |
| `subject[19]` | MA101 | MA101 | D | D | 4 | 4 | **✅ MATCHED** |
| `subject[20]` | CS203 | CS203 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[21]` | CS301 | CS301 | A | A | 4 | 4 | **✅ MATCHED** |
| `subject[22]` | CS204 | CS204 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[23]` | ES101 | ES101 | S | S | 2 | 2 | **✅ MATCHED** |
| `subject[24]` | MA102 | MA102 | A | A | 4 | 4 | **✅ MATCHED** |
| `subject[25]` | CS301 | CS301 | D | D | 4 | 4 | **✅ MATCHED** |
| `subject[26]` | CS306 | CS306 | D | D | 3 | 3 | **✅ MATCHED** |
| `subject[27]` | CS205 | CS205 | D | D | 4 | 4 | **✅ MATCHED** |
| `subject[28]` | CS304 | CS304 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[29]` | PH101 | PH101 | D | D | 3 | 3 | **✅ MATCHED** |
| `subject[30]` | CS202 | CS202 | E | E | 4 | 4 | **✅ MATCHED** |
| `subject[31]` | MA101 | MA101 | E | E | 4 | 4 | **✅ MATCHED** |
| `subject[32]` | CH101 | CH101 | E | E | 3 | 3 | **✅ MATCHED** |
| `subject[33]` | MA102 | MA102 | E | E | 4 | 4 | **✅ MATCHED** |
| `subject[34]` | CS208 | CS208 | E | E | 3 | 3 | **✅ MATCHED** |
| `subject[35]` | MA102 | MA102 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[36]` | CS306 | CS306 | D | D | 3 | 3 | **✅ MATCHED** |
| `subject[37]` | PH101 | PH101 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[38]` | MA101 | MA101 | C | C | 4 | 4 | **✅ MATCHED** |
| `subject[39]` | CS301 | CS301 | C | C | 4 | 4 | **✅ MATCHED** |

---

### Sample 6: `DOC-26ADDCC0_rotated_90` (Type: `student_id`, Profile: `rotated_90`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | PH101 | PH101 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | MA101 | MA101 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[2]` | HS101 | HS101 | B+ | B+ | 2 | 2 | **✅ MATCHED** |
| `subject[3]` | IT301 | IT301 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[4]` | IT302 | IT302 | A | A | 3 | 3 | **✅ MATCHED** |

---

### Sample 7: `DOC-17EC90D2_scanner_copy` (Type: `certificate`, Profile: `scanner_copy`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | HS101 | HS101 | B+ | B+ | 2 | 2 | **✅ MATCHED** |
| `subject[1]` | CH101 | CH101 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | ES101 | ES101 | A | A | 2 | 2 | **✅ MATCHED** |
| `subject[3]` | EE201 | EE201 | B+ | B+ | 4 | 4 | **✅ MATCHED** |
| `subject[4]` | ME100 | ME100 | A | A | 3 | 3 | **✅ MATCHED** |

---

### Sample 8: `DOC-125B42F6_clean` (Type: `certificate`, Profile: `clean`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | ME306 | ME306 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | CH101 | CH101 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | HS101 | HS101 | B | B | 2 | 2 | **✅ MATCHED** |
| `subject[3]` | PH101 | PH101 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[4]` | ME203 | ME203 | B | B | 3 | 3 | **✅ MATCHED** |

---

### Sample 9: `DOC-781DFB94_rotated_90` (Type: `certificate`, Profile: `rotated_90`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | AI302 | AI302 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[1]` | ME100 | ME100 | D | D | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | AI202 | AI202 | C | C | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | ES101 | ES101 | E | E | 2 | 2 | **✅ MATCHED** |
| `subject[4]` | AI203 | AI203 | E | E | 4 | 4 | **✅ MATCHED** |

---

### Sample 10: `DOC-64016899_scanner_copy` (Type: `student_id`, Profile: `scanner_copy`)

#### Side-by-Side Subject Extraction Trace

| Subject Index | GT Course Code | Pred Course Code | GT Grade | Pred Grade | GT Credits | Pred Credits | Evaluator Result |
|---|---|---|---|---|---|---|---|
| `subject[0]` | MA101 | MA101 | B | B | 4 | 4 | **✅ MATCHED** |
| `subject[1]` | CE303 | CE303 | B+ | B+ | 3 | 3 | **✅ MATCHED** |
| `subject[2]` | CE202 | CE202 | A | A | 3 | 3 | **✅ MATCHED** |
| `subject[3]` | CE205 | CE205 | B | B | 3 | 3 | **✅ MATCHED** |
| `subject[4]` | CE203 | CE203 | A | A | 3 | 3 | **✅ MATCHED** |

---
