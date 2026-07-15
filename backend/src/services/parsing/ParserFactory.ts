// src/services/parsing/ParserFactory.ts
import { IParser } from './ParserInterface';
import { PdfParser } from './pdfParser';
import { ImageParser } from './imageParser';
import { ExcelParser } from './excelParser';
import { CsvParser } from './CsvParser';
import { TxtParser } from './TxtParser';

/**
 * Registration‑based factory for parsers.
 * Allows future parsers to be added without modifying this file.
 */
export class ParserFactory {
  private static parsers: Map<string, IParser> = new Map();

  /** Register a parser implementation for a given strategy name */
  static registerParser(strategy: string, parser: IParser): void {
    if (ParserFactory.parsers.has(strategy)) {
      // Overwrite is intentional to allow hot‑swap in tests.
      console.warn(`ParserFactory: Overriding existing parser for strategy ${strategy}`);
    }
    ParserFactory.parsers.set(strategy, parser);
  }

  /** Register built‑in parsers – called once at module load */
  public static initializeBuiltInParsers(): void {
    ParserFactory.registerParser('PDF_PARSER', new PdfParser());
    ParserFactory.registerParser('IMAGE_PARSER', new ImageParser());
    ParserFactory.registerParser('EXCEL_PARSER', new ExcelParser());
    ParserFactory.registerParser('CSV_PARSER', new CsvParser());
    ParserFactory.registerParser('TXT_PARSER', new TxtParser());
  }

  /** Retrieve a parser for the requested strategy */
  static getParser(strategy: string): IParser {
    const parser = ParserFactory.parsers.get(strategy);
    if (!parser) {
      throw new Error(`ParserFactory: No parser registered for strategy '${strategy}'`);
    }
    return parser;
  }}

ParserFactory.initializeBuiltInParsers();
