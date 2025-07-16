
"use client";

import { useState, useMemo, ChangeEvent, useCallback, KeyboardEvent as ReactKeyboardEvent, useEffect } from 'react';
import type { NextPage } from 'next';
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, ArrowUpDown, AlertCircle, FileJsonIcon, CheckCircle2Icon, PlusCircle, Save, CalendarIcon, Mail, BellRing, LogIn, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface EditingCell {
  rowIndex: number;
  headerKey: string;
}

interface ResellerInfo {
  name: string;
  email: string;
}

const LICENSE_MODEL_HEADERS = ['Produttore', 'Prodotto', 'Tipo_Licenza', 'Numero_Licenze', 'Bundle', 'Borrowable', 'Contratto', 'Rivenditore', 'Email_Rivenditore', 'Scadenza'];

const getAllKeys = (data: any[]): string[] => {
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });
  const sortedKeys = Array.from(allKeys);
  if (sortedKeys.includes('id')) {
    sortedKeys.splice(sortedKeys.indexOf('id'), 1);
    sortedKeys.unshift('id');
  }
  return sortedKeys;
};

const getDisplayValue = (value: any): string => {
  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd');
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
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

const UnauthenticatedScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary">Welcome</CardTitle>
                <CardDescription className="text-muted-foreground">Please sign in to manage license data.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => signIn("google")} className="w-full text-lg py-6 bg-accent hover:bg-accent/90">
                    <LogIn className="mr-2 h-5 w-5" /> Sign In with Google
                </Button>
            </CardContent>
        </Card>
    </div>
);

