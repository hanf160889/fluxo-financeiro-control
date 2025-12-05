import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SettingsItem {
  id: string;
  name: string;
}

interface SettingsListCardProps {
  title: string;
  placeholder: string;
  items: SettingsItem[] | undefined;
  isLoading: boolean;
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isAdding?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function SettingsListCard({
  title,
  placeholder,
  items,
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
  isAdding,
  canEdit = true,
  canDelete = true,
}: SettingsListCardProps) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue.trim());
      setNewValue('');
    }
  };

  const handleStartEdit = (item: SettingsItem) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingValue.trim()) {
      onUpdate(editingId, editingValue.trim());
      setEditingId(null);
      setEditingValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={isAdding || !newValue.trim()}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : items?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum item cadastrado
            </p>
          ) : (
            items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                {editingId === item.id ? (
                  <>
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 mr-2"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{item.name}</span>
                    <div className="flex gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
