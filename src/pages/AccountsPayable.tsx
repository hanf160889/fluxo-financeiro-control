import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Download, FileText, Check, Pencil, Paperclip, Trash2, Loader2, X } from "lucide-react";
import NewAccountPayableModal from "@/components/forms/NewAccountPayableModal";
import EditAccountPayableModal from "@/components/forms/EditAccountPayableModal";
import { useAccountsPayable, AccountPayable } from "@/hooks/useAccountsPayable";
import { useSuppliers } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountsPayablePage = () => {
  const { items, loading, fetchItems, addItem, markAsPaid, deleteItem } = useAccountsPayable();
  const { items: suppliers } = useSuppliers();
  const { role } = useAuth();

  const [filterSupplier, setFilterSupplier] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<AccountPayable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [itemToPay, setItemToPay] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = role === "admin" || role === "editor";
  const canDelete = role === "admin";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const handleFilter = () => {
    fetchItems(startDate || undefined, endDate || undefined, filterSupplier);
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterSupplier("all");
    fetchItems();
    setSelectedIds([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBatchDelete = async () => {
    setDeleting(true);
    try {
      // Delete cost center distributions first
      const { error: ccError } = await supabase
        .from("accounts_payable_cost_centers")
        .delete()
        .in("account_payable_id", selectedIds);

      if (ccError) throw ccError;

      // Delete accounts payable
      const { error } = await supabase.from("accounts_payable").delete().in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} conta(s) excluída(s) com sucesso!`);
      setSelectedIds([]);
      fetchItems();
    } catch (error: any) {
      toast.error("Erro ao excluir contas");
      console.error("Error batch deleting:", error);
    } finally {
      setDeleting(false);
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleMarkAsPaid = (id: string) => {
    setItemToPay(id);
    setPayDialogOpen(true);
  };

  const confirmMarkAsPaid = () => {
    if (itemToPay) {
      markAsPaid(itemToPay, new Date().toISOString().split("T")[0]);
      setPayDialogOpen(false);
      setItemToPay(null);
    }
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleEdit = (item: AccountPayable) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleViewAttachment = async (url: string) => {
    try {
      // Extract the file key from the URL
      const urlObj = new URL(url);
      const fileKey = urlObj.pathname.substring(1); // Remove leading slash

      toast.loading("Carregando comprovante...", { id: "loading-attachment" });

      const { data, error } = await supabase.functions.invoke("get-signed-url", {
        body: { fileKey },
      });

      toast.dismiss("loading-attachment");

      if (error || !data?.success) {
        throw new Error(data?.error || "Erro ao gerar URL");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast.error("Erro ao abrir comprovante");
    }
  };

  const handleExportExcel = () => {
    const dateRange = startDate || endDate ? `_${startDate || "inicio"}_${endDate || "fim"}` : "";
    exportToExcel(items, `contas-a-pagar${dateRange}`);
  };

  const handleExportPDF = () => {
    const dateRange = startDate || endDate ? `_${startDate || "inicio"}_${endDate || "fim"}` : "";
    exportToPDF(items, `contas-a-pagar${dateRange}`);
  };

  const getInstallmentText = (item: AccountPayable) => {
    if (item.total_installments && item.total_installments > 1) {
      return `${item.current_installment} de ${item.total_installments}`;
    }
    return "-";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas pendentes</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            {canEdit && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="date"
                  placeholder="Data inicial"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  placeholder="Data final"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos fornecedores</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleFilter}>Filtrar</Button>
              {(startDate || endDate || filterSupplier !== "all") && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista de Contas</CardTitle>
            {selectedIds.length > 0 && canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setBatchDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selectedIds.length})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma conta pendente</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canDelete && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.length === items.length && items.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>N° Doc</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        {canDelete && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.supplier?.name || "-"}</TableCell>
                        <TableCell>{item.category?.name || "-"}</TableCell>
                        <TableCell>{item.document_number || "-"}</TableCell>
                        <TableCell>{formatDate(item.due_date)}</TableCell>
                        <TableCell>{getInstallmentText(item)}</TableCell>
                        <TableCell>{item.payment_date ? formatDate(item.payment_date) : "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_paid ? "default" : "destructive"}>
                            {item.is_paid ? "Paga" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!item.is_paid && canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Marcar como paga"
                                onClick={() => handleMarkAsPaid(item.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {item.attachment_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver comprovante"
                                onClick={() => handleViewAttachment(item.attachment_url!)}
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <NewAccountPayableModal open={isModalOpen} onOpenChange={setIsModalOpen} onSubmit={addItem} />

        <EditAccountPayableModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          item={itemToEdit}
          onSave={() => fetchItems()}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pay Confirmation Dialog */}
        <AlertDialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
              <AlertDialogDescription>Deseja marcar esta conta como paga com a data de hoje?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmMarkAsPaid}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Delete Confirmation Dialog */}
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedIds.length} conta(s)? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBatchDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AccountsPayablePage;
