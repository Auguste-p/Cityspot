import { getSupabaseClient } from '../lib/supabase';
import type { Post, PostCategory, Task } from '../types/Post';

type DatabaseIssueStatus = 'open' | 'in-progress' | 'resolved';

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
  positive_votes: number | null;
  negative_votes: number | null;
  created_at: string | null;
  status: DatabaseIssueStatus | null;
  is_municipal_project: boolean | null;
  category: PostCategory | null;
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
  positiveVotes?: number;
  negativeVotes?: number;
  isMunicipalProject?: boolean;
  category?: PostCategory | null;
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
    votes: {
      positive: row.positive_votes ?? 0,
      negative: row.negative_votes ?? 0,
    },
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    status: normalizeIssueStatus(row.status),
    isMunicipalProject: Boolean(row.is_municipal_project),
    category: row.category ?? undefined,
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
    votes: {
      positive: input.positiveVotes ?? 0,
      negative: input.negativeVotes ?? 0,
    },
    createdAt: now,
    status: 'pending',
    isMunicipalProject: input.isMunicipalProject ?? false,
    category: input.category ?? undefined,
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
    positive_votes: input.positiveVotes ?? 0,
    negative_votes: input.negativeVotes ?? 0,
    status: denormalizePostStatus('pending'),
    is_municipal_project: input.isMunicipalProject ?? false,
    category: input.category ?? null,
  };

  const supabase = client as any;

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
    const materialPayload = materialInputs.map((name) => ({
      issue_id: issueId,
      name,
    }));

    const { error: materialError } = await supabase.from('materials').insert(materialPayload);

    if (materialError) {
      throw new Error(materialError.message);
    }
  }

  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const { data: materialRows, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('issue_id', issueId)
    .order('id', { ascending: true });

  if (materialsError) {
    throw new Error(materialsError.message);
  }

  return normalizeIssue(
    createdIssue as IssueRow,
    (taskRows ?? []) as TaskRow[],
    (materialRows ?? []) as MaterialRow[],
  );
}

export async function updateIssueVotes(
  issueId: string,
  votes: { positive: number; negative: number },
) {
  const client = getSupabaseClient();

  if (!client) {
    const issue = localIssuesStore.find((post) => post.id === issueId);
    if (!issue) {
      return null;
    }

    issue.votes = { ...votes };
    return clonePost(issue);
  }

  const supabase = client as any;

  const { data, error } = await supabase
    .from('issues')
    .update({ positive_votes: votes.positive, negative_votes: votes.negative })
    .eq('id', issueId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeIssue(data as IssueRow);
}