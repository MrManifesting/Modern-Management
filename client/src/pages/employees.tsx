import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequestSimple, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, CheckCircle, AlertCircle, Activity, Package, Search, Users } from "lucide-react";
import type { Employee, InventoryAction } from "@shared/schema";

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    role: "inventory",
    department: "warehouse",
    active: true,
    pin: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });
  
  const { data: employeeActions = [], isLoading: isLoadingActions } = useQuery({
    queryKey: ["/api/employees", selectedEmployee?.id, "inventory-actions"],
    queryFn: () => 
      selectedEmployee 
        ? apiRequestSimple<InventoryAction[]>(`/api/employees/${selectedEmployee.id}/inventory-actions`) 
        : Promise.resolve([]),
    enabled: !!selectedEmployee
  });
  
  const createEmployee = useMutation({
    mutationFn: (data: typeof employeeFormData) => 
      apiRequestSimple<Employee>("/api/employees", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEmployeeFormOpen(false);
      setEmployeeFormData({
        employeeId: "",
        name: "",
        email: "",
        role: "inventory",
        department: "warehouse",
        active: true,
        pin: ""
      });
      toast({
        title: "Employee created",
        description: "The employee has been successfully created."
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating employee",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateEmployee = useMutation({
    mutationFn: (data: { id: number; data: Partial<typeof employeeFormData> }) => 
      apiRequestSimple<Employee>(`/api/employees/${data.id}`, {
        method: "PATCH", 
        body: JSON.stringify(data.data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEmployeeFormOpen(false);
      setIsEditing(false);
      toast({
        title: "Employee updated",
        description: "The employee has been successfully updated."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating employee",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const deleteEmployee = useMutation({
    mutationFn: (id: number) => 
      apiRequestSimple<{success: boolean}>(`/api/employees/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (selectedEmployee) {
        setSelectedEmployee(null);
      }
      toast({
        title: "Employee deleted",
        description: "The employee has been successfully removed."
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting employee",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
  };
  
  const handleCreateEmployee = () => {
    createEmployee.mutate(employeeFormData);
  };
  
  const handleUpdateEmployee = () => {
    if (!selectedEmployee) return;
    updateEmployee.mutate({ 
      id: selectedEmployee.id, 
      data: employeeFormData 
    });
  };
  
  const handleDeleteEmployee = (id: number) => {
    if (confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      deleteEmployee.mutate(id);
    }
  };
  
  const openEditForm = (employee: Employee) => {
    setEmployeeFormData({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      active: employee.active,
      pin: employee.pin || ""
    });
    setIsEditing(true);
    setEmployeeFormOpen(true);
  };
  
  const openCreateForm = () => {
    setEmployeeFormData({
      employeeId: "",
      name: "",
      email: "",
      role: "inventory",
      department: "warehouse",
      active: true,
      pin: ""
    });
    setIsEditing(false);
    setEmployeeFormOpen(true);
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "add":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Added Stock</Badge>;
      case "remove":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Removed Stock</Badge>;
      case "check":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Inventory Check</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };
  
  return (
    <div className="container py-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Employee Management</h1>
        </div>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          Add New Employee
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 order-2 lg:order-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Employees</CardTitle>
            <CardDescription>
              Manage your team members and track inventory handling
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="py-4 text-center">Loading employees...</div>
            ) : (
              <>
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p>No employees found.</p>
                    <p className="text-sm">Add your first employee to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div 
                        key={employee.id}
                        className={`p-3 border rounded-md flex flex-col sm:flex-row sm:justify-between gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                          selectedEmployee?.id === employee.id ? "bg-accent/70 border-primary/30" : ""
                        }`}
                        onClick={() => handleEmployeeSelect(employee)}
                      >
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {employee.employeeId} - {employee.role}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:space-x-2">
                          {employee.active ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800">Inactive</Badge>
                          )}
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(employee);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEmployee(employee.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 order-1 lg:order-2">
          {selectedEmployee ? (
            <Tabs defaultValue="details">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <CardTitle>{selectedEmployee.name}</CardTitle>
                    <CardDescription>ID: {selectedEmployee.employeeId}</CardDescription>
                  </div>
                  <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              
              <CardContent>
                <TabsContent value="details" className="mt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Employee ID</Label>
                        <div className="font-medium">{selectedEmployee.employeeId}</div>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <div className="font-medium">{selectedEmployee.name}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <div className="font-medium break-words">{selectedEmployee.email}</div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <div className="font-medium">
                          {selectedEmployee.active ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="mr-1 h-4 w-4" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="mr-1 h-4 w-4" /> Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Role</Label>
                        <div className="font-medium">{selectedEmployee.role}</div>
                      </div>
                      <div>
                        <Label>Department</Label>
                        <div className="font-medium">{selectedEmployee.department}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Created</Label>
                        <div className="font-medium">
                          {new Date(selectedEmployee.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <Label>Last Updated</Label>
                        <div className="font-medium">
                          {new Date(selectedEmployee.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-2 mt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => openEditForm(selectedEmployee)}
                        className="w-full sm:w-auto"
                      >
                        Edit Employee
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                        className="w-full sm:w-auto"
                      >
                        Delete Employee
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="activity" className="mt-0">
                  {isLoadingActions ? (
                    <div className="py-4 text-center">Loading activity history...</div>
                  ) : (
                    <>
                      {employeeActions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                          <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
                          <p>No activity history found.</p>
                          <p className="text-sm">This employee hasn't performed any inventory actions yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Item ID</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employeeActions.map((action) => (
                                <TableRow key={action.id}>
                                  <TableCell>
                                    {formatTimestamp(action.timestamp)}
                                  </TableCell>
                                  <TableCell>
                                    {getActionTypeLabel(action.actionType)}
                                  </TableCell>
                                  <TableCell>{action.itemId}</TableCell>
                                  <TableCell>{action.quantity !== null ? action.quantity : "N/A"}</TableCell>
                                  <TableCell>{action.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
              <Users className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <CardTitle className="mb-2">Employee Details</CardTitle>
              <CardDescription className="max-w-md">
                Select an employee from the list to view their details and activity history.
              </CardDescription>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={openCreateForm}
              >
                Add New Employee
              </Button>
            </div>
          )}
        </Card>
      </div>
      
      <Dialog open={employeeFormOpen} onOpenChange={setEmployeeFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update the employee information in the form below." 
                : "Fill in the employee details to add them to the system."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input 
                  id="employeeId"
                  value={employeeFormData.employeeId}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    employeeId: e.target.value
                  })}
                  placeholder="EMP001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    name: e.target.value
                  })}
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={employeeFormData.email}
                onChange={(e) => setEmployeeFormData({
                  ...employeeFormData,
                  email: e.target.value
                })}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={employeeFormData.role} 
                  onValueChange={(value) => setEmployeeFormData({
                    ...employeeFormData,
                    role: value
                  })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={employeeFormData.department} 
                  onValueChange={(value) => setEmployeeFormData({
                    ...employeeFormData,
                    department: value
                  })}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code (Optional)</Label>
                <Input 
                  id="pin"
                  type="password"
                  value={employeeFormData.pin}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    pin: e.target.value
                  })}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                />
              </div>
              <div className="flex items-center space-x-2 h-full pt-8">
                <Switch 
                  id="active" 
                  checked={employeeFormData.active}
                  onCheckedChange={(checked) => setEmployeeFormData({
                    ...employeeFormData,
                    active: checked
                  })}
                />
                <Label htmlFor="active">Active Employee</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setEmployeeFormOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditing ? handleUpdateEmployee : handleCreateEmployee}
              disabled={
                !employeeFormData.employeeId ||
                !employeeFormData.name ||
                !employeeFormData.email
              }
              className="w-full sm:w-auto"
            >
              {isEditing ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}