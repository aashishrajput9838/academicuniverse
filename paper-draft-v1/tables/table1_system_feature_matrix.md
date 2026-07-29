# Table 1. System Feature Matrix

**AU DIC vs Enterprise Alternatives**

| Feature | AU DIC (Proposed) | SAP S/4HANA | Workday HCM | Moodle LMS |
|---|---|---|---|---|
| **Document Intelligence** | Yes (Dual-Provider AI) | Limited (OCR add-on) | Limited | Basic (Tesseract) |
| **Multimodal LLM Integration** | Yes (Gemini + OpenRouter) | No | No | No |
| **Human-in-the-Loop (HITL)** | Yes (Candidate Staging) | No | No | Limited |
| **Dual-Provider Failover** | Yes (Automatic) | No | No | No |
| **Multi-Tenant SaaS** | Yes (Organization-scoped) | Yes | Yes | Yes (Plugin) |
| **Soft Deletion** | Yes (Transaction-safe) | Yes | Yes | Yes |
| **Structured JSON Extraction** | Yes (7 core fields + arrays) | No | No | No |
| **Confidence Scoring** | Yes (Per-field) | No | No | No |
| **Mobile Camera Support** | Yes (Quality profiles) | No | No | No |
| **Scanner Copy Support** | Yes (OCR fallback) | No | No | Limited |
| **Rotated Document Support** | Yes (Deskew + AI) | No | No | No |
| **Audit Trail** | Yes (ReviewHistory) | Yes | Yes | Yes |
| **Tenant Isolation** | Yes (organizationId scoping) | Yes | Yes | Yes |
| **REST API** | Yes (Express.js) | Yes (OData) | Yes (REST) | Yes (Web services) |
| **Open Source** | No | No | No | Yes |
| **Document Categories** | Academic (Certificate, Timetable, ID, Marksheet) | HR/Flexible | HR/Flexible | Academic limited |
| **Canonical Write** | Yes (After HITL approval) | Yes | Yes | No |
| **Bulk Operations** | Yes (Bulk delete review required) | Yes | Yes | Yes |
| **Scalability** | Cloud-native (MongoDB + Redis) | Enterprise | Enterprise | Self-hosted |
| **Cost Model** | Pay-per-use (AI API) | License | License | Free |

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
