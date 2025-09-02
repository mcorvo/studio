
"use client";

import { useState, useMemo, useCallback, KeyboardEvent as ReactKeyboardEvent, useEffect } from 'react';
import type { NextPage } from 'next';
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, AlertCircle, CheckCircle2Icon, PlusCircle, Save, LogIn, Building, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface EditingCell {
  rowIndex: number;
  headerKey: string;
}

const SUPPLIER_MODEL_HEADERS = ['fornitore', 'anno', 'email', 'link_rda', 'fornitore_unico', 'Prodotto', 'licenses'];

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
  if (Array.isArray(value)) {
    return `${value.length}`;
  }
  if (typeof value === 'boolean') {
    return value.toString();
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
                <CardDescription className="text-muted-foreground">Please sign in to manage supplier data.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => signIn("keycloak")} className="w-full text-lg py-6 bg-accent hover:bg-accent/90">
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                </Button>
            </CardContent>
        </Card>
    </div>
);

const SupplierManagementPage: NextPage = () => {
  const { data: session, status } = useSession();
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<string>('');
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [pendingEditCell, setPendingEditCell] = useState<EditingCell | null>(null);

  const isAdmin = useMemo(() => session?.user?.roles?.includes('administrator') ?? false, [session]);

  const loadDataFromDB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEditingCell(null);
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setTableData(data);
        setTableHeaders(getAllKeys(data));
        if (data.length > 0) {
          setSuccessMessage("Supplier data successfully loaded from database.");
        } else {
          setSuccessMessage("Supplier database is empty. Add a new row to start.");
        }
      } else {
        throw new Error("Invalid data format received from server.");
      }
    } catch (err) {
      setError(`Failed to load supplier data from database: ${err instanceof Error ? err.message : String(err)}`);
      setTableData([]);
      setTableHeaders(SUPPLIER_MODEL_HEADERS);
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
    if (!isAdmin) {
      setError("You do not have permission to save data.");
      return;
    }
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

      const response = await fetch('/api/suppliers', {
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
      setSuccessMessage("Supplier data successfully saved to database.");
      loadDataFromDB();
    } catch (err) {
      setError(`Failed to save supplier data to database: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [tableData, loadDataFromDB, isAdmin]);

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
    if (key === 'id' || key === 'licenses') return;
    let direction: SortDirection = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setEditingCell(null);
  };

  const handleSaveEdit = useCallback(() => {
    if (!editingCell || !tableData) return;
    const { rowIndex, headerKey } = editingCell;
    const newData = [...tableData];
    const currentItem = newData[rowIndex];
    
    if (typeof currentItem !== 'object' || currentItem === null) {
      setEditingCell(null);
      return;
    }
    
    let parsedNewValue: any = currentEditValue;
    
    if (headerKey === 'anno') {
      const num = parseInt(currentEditValue, 10);
      parsedNewValue = isNaN(num) ? (new Date().getFullYear()) : num;
    } else if (headerKey === 'fornitore_unico') {
      parsedNewValue = currentEditValue.toLowerCase() === 'true';
    }
    
    newData[rowIndex] = { ...currentItem, [headerKey]: parsedNewValue };
    setTableData(newData);
    setEditingCell(null);
  }, [editingCell, currentEditValue, tableData]);

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleCellClick = (rowIndex: number, headerKey: string) => {
    if (isLoading || !isAdmin || headerKey === 'id' || headerKey === 'licenses') return;

    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey) {
      return;
    }
    if (editingCell) {
      handleSaveEdit();
    }
    
    const rowData = tableData?.[rowIndex];
    if (rowData && typeof rowData.id === 'number' && rowData.id > 0) {
      setPendingEditCell({ rowIndex, headerKey });
      setConfirmationDialogOpen(true);
    } else {
      setEditingCell({ rowIndex, headerKey });
      setCurrentEditValue(getDisplayValue(tableData?.[rowIndex]?.[headerKey]));
    }
  };
  
  const proceedWithEdit = () => {
    if (pendingEditCell) {
      setEditingCell(pendingEditCell);
      setCurrentEditValue(getDisplayValue(tableData?.[pendingEditCell.rowIndex]?.[pendingEditCell.headerKey]));
    }
    setConfirmationDialogOpen(false);
    setPendingEditCell(null);
  };
  
  const cancelEdit = () => {
    setConfirmationDialogOpen(false);
    setPendingEditCell(null);
  };

  const handleAddRow = useCallback(() => {
    if (isLoading || !isAdmin) return;
    setEditingCell(null);
    const newRow: { [key: string]: any } = {};

    SUPPLIER_MODEL_HEADERS.forEach(header => {
        switch(header) {
            case 'anno':
                newRow[header] = new Date().getFullYear();
                break;
            case 'licenses':
                newRow[header] = [];
                break;
            case 'fornitore_unico':
                newRow[header] = false;
                break;
            default:
                newRow[header] = "";
        }
    });
    
    let currentHeaders = [...tableHeaders];
    if (currentHeaders.length === 0 || !SUPPLIER_MODEL_HEADERS.every(h => currentHeaders.includes(h))) {
        const headersWithId = (tableData && tableData.length > 0 && tableData[0].hasOwnProperty('id'));
        currentHeaders = [...SUPPLIER_MODEL_HEADERS];
        if (headersWithId) {
            currentHeaders.unshift('id');
        }
        setTableHeaders(currentHeaders);
    }

    setTableData(prevData => [...(prevData || []), newRow]);
    setSuccessMessage("New supplier row added. Click cells to edit. Save to persist changes to DB.");
    setError(null);
  }, [isLoading, tableHeaders, tableData, isAdmin]);

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
    <div className="container mx-auto p-0">
      <div className="text-left mb-8">
            <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                <Building className="w-10 h-10" />
                Supplier Management
            </h1>
            <p className="text-muted-foreground mt-2">View, edit, add, and save supplier data.</p>
      </div>

      <AlertDialog open={isConfirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Edit</AlertDialogTitle>
                  <AlertDialogDescription>
                      This record is already saved in the database. Are you sure you want to edit it?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={cancelEdit}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={proceedWithEdit}>Edit</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      {isLoading && (
        <Alert variant="default" className="mb-8 shadow-md rounded-md border-blue-500/50">
            <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <AlertTitle className="font-semibold text-blue-600">Processing Database Request</AlertTitle>
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
      
      {tableData !== null && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Building className="h-6 w-6"/>
                Supplier Data Table
              </CardTitle>
              <CardDescription>{isAdmin ? "'id' is database-generated and not editable. Save changes to the database." : "View-only access. You do not have permission to edit this data."}</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto flex-wrap justify-end">
              {isAdmin && (
                <>
                  <Button
                    onClick={saveDataToDB}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white rounded-md w-full md:w-auto"
                    aria-label="Save table data to database"
                    disabled={isLoading || !tableData || tableData.length === 0}
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save to Database
                  </Button>
                  <Button
                    onClick={handleAddRow}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-md w-full md:w-auto"
                    aria-label="Add new row to table"
                    disabled={isLoading}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add Row
                  </Button>
                </>
              )}
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
              <p className="text-muted-foreground text-center py-8">No supplier data to display. Try adding a row.</p>
            ) : sortedTableData && sortedTableData.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableCaption className="py-4">Data from database. Found {sortedTableData.length} rows.</TableCaption>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {tableHeaders.map((headerKey) => (
                      <TableHead
                        key={headerKey}
                        onClick={() => requestSort(headerKey)}
                        className={`cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap p-3 text-sm font-medium ${sortConfig?.key === headerKey ? 'bg-muted text-primary' : ''} ${headerKey === 'id' || headerKey === 'licenses' ? 'cursor-default' : ''}`}
                        aria-sort={sortConfig?.key === headerKey ? sortConfig.direction : 'none'}
                        title={headerKey === 'id' ? 'ID (not sortable/editable)' : (headerKey === 'licenses' ? 'Associated licenses (not sortable/editable)' : `Sort by ${headerKey}`)}
                      >
                        <div className="flex items-center gap-1">
                          {headerKey.replace(/_/g, ' ')}
                          {headerKey !== 'id' && headerKey !== 'licenses' && sortConfig?.key === headerKey ? (
                            sortConfig.direction === 'ascending' ? <ArrowUpDown className="h-4 w-4 opacity-80 transform rotate-180 transition-transform" /> : <ArrowUpDown className="h-4 w-4 opacity-80 transition-transform" />
                          ) : (
                           headerKey !== 'id' && headerKey !== 'licenses' && <ArrowUpDown className="h-4 w-4 opacity-30" />
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
                             if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') || headerKey === 'id' || headerKey === 'licenses') return;
                             handleCellClick(rowIndex, headerKey);
                          }}
                        >
                          {editingCell && editingCell.rowIndex === rowIndex && editingCell.headerKey === headerKey ? (
                              <Input
                                type={headerKey === 'anno' ? 'number' : 'text'}
                                value={currentEditValue}
                                onChange={(e) => setCurrentEditValue(e.target.value)}
                                onBlurCapture={handleSaveEdit}
                                onKeyDown={handleEditKeyDown}
                                autoFocus
                                className="h-full w-full p-3 border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-none box-border bg-background/80"
                              />
                          ) : (
                             headerKey === 'licenses' && Array.isArray(row[headerKey]) && row[headerKey].length > 0 ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="p-3 w-full h-full box-border min-h-[2.5rem] flex items-center cursor-pointer hover:bg-muted/30">
                                           <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                           {getDisplayValue(row[headerKey])}
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto max-w-2xl">
                                      <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Associated Licenses</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Licenses linked to supplier "{row.fornitore}".
                                        </p>
                                      </div>
                                      <div className="mt-4 rounded-md border overflow-hidden">
                                          <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Prodotto</TableHead>
                                                    <TableHead>Tipo Licenza</TableHead>
                                                    <TableHead>Scadenza</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {row[headerKey].map((license: any) => (
                                                    <TableRow key={license.id}>
                                                        <TableCell>{license.Prodotto}</TableCell>
                                                        <TableCell>{license.Tipo_Licenza}</TableCell>
                                                        <TableCell>{license.Scadenza ? new Date(license.Scadenza).toLocaleDateString() : 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                          </Table>
                                      </div>
                                    </PopoverContent>
                                </Popover>
                             ) : (
                                <div
                                  className={`p-3 truncate w-full h-full box-border min-h-[2.5rem] flex items-center ${isAdmin && headerKey !== 'id' && headerKey !== 'licenses' ? 'cursor-pointer hover:bg-muted/30' : 'text-muted-foreground'}`}
                                  title={getDisplayValue(row[headerKey])}
                                >
                                  {headerKey === 'licenses' && <FileText className="mr-2 h-4 w-4 text-muted-foreground" />}
                                  {getDisplayValue(row[headerKey])}
                                </div>
                             )
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

export default SupplierManagementPage;
