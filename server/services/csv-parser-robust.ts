/**
 * Robust CSV Parser for Shopify Exports
 * 
 * This parser handles complex CSV files with:
 * - Quoted fields containing commas
 * - Multi-line quoted content (HTML descriptions)
 * - Escaped quotes within fields
 * - Mixed delimiters and encodings
 */

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  errors: string[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    headerCount: number;
  };
}

export interface CSVField {
  value: string;
  isQuoted: boolean;
  position: number;
}

/**
 * State machine states for CSV parsing
 */
enum ParseState {
  START_FIELD,
  IN_QUOTED_FIELD,
  IN_UNQUOTED_FIELD,
  QUOTE_IN_QUOTED_FIELD,
  END_FIELD
}

/**
 * Advanced CSV parser using finite state machine
 * Handles RFC 4180 compliance with extended support for:
 * - Multi-line quoted fields
 * - HTML content within quotes
 * - Nested quotes and special characters
 */
export class RobustCSVParser {
  private delimiter: string = ',';
  private quoteChar: string = '"';
  private escapeChar: string = '"';
  private lineBreak: string = '\n';
  
  constructor(options?: {
    delimiter?: string;
    quoteChar?: string;
    escapeChar?: string;
    lineBreak?: string;
  }) {
    if (options) {
      this.delimiter = options.delimiter || this.delimiter;
      this.quoteChar = options.quoteChar || this.quoteChar;
      this.escapeChar = options.escapeChar || this.escapeChar;
      this.lineBreak = options.lineBreak || this.lineBreak;
    }
  }

  /**
   * Parse CSV content with comprehensive error handling
   */
  public parse(csvContent: string): CSVParseResult {
    const result: CSVParseResult = {
      headers: [],
      rows: [],
      errors: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        headerCount: 0
      }
    };

