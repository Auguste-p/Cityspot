import { useCallback, useEffect, useState } from 'react';
import type { Post } from '../types/Post';
import { type Comment, type MunicipalStats, type Vote, createComment, getMunicipalStats, createVote, getIssueById, listComments, listIssues, listRevokedIssuesByCity, listRevokedIssuesByUser, listVotes, listVotesByUser } from '../services/issuesService';

// `cityInsee` : code INSEE de la commune à filtrer (vue mairie) ; absent = tous les signalements.
export function useIssues(cityInsee?: string) {
  const [issues, setIssues] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextIssues = await listIssues(cityInsee);
      setIssues(nextIssues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error('Impossible de charger les signalements'));
    } finally {
      setLoading(false);
    }
  }, [cityInsee]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { issues, loading, error, reload };
}

export function useIssue(issueId?: string) {
  const [issue, setIssue] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadIssue() {
      if (!issueId) {
        setIssue(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextIssue = await getIssueById(issueId);
        if (isActive) {
          setIssue(nextIssue);
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError instanceof Error ? nextError : new Error('Impossible de charger le signalement'));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadIssue();

    return () => {
      isActive = false;
    };
  }, [issueId]);

  return { issue, loading, error };
}

export function useComments(issueId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!issueId) { setComments([]); setLoading(false); return; }

    setLoading(true);
    listComments(issueId)
      .then((data) => { if (isActive) setComments(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les commentaires')); })
      .finally(() => { if (isActive) setLoading(false); });

    return () => { isActive = false; };
  }, [issueId]);

  const addComment = useCallback(async (userId: string, text: string, authorName?: string) => {
    if (!issueId) return;
    const comment = await createComment(issueId, userId, text, authorName);
    setComments((prev) => [...prev, comment]);
  }, [issueId]);

  return { comments, loading, error, addComment };
}

export function useVotes(issueId?: string) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!issueId) { setVotes([]); setLoading(false); return; }
    setLoading(true);
    listVotes(issueId)
      .then((data) => { if (isActive) setVotes(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les votes')); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [issueId]);

  const addVote = useCallback(async (userId: string, yes: boolean) => {
    if (!issueId) return;
    const vote = await createVote(issueId, userId, yes);
    setVotes((prev) => [...prev, vote]);
  }, [issueId]);

  return { votes, loading, error, addVote };
}

export function useRevokedIssues(userId?: string) {
  const [issues, setIssues] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!userId) { setIssues([]); setLoading(false); return; }
    setLoading(true);
    listRevokedIssuesByUser(userId)
      .then((data) => { if (isActive) setIssues(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les signalements révoqués')); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [userId]);

  return { issues, loading, error };
}

// `enabled` faux (compte mairie sans commune) : aucun appel, la RPC refuserait de toute façon.
export function useMunicipalStats(enabled = true) {
  const [stats, setStats] = useState<MunicipalStats | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!enabled) { setStats(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    getMunicipalStats()
      .then((data) => { if (isActive) setStats(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les statistiques')); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [enabled]);

  return { stats, loading, error };
}

export function useRevokedCityIssues(cityInsee?: string) {
  const [issues, setIssues] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!cityInsee) { setIssues([]); setLoading(false); return; }
    setLoading(true);
    listRevokedIssuesByCity(cityInsee)
      .then((data) => { if (isActive) setIssues(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les signalements révoqués')); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [cityInsee]);

  return { issues, loading, error };
}

export function useUserVotes(userId?: string) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!userId) { setVotes([]); setLoading(false); return; }
    setLoading(true);
    listVotesByUser(userId)
      .then((data) => { if (isActive) setVotes(data); })
      .catch((err) => { if (isActive) setError(err instanceof Error ? err : new Error('Impossible de charger les votes')); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [userId]);

  return { votes, loading, error };
}