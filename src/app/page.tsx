
"use client";

import { useState, useMemo, ChangeEvent, useCallback, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { NextPage } from 'next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, ArrowUpDown, AlertCircle, FileJsonIcon, CheckCircle2Icon } from 'lucide-react';

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface EditingCell {
  rowIndex: number;
  headerKey: string;
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
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<string>('');

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setFileName(file.name);
      setEditingCell(null); // Clear editing state
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
    setEditingCell(null); // Clear editing state

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
    setEditingCell(null); // Exit edit mode if sorting
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
    setEditingCell(null); // Exit edit mode

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

  const handleSaveEdit = useCallback(() => {
    if (!editingCell || !tableData) return;

    const { rowIndex, headerKey } = editingCell;
    const newData = [...tableData];
    const currentItem = newData[rowIndex];
    // Ensure currentItem is an object before trying to spread it or assign to its keys
    if (typeof currentItem !== 'object' || currentItem === null) {
        console.error("Cannot edit item, it's not an object:", currentItem);
        setEditingCell(null);
        return;
    }
    const originalValue = currentItem[headerKey];
    let parsedNewValue: any = currentEditValue;

    try {
      if (currentEditValue.trim() === "") { // Handle empty string input
        parsedNewValue = (originalValue === null || typeof originalValue === 'string') ? "" : null;
      } else if (typeof originalValue === 'number' && !isNaN(Number(currentEditValue))) {
        parsedNewValue = Number(currentEditValue);
      } else if (typeof originalValue === 'boolean') {
        if (currentEditValue.toLowerCase() === 'true') parsedNewValue = true;
        else if (currentEditValue.toLowerCase() === 'false') parsedNewValue = false;
        // else keep as string if not clearly boolean
      } else if ((typeof originalValue === 'object' && originalValue !== null) || 
                 (currentEditValue.startsWith('{') && currentEditValue.endsWith('}')) || 
                 (currentEditValue.startsWith('[') && currentEditValue.endsWith(']'))) {
        parsedNewValue = JSON.parse(currentEditValue);
      }
      // Default: keep as string (parsedNewValue is already currentEditValue)
    } catch (e) {
      // If JSON.parse fails or other conversion error, keep currentEditValue as string
      // A toast could be added here for parse errors if desired.
      console.warn(`Failed to parse '${currentEditValue}' for cell [${rowIndex}, ${headerKey}]. Saving as string.`);
    }
    
    newData[rowIndex] = { ...currentItem, [headerKey]: parsedNewValue };
    setTableData(newData);
    setEditingCell(null);
  }, [editingCell, currentEditValue, tableData]);

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if wrapped in one
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      setEditingCell(null); // Cancel edit
    }
  };

  const handleCellClick = (rowIndex: number, headerKey: string) => {
    if (isLoading) return; // Prevent editing while loading
    // If already editing this cell, do nothing to allow normal input interaction
    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey) {
      return;
    }
    // If editing another cell, save it first
    if (editingCell) {
      handleSaveEdit();
    }
    setEditingCell({ rowIndex, headerKey });
    setCurrentEditValue(getDisplayValue(tableData?.[rowIndex]?.[headerKey]));
  };


  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background text-foreground font-body">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">JSON Table Viewer</h1>
        <p className="text-muted-foreground mt-2">Upload or paste JSON to view, edit, and export data.</p>
      </header>

      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <FileJsonIcon className="text-primary w-7 h-7" />
            Input JSON Data
          </CardTitle>
          <CardDescription>Upload a .json file or paste content. Edit data directly in the table below.</CardDescription>
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
              onChange={(e) => { setJsonInput(e.target.value); setFileName(null); setError(null); setSuccessMessage(null); setEditingCell(null);}}
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
              <CardDescription>View and sort your JSON data. Click a cell to edit its content. Click column headers to sort.</CardDescription>
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
                    {tableHeaders.map((headerKey) => (
                      <TableHead 
                        key={headerKey} 
                        onClick={() => requestSort(headerKey)}
                        className={`cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap p-3 text-sm font-medium ${sortConfig?.key === headerKey ? 'bg-muted text-primary' : ''}`}
                        aria-sort={sortConfig?.key === headerKey ? sortConfig.direction : 'none'}
                        title={`Sort by ${headerKey}`}
                      >
                        <div className="flex items-center gap-1">
                          {headerKey}
                          {sortConfig?.key === headerKey ? (
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
                      {tableHeaders.map((headerKey) => (
                        <TableCell 
                          key={`${rowIndex}-${headerKey}`} 
                          className="p-0 text-sm relative" /* p-0 allows input to fill cell */
                          onClickCapture={(e) => { 
                            // If click target is already the input, don't re-trigger cell click
                            if ((e.target as HTMLElement).tagName === 'INPUT') return;
                            handleCellClick(rowIndex, headerKey);
                          }}
                        >
                          {editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey ? (
                            <Input
                              type="text"
                              value={currentEditValue}
                              onChange={(e) => setCurrentEditValue(e.target.value)}
                              onBlurCapture={handleSaveEdit} // Use onBlurCapture to ensure it fires before potential parent onClick
                              onKeyDown={handleEditKeyDown}
                              autoFocus
                              className="h-full w-full p-3 border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-none box-border bg-background/80"
                            />
                          ) : (
                            <div 
                              className="p-3 truncate cursor-pointer hover:bg-muted/30 w-full h-full box-border min-h-[2.5rem] flex items-center" /* min-h to match input */
                              title={getDisplayValue(row[headerKey])}
                            >
                              {getDisplayValue(row[headerKey])}
                            </div>
                          )}
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

