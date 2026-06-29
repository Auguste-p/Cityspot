import { useCallback, useEffect, useState } from 'react';
import type { Post } from '../types/Post';
import { type Comment, createComment, getIssueById, listComments, listIssues } from '../services/issuesService';

export function useIssues() {
  const [issues, setIssues] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextIssues = await listIssues();
      setIssues(nextIssues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error('Impossible de charger les signalements'));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const addComment = useCallback(async (userId: string, text: string) => {
    if (!issueId) return;
    const comment = await createComment(issueId, userId, text);
    setComments((prev) => [...prev, comment]);
  }, [issueId]);

  return { comments, loading, error, addComment };
}