    try {
      // Normalize line endings
      const normalizedContent = this.normalizeLineEndings(csvContent);
      
      // Parse using state machine
      const parsedData = this.parseWithStateMachine(normalizedContent);
      
      if (parsedData.length === 0) {
        result.errors.push('No data found in CSV');
        return result;
      }

      // Extract headers
      result.headers = parsedData[0];
      result.stats.headerCount = result.headers.length;
      
      // Process data rows
      for (let i = 1; i < parsedData.length; i++) {
        const row = parsedData[i];
        result.stats.totalRows++;
        
        // Validate row length
        if (row.length !== result.headers.length) {
          // Try to fix common issues
          const fixedRow = this.attemptRowFix(row, result.headers.length);
          if (fixedRow.length === result.headers.length) {
            result.rows.push(fixedRow);
            result.stats.validRows++;
          } else {
            result.errors.push(`Row ${i}: Expected ${result.headers.length} fields, got ${row.length}`);
            result.stats.invalidRows++;
            // Include the row anyway with padding/truncation
            result.rows.push(this.padOrTruncateRow(row, result.headers.length));
          }
        } else {
          result.rows.push(row);
          result.stats.validRows++;
        }
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Normalize line endings to consistent format
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Parse CSV using finite state machine for maximum accuracy
   */
  private parseWithStateMachine(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let state = ParseState.START_FIELD;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      const nextChar = i + 1 < content.length ? content[i + 1] : null;

      switch (state) {
        case ParseState.START_FIELD:
          if (char === this.quoteChar) {
            state = ParseState.IN_QUOTED_FIELD;
          } else if (char === this.delimiter) {
            currentRow.push('');
            // Stay in START_FIELD
          } else if (char === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            // Stay in START_FIELD
          } else {
            currentField = char;
            state = ParseState.IN_UNQUOTED_FIELD;
          }
          break;

        case ParseState.IN_QUOTED_FIELD:
          if (char === this.quoteChar) {
            if (nextChar === this.quoteChar) {
              // Escaped quote
              currentField += this.quoteChar;
              i++; // Skip next character
            } else {
              state = ParseState.QUOTE_IN_QUOTED_FIELD;
            }
          } else {
            currentField += char;
          }
          break;

        case ParseState.QUOTE_IN_QUOTED_FIELD:
          if (char === this.delimiter) {
            currentRow.push(currentField);
            currentField = '';
            state = ParseState.START_FIELD;
          } else if (char === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            state = ParseState.START_FIELD;
          } else if (char === this.quoteChar) {
            // Another quote after closing quote - treat as escaped
            currentField += char;
            state = ParseState.IN_QUOTED_FIELD;
          } else {
            // Non-delimiter after closing quote - this is technically malformed
            // but we'll be lenient and continue
            currentField += char;
            state = ParseState.IN_UNQUOTED_FIELD;
          }
          break;

        case ParseState.IN_UNQUOTED_FIELD:
          if (char === this.delimiter) {
            currentRow.push(currentField);
            currentField = '';
            state = ParseState.START_FIELD;
          } else if (char === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            state = ParseState.START_FIELD;
          } else {
            currentField += char;
          }
          break;
      }

      i++;
    }

    // Handle final field and row
    if (currentField || state === ParseState.QUOTE_IN_QUOTED_FIELD) {
      currentRow.push(currentField);
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Attempt to fix common row parsing issues
   */
  private attemptRowFix(row: string[], expectedLength: number): string[] {
    // If row is too short, it might be due to missing trailing commas
    if (row.length < expectedLength) {
      const paddedRow = [...row];
      while (paddedRow.length < expectedLength) {
        paddedRow.push('');
      }
      return paddedRow;
    }

    // If row is too long, it might be due to unescaped commas in fields
    if (row.length > expectedLength) {
      // Try to merge adjacent fields that might have been split incorrectly
      const fixedRow: string[] = [];
      let i = 0;
      
      while (i < row.length && fixedRow.length < expectedLength) {
        if (fixedRow.length === expectedLength - 1) {
          // Last field - merge remaining
          fixedRow.push(row.slice(i).join(','));
          break;
        } else {
          fixedRow.push(row[i]);
          i++;
        }
      }
      
      return fixedRow;
    }

    return row;
  }

  /**
   * Pad short rows or truncate long rows to match expected length
   */
  private padOrTruncateRow(row: string[], expectedLength: number): string[] {
    if (row.length < expectedLength) {
      const paddedRow = [...row];
      while (paddedRow.length < expectedLength) {
        paddedRow.push('');
      }
      return paddedRow;
    } else if (row.length > expectedLength) {
      return row.slice(0, expectedLength);
    }
    return row;
  }

  /**
   * Detect delimiter automatically
   */
  public static detectDelimiter(csvContent: string): string {
    const sample = csvContent.substring(0, 1024); // First 1KB
    const delimiters = [',', ';', '\t', '|'];
    const counts: { [key: string]: number } = {};

    for (const delimiter of delimiters) {
      counts[delimiter] = (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    }

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }
}

/**
 * Convenience function for parsing CSV content
 */
export function parseCSV(csvContent: string, options?: {
  delimiter?: string;
  autoDetectDelimiter?: boolean;
}): CSVParseResult {
  let delimiter = options?.delimiter || ',';
  
  if (options?.autoDetectDelimiter) {
    delimiter = RobustCSVParser.detectDelimiter(csvContent);
  }

  const parser = new RobustCSVParser({ delimiter });
  return parser.parse(csvContent);
}

/**
 * Parse Shopify CSV with specific handling for common Shopify export formats
 */
export function parseShopifyCSV(csvContent: string): CSVParseResult {
  // Shopify typically uses comma delimiters
  const parser = new RobustCSVParser({ delimiter: ',' });
  const result = parser.parse(csvContent);
  
  // Apply Shopify-specific post-processing
  if (result.headers.length > 0) {
    // Clean up common Shopify header variations
    result.headers = result.headers.map(header => 
      header.trim().replace(/[""]/g, '"').replace(/\s+/g, ' ')
    );
    
    // Clean up row data
    result.rows = result.rows.map(row => 
      row.map(cell => 
        typeof cell === 'string' ? cell.trim() : cell
      )
    );
  }
  
  return result;
}