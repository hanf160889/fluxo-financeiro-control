import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileAttachmentFieldProps {
  attachmentUrl: string | null;
  attachmentName: string | null;
  onAttachmentChange: (url: string | null, name: string | null) => void;
  folder: string;
  label?: string;
  previousUrl?: string | null;
  inputId?: string;
}

const FileAttachmentField = ({
  attachmentUrl,
  attachmentName,
  onAttachmentChange,
  folder,
  label = 'Comprovante',
  previousUrl,
  inputId = 'file-attachment',
}: FileAttachmentFieldProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const deleteFileFromWasabi = async (url: string) => {
    try {
      console.log('Deleting file from Wasabi:', url);
      const { error } = await supabase.functions.invoke('delete-from-wasabi', {
        body: JSON.stringify({ fileUrl: url }),
      });
      if (error) {
        console.error('Error deleting file:', error);
      }
    } catch (error) {
      console.error('Error deleting file from Wasabi:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);

      try {
        // If there's a previous URL, delete the old file
        const urlToDelete = previousUrl || attachmentUrl;
        if (urlToDelete) {
          await deleteFileFromWasabi(urlToDelete);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const { data, error } = await supabase.functions.invoke('upload-to-wasabi', {
          body: formData,
        });

        if (error) throw error;

        if (data.success) {
          onAttachmentChange(data.url, file.name);
          toast.success('Arquivo enviado com sucesso!');
        } else {
          throw new Error(data.error || 'Erro ao enviar arquivo');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar arquivo';
        toast.error(errorMessage);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveFile = async () => {
    // Delete the current file from Wasabi
    if (attachmentUrl) {
      await deleteFileFromWasabi(attachmentUrl);
    }
    onAttachmentChange(null, null);
  };

  const handleViewFile = async () => {
    if (!attachmentUrl) return;
    
    try {
      // Extract file key from URL
      const urlParts = attachmentUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes('.s3.'));
      const fileKey = urlParts.slice(bucketIndex + 1).join('/');

      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: JSON.stringify({ fileKey }),
      });

      if (error) throw error;
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
      // Fallback: try to open the direct URL
      window.open(attachmentUrl, '_blank');
    }
  };

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {attachmentUrl || attachmentName ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-sm flex-1 truncate">{attachmentName}</span>
          )}
          {attachmentUrl && !isUploading && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleViewFile}
              className="text-primary h-auto p-0"
            >
              Ver
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            className="h-8 w-8"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-2 pb-3">
              {isUploading ? (
                <Loader2 className="h-6 w-6 mb-2 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {isUploading ? 'Enviando...' : 'Clique para anexar arquivo'}
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default FileAttachmentField;
