
"use client";

import { useState, useMemo, useCallback, KeyboardEvent as ReactKeyboardEvent, useEffect } from 'react';
import type { NextPage } from 'next';
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowUpDown, AlertCircle, CheckCircle2Icon, PlusCircle, Save, CalendarIcon, BellRing, LogIn, Building, FileText, LibrarySquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface EditingCell {
  rowIndex: number;
  headerKey: string;
}

const LICENSE_MODEL_HEADERS = ['Produttore', 'Prodotto', 'Tipo_Licenza', 'Numero_Licenze', 'Bundle', 'Contratto', 'Rivenditore', 'Scadenza', 'suppliers', 'rdas'];

const licenseFormSchema = z.object({
    Produttore: z.string().min(1, "Producer is required"),
    Prodotto: z.string().min(1, "Product is required"),
    Tipo_Licenza: z.string().min(1, "License type is required"),
    Numero_Licenze: z.coerce.number().int().min(0),
    Bundle: z.coerce.number().int().min(0),
    Contratto: z.string().optional(),
    Rivenditore: z.string().optional(),
    Scadenza: z.date().optional().nullable(),
});

type LicenseFormValues = z.infer<typeof licenseFormSchema>;


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
  if (Array.isArray(value)) {
    return `${value.length}`;
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
                <Button onClick={() => signIn("keycloak")} className="w-full text-lg py-6 bg-accent hover:bg-accent/90">
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                </Button>
            </CardContent>
        </Card>
    </div>
);

