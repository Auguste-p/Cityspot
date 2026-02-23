import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Camera, MapPin, Plus, X, Check, Package, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TaskInput {
  id: string;
  title: string;
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPropertyDocument(file.name);
      toast.success(`Document "${file.name}" ajouté`);
    }
  };

  const addTask = () => {
    if (newTaskTitle.trim()) {
      setTasks([...tasks, { id: Date.now().toString(), title: newTaskTitle.trim() }]);
      setNewTaskTitle('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials([...materials, newMaterial.trim()]);
      setNewMaterial('');
    }
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
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
          {/* Photo Upload */}
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
                    onClick={() => setImagePreview(null)}
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
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </Card>

          {/* Title */}
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

          {/* Description */}
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

          {/* Location */}
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

          {/* Property Type */}
          <Card className="p-6">
            <Label className="mb-3 block">Type de voie</Label>
            <RadioGroup value={isPrivateProperty} onValueChange={(value: 'public' | 'private') => setIsPrivateProperty(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">Voie publique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">Voie privée</Label>
              </div>
            </RadioGroup>

            {/* Private Property Details */}
            {isPrivateProperty === 'private' && (
              <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
                <Label className="block">Est-ce votre propriété ?</Label>
                <RadioGroup value={isOwnProperty} onValueChange={(value: 'yes' | 'no') => setIsOwnProperty(value)}>
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
                          onClick={() => setPropertyDocument(null)}
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
                          onChange={handleDocumentUpload}
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

          {/* Tasks */}
          <Card className="p-6">
            <Label className="mb-3 block">Tâches à effectuer</Label>
            
            {/* Task List */}
            {tasks.length > 0 && (
              <div className="space-y-2 mb-4">
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                  >
                    <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="flex-1">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Input */}
            <div className="flex gap-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTask();
                  }
                }}
                placeholder="Ajouter une tâche..."
                className="bg-input-background"
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="size-4" />
                Ajouter
              </button>
            </div>
          </Card>

          {/* Materials */}
          <Card className="p-6">
            <Label className="mb-3 block flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Matériel nécessaire
            </Label>
            
            {/* Materials List */}
            {materials.length > 0 && (
              <div className="space-y-2 mb-4">
                {materials.map((material, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                  >
                    <Package className="size-4 text-primary flex-shrink-0" />
                    <span className="flex-1">{material}</span>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Material Input */}
            <div className="flex gap-2">
              <Input
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMaterial();
                  }
                }}
                placeholder="Ex: Bitume, Peinture..."
                className="bg-input-background"
              />
              <button
                type="button"
                onClick={addMaterial}
                disabled={!newMaterial.trim()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="size-4" />
                Ajouter
              </button>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
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
        </form>
      </div>
    </div>
  );
}