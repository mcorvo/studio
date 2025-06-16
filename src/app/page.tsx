
"use client";

import { useState, useMemo, ChangeEvent, useCallback } from 'react';
import type { NextPage } from 'next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Download, ArrowUpDown, AlertCircle, FileJsonIcon, CheckCircle2Icon } from 'lucide-react';

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

// Helper to get all unique keys from an array of objects
const getAllKeys = (data: any[]): string[] => {
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });
  return Array.from(allKeys);
};

// Helper to get value, handling nested objects/arrays by stringifying them
const getDisplayValue = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Unserializable Object]';
    }
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
};

const JsonTableViewerPage: NextPage = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setFileName(file.name);
      try {
        const text = await file.text();
        setJsonInput(text);
        setSuccessMessage(`File "${file.name}" loaded. Click "View Table" to process.`);
      } catch (err) {
        setError(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
        setJsonInput('');
        setFileName(null);
      } finally {
        setIsLoading(false);
        event.target.value = ''; // Reset file input
      }
    }
  }, []);

  const processJson = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setTableData(null);
    setTableHeaders([]);
    setSortConfig(null);

    if (!jsonInput.trim()) {
      setError("JSON input is empty.");
      setIsLoading(false);
      return;
    }

    try {
      let parsedData = JSON.parse(jsonInput);
      
      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error("Input is not a valid JSON object or array.");
      }

      let dataArray: any[];
      if (Array.isArray(parsedData)) {
        dataArray = parsedData;
      } else {
        dataArray = [parsedData];
      }

      if (dataArray.length === 0) {
        setTableData([]);
        setTableHeaders([]);
        setSuccessMessage("JSON processed. The array is empty.");
        setIsLoading(false);
        return;
      }
      
      dataArray = dataArray.map(item => (typeof item !== 'object' || item === null) ? { value: item } : item);

      const headers = getAllKeys(dataArray);
      setTableHeaders(headers);
      setTableData(dataArray);
      setSuccessMessage("JSON data successfully processed.");
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      setTableData(null);
      setTableHeaders([]);
    } finally {
      setIsLoading(false);
    }
  }, [jsonInput]);

  const sortedTableData = useMemo(() => {
    if (!tableData) return null;
    let sortableItems = [...tableData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = getDisplayValue(a[sortConfig.key]);
        const valB = getDisplayValue(b[sortConfig.key]);
        
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const escapeCsvCell = (cellData: any): string => {
    const stringValue = getDisplayValue(cellData);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportToCsv = useCallback(() => {
    if (!sortedTableData || !tableHeaders.length) {
      setError("No data available to export.");
      return;
    }
    setError(null);

    try {
      const csvHeader = tableHeaders.map(escapeCsvCell).join(',');
      const csvRows = sortedTableData.map(row => 
        tableHeaders.map(header => escapeCsvCell(row[header])).join(',')
      );

      const csvContent = `${csvHeader}\n${csvRows.join('\n')}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const exportFileName = fileName ? `${fileName.split('.')[0]}.csv` : 'table_export.csv';
      link.setAttribute('download', exportFileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage("Data exported to CSV successfully.");
    } catch (err) {
      setError(`Failed to export CSV: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [sortedTableData, tableHeaders, fileName]);

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background text-foreground font-body">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">JSON Table Viewer</h1>
        <p className="text-muted-foreground mt-2">Upload or paste JSON to view as a sortable table and export to CSV.</p>
      </header>

      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <FileJsonIcon className="text-primary w-7 h-7" />
            Input JSON Data
          </CardTitle>
          <CardDescription>Upload a .json file or paste content into the text area.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="json-file-input" className="font-semibold text-lg">Upload JSON File</Label>
            <Input
              id="json-file-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              aria-label="Upload JSON file"
              disabled={isLoading}
            />
            {fileName && !error && jsonInput && <p className="text-sm text-muted-foreground mt-1">Loaded file: {fileName}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="json-textarea" className="font-semibold text-lg">Or Paste JSON Here</Label>
            <Textarea
              id="json-textarea"
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setFileName(null); setError(null); setSuccessMessage(null); }}
              placeholder='e.g., [{"id": 1, "name": "Example"}, {"id": 2, "name": "Data"}]'
              rows={10}
              className="border-input focus:ring-primary focus:border-primary rounded-md"
              aria-label="Paste JSON data"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={processJson} 
            disabled={isLoading || !jsonInput.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full md:w-auto rounded-md text-base py-3 px-6"
            aria-label="View JSON data as table"
          >
            {isLoading && jsonInput ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : "View Table"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-8 shadow-md rounded-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Error Processing JSON</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && !error && (
         <Alert variant="default" className="mb-8 shadow-md rounded-md border-primary/50">
          <CheckCircle2Icon className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {sortedTableData && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">Data Table</CardTitle>
              <CardDescription>View and sort your JSON data. Click column headers to sort.</CardDescription>
            </div>
            <Button 
              onClick={exportToCsv}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-md w-full md:w-auto"
              aria-label="Export table data to CSV"
              disabled={isLoading || !sortedTableData.length}
            >
              <Download className="mr-2 h-5 w-5" />
              Export as CSV
            </Button>
          </CardHeader>
          <CardContent>
            {sortedTableData.length === 0 && !isLoading ? (
              <p className="text-muted-foreground text-center py-8">No data to display in table. The JSON might be valid but represents an empty dataset.</p>
            ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableCaption className="py-4">{fileName ? `Data from ${fileName}` : (jsonInput ? 'Pasted JSON data' : 'No data source')}. {sortedTableData.length > 0 ? `Found ${sortedTableData.length} rows.` : ''}</TableCaption>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHead 
                        key={header} 
                        onClick={() => requestSort(header)}
                        className={`cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap p-3 text-sm font-medium ${sortConfig?.key === header ? 'bg-muted text-primary' : ''}`}
                        aria-sort={sortConfig?.key === header ? sortConfig.direction : 'none'}
                        title={`Sort by ${header}`}
                      >
                        <div className="flex items-center gap-1">
                          {header}
                          {sortConfig?.key === header ? (
                            sortConfig.direction === 'ascending' ? <ArrowUpDown className="h-4 w-4 opacity-80 transform rotate-180 transition-transform" /> : <ArrowUpDown className="h-4 w-4 opacity-80 transition-transform" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableData.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="hover:bg-muted/20 transition-colors data-[state=selected]:bg-muted">
                      {tableHeaders.map((header, cellIndex) => (
                        <TableCell key={`${rowIndex}-${cellIndex}`} className="p-3 text-sm max-w-[250px] truncate" title={getDisplayValue(row[header])}>
                          {getDisplayValue(row[header])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JsonTableViewerPage;