const AddLicenseDialog = ({ onSave, children }: { onSave: (data: LicenseFormValues) => void; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<LicenseFormValues>({
        resolver: zodResolver(licenseFormSchema),
        defaultValues: {
            Produttore: '',
            Prodotto: '',
            Tipo_Licenza: '',
            Numero_Licenze: 0,
            Bundle: 0,
            Contratto: '',
            Rivenditore: '',
            Scadenza: null,
        },
    });

    const onSubmit = (data: LicenseFormValues) => {
        onSave(data);
        form.reset();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New License</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the new license. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="Produttore"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Producer</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Producer Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="Prodotto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Product Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Tipo_Licenza"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>License Type</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Subscription" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Numero_Licenze"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Licenses</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="Bundle" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bundle</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="Contratto" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contract</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Contract ID" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name="Rivenditore" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reseller</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Reseller Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Scadenza"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Expiration Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date("1900-01-01")}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


const LicenseManagementPage: NextPage = () => {
  const { data: session, status } = useSession();
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
  const { toast } = useToast();
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [pendingEditCell, setPendingEditCell] = useState<EditingCell | null>(null);

  const isAdmin = useMemo(() => session?.user?.clientRoles?.includes('administrator') ?? false, [session]);


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
      const response = await fetch('/api/tabledata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
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
    if (key === 'id' || key === 'suppliers' || key === 'rdas') return;
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
      const exportFileName = 'licenses_export.csv';
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
  }, [sortedTableData, tableHeaders]);

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
          if (currentEditValue.trim() === "" && typeof originalValue !== 'number') {
             parsedNewValue = "";
          } else if (headerKey === 'Numero_Licenze' || headerKey === 'Bundle') {
            const num = parseInt(currentEditValue, 10);
            parsedNewValue = isNaN(num) ? (originalValue || 0) : num;
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
    if (!isAdmin || isLoading || headerKey === 'id' || headerKey === 'suppliers' || headerKey === 'rdas') return;

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

  const handleAddRow = useCallback((newLicense: LicenseFormValues) => {
    if (isLoading || !isAdmin) return;
    setEditingCell(null);
    
    const newRow = {
        ...newLicense,
        Scadenza: newLicense.Scadenza ? format(newLicense.Scadenza, 'yyyy-MM-dd') : null,
        suppliers: [],
        rdas: [],
    };
    
    setTableData(prevData => [...(prevData || []), newRow]);
    setSuccessMessage("New row added. Save to persist changes to DB.");
    setError(null);
  }, [isLoading, isAdmin]);

  const handleNotify = useCallback(async () => {
    setIsNotifying(true);
    setError(null);
    setSuccessMessage(null);
    
    toast({
        title: "Checking for expiring licenses...",
        description: "This may take a moment. Please wait.",
    });

    try {
        const response = await fetch('/api/notify-expirations', {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
            }
        });
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
            setSuccessMessage(`Successfully generated ${emailCount} email(s). Emails are sent to the configured recipient.`)
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
    <div className="container mx-auto p-0">
      <div className="text-left mb-8">
            <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                <LibrarySquare className="w-10 h-10" />
                License Data Management
            </h1>
            <p className="text-muted-foreground mt-2">Manage license, supplier, and RDA data.</p>
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

      {tableData !== null && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">License Data Table</CardTitle>
              <CardDescription>
                {isAdmin ? "View, sort, and edit license data. 'id' is database-generated and not editable. Save changes to the database." : "View-only access. You do not have permission to edit this data."}
              </CardDescription>
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
              {isAdmin && (
                <>
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
                  <AddLicenseDialog onSave={handleAddRow}>
                      <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-md w-full md:w-auto"
                          aria-label="Add new row to table"
                          disabled={isLoading || isNotifying}
                      >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Add Row
                      </Button>
                  </AddLicenseDialog>
                </>
              )}
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
                <TableCaption className="py-4">{tableData.length > 0 ? 'Data from database' : 'No data source'}. {sortedTableData.length > 0 ? `Found ${sortedTableData.length} rows.` : ''}</TableCaption>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {tableHeaders.map((headerKey) => (
                      <TableHead
                        key={headerKey}
                        onClick={() => requestSort(headerKey)}
                        className={`cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap p-3 text-sm font-medium ${sortConfig?.key === headerKey ? 'bg-muted text-primary' : ''} ${headerKey === 'id' || headerKey === 'suppliers' || headerKey === 'rdas' ? 'cursor-default' : ''}`}
                        aria-sort={sortConfig?.key === headerKey ? sortConfig.direction : 'none'}
                        title={headerKey === 'id' ? 'ID (not sortable/editable)' : (headerKey === 'suppliers' ? 'Associated suppliers (not sortable/editable)' : (headerKey === 'rdas' ? 'Associated RDAs (not sortable/editable)' : `Sort by ${headerKey}`))}
                      >
                        <div className="flex items-center gap-1">
                          {headerKey}
                          {headerKey !== 'id' && headerKey !== 'suppliers' && headerKey !== 'rdas' && sortConfig?.key === headerKey ? (
                            sortConfig.direction === 'ascending' ? <ArrowUpDown className="h-4 w-4 opacity-80 transform rotate-180 transition-transform" /> : <ArrowUpDown className="h-4 w-4 opacity-80 transition-transform" />
                          ) : (
                           headerKey !== 'id' && headerKey !== 'suppliers' && headerKey !== 'rdas' && <ArrowUpDown className="h-4 w-4 opacity-30" />
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
                             if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') || headerKey === 'id' || headerKey === 'suppliers' || headerKey === 'rdas' || isNotifying) return;
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
                             headerKey === 'suppliers' && Array.isArray(row[headerKey]) && row[headerKey].length > 0 ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="p-3 w-full h-full box-border min-h-[2.5rem] flex items-center cursor-pointer hover:bg-muted/30">
                                           <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                                           {getDisplayValue(row[headerKey])}
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto max-w-lg">
                                      <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Associated Suppliers</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Suppliers linked to license for "{row.Prodotto}".
                                        </p>
                                      </div>
                                      <div className="mt-4 rounded-md border overflow-hidden">
                                          <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fornitore</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Prodotto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {row[headerKey].map((supplier: any) => (
                                                    <TableRow key={supplier.id}>
                                                        <TableCell>{supplier.fornitore}</TableCell>
                                                        <TableCell>{supplier.email}</TableCell>
                                                        <TableCell>{supplier.Prodotto}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                          </Table>
                                      </div>
                                    </PopoverContent>
                                </Popover>
                            ) : headerKey === 'rdas' && Array.isArray(row[headerKey]) && row[headerKey].length > 0 ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                    <div className="p-3 w-full h-full box-border min-h-[2.5rem] flex items-center cursor-pointer hover:bg-muted/30">
                                       <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                       {getDisplayValue(row[headerKey])}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto max-w-lg">
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Associated RDAs</h4>
                                    <p className="text-sm text-muted-foreground">
                                        RDAs linked to license for "{row.Prodotto}".
                                    </p>
                                  </div>
                                  <div className="mt-4 rounded-md border overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>RDA</TableHead>
                                                <TableHead>Anno</TableHead>
                                                <TableHead>Rivenditore</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {row[headerKey].map((rda: any) => (
                                                <TableRow key={rda.id}>
                                                    <TableCell>{rda.rda}</TableCell>
                                                    <TableCell>{rda.anno}</TableCell>
                                                    <TableCell>{rda.rivenditore}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                      </Table>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                                <div
                                  className={`p-3 truncate w-full h-full box-border min-h-[2.5rem] flex items-center ${isAdmin && headerKey !== 'id' ? 'cursor-pointer hover:bg-muted/30' : 'text-muted-foreground'} ${isNotifying || headerKey === 'suppliers' || headerKey === 'rdas' ? 'cursor-not-allowed' : ''}`}
                                  title={getDisplayValue(row[headerKey])}
                                >
                                  {headerKey === 'suppliers' && <Building className="mr-2 h-4 w-4 text-muted-foreground" />}
                                  {headerKey === 'rdas' && <FileText className="mr-2 h-4 w-4 text-muted-foreground" />}
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

export default LicenseManagementPage;

    