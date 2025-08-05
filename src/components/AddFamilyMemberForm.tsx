import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { familyMemberSchema, fileUploadSchema, sanitizeFileName } from '@/lib/validation';
import { auditLog, handleSecureError, validateFileContent } from '@/lib/security';

interface AddFamilyMemberFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'aunt_uncle', label: 'Aunt/Uncle' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'child', label: 'Child' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

export const AddFamilyMemberForm = ({ onSuccess, onCancel }: AddFamilyMemberFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    birth_date: '',
    bio: '',
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file before processing
      const fileValidation = fileUploadSchema.safeParse({
        filename: file.name,
        size: file.size,
        type: file.type
      });

      if (!fileValidation.success) {
        setError(fileValidation.error.errors[0].message);
        return;
      }

      // Validate file content for security
      const contentValidation = await validateFileContent(file);
      if (!contentValidation.isValid) {
        setError(contentValidation.error || 'Invalid file content');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(''); // Clear any previous errors
    }
  };

  const uploadPhoto = async (file: File, familyMemberId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedFileName = sanitizeFileName(`${familyMemberId}.${fileExt}`);
      const fileName = `${user?.id}/${sanitizedFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('family-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('family-photos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Photo upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Validate input data with new schema
      const validationResult = familyMemberSchema.safeParse({
        name: formData.name,
        relationship: formData.relationship || undefined,
        birth_date: formData.birth_date || undefined,
        bio: formData.bio || undefined
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      // Create the family member record
      const { data: familyMember, error: insertError } = await supabase
        .from('family_members')
        .insert({
          user_id: user.id,
          name: formData.name,
          relationship: formData.relationship as any,
          birth_date: formData.birth_date || null,
          bio: formData.bio,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Upload photo if provided
      let photoUrl = null;
      if (photoFile && familyMember) {
        photoUrl = await uploadPhoto(photoFile, familyMember.id);
        
        if (photoUrl) {
          // Update the family member with photo URL
          const { error: updateError } = await supabase
            .from('family_members')
            .update({ photo_url: photoUrl })
            .eq('id', familyMember.id);

          if (updateError) {
            console.error('Error updating photo URL:', updateError);
          }
        }
      }

      // Audit log the action
      await auditLog('family_member_added', user.id, { 
        name: formData.name, 
        relationship: formData.relationship 
      });

      toast({
        title: 'Family member added!',
        description: `${formData.name} has been added to your family.`,
      });

      // Reset form
      setFormData({ name: '', relationship: '', birth_date: '', bio: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding family member:', error);
      const secureError = handleSecureError(error);
      setError(secureError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Add Family Member
        </CardTitle>
        <CardDescription>
          Add a new family member to start recording their stories
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo (Optional)</Label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </div>
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select
              value={formData.relationship}
              onValueChange={(value) => setFormData({ ...formData, relationship: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birth_date">Birth Date (Optional)</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about this family member..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Family Member
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};