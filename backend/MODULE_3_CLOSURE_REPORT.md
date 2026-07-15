# Module-3 Closure Report

## npm run lint

Working directory: `C:\github\academicuniverse.com\academicuniverse`

Exit code: 0

```text
> my-project@0.1.0 lint
> eslint .
```

## npx tsc --noEmit

Working directory: `C:\github\academicuniverse.com\academicuniverse`

Command executed on Windows: `npx.cmd tsc --noEmit`

Exit code: 0

## npm test

Working directory: `C:\github\academicuniverse.com\academicuniverse`

Command executed on Windows: `npm.cmd test`

Exit code: 0

```text
> my-project@0.1.0 test
> npm --prefix backend test -- --runInBand


> academic-universe-backend@1.0.0 test
> jest --runInBand --runInBand

PASS src/services/ocr/__tests__/OCRService.test.ts
PASS src/services/classification/__tests__/DocumentClassifier.test.ts
PASS src/services/parsing/__tests__/ParserService.test.ts
PASS src/services/parsing/__tests__/ExcelParser.test.ts
PASS src/services/parsing/__tests__/PdfParser.test.ts
PASS src/services/parsing/__tests__/ParserFactory.test.ts
PASS src/services/parsing/__tests__/TxtParser.test.ts
PASS src/services/parsing/__tests__/CsvParser.test.ts
PASS src/services/parsing/__tests__/ImageParser.test.ts

Test Suites: 9 passed, 9 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        9.226 s, estimated 14 s
```

## verifyRuntime.ts

Working directory: `C:\github\academicuniverse.com\academicuniverse\backend`

Command executed on Windows: `npx.cmd ts-node --project tsconfig.verify.json -r tsconfig-paths/register verifyRuntime.ts`

Exit code: 0

```text
[Verifier] runId=runtime-1784068422337
Connecting to MongoDB database...
Connecting to MongoDB at: mongodb://****:****@ac-v4ladfm-shard-00-00.mkkp87x.mongodb.net:27017,ac-v4ladfm-shard-00-01.mkkp87x.mongodb.net:27017,ac-v4ladfm-shard-00-02.mkkp87x.mongodb.net:27017/academic_universe?ssl=true&replicaSet=atlas-132cuy-shard-0&authSource=admin&appName=academicuniversecluster1
✓ MongoDB connected successfully
MongoDB database connected successfully.
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\image-runtime.png
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\scanned-runtime.pdf
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\digital-runtime.pdf
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.csv
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.txt
[Verifier][Temp] CREATED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.xlsx
[Verifier][GridFS] STORED label=Image fileId=6a56b946c1ad6b277e188cec
[Verifier][GridFS] STORED label=Scanned PDF fileId=6a56b947c1ad6b277e188cee
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-image exists=false
[Verifier][OCRExecution] processingId=runtime-1784068422337-image storageId=6a56b946c1ad6b277e188cec mimeType=image/png executionCount=1
[EventBus] OCR_COMPLETED event received for: runtime-1784068422337-image, text length: 53
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-image exists=true
[Verifier][Case] Image -> OCRCompleted; processingId=runtime-1784068422337-image; ocrExecutions=1; OCRCompletedEvents=1; OCRFailedEvents=0; rawPreview=""
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-scanned-pdf exists=false
[Verifier][OCRExecution] processingId=runtime-1784068422337-scanned-pdf storageId=6a56b947c1ad6b277e188cee mimeType=application/pdf executionCount=1
[EventBus] OCR_COMPLETED event received for: runtime-1784068422337-scanned-pdf, text length: 53
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-scanned-pdf exists=true
[Verifier][Case] Scanned PDF -> OCRCompleted; processingId=runtime-1784068422337-scanned-pdf; ocrExecutions=1; OCRCompletedEvents=1; OCRFailedEvents=0; rawPreview=""
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-digital-pdf exists=false
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-digital-pdf exists=false
[Verifier][Case] Digital PDF -> OCR skipped; processingId=runtime-1784068422337-digital-pdf; ocrExecutions=0; OCRCompletedEvents=0; OCRFailedEvents=0; rawPreview=""
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-csv exists=false
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-csv exists=false
[Verifier][Case] CSV -> OCR skipped; processingId=runtime-1784068422337-csv; ocrExecutions=0; OCRCompletedEvents=0; OCRFailedEvents=0; rawPreview="col1,col2 val1,val2"
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-txt exists=false
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-txt exists=false
[Verifier][Case] TXT -> OCR skipped; processingId=runtime-1784068422337-txt; ocrExecutions=0; OCRCompletedEvents=0; OCRFailedEvents=0; rawPreview="Hello, this is a text file"
[Verifier][MongoIdempotency] before processingId=runtime-1784068422337-xlsx exists=false
[Verifier][MongoIdempotency] after processingId=runtime-1784068422337-xlsx exists=false
[Verifier][Case] XLSX -> OCR skipped; processingId=runtime-1784068422337-xlsx; ocrExecutions=0; OCRCompletedEvents=0; OCRFailedEvents=0; rawPreview="{"Sheet1":[["A1","B1"],["A2","B2"]]}"
[Verifier][Duplicate] processingId=runtime-1784068422337-image; ocrExecutionsBefore=1; ocrExecutionsAfter=1; OCRCompletedBefore=1; OCRCompletedAfter=1; mongoBefore=true; mongoAfter=true
[Verifier][Duplicate] processingId=runtime-1784068422337-scanned-pdf; ocrExecutionsBefore=1; ocrExecutionsAfter=1; OCRCompletedBefore=1; OCRCompletedAfter=1; mongoBefore=true; mongoAfter=true

=============================================
ALL RUNTIME VERIFICATION CHECKS PASSED
=============================================
[Verifier][GridFS] REMOVED fileId=6a56b946c1ad6b277e188cec
[Verifier][GridFS] REMOVED fileId=6a56b947c1ad6b277e188cee
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-image exists=false
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-scanned-pdf exists=false
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-digital-pdf exists=false
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-csv exists=false
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-txt exists=false
[Verifier][MongoIdempotency] cleanup processingId=runtime-1784068422337-xlsx exists=false
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\image-runtime.png removed=true
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\scanned-runtime.pdf removed=true
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\digital-runtime.pdf removed=true
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.csv removed=true
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.txt removed=true
[Verifier][Temp] REMOVED C:\github\academicuniverse.com\academicuniverse\backend\tmp\runtime-verification-runtime-1784068422337\sample-runtime.xlsx removed=true
OCRFactory: Overriding existing provider for TESSERACT
```
