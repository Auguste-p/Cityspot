import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { signIn, signUp, getCurrentUser } from '../services/authService';
import { searchCity, type GeocodeResult } from '../lib/geocode';

const CITY_SEARCH_DEBOUNCE_MS = 400;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<GeocodeResult[]>([]);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ lat: number; lng: number } | null>(null);
  const citySearchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) navigate('/', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    return () => clearTimeout(citySearchTimeout.current);
  }, []);

  const handleCityChange = (value: string) => {
    setCity(value);
    setSelectedCity(null);
    clearTimeout(citySearchTimeout.current);

    citySearchTimeout.current = setTimeout(async () => {
      const results = await searchCity(value);
      setCitySuggestions(results);
      setCitySuggestionsOpen(results.length > 0);
    }, CITY_SEARCH_DEBOUNCE_MS);
  };

  const handleCitySelect = (suggestion: GeocodeResult) => {
    setCity(suggestion.label);
    setSelectedCity({ lat: suggestion.lat, lng: suggestion.lng });
    setCitySuggestionsOpen(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/', { replace: true });
        return;
      }

      const { session } = await signUp(email, password, {
        name,
        city,
        cityLat: selectedCity?.lat,
        cityLng: selectedCity?.lng,
      });

      if (session) {
        navigate('/', { replace: true });
        return;
      }

      // Projet Supabase avec confirmation d'email activée : pas de session
      // tant que le lien reçu par mail n'a pas été cliqué — inutile de
      // naviguer vers `/`, la garde de route de Layout.tsx renverrait de
      // toute façon vers /login sans explication.
      setInfo('Compte créé ! Vérifiez votre boîte mail pour confirmer votre inscription, puis connectez-vous.');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary rounded-full">
            <MapPin className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">City Spot</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jeanne Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <div className="relative">
                  <Input
                    id="city"
                    type="text"
                    placeholder="Lyon"
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    onFocus={() => setCitySuggestionsOpen(citySuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setCitySuggestionsOpen(false), 150)}
                    required
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={citySuggestionsOpen}
                    aria-controls="city-suggestions"
                  />
                  {citySuggestionsOpen && citySuggestions.length > 0 && (
                    <ul
                      id="city-suggestions"
                      role="listbox"
                      aria-label="Suggestions de ville"
                      className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg"
                    >
                      {citySuggestions.map((suggestion, index) => (
                        <li key={`${suggestion.lat}-${suggestion.lng}-${index}`} role="option" aria-selected={false}>
                          <button
                            type="button"
                            onMouseDown={() => handleCitySelect(suggestion)}
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
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {info && (
            <p className="text-sm text-primary">{info}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setInfo(null); }}
            className="text-primary underline-offset-4 hover:underline"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </Card>
    </div>
  );
}