const LicenseManagementPage: NextPage = () => {
  const { data: session, status } = useSession();
  const [jsonInput, setJsonInput] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotifying, setIsNotifying] = useState<boolean>(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<string>('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [resellerInfo, setResellerInfo] = useState<ResellerInfo | null>(null);
  const { toast } = useToast();


  const loadDataFromDB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEditingCell(null);
    try {
      const response = await fetch('/api/tabledata');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setTableData(data);
        setTableHeaders(getAllKeys(data));
        if (data.length > 0) {
          setSuccessMessage("Data successfully loaded from database.");
        } else {
          setSuccessMessage("Database is empty. Load JSON or add rows.");
        }
      } else {
        throw new Error("Invalid data format received from server.");
      }
    } catch (err) {
      setError(`Failed to load data from database: ${err instanceof Error ? err.message : String(err)}`);
      setTableData([]);
      setTableHeaders(LICENSE_MODEL_HEADERS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
        loadDataFromDB();
    }
  }, [status, loadDataFromDB]);


  const saveDataToDB = useCallback(async () => {
    if (!tableData) {
      setError("No data to save.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEditingCell(null);
    try {
      const dataToSend = tableData.map(row => {
        const { id, ...rest } = row;
        return (typeof id === 'number' && id > 0) ? row : rest;
      });

      const response = await fetch('/api/tabledata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save data: ${response.statusText}`);
      }
      setSuccessMessage("Data successfully saved to database.");
      loadDataFromDB();
    } catch (err) {
      setError(`Failed to save data to database: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [tableData, loadDataFromDB]);


  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setFileName(file.name);
      setEditingCell(null);
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
        event.target.value = '';
      }
    }
  }, []);

  const processJson = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSortConfig(null);
    setEditingCell(null);

    if (!jsonInput.trim()) {
      setError("JSON input is empty. Clearing table.");
      setTableData([]);
      setTableHeaders(LICENSE_MODEL_HEADERS);
      setIsLoading(false);
      return;
    }

    try {
      let parsedData = JSON.parse(jsonInput);
      let dataArray: any[] = Array.isArray(parsedData) ? parsedData : [parsedData];
      if (dataArray.length === 0) {
        setTableData([]);
        setTableHeaders(getAllKeys(dataArray).length > 0 ? getAllKeys(dataArray) : LICENSE_MODEL_HEADERS);
        setSuccessMessage("JSON processed. The array is empty.");
      } else {
        dataArray = dataArray.map(item => {
          if (typeof item !== 'object' || item === null) return { value: item };
          const newItem: any = {};
          LICENSE_MODEL_HEADERS.forEach(header => {
            newItem[header] = item[header] ?? (header === 'Numero_Licenze' || header === 'Bundle' ? 0 : (header === 'Borrowable' ? false : ''));
          });
          if (item.id) newItem.id = item.id;
          return newItem;
        });
        setTableHeaders(getAllKeys(dataArray));
        setTableData(dataArray);
        setSuccessMessage("JSON data successfully processed and table updated.");
      }
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
    if (key === 'id') return;
    let direction: SortDirection = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setEditingCell(null);
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
    setEditingCell(null);
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
      const exportFileName = fileName ? `${fileName.split('.')[0]}.csv` : 'licenses_export.csv';
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
    if (typeof currentItem !== 'object' || currentItem === null) {
      setEditingCell(null);
      return;
    }
    const originalValue = currentItem[headerKey];
    let parsedNewValue: any = currentEditValue;

    if (headerKey !== 'Scadenza') {
        try {
          if (currentEditValue.trim() === "" && typeof originalValue !== 'boolean' && typeof originalValue !== 'number') {
             parsedNewValue = "";
          } else if (headerKey === 'Numero_Licenze' || headerKey === 'Bundle') {
            const num = parseInt(currentEditValue, 10);
            parsedNewValue = isNaN(num) ? (originalValue || 0) : num;
          } else if (headerKey === 'Borrowable') {
            parsedNewValue = currentEditValue.toLowerCase() === 'true';
          } else if (typeof originalValue === 'string' || originalValue === null || originalValue === undefined) {
            parsedNewValue = currentEditValue;
          }
        } catch (e) {
          console.warn(`Failed to parse '${currentEditValue}' for cell [${rowIndex}, ${headerKey}]. Saving as string.`);
          parsedNewValue = currentEditValue;
        }
    }

    newData[rowIndex] = { ...currentItem, [headerKey]: parsedNewValue };
    setTableData(newData);
    setEditingCell(null);
  }, [editingCell, currentEditValue, tableData]);

  const handleDateSelect = (date: Date | undefined, rowIndex: number, headerKey: string) => {
    if (!date || !tableData) return;
    const newData = [...tableData];
    newData[rowIndex] = { ...newData[rowIndex], [headerKey]: format(date, 'yyyy-MM-dd') };
    setTableData(newData);
    setDatePickerOpen(false);
    setEditingCell(null);
  };

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleCellClick = (rowIndex: number, headerKey: string) => {
    if (isLoading || headerKey === 'id') return;

    if (headerKey === 'Rivenditore') {
      if (!tableData) return;
      const row = tableData[rowIndex];
      if (row) {
        setResellerInfo({
          name: getDisplayValue(row.Rivenditore),
          email: getDisplayValue(row.Email_Rivenditore),
        });
      }
      return;
    }

    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey) {
      return;
    }
    if (editingCell) {
      handleSaveEdit();
    }
    setEditingCell({ rowIndex, headerKey });
    setCurrentEditValue(getDisplayValue(tableData?.[rowIndex]?.[headerKey]));
  };

  const handleAddRow = useCallback(() => {
    if (isLoading) return;
    setEditingCell(null);
    const newRow: { [key: string]: any } = {};

    LICENSE_MODEL_HEADERS.forEach(header => {
        switch(header) {
            case 'Numero_Licenze':
            case 'Bundle':
                newRow[header] = 0;
                break;
            case 'Borrowable':
                newRow[header] = false;
                break;
            case 'Scadenza':
                newRow[header] = null;
                break;
            default:
                newRow[header] = "";
        }
    });
    
    let currentHeaders = [...tableHeaders];
    if (currentHeaders.length === 0 || !LICENSE_MODEL_HEADERS.every(h => currentHeaders.includes(h))) {
        const headersWithId = (tableData && tableData.length > 0 && tableData[0].hasOwnProperty('id'));
        currentHeaders = [...LICENSE_MODEL_HEADERS];
        if (headersWithId) {
            currentHeaders.unshift('id');
        }
        setTableHeaders(currentHeaders);
    }

    setTableData(prevData => [...(prevData || []), newRow]);
    setSuccessMessage("New row added. Click cells to edit. Save to persist changes to DB.");
    setError(null);
  }, [isLoading, tableHeaders, tableData]);

  const handleNotify = useCallback(async () => {
    setIsNotifying(true);
    setError(null);
    setSuccessMessage(null);
    
    toast({
        title: "Checking for expiring licenses...",
        description: "This may take a moment. Please wait.",
    });

    try {
        const response = await fetch('/api/notify-expirations');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'An unknown error occurred.');
        }

        const emailCount = result.details?.sentEmails?.length || 0;
        if (emailCount > 0) {
            toast({
                title: "Notifications Generated",
                description: `Successfully generated ${emailCount} email(s) for expiring licenses.`,
                variant: "default",
            });
            setSuccessMessage(`Successfully generated ${emailCount} email(s). Note: This mock-up generates email content but does not send them.`)
        } else {
             toast({
                title: "No Expiring Licenses",
                description: "No licenses were found that are expiring in the next 4 months.",
            });
            setSuccessMessage("No licenses are due for an expiration notification at this time.")
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to check for expirations: ${errorMessage}`);
        toast({
            title: "Error",
            description: `Failed to check for expirations: ${errorMessage}`,
            variant: "destructive",
        });
    } finally {
        setIsNotifying(false);
    }
  }, [toast]);

  if (status === "loading") {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
  }

  if (status === "unauthenticated") {
      return <UnauthenticatedScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background text-foreground font-body">
      <header className="mb-8 flex justify-between items-center">
        <div className="text-center flex-grow">
            <h1 className="text-4xl font-headline font-bold text-primary">License Data Management</h1>
            <p className="text-muted-foreground mt-2">Upload or paste JSON, view, edit, add license rows, and persist data to a database.</p>
        </div>
        <Button onClick={() => signOut()} variant="outline">
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
        </Button>
      </header>

      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <FileJsonIcon className="text-primary w-7 h-7" />
            Input License Data (JSON)
          </CardTitle>
          <CardDescription>Upload a .json file or paste content. New data will replace existing table content. Save to persist to DB.</CardDescription>
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
              disabled={isLoading || isNotifying}
            />
            {fileName && !error && jsonInput && <p className="text-sm text-muted-foreground mt-1">Loaded file: {fileName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="json-textarea" className="font-semibold text-lg">Or Paste JSON Here</Label>
            <Textarea
              id="json-textarea"
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setFileName(null); setError(null); setSuccessMessage(null); setEditingCell(null);}}
              placeholder='e.g., [{"Produttore": "Example Inc", "Prodotto": "Software X", "Tipo_Licenza": "Subscription", "Numero_Licenze": 10, "Bundle": 1, "Borrowable": true, "Contratto": "CTR-001", "Rivenditore": "ResellerX", "Email_Rivenditore": "contact@resellerx.com", "Scadenza": "2025-12-31"}]'
              rows={10}
              className="border-input focus:ring-primary focus:border-primary rounded-md"
              aria-label="Paste JSON data"
              disabled={isLoading || isNotifying}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={processJson}
            disabled={isLoading || isNotifying || !jsonInput.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full md:w-auto rounded-md text-base py-3 px-6"
            aria-label="View JSON data as table"
          >
            {isLoading && jsonInput.trim() && !successMessage?.includes("database") ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing JSON...
              </span>
            ) : "View Table from Input"}
          </Button>
        </CardFooter>
      </Card>

      {(isLoading && status === 'authenticated') && (
        <Alert variant="default" className="mb-8 shadow-md rounded-md border-blue-500/50">
            <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <AlertTitle className="font-semibold text-blue-600">{isNotifying ? "Checking Expirations..." : "Processing Database Request"}</AlertTitle>
            </div>
          <AlertDescription>Please wait...</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-8 shadow-md rounded-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Error</AlertTitle>
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

      {resellerInfo && (
        <AlertDialog open={!!resellerInfo} onOpenChange={(isOpen) => !isOpen && setResellerInfo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Contact Information for {resellerInfo.name}</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="flex items-center gap-2 pt-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{resellerInfo.email || "No email provided."}</span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setResellerInfo(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {tableData !== null && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">License Data Table</CardTitle>
              <CardDescription>View, sort, and edit license data. 'id' is database-generated and not editable. Save changes to the database.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto flex-wrap justify-end">
               <Button
                onClick={handleNotify}
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 hover:text-orange-600 rounded-md w-full md:w-auto"
                aria-label="Check for expiring licenses"
                disabled={isLoading || isNotifying}
              >
                <BellRing className="mr-2 h-5 w-5" />
                Check Expirations
              </Button>
               <Button
                onClick={saveDataToDB}
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white rounded-md w-full md:w-auto"
                aria-label="Save table data to database"
                disabled={isLoading || isNotifying || !tableData || tableData.length === 0}
              >
                <Save className="mr-2 h-5 w-5" />
                Save to Database
              </Button>
              <Button
                onClick={handleAddRow}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-md w-full md:w-auto"
                aria-label="Add new row to table"
                disabled={isLoading || isNotifying}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Row
              </Button>
              <Button
                onClick={exportToCsv}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-md w-full md:w-auto"
                aria-label="Export table data to CSV"
                disabled={isLoading || isNotifying || !sortedTableData || !sortedTableData.length}
              >
                <Download className="mr-2 h-5 w-5" />
                Export as CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tableData === null && isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="ml-3 text-muted-foreground">Loading data from database...</p>
                </div>
            ) : sortedTableData && sortedTableData.length === 0 && !isLoading ? (
              <p className="text-muted-foreground text-center py-8">No license data to display. Try adding a row or loading JSON. If data was loaded from DB, it might be empty.</p>
            ) : sortedTableData && sortedTableData.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableCaption className="py-4">{fileName ? `Data from ${fileName}` : (jsonInput ? 'Data from pasted JSON' : (tableData.length > 0 ? 'Data from database' : 'No data source'))}. {sortedTableData.length > 0 ? `Found ${sortedTableData.length} rows.` : ''}</TableCaption>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {tableHeaders.map((headerKey) => (
                      <TableHead
                        key={headerKey}
                        onClick={() => requestSort(headerKey)}
                        className={`cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap p-3 text-sm font-medium ${sortConfig?.key === headerKey ? 'bg-muted text-primary' : ''} ${headerKey === 'id' ? 'cursor-default' : ''}`}
                        aria-sort={sortConfig?.key === headerKey ? sortConfig.direction : 'none'}
                        title={headerKey === 'id' ? 'ID (not sortable/editable)' : `Sort by ${headerKey}`}
                      >
                        <div className="flex items-center gap-1">
                          {headerKey}
                          {headerKey !== 'id' && sortConfig?.key === headerKey ? (
                            sortConfig.direction === 'ascending' ? <ArrowUpDown className="h-4 w-4 opacity-80 transform rotate-180 transition-transform" /> : <ArrowUpDown className="h-4 w-4 opacity-80 transition-transform" />
                          ) : (
                           headerKey !== 'id' && <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableData.map((row, rowIndex) => (
                    <TableRow key={row.id || rowIndex} className="hover:bg-muted/20 transition-colors data-[state=selected]:bg-muted">
                      {tableHeaders.map((headerKey) => (
                        <TableCell
                          key={`${row.id || rowIndex}-${headerKey}`}
                          className="p-0 text-sm relative"
                          onClickCapture={(e) => {
                             if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') || headerKey === 'id' || isNotifying) return;
                             handleCellClick(rowIndex, headerKey);
                          }}
                        >
                          {editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey ? (
                            headerKey === 'Scadenza' ? (
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
                                                !row[headerKey] && "text-muted-foreground"
                                            )}
                                            onClick={() => setDatePickerOpen(true)}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {row[headerKey] ? format(new Date(row[headerKey]), "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={row[headerKey] ? new Date(row[headerKey]) : undefined}
                                            onSelect={(date) => handleDateSelect(date, rowIndex, headerKey)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <Input
                                  type={headerKey === 'Numero_Licenze' || headerKey === 'Bundle' ? 'number' : 'text'}
                                  value={currentEditValue}
                                  onChange={(e) => setCurrentEditValue(e.target.value)}
                                  onBlurCapture={handleSaveEdit}
                                  onKeyDown={handleEditKeyDown}
                                  autoFocus
                                  className="h-full w-full p-3 border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-none box-border bg-background/80"
                                />
                            )
                          ) : (
                            <div
                              className={`p-3 truncate w-full h-full box-border min-h-[2.5rem] flex items-center ${headerKey !== 'id' ? 'cursor-pointer hover:bg-muted/30' : 'text-muted-foreground'} ${isNotifying ? 'cursor-not-allowed' : ''}`}
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
            ) : null }
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LicenseManagementPage;
