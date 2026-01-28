import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Image } from 'lucide-react';

interface ExamImageUploadProps {
  onImageUploaded: (imageItem: {
    id: string;
    item_type: 'image';
    text: string;
    assets: Array<{ type: string; url: string; alt: string }>;
    order: number;
    isUploading?: boolean;
  }) => void;
  onUploadComplete?: (id: string, url: string) => void;
  currentOrder: number;
}

const generateId = () => `img_${Math.random().toString(36).substr(2, 9)}`;

export function ExamImageUpload({ onImageUploaded, onUploadComplete, currentOrder }: ExamImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    const imageId = generateId();

    // Create placeholder item with loading state
    const placeholderItem = {
      id: imageId,
      item_type: 'image' as const,
      text: `Figure ${currentOrder}`,
      assets: [
        {
          type: 'image',
          url: '', // Empty during upload
          alt: 'Exam figure',
        },
      ],
      order: currentOrder,
      isUploading: true,
    };

    // Immediately add placeholder to show skeleton
    onImageUploaded(placeholderItem);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Upload in background
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName);

      // Notify parent of completed upload
      onUploadComplete?.(imageId, urlData.publicUrl);

      toast({
        title: 'Image uploaded',
        description: 'The image has been added to the exam content',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" size="sm" className="gap-2" onClick={handleButtonClick}>
        <Image className="h-4 w-4" />
        Add Image
      </Button>
    </>
  );
}
