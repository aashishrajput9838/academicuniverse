# Synthetic Academic Document Generator — Developer Guide

## Architecture Overview

The **Synthetic Academic Document Generator** is an independent, modular sub-system designed to generate deterministic, multi-category academic documents and perfect Ground Truth JSON records for benchmarking and evaluation.

```
benchmarks/synthetic-generator/
├── types/
│   └── syntheticGenerator.types.ts       # Domain types
├── core/
│   ├── seededRandom.ts                    # Mulberry32 PRNG
│   ├── dataFabricator.ts                  # Student, course, grade data generator
│   ├── templateEngine.ts                  # Pluggable university templates
│   └── qualityProfiles.ts                 # 9 quality profiles + distortion handler
├── generators/                            # PDF rendering modules (pdf-lib)
│   ├── marksheetGenerator.ts
│   ├── certificateGenerator.ts
│   ├── transcriptGenerator.ts
│   ├── timetableGenerator.ts
│   ├── admitCardGenerator.ts
│   ├── feeReceiptGenerator.ts
│   └── studentIdGenerator.ts
├── pipeline/                              # Orchestration & validation
│   ├── groundTruthBuilder.ts
│   ├── manifestBuilder.ts
│   ├── qualityChecker.ts
│   └── syntheticPipeline.ts
├── cli/
│   └── syntheticCli.ts                    # Commander CLI
└── tests/
    └── syntheticGenerator.test.ts         # Jest test suite
```

---

## Adding a Custom University Template

University templates implement the `ITemplatePlugin` interface. To add a new template:

```typescript
import { ITemplatePlugin, UniversityTemplateConfig } from '../core/templateEngine';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export class CustomTemplateE implements ITemplatePlugin {
  config: UniversityTemplateConfig = {
    id: 'TEMPLATE_E',
    name: 'Custom Academic Institute',
    shortCode: 'CAI',
    location: 'Location City, Country',
    tagline: 'Empowering Research & Innovation',
    primaryColor: '#005588',
    secondaryColor: '#0088cc',
    fontFamily: 'Helvetica',
    headerStyle: 'RULED',
    watermarkText: 'SYNTHETIC RESEARCH DATASET',
  };

  async renderDocument(doc: PDFDocument, page: PDFPage, data: any): Promise<void> {
    // Custom drawing logic using pdf-lib
  }
}
```

Register your template in `templateEngine.registerTemplate(new CustomTemplateE())`.

---

## Output Structure

Generated synthetic datasets are saved in `benchmarks/synthetic-dataset/` by default:

```
synthetic-dataset/
├── documents/
│   ├── SYNTH_MS_001.pdf
│   └── SYNTH_CERT_002.pdf
├── ground-truth/
│   ├── SYNTH_MS_001.json
│   └── SYNTH_CERT_002.json
├── manifest.json
├── metadata.json
└── generation-report.md
```

---

## Testing

Run tests using Jest:

```bash
npm test -- syntheticGenerator.test.ts
```
