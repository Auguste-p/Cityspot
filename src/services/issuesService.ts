import {getSupabaseClient, type IssueStatus} from '../lib/supabase';
import { logSecurityEvent } from '../lib/sentry';
import { getDefaultIssuePhotoUrl } from '../lib/storage';
import { POST_CATEGORIES } from '../lib/postCategory';
import type { Post, PostCategory, Task } from '../types/Post';

type DatabaseIssueStatus = IssueStatus;

interface IssueLocation {
  lat?: number | string;
  lng?: number | string;
  address?: string;
}

interface IssueRow {
  id: string;
  title: string;
  description: string | null;
  location: IssueLocation | null;
  image_url: string | null;
  is_private_property: boolean | null;
  is_own_property: boolean | null;
  positive_votes: number | null;
  negative_votes: number | null;
  created_at: string | null;
  status: DatabaseIssueStatus | null;
  is_municipal_project: boolean | null;
  categories: PostCategory[] | null;
  created_by: string | null;
  city: string | null;
  city_insee: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
}

interface TaskRow {
  id: string;
  issue_id: string;
  title: string;
  completed: boolean | null;
}

interface MaterialRow {
  id: number;
  issue_id: string;
  name: string;
}

interface CommentRow {
  id: string;
  created_at: string;
  id_user: string;
  id_issue: string;
  comment: string;
  author_name: string | null;
}

function normalizeKey(value: string) {
  return value.trim();
}

export interface CreateIssueInput {
  title: string;
  description: string;
  address: string;
  imageUrl?: string | null;
  materials?: string[];
  tasks?: string[];
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  isPrivateProperty?: boolean;
  isOwnProperty?: boolean;
  ownerEmail?: string;
  positiveVotes?: number;
  negativeVotes?: number;
  isMunicipalProject?: boolean;
  categories?: PostCategory[];
  created_by?: string;
  city?: string;
  cityInsee?: string;
}

const localIssuesStore: Post[] = [];

function clonePost(post: Post): Post {
  return {
    ...post,
    location: { ...post.location },
    tasks: post.tasks.map((task) => ({ ...task })),
    materials: [...post.materials],
    votes: { ...post.votes },
    createdAt: new Date(post.createdAt),
    userVotes: post.userVotes ? { ...post.userVotes } : undefined,
  };
}

function toNumber(value: number | string | undefined, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeIssueStatus(status: DatabaseIssueStatus | null | undefined): Post['status'] {
  switch (status) {
    case 'resolved':
      return 'completed';
    case 'in-progress':
      return 'in-progress';
    default:
      return 'pending';
  }
}

function denormalizePostStatus(status: Post['status']): DatabaseIssueStatus {
  switch (status) {
    case 'completed':
      return 'resolved';
    case 'in-progress':
      return 'in-progress';
    default:
      return 'open';
  }
}

function normalizeTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
  };
}

