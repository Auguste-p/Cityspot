import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { settingsFormSchema } from '../schemas/formSchemas';
import { z } from 'zod';

export function Settings() {
  const navigate = useNavigate();
  const { user } = useUser();

  const form = useForm<z.input<typeof settingsFormSchema>, undefined, z.output<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      address: user.address ?? '',
      avatar: user.avatar ?? '',
      notificationsEnabled: true,
      emailNotifications: true,
      profileVisible: false,
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: z.output<typeof settingsFormSchema>) => {
    try {
      console.log('Settings data:', data);
      toast.success('Informations mises à jour avec succès !');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleLogout = () => {
    toast.success('Déconnexion réussie');
    setTimeout(() => navigate('/'), 1500);
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
                        <Input {...field} type="email" className="bg-input-background" />
                      </FormControl>
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
                  name="notificationsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium">
                          Notifications push
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">
                          Alertes pour les nouveaux commentaires
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
