import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, LogOut, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { getUserProfile, signOut, updateUserProfile } from '../services/authService';
import { settingsFormSchema } from '../schemas/formSchemas';
import { isAllowedImageFile, uploadToBucket } from '../lib/storage';
import { searchAddress, type GeocodeResult } from '../lib/geocode';
import { z } from 'zod';

const ADDRESS_SEARCH_DEBOUNCE_MS = 400;

export function Settings() {
  const navigate = useNavigate();
  const { user } = useUser();

  const form = useForm<z.input<typeof settingsFormSchema>, undefined, z.output<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: '',
      address: '',
      city: '',
      avatar: user?.avatar ?? '',
      emailNotifications: true,
      profileVisible: false,
    },
    mode: 'onBlur',
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const addressSearchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    getUserProfile(user.id)
      .then((profile) => {
        if (!profile) return;
        form.reset({
          name: profile.name ?? user.name ?? '',
          email: user.email ?? '',
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          avatar: profile.avatar ?? user.avatar ?? '',
          emailNotifications: profile.emailNotifications ?? true,
          profileVisible: profile.profileVisible ?? false,
        });
      })
      .finally(() => setProfileLoading(false));
    // `user.id` on purpose: `user` gets a new object reference on every
    // auth-state event (token refresh, initial session), which would
    // otherwise re-run this fetch and reset mid-edit, silently discarding
    // whatever the visitor just toggled. `form` is stable (react-hook-form
    // guarantees it) so including it never causes extra runs.
  }, [user?.id, form]);

  useEffect(() => {
    return () => clearTimeout(addressSearchTimeout.current);
  }, []);

  if (!user) return null;

  if (profileLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="mb-2">Chargement des paramètres</h2>
          <p className="text-sm text-muted-foreground">Récupération de votre profil.</p>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: z.output<typeof settingsFormSchema>) => {
    try {
      const avatar = avatarFile ? await uploadToBucket('avatars', user.id, avatarFile) : data.avatar;

      await updateUserProfile(user.id, {
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        // Coordonnées mises à jour seulement si l'adresse a été rechangée cette
        // session (nouvelle suggestion choisie) — sinon on ne touche pas aux
        // coordonnées existantes, déjà cohérentes avec la ville affichée.
        ...(selectedLocation ? { cityLat: selectedLocation.lat, cityLng: selectedLocation.lng } : {}),
        avatar,
        emailNotifications: data.emailNotifications,
        profileVisible: data.profileVisible,
      });
      toast.success('Informations mises à jour avec succès !');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImageFile(file)) {
      toast.error('Veuillez sélectionner une image PNG ou JPG de moins de 5 Mo');
      return;
    }

    setAvatarFile(file);
    onChange(URL.createObjectURL(file));
  };

  const handleAddressChange = (value: string) => {
    setSelectedLocation(null);
    clearTimeout(addressSearchTimeout.current);

    addressSearchTimeout.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setAddressSuggestions(results);
      setSuggestionsOpen(results.length > 0);
    }, ADDRESS_SEARCH_DEBOUNCE_MS);
  };

  const handleAddressSelect = (suggestion: GeocodeResult, onChangeAddress: (value: string) => void) => {
    onChangeAddress(suggestion.label);
    form.setValue('city', suggestion.city ?? '');
    setSelectedLocation({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestionsOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => navigate('/profile')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              aria-label="Retour au profil"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1>Paramètres</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <Card className="p-6">
                  <h2 className="mb-4">Photo de profil</h2>
                  <div className="flex items-center gap-4">
                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl overflow-hidden">
                      {field.value ? (
                        <img src={field.value} alt="" className="size-full object-cover" />
                      ) : (
                        user.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(e) => handleAvatarUpload(e, field.onChange)}
                        className="hidden"
                        aria-label="Changer la photo de profil"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        Changer la photo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG ou PNG (max. 5MB)
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            />

            <Card className="p-6">
              <h2 className="mb-4">Informations personnelles</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <User className="size-4 text-primary" />
                        Nom complet
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-input-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Mail className="size-4 text-primary" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="email" disabled className="bg-input-background" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Géré depuis l'authentification, non modifiable ici.</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Phone className="size-4 text-primary" />
                        Téléphone
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" className="bg-input-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <MapPin className="size-4 text-primary" />
                        Adresse
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleAddressChange(e.target.value);
                            }}
                            onFocus={() => setSuggestionsOpen(addressSuggestions.length > 0)}
                            onBlur={() => {
                              field.onBlur();
                              setTimeout(() => setSuggestionsOpen(false), 150);
                            }}
                            placeholder="Rechercher une adresse, une rue ou un lieu..."
                            className="bg-input-background"
                            autoComplete="off"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={suggestionsOpen}
                            aria-controls="settings-address-suggestions"
                          />
                        </FormControl>
                        {suggestionsOpen && addressSuggestions.length > 0 && (
                          <ul
                            id="settings-address-suggestions"
                            role="listbox"
                            aria-label="Suggestions d'adresse"
                            className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg"
                          >
                            {addressSuggestions.map((suggestion, index) => (
                              <li key={`${suggestion.lat}-${suggestion.lng}-${index}`} role="option" aria-selected={false}>
                                <button
                                  type="button"
                                  onMouseDown={() => handleAddressSelect(suggestion, field.onChange)}
                                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                >
                                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                  {suggestion.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <MapPin className="size-4 text-primary" />
                        Ville
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-input-background" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Déduite de l'adresse choisie ci-dessus.
                      </p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4">Confidentialité</h2>
              <FormField
                control={form.control}
                name="profileVisible"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium">
                          Visibilité du profil
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rendre votre profil public : nom, ville, signalements et votes visibles
                          par les autres membres (jamais votre téléphone ni votre adresse).
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    {field.value && (
                      <Link
                        to={`/user/${user.id}`}
                        className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
                      >
                        <ExternalLink className="size-3.5" />
                        Voir mon profil public
                      </Link>
                    )}
                  </FormItem>
                )}
              />
            </Card>

            <Card className="p-6">
              <h2 className="mb-4">Notifications (à venir)</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailNotifications"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium">
                          Notifications par email
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recevoir des mises à jour sur vos signalements
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} disabled onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              {form.formState.isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="size-5" />
                  Enregistrer les modifications
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="size-5" />
              Se déconnecter
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-1">
              {import.meta.env.VITE_APP_VERSION ?? 'dev'}
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