async function fetchTasksByIssueIds(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  issueIds: string[],
) {
  const normalizedIssueIds = issueIds.map(normalizeKey);
  const { data: bulkTaskRows, error: bulkTasksError } = await client
    .from('tasks')
    .select('*')
    .in('issue_id', normalizedIssueIds)
    .order('id', { ascending: true });

  if (bulkTasksError) {
    throw new Error(bulkTasksError.message);
  }

  const typedBulkRows = (bulkTaskRows ?? []) as TaskRow[];
  if (typedBulkRows.length > 0 || normalizedIssueIds.length <= 1) {
    return typedBulkRows;
  }

  const fallbackResults = await Promise.all(
    normalizedIssueIds.map(async (issueId) => {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('issue_id', issueId)
        .order('id', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as TaskRow[];
    }),
  );

  return fallbackResults.flat();
}

async function fetchMaterialsByIssueIds(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  issueIds: string[],
) {
  const normalizedIssueIds = issueIds.map(normalizeKey);
  const { data: bulkMaterialRows, error: bulkMaterialsError } = await client
    .from('materials')
    .select('*')
    .in('issue_id', normalizedIssueIds)
    .order('id', { ascending: true });

  if (bulkMaterialsError) {
    throw new Error(bulkMaterialsError.message);
  }

  const typedBulkRows = (bulkMaterialRows ?? []) as MaterialRow[];
  if (typedBulkRows.length > 0 || normalizedIssueIds.length <= 1) {
    return typedBulkRows;
  }

  const fallbackResults = await Promise.all(
    normalizedIssueIds.map(async (issueId) => {
      const { data, error } = await client
        .from('materials')
        .select('*')
        .eq('issue_id', issueId)
        .order('id', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as MaterialRow[];
    }),
  );

  return fallbackResults.flat();
}

function normalizeIssue(
  row: IssueRow,
  taskRows: TaskRow[] = [],
  materialRows: MaterialRow[] = [],
  ownerEmail?: string,
): Post {
  const location = row.location ?? {};

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    location: {
      lat: toNumber(location.lat),
      lng: toNumber(location.lng),
      address: location.address ?? '',
    },
    imageUrl: row.image_url ?? getDefaultIssuePhotoUrl(),
    tasks: taskRows.map(normalizeTask),
    materials: materialRows.map((material) => material.name),
    isPrivateProperty: Boolean(row.is_private_property),
    isOwnProperty: row.is_own_property ?? undefined,
    ownerEmail,
    votes: {
      positive: row.positive_votes ?? 0,
      negative: row.negative_votes ?? 0,
    },
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    status: normalizeIssueStatus(row.status),
    isMunicipalProject: Boolean(row.is_municipal_project),
    // Une valeur héritée de l'ancienne colonne `category` peut ne plus exister dans
    // POST_CATEGORIES : l'UI en lit l'icône sans garde, d'où le filtre ici.
    categories: (row.categories ?? []).filter((category) => POST_CATEGORIES.includes(category)),
    created_by: row.created_by ?? undefined,
    city: row.city ?? undefined,
    cityInsee: row.city_insee ?? undefined,
    revoked: row.revoked_at
      ? { at: new Date(row.revoked_at), reason: row.revoked_reason ?? '' }
      : undefined,
  };
}

function buildLocalIssue(input: CreateIssueInput): Post {
  const now = new Date();

  return {
    id: `issue-${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    title: input.title,
    description: input.description,
    location: input.location ?? {
      lat: 0,
      lng: 0,
      address: input.address,
    },
    imageUrl: input.imageUrl?.trim() ? input.imageUrl : getDefaultIssuePhotoUrl(),
    tasks: (input.tasks ?? []).map((title, index) => ({
      id: `task-${now.getTime()}-${index}`,
      title,
      completed: false,
    })),
    materials: input.materials ?? [],
    isPrivateProperty: input.isPrivateProperty ?? false,
    isOwnProperty: input.isOwnProperty,
    ownerEmail: input.ownerEmail?.trim() ? input.ownerEmail : undefined,
    votes: {
      positive: input.positiveVotes ?? 0,
      negative: input.negativeVotes ?? 0,
    },
    createdAt: now,
    status: 'pending',
    isMunicipalProject: input.isMunicipalProject ?? false,
    categories: input.categories ?? [],
    created_by: input.created_by ?? undefined,
  };
}

// `cityInsee` : commune dont on veut les signalements (vue mairie). Absent : tous.
export async function listIssues(cityInsee?: string): Promise<Post[]> {
  const client = getSupabaseClient();

  if (!client) {
    return localIssuesStore.map(clonePost);
  }

  // Les signalements révoqués sont exclus des listes (carte, profils, stats) pour
  // tous ; la RLS ne les laisse ouvrir en détail qu'à l'auteur et à la mairie.
  let query = client.from('issues').select('*').is('revoked_at', null);
  if (cityInsee) {
    query = query.eq('city_insee', cityInsee);
  }

  const { data: issueRows, error: issuesError } = await query.order('created_at', { ascending: false });

  if (issuesError) {
    throw new Error(issuesError.message);
  }

  return hydrateIssues(client, (issueRows ?? []) as IssueRow[]);
}

// Profil privé : la RLS ne renvoie les signalements révoqués qu'à leur auteur (et à la
// mairie de la ville) ; le filtre sur `created_by` écarte ceux d'une mairie qui n'est pas l'auteur.
export async function listRevokedIssuesByUser(userId: string): Promise<Post[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('issues')
    .select('*')
    .eq('created_by', userId)
    .not('revoked_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateIssues(client, (data ?? []) as IssueRow[]);
}

// Tableau de bord mairie : la RLS ne renvoie les révoqués d'une commune (code INSEE) qu'à sa
// mairie (et à leur auteur) ; un compte sans droit reçoit simplement une liste vide.
export async function listRevokedIssuesByCity(cityInsee: string): Promise<Post[]> {
  const client = getSupabaseClient();
  if (!client || !cityInsee) return [];

  const { data, error } = await client
    .from('issues')
    .select('*')
    .eq('city_insee', cityInsee)
    .not('revoked_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateIssues(client, (data ?? []) as IssueRow[]);
}

async function hydrateIssues(client: NonNullable<ReturnType<typeof getSupabaseClient>>, issues: IssueRow[]): Promise<Post[]> {
  const issueIds = issues.map((issue) => issue.id);

  if (issueIds.length === 0) {
    return [];
  }

  const taskRows = await fetchTasksByIssueIds(client, issueIds);
  const materialRows = await fetchMaterialsByIssueIds(client, issueIds);

  const groupedTasks = new Map<string, TaskRow[]>();
  const groupedMaterials = new Map<string, MaterialRow[]>();

  for (const taskRow of taskRows) {
    const issueKey = normalizeKey(taskRow.issue_id);
    const currentTasks = groupedTasks.get(issueKey) ?? [];
    currentTasks.push(taskRow);
    groupedTasks.set(issueKey, currentTasks);
  }

  for (const materialRow of materialRows) {
    const issueKey = normalizeKey(materialRow.issue_id);
    const currentMaterials = groupedMaterials.get(issueKey) ?? [];
    currentMaterials.push(materialRow);
    groupedMaterials.set(issueKey, currentMaterials);
  }

  return issues.map((issue) =>
    normalizeIssue(
      issue,
      groupedTasks.get(normalizeKey(issue.id)) ?? [],
      groupedMaterials.get(normalizeKey(issue.id)) ?? [],
    ),
  );
}

export async function getIssueById(issueId: string): Promise<Post | null> {
  const client = getSupabaseClient();

  if (!client) {
    const issue = localIssuesStore.find((post) => post.id === issueId);
    return issue ? clonePost(issue) : null;
  }

  const { data: issueRow, error: issueError } = await client
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .maybeSingle();

  if (issueError) {
    throw new Error(issueError.message);
  }

  if (!issueRow) {
    return null;
  }

  const { data: taskRows, error: tasksError } = await client
    .from('tasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const { data: materialRows, error: materialsError } = await client
    .from('materials')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (materialsError) {
    throw new Error(materialsError.message);
  }

  // La RLS de issue_owner_contacts ne renvoie la ligne qu'à l'auteur et à la mairie de la commune.
  const { data: ownerContact, error: ownerError } = await (client as any)
    .from('issue_owner_contacts')
    .select('owner_email')
    .eq('issue_id', issueId)
    .maybeSingle();

  if (ownerError) {
    throw new Error(ownerError.message);
  }

  return normalizeIssue(
    issueRow as IssueRow,
    (taskRows ?? []) as TaskRow[],
    (materialRows ?? []) as MaterialRow[],
    ownerContact?.owner_email ?? undefined,
  );
}

export async function createIssue(input: CreateIssueInput): Promise<Post> {
  const client = getSupabaseClient();

  if (!client) {
    const createdIssue = buildLocalIssue(input);
    localIssuesStore.unshift(createdIssue);
    return clonePost(createdIssue);
  }

  const issueId = `issue-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const issuePayload = {
    id: issueId,
    title: input.title,
    description: input.description,
    location: input.location ?? {
      lat: 0,
      lng: 0,
      address: input.address,
    },
    image_url: input.imageUrl?.trim() ? input.imageUrl : getDefaultIssuePhotoUrl(),
    is_private_property: input.isPrivateProperty ?? false,
    is_own_property: input.isOwnProperty ?? null,
    positive_votes: input.positiveVotes ?? 0,
    negative_votes: input.negativeVotes ?? 0,
    status: denormalizePostStatus('pending'),
    is_municipal_project: input.isMunicipalProject ?? false,
    categories: input.categories ?? [],
    created_by: input.created_by ?? undefined,
    city: input.city ?? null,
    city_insee: input.cityInsee ?? null,
  };

  const supabase = client as any;

  // Insert the issue first to ensure we have a valid issue_id for tasks and materials
  const { data: createdIssue, error: issueError } = await supabase
    .from('issues')
    .insert(issuePayload)
    .select('*')
    .single();

  if (issueError) {
    throw new Error(issueError.message);
  }

  const taskInputs = input.tasks ?? [];
  const materialInputs = input.materials ?? [];

  // Handle tasks insertion after issue is created to ensure we have a valid issue_id
  if (taskInputs.length > 0) {
    const taskPayload = taskInputs.map((title, index) => ({
      id: `task-${Date.now()}-${index}`,
      issue_id: issueId,
      title,
      completed: false,
    }));

    const { error: taskError } = await supabase.from('tasks').insert(taskPayload);

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  // Handle materials insertion after issue is created to ensure we have a valid issue_id
  if (materialInputs.length > 0) {
    const materialPayload = materialInputs.map((name, index) => ({
      id: `material-${Date.now()}-${index}`,
      issue_id: issueId,
      name,
    }));

    const { error: materialError } = await supabase.from('materials').insert(materialPayload);

    if (materialError) {
      throw new Error(materialError.message);
    }
  }

  // E-mail du propriétaire d'un lieu privé : table à part, lisible seulement par l'auteur et la mairie.
  const ownerEmail = input.ownerEmail?.trim();
  if (ownerEmail) {
    const { error: ownerError } = await supabase
      .from('issue_owner_contacts')
      .insert({ issue_id: issueId, owner_email: ownerEmail });

    if (ownerError) {
      throw new Error(ownerError.message);
    }
  }

  // Fetch the tasks and materials after insertion to ensure we return the complete issue data
  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  // Fetch materials after tasks to ensure we return the complete issue data
  const { data: materialRows, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (materialsError) {
    throw new Error(materialsError.message);
  }

  // Return the fully normalized issue with tasks and materials included
  return normalizeIssue(
    createdIssue as IssueRow,
    (taskRows ?? []) as TaskRow[],
    (materialRows ?? []) as MaterialRow[],
    ownerEmail || undefined,
  );
}

export interface UpdateIssueInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  materials?: string[];
  tasks?: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  isPrivateProperty?: boolean;
  isOwnProperty?: boolean;
  ownerEmail?: string;
  categories?: PostCategory[];
  city?: string;
  cityInsee?: string;
}

export async function updateIssue(issueId: string, input: UpdateIssueInput): Promise<Post> {
  const client = getSupabaseClient();

  if (!client) {
    const index = localIssuesStore.findIndex((post) => post.id === issueId);
    if (index === -1) {
      throw new Error('Signalement introuvable');
    }

    const updated: Post = {
      ...localIssuesStore[index],
      title: input.title,
      description: input.description,
      location: { ...input.location },
      imageUrl: input.imageUrl?.trim() ? input.imageUrl : localIssuesStore[index].imageUrl,
      materials: input.materials ?? [],
      tasks: (input.tasks ?? []).map((title, taskIndex) => ({
        id: `task-${Date.now()}-${taskIndex}`,
        title,
        completed: false,
      })),
      isPrivateProperty: input.isPrivateProperty ?? localIssuesStore[index].isPrivateProperty,
      isOwnProperty: input.isOwnProperty ?? localIssuesStore[index].isOwnProperty,
      ownerEmail: input.ownerEmail?.trim() ? input.ownerEmail : localIssuesStore[index].ownerEmail,
      categories: input.categories ?? localIssuesStore[index].categories,
    };
    localIssuesStore[index] = updated;
    return clonePost(updated);
  }

  const supabase = client as any;

  const { data: updatedIssue, error: issueError } = await supabase
    .from('issues')
    .update({
      title: input.title,
      description: input.description,
      location: input.location,
      image_url: input.imageUrl?.trim() ? input.imageUrl : getDefaultIssuePhotoUrl(),
      is_private_property: input.isPrivateProperty ?? false,
      is_own_property: input.isOwnProperty ?? null,
      ...(input.categories !== undefined ? { categories: input.categories } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.cityInsee !== undefined ? { city_insee: input.cityInsee } : {}),
    })
    .eq('id', issueId)
    .select('*')
    .single();

  if (issueError) {
    // PGRST116 : la RLS a filtré la ligne (0 résultat pour `.single()`) — soit
    // l'id n'existe pas, soit l'appelant n'est pas le propriétaire.
    if (issueError.code === 'PGRST116') {
      logSecurityEvent('Modification refusée par la RLS (0 ligne retournée)', { issueId });
    }
    throw new Error(issueError.message);
  }

  // Tasks/materials are simple title lists with no stable diff key — replace wholesale.
  await supabase.from('tasks').delete().eq('issue_id', issueId);
  await supabase.from('materials').delete().eq('issue_id', issueId);

  // E-mail du propriétaire : remplacé s'il est fourni, retiré sinon (comme avant : vide = effacé).
  const ownerEmail = input.ownerEmail?.trim();
  const { error: ownerError } = ownerEmail
    ? await supabase.from('issue_owner_contacts').upsert({ issue_id: issueId, owner_email: ownerEmail }, { onConflict: 'issue_id' })
    : await supabase.from('issue_owner_contacts').delete().eq('issue_id', issueId);
  if (ownerError) {
    throw new Error(ownerError.message);
  }

  const taskInputs = input.tasks ?? [];
  const materialInputs = input.materials ?? [];

  if (taskInputs.length > 0) {
    const taskPayload = taskInputs.map((title, index) => ({
      id: `task-${Date.now()}-${index}`,
      issue_id: issueId,
      title,
      completed: false,
    }));

    const { error: taskError } = await supabase.from('tasks').insert(taskPayload);
    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  if (materialInputs.length > 0) {
    const materialPayload = materialInputs.map((name, index) => ({
      id: `material-${Date.now()}-${index}`,
      issue_id: issueId,
      name,
    }));

    const { error: materialError } = await supabase.from('materials').insert(materialPayload);
    if (materialError) {
      throw new Error(materialError.message);
    }
  }

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  const { data: materialRows } = await supabase
    .from('materials')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  return normalizeIssue(
    updatedIssue as IssueRow,
    (taskRows ?? []) as TaskRow[],
    (materialRows ?? []) as MaterialRow[],
    ownerEmail || undefined,
  );
}

export async function deleteIssue(issueId: string) {
  const client = getSupabaseClient();

  if (!client) {
    const index = localIssuesStore.findIndex((post) => post.id === issueId);
    if (index === -1) {
      throw new Error('Signalement introuvable');
    }
    localIssuesStore.splice(index, 1);
    return true;
  }

  // RLS sur `issues` restreint le DELETE au créateur (auth.uid() = created_by,
  // cf. PLAN_CORRECTION_BOGUES.md BUG-10) : un non-propriétaire reçoit un 200
  // avec 0 ligne supprimée plutôt qu'une erreur explicite — d'où le .select()
  // pour distinguer "supprimé" de "silencieusement refusé par la RLS".
  const { data, error } = await client
    .from('issues')
    .delete()
    .eq('id', issueId)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    logSecurityEvent('Suppression refusée par la RLS (0 ligne supprimée)', { issueId });
    throw new Error("Vous n'êtes pas autorisé à supprimer ce signalement");
  }

  return true;
}

// Réservé à la mairie de la ville du signalement : tout est vérifié par la RPC
// (rôle, ville, motif), un refus remonte comme erreur Postgres. Le mail à l'auteur
// est un effet secondaire : son échec ne remet pas en cause la révocation, il est
// seulement remonté (`emailSent: false`) pour que la mairie en soit avertie.
export async function revokeIssue(issueId: string, reason: string): Promise<{ emailSent: boolean }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const { error } = await (client as any).rpc('revoke_issue', { p_issue_id: issueId, p_reason: reason });
  if (error) {
    logSecurityEvent('Révocation refusée', { issueId });
    throw new Error(error.message);
  }

  const { error: mailError } = await client.functions.invoke('notify-revocation', { body: { issueId } });
  if (mailError) {
    await logFunctionError('notify-revocation', mailError);
    logSecurityEvent("Mail de révocation non envoyé", { issueId });
    return { emailSent: false };
  }
  return { emailSent: true };
}

// Une erreur de Edge Function (FunctionsHttpError) n'expose le statut/corps de la réponse
// que dans `error.context` ; sans lecture, la console du navigateur ne montre qu'un « 401 ».
async function logFunctionError(name: string, error: unknown) {
  const response = (error as { context?: Response } | null)?.context;
  const body = response ? await response.text().catch(() => '') : '';
  console.error(`Edge Function ${name} en échec :`, response?.status, body || (error as Error)?.message);
}

// Mail aux comptes mairie de la ville pour un signalement exigeant autorisation. Effet
// secondaire de la création : ne lève jamais, le résultat sert seulement au message affiché.
export async function notifyMairie(issueId: string): Promise<'sent' | 'none' | 'failed'> {
  const client = getSupabaseClient();
  if (!client) return 'none';

  const { data, error } = await client.functions.invoke('notify-mairie', { body: { issueId } });
  if (error) {
    await logFunctionError('notify-mairie', error);
    logSecurityEvent('Mail mairie non envoyé', { issueId });
    return 'failed';
  }
  return data?.sent > 0 ? 'sent' : 'none';
}

export interface Comment {
  id: string;
  created_at: string;
  id_user: string;
  id_issue: string;
  comment: string;
  authorName?: string;
  // Posé seulement quand l'auteur est un compte mairie (vue municipal_user_ids).
  authorIsMunicipal?: boolean;
}

export async function listComments(issueId: string): Promise<Comment[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('id_issue', issueId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CommentRow[];
  const municipalIds = await getMunicipalAuthorIds(rows.map((row) => row.id_user));

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    id_user: row.id_user,
    id_issue: row.id_issue,
    comment: row.comment,
    authorName: row.author_name ?? undefined,
    ...(municipalIds.has(row.id_user) ? { authorIsMunicipal: true } : {}),
  }));
}

