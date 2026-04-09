import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Camera, Check, FileText, Loader2, MapPin, Package, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { createPostSchema } from '../schemas/formSchemas';

type CreatePostFormInput = z.input<typeof createPostSchema>;
type CreatePostFormOutput = z.output<typeof createPostSchema>;
type CreatePostForm = z.input<typeof createPostSchema>;

type ListFieldName = 'tasks' | 'materials';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

type FormApi = ReturnType<typeof useForm<CreatePostFormInput, undefined, CreatePostFormOutput>>;

interface UploadSectionProps {
  imagePreview: string | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

function UploadSection({ imagePreview, onImageUpload, onRemoveImage }: UploadSectionProps) {
  return (
    <Card className="p-6">
      <Label className="mb-3 block">Photo de la dégradation</Label>
      <div className="relative">
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Aperçu"
              className="h-64 w-full rounded-lg object-cover"
            />
            <Button
              type="button"
              onClick={onRemoveImage}
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2 rounded-full p-2"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <label className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Camera className="mb-3 size-12 text-muted-foreground" />
              <p className="mb-2 text-muted-foreground">
                <span className="text-primary">Cliquez pour ajouter</span> une photo
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG (MAX. 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onImageUpload}
            />
          </label>
        )}
      </div>
    </Card>
  );
}

interface PropertySectionProps {
  form: FormApi;
  onDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: () => void;
  propertyDocumentName: string | null;
}

