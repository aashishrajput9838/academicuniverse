export class OntologyResolutionMetrics {
  private successCount = 0;
  private failureCount = 0;
  private fallbackCount = 0;

  recordSuccess(): void {
    this.successCount++;
  }

  recordFailure(): void {
    this.failureCount++;
  }

  recordFallback(): void {
    this.fallbackCount++;
  }

  getMetrics() {
    return {
      ontologyResolutionSuccess: this.successCount,
      ontologyResolutionFailure: this.failureCount,
      ontologyFallbackCount: this.fallbackCount,
    };
  }

  reset(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.fallbackCount = 0;
  }
}

export const ontologyResolutionMetrics = new OntologyResolutionMetrics();