// Le badge est décoratif : si la vue est illisible, les commentaires s'affichent sans lui
// plutôt que de faire échouer tout le fil.
async function getMunicipalAuthorIds(authorIds: string[]): Promise<Set<string>> {
  const client = getSupabaseClient();
  const ids = [...new Set(authorIds)];
  if (!client || ids.length === 0) return new Set();

  try {
    const { data, error } = await (client as any).from('municipal_user_ids').select('id').in('id', ids);
    if (error) return new Set();
    return new Set((data ?? []).map((row: { id: string }) => row.id));
  } catch {
    return new Set();
  }
}

// author_name est dénormalisé sur la ligne à l'écriture (même raison que
// issues.owner_email) : la RLS sur public.users n'autorise chaque compte qu'à
// lire sa propre ligne (SEC-11), donc pas moyen de relire le nom d'un autre
// auteur à l'affichage — seul l'auteur, au moment où il poste, peut fournir
// (et lire) son propre nom.
export async function createComment(issueId: string, userId: string, text: string, authorName?: string): Promise<Comment> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const supabase = client as any;
  const { data, error } = await supabase
    .from('comments')
    .insert({ id_issue: issueId, id_user: userId, comment: text, author_name: authorName ?? null })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const row = data as CommentRow;
  return {
    id: row.id,
    created_at: row.created_at,
    id_user: row.id_user,
    id_issue: row.id_issue,
    comment: row.comment,
    authorName: row.author_name ?? undefined,
  };
}

export type ReportReason = 'illegal' | 'harassment' | 'privacy' | 'spam' | 'other';

// Signalement d'un contenu (bouton « Signaler », CGU §8). Écriture seule : la RLS de
// content_reports n'a pas de policy SELECT, l'éditeur lit la table depuis le dashboard.
// L'index unique (signaleur, signalement, commentaire) fait échouer un doublon en 23505,
// que l'on traite comme un succès — le contenu a déjà été signalé par ce compte.
export async function reportContent(input: {
  userId: string;
  issueId: string;
  commentId?: string;
  reason: ReportReason;
  details?: string;
}): Promise<'sent' | 'duplicate'> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const { error } = await (client as any).from('content_reports').insert({
    reporter_id: input.userId,
    issue_id: input.issueId,
    comment_id: input.commentId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
  });

  if (error?.code === '23505') return 'duplicate';
  if (error) throw new Error(error.message);
  return 'sent';
}

interface VoteRow {
  id: string;
  created_at: string;
  id_user: string;
  id_issue: string;
  yes: boolean;
}

export interface Vote {
  id: string;
  created_at: string;
  id_user: string;
  id_issue: string;
  yes: boolean;
}

export async function listVotes(issueId: string): Promise<Vote[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('votes')
    .select('*')
    .eq('id_issue', issueId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VoteRow[];
}

export async function listVotesByUser(userId: string): Promise<Vote[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('votes')
    .select('*')
    .eq('id_user', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VoteRow[];
}

export async function createVote(issueId: string, userId: string, yes: boolean): Promise<Vote> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');
  const supabase = client as any;
  const { data, error } = await supabase
    .from('votes')
    .insert({ id_issue: issueId, id_user: userId, yes })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as VoteRow;
}

// Note privée d'un compte mairie : la RLS (issue_private_notes) ne renvoie que
// la note de l'appelant, donc pas de filtre sur l'auteur ici.
export async function getPrivateNote(issueId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return '';

  const { data, error } = await (client as any)
    .from('issue_private_notes')
    .select('note')
    .eq('issue_id', issueId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.note ?? '';
}

// Une note vide supprime la ligne (la base impose 1 à 2000 caractères).
export async function savePrivateNote(issueId: string, userId: string, note: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const supabase = client as any;
  const text = note.trim();
  const { error } = text
    ? await supabase
        .from('issue_private_notes')
        .upsert(
          { issue_id: issueId, author_id: userId, note: text, updated_at: new Date().toISOString() },
          { onConflict: 'issue_id,author_id' },
        )
    : await supabase.from('issue_private_notes').delete().eq('issue_id', issueId).eq('author_id', userId);

  if (error) throw new Error(error.message);
}
