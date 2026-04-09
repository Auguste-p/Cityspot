import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Camera, MapPin, Plus, X, Check, Package, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TaskInput {
  id: string;
  title: string;
}

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

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
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={onRemoveImage}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-full hover:bg-destructive/90 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Camera className="size-12 text-muted-foreground mb-3" />
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
  isPrivateProperty: 'public' | 'private';
  setIsPrivateProperty: (value: 'public' | 'private') => void;
  isOwnProperty: 'yes' | 'no';
  setIsOwnProperty: (value: 'yes' | 'no') => void;
  propertyDocument: string | null;
  onDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: () => void;
  ownerEmail: string;
  setOwnerEmail: (value: string) => void;
}

function PropertySection({
  isPrivateProperty,
  setIsPrivateProperty,
  isOwnProperty,
  setIsOwnProperty,
  propertyDocument,
  onDocumentUpload,
  onRemoveDocument,
  ownerEmail,
  setOwnerEmail,
}: PropertySectionProps) {
  return (
    <Card className="p-6">
      <Label className="mb-3 block">Type de voie</Label>
      <RadioGroup
        value={isPrivateProperty}
        onValueChange={(value: 'public' | 'private') => setIsPrivateProperty(value)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="public" id="public" />
          <Label htmlFor="public" className="cursor-pointer">Voie publique</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="private" id="private" />
          <Label htmlFor="private" className="cursor-pointer">Voie privée</Label>
        </div>
      </RadioGroup>

      {isPrivateProperty === 'private' && (
        <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
          <Label className="block">Est-ce votre propriété ?</Label>
          <RadioGroup
            value={isOwnProperty}
            onValueChange={(value: 'yes' | 'no') => setIsOwnProperty(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="own-yes" />
              <Label htmlFor="own-yes" className="cursor-pointer">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="own-no" />
              <Label htmlFor="own-no" className="cursor-pointer">Non</Label>
            </div>
          </RadioGroup>

          {isOwnProperty === 'yes' ? (
            <div className="mt-3">
              <Label className="mb-2 block flex items-center gap-2">
                <FileText className="size-4" />
                Document de propriété
              </Label>
              {propertyDocument ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{propertyDocument}</span>
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
              <Label htmlFor="owner-email" className="mb-2 block">
                Email du propriétaire
              </Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="proprietaire@example.com"
                className="bg-input-background"
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

interface SimpleTask {
  id: string;
  title: string;
}

interface ListSectionProps {
  title: string;
  items: SimpleTask[];
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  placeholder: string;
  addLabel: string;
  icon: typeof Package;
}

function ListSection({
  title,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
  placeholder,
  addLabel,
  icon: Icon,
}: ListSectionProps) {
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
              <span className="flex-1">{item.title}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
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
          onChange={(e) => onNewValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="bg-input-background"
        />
        <button
          type="button"
          onClick={onAdd}
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

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
      >
        Annuler
      </button>
      <button
        type="submit"
        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <Check className="size-5" />
        Créer le signalement
      </button>
    </div>
  );
}

export function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [tasks, setTasks] = useState<TaskInput[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [materials, setMaterials] = useState<string[]>([]);
  const [newMaterial, setNewMaterial] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPrivateProperty, setIsPrivateProperty] = useState<'public' | 'private'>('public');
  const [isOwnProperty, setIsOwnProperty] = useState<'yes' | 'no'>('yes');
  const [propertyDocument, setPropertyDocument] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

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

    setPropertyDocument(file.name);
    toast.success(`Document "${file.name}" ajouté`);
  };

  const addTask = () => {
    if (newTaskTitle.trim()) {
      setTasks((currentTasks) => [
        ...currentTasks,
        { id: Date.now().toString(), title: newTaskTitle.trim() },
      ]);
      setNewTaskTitle('');
    }
  };

  const removeTask = (id: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials((currentMaterials) => [...currentMaterials, newMaterial.trim()]);
      setNewMaterial('');
    }
  };

  const removeMaterial = (index: number) => {
    setMaterials((currentMaterials) => currentMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }
    
    if (!address.trim()) {
      toast.error('Veuillez entrer une adresse');
      return;
    }

    if (isPrivateProperty === 'private' && isOwnProperty === 'no' && !ownerEmail.trim()) {
      toast.error('Veuillez entrer l\'email du propriétaire');
      return;
    }

    if (isPrivateProperty === 'private' && isOwnProperty === 'no' && !isValidEmail(ownerEmail.trim())) {
      toast.error('Veuillez entrer un email valide pour le propriétaire');
      return;
    }

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

        <form onSubmit={handleSubmit} className="space-y-6">
          <UploadSection
            imagePreview={imagePreview}
            onImageUpload={handleImageUpload}
            onRemoveImage={() => setImagePreview(null)}
          />

          <Card className="p-6">
            <Label htmlFor="title" className="mb-3 block">
              Titre du signalement
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nid-de-poule rue Victor Hugo"
              className="bg-input-background"
            />
          </Card>

          <Card className="p-6">
            <Label htmlFor="description" className="mb-3 block">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez la dégradation en détail..."
              rows={4}
              className="bg-input-background resize-none"
            />
          </Card>

          <Card className="p-6">
            <Label htmlFor="address" className="mb-3 block flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Localisation
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse ou lieu précis"
              className="bg-input-background"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Soyez le plus précis possible pour faciliter l'intervention
            </p>
          </Card>

          <PropertySection
            isPrivateProperty={isPrivateProperty}
            setIsPrivateProperty={setIsPrivateProperty}
            isOwnProperty={isOwnProperty}
            setIsOwnProperty={setIsOwnProperty}
            propertyDocument={propertyDocument}
            onDocumentUpload={handleDocumentUpload}
            onRemoveDocument={() => setPropertyDocument(null)}
            ownerEmail={ownerEmail}
            setOwnerEmail={setOwnerEmail}
          />

          <ListSection
            title="Tâches à effectuer"
            items={tasks}
            newValue={newTaskTitle}
            onNewValueChange={setNewTaskTitle}
            onAdd={addTask}
            onRemove={removeTask}
            placeholder="Ajouter une tâche..."
            addLabel="Ajouter"
            icon={Package}
          />

          <ListSection
            title="Matériel nécessaire"
            items={materials.map((material, index) => ({ id: index.toString(), title: material }))}
            newValue={newMaterial}
            onNewValueChange={setNewMaterial}
            onAdd={addMaterial}
            onRemove={(id) => removeMaterial(Number(id))}
            placeholder="Ex: Bitume, Peinture..."
            addLabel="Ajouter"
            icon={Package}
          />

          <FormActions onCancel={() => navigate('/')} />
        </form>
      </div>
    </div>
  );
}