function PropertySection({
  form,
  onDocumentUpload,
  onRemoveDocument,
  propertyDocumentName,
}: PropertySectionProps) {
  const isPrivateProperty = form.watch('isPrivateProperty');
  const isOwnProperty = form.watch('isOwnProperty');
  return (
    <Card className="p-6">
      <Label className="mb-3 block">Type de voie</Label>
      <FormField
        control={form.control}
        name="isPrivateProperty"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={field.onChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="cursor-pointer">Voie publique</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="cursor-pointer">Voie privée</Label>
                </div>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {isPrivateProperty === 'private' && (
        <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
          <Label className="block">Est-ce votre propriété ?</Label>
          <FormField
            control={form.control}
            name="isOwnProperty"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="own-yes" />
                      <Label htmlFor="own-yes" className="cursor-pointer">Oui</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="own-no" />
                      <Label htmlFor="own-no" className="cursor-pointer">Non</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          {isOwnProperty === 'yes' ? (
            <div className="mt-3">
              <Label className="mb-2 block flex items-center gap-2">
                <FileText className="size-4" />
                Document de propriété
              </Label>
              {propertyDocumentName ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{propertyDocumentName}</span>
                  <button
                    type="button"
                    onClick={onRemoveDocument}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center">
                    <FileText className="size-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour ajouter un document
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">PDF, JPG (MAX. 5MB)</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={onDocumentUpload}
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="owner-email" className="mb-2 block">
                      Email du propriétaire
                    </Label>
                    <FormControl>
                      <Input
                        id="owner-email"
                        type="email"
                        {...field}
                        value={field.value || ''}
                        placeholder="proprietaire@example.com"
                        className="bg-input-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Une alerte sera envoyée au propriétaire
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface ListSectionProps {
  title: string;
  fieldName: 'tasks' | 'materials';
  form: FormApi;
  placeholder: string;
  addLabel: string;
  icon: typeof Package;
}

function ListSection({
  title,
  fieldName,
  form,
  placeholder,
  addLabel,
  icon: Icon,
}: ListSectionProps) {
  const [newValue, setNewValue] = useState('');
  const { fields: items, append, remove } = useFieldArray({
    control: form.control,
    name: fieldName as any,
  });

  const handleAdd = () => {
    if (newValue.trim()) {
      if (fieldName === 'tasks') {
        append({ id: Date.now().toString(), title: newValue.trim() } as any);
      } else {
        append(newValue.trim() as any);
      }
      setNewValue('');
    }
  };
  return (
    <Card className="p-6">
      <Label className="mb-3 block flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        {title}
      </Label>

      {items.length > 0 && (
        <div className="space-y-2 mb-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
            >
              <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-sm flex-shrink-0">
                {index + 1}
              </div>
              <span className="flex-1">
                {fieldName === 'tasks' ? (item as any).title : (item as any)}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="bg-input-background"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newValue.trim()}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
    </Card>
  );
}

function FormActions({ onCancel, isSubmitting }: { onCancel: () => void; isSubmitting: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="flex-1 px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Création...
          </>
        ) : (
          <>
            <Check className="size-5" />
            Créer le signalement
          </>
        )}
      </button>
    </div>
  );
}

export function CreatePost() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [propertyDocumentName, setPropertyDocumentName] = useState<string | null>(null);

  const form = useForm<CreatePostFormInput, undefined, CreatePostFormOutput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      description: '',
      address: '',
      isPrivateProperty: 'public',
      isOwnProperty: 'yes',
      propertyDocument: undefined,
      ownerEmail: '',
      tasks: [],
      materials: [],
    },
  });

  const isAllowedImageFile = (file: File) =>
    file.type.startsWith('image/') && file.size <= MAX_UPLOAD_SIZE;

  const isAllowedDocumentFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    return allowedTypes.includes(file.type) && file.size <= MAX_UPLOAD_SIZE;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isAllowedImageFile(file)) {
      toast.error('Veuillez sélectionner une image PNG ou JPG de moins de 5 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isAllowedDocumentFile(file)) {
      toast.error('Veuillez sélectionner un document PDF, JPG ou PNG de moins de 5 Mo');
      return;
    }

    setPropertyDocumentName(file.name);
    form.setValue('propertyDocument', file.name);
    toast.success(`Document "${file.name}" ajouté`);
  };

  const onSubmit = (_data: CreatePostFormOutput) => {
    // Mock submission
    toast.success('Signalement créé avec succès ! 🎉');
    
    // Navigate back to map after a short delay
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="mb-2">Nouveau signalement</h1>
          <p className="text-muted-foreground">
            Aidez à embellir votre ville en signalant les dégradations
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <UploadSection
              imagePreview={imagePreview}
              onImageUpload={handleImageUpload}
              onRemoveImage={() => setImagePreview(null)}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <Card className="p-6">
                  <FormItem>
                    <Label htmlFor="title" className="mb-3 block">
                      Titre du signalement
                    </Label>
                    <FormControl>
                      <Input
                        id="title"
                        {...field}
                        placeholder="Ex: Nid-de-poule rue Victor Hugo"
                        className="bg-input-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </Card>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <Card className="p-6">
                  <FormItem>
                    <Label htmlFor="description" className="mb-3 block">
                      Description
                    </Label>
                    <FormControl>
                      <Textarea
                        id="description"
                        {...field}
                        placeholder="Décrivez la dégradation en détail..."
                        rows={4}
                        className="bg-input-background resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </Card>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <Card className="p-6">
                  <FormItem>
                    <Label htmlFor="address" className="mb-3 block flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      Localisation
                    </Label>
                    <FormControl>
                      <Input
                        id="address"
                        {...field}
                        placeholder="Adresse ou lieu précis"
                        className="bg-input-background"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-2">
                      Soyez le plus précis possible pour faciliter l'intervention
                    </p>
                  </FormItem>
                </Card>
              )}
            />

            <PropertySection
              form={form}
              onDocumentUpload={handleDocumentUpload}
              onRemoveDocument={() => {
                setPropertyDocumentName(null);
                form.setValue('propertyDocument', undefined);
              }}
              propertyDocumentName={propertyDocumentName}
            />

            <ListSection
              title="Tâches à effectuer"
              fieldName="tasks"
              form={form}
              placeholder="Ajouter une tâche..."
              addLabel="Ajouter"
              icon={Package}
            />

            <ListSection
              title="Matériel nécessaire"
              fieldName="materials"
              form={form}
              placeholder="Ex: Bitume, Peinture..."
              addLabel="Ajouter"
              icon={Package}
            />

            <FormActions 
              onCancel={() => navigate('/')} 
              isSubmitting={form.formState.isSubmitting}
            />
          </form>
        </Form>
      </div>
    </div>
  );
}