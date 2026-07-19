import {getSupabaseClient, type IssueStatus} from '../lib/supabase';
import { logSecurityEvent } from '../lib/sentry';
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
  owner_email: string | null;
  positive_votes: number | null;
  negative_votes: number | null;
  created_at: string | null;
  status: DatabaseIssueStatus | null;
  is_municipal_project: boolean | null;
  category: PostCategory | null;
  created_by: string | null;
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
  category?: PostCategory | null;
  created_by?: string;
}

const DEFAULT_IMAGE_URL = 'https://picsum.photos/200';

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
    imageUrl: row.image_url ?? DEFAULT_IMAGE_URL,
    tasks: taskRows.map(normalizeTask),
    materials: materialRows.map((material) => material.name),
    isPrivateProperty: Boolean(row.is_private_property),
    isOwnProperty: row.is_own_property ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    votes: {
      positive: row.positive_votes ?? 0,
      negative: row.negative_votes ?? 0,
    },
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    status: normalizeIssueStatus(row.status),
    isMunicipalProject: Boolean(row.is_municipal_project),
    category: row.category ?? undefined,
    created_by: row.created_by ?? undefined,
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
    imageUrl: input.imageUrl?.trim() ? input.imageUrl : DEFAULT_IMAGE_URL,
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
    category: input.category ?? undefined,
    created_by: input.created_by ?? undefined,
  };
}

export async function listIssues(): Promise<Post[]> {
  const client = getSupabaseClient();

  if (!client) {
    return localIssuesStore.map(clonePost);
  }

  const { data: issueRows, error: issuesError } = await client
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });

  if (issuesError) {
    throw new Error(issuesError.message);
  }

  const issues = (issueRows ?? []) as IssueRow[];
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

  return normalizeIssue(
    issueRow as IssueRow,
    (taskRows ?? []) as TaskRow[],
    (materialRows ?? []) as MaterialRow[],
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
    image_url: input.imageUrl?.trim() ? input.imageUrl : DEFAULT_IMAGE_URL,
    is_private_property: input.isPrivateProperty ?? false,
    is_own_property: input.isOwnProperty ?? null,
    owner_email: input.ownerEmail?.trim() ? input.ownerEmail : null,
    positive_votes: input.positiveVotes ?? 0,
    negative_votes: input.negativeVotes ?? 0,
    status: denormalizePostStatus('pending'),
    is_municipal_project: input.isMunicipalProject ?? false,
    category: input.category ?? null,
    created_by: input.created_by ?? undefined,
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
      image_url: input.imageUrl?.trim() ? input.imageUrl : DEFAULT_IMAGE_URL,
      is_private_property: input.isPrivateProperty ?? false,
      is_own_property: input.isOwnProperty ?? null,
      owner_email: input.ownerEmail?.trim() ? input.ownerEmail : null,
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

export interface Comment {
  id: string;
  created_at: string;
  id_user: string;
  id_issue: string;
  comment: string;
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

  return ((data ?? []) as CommentRow[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    id_user: row.id_user,
    id_issue: row.id_issue,
    comment: row.comment,
  }));
}

export async function createComment(issueId: string, userId: string, text: string): Promise<Comment> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const supabase = client as any;
  const { data, error } = await supabase
    .from('comments')
    .insert({ id_issue: issueId, id_user: userId, comment: text })
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
  };
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