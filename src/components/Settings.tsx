import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { getUserProfile, signOut, updateUserProfile } from '../services/authService';
import { settingsFormSchema } from '../schemas/formSchemas';
import { z } from 'zod';

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
      avatar: user?.avatar ?? '',
      emailNotifications: true,
      profileVisible: false,
    },
    mode: 'onBlur',
  });

  const [profileLoading, setProfileLoading] = useState(true);

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
          avatar: profile.avatar ?? user.avatar ?? '',
          emailNotifications: profile.emailNotifications ?? true,
          profileVisible: profile.profileVisible ?? false,
        });
      })
      .finally(() => setProfileLoading(false));
    // `user.id` on purpose: `user` gets a new object reference on every
    // auth-state event (token refresh, initial session), which would
    // otherwise re-run this fetch and reset mid-edit, silently discarding
    // whatever the visitor just toggled.
  }, [user?.id]);

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
      await updateUserProfile(user.id, {
        name: data.name,
        phone: data.phone,
        address: data.address,
        avatar: data.avatar,
        emailNotifications: data.emailNotifications,
        profileVisible: data.profileVisible,
      });
      toast.success('Informations mises à jour avec succès !');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    }
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
            <Card className="p-6">
              <h2 className="mb-4">Photo de profil</h2>
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
                  {user.avatar}
                </div>
                <div>
                  <Button type="button" variant="secondary" size="sm">
                    Changer la photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG ou GIF (max. 2MB)
                  </p>
                </div>
              </div>
            </Card>

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
                      <FormControl>
                        <Input {...field} className="bg-input-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4">Préférences</h2>
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
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileVisible"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium">
                          Visibilité du profil
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rendre votre profil public
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
          </form>
        </Form>
      </div>
    </div>
  );
}
