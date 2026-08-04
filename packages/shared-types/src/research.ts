export interface ResearchPaperData {
    id?: string;
    topic: string;
    outline: any[];
    content: Record<string, string>;
    abstract: string;
    citations: any;
}
