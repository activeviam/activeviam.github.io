import React, { useCallback, useEffect, useState } from "react";
import { Button, ListGroup, Spinner } from "react-bootstrap";
import {
  deleteRecentQueryPlan,
  getRecentQueryPlans,
  loadRecentQueryPlanData,
  RecentQueryPlanEntry,
} from "../../library/storage/recentQueryPlans";
import { prettySize } from "../../library/utilities/textUtils";

export function RecentQueryPlans({
  onLoad,
}: {
  onLoad: (data: unknown) => void;
}) {
  const [entries, setEntries] = useState<RecentQueryPlanEntry[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getRecentQueryPlans()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLoad = async (entry: RecentQueryPlanEntry) => {
    setLoadingId(entry.id ?? null);
    try {
      const data = await loadRecentQueryPlanData(entry);
      onLoad(data);
    } catch (err) {
      console.warn("Failed to load recent query plan:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await deleteRecentQueryPlan(id);
      refresh();
    } catch (err) {
      console.warn("Failed to delete recent query plan:", err);
    }
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h6>Recent query plans</h6>
      <ListGroup>
        {entries.map((entry) => (
          <ListGroup.Item
            key={entry.id}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{entry.label}</strong>
              <br />
              <small className="text-muted">
                {prettySize(entry.sizeInBytes)} &middot;{" "}
                {new Date(entry.savedAt).toLocaleString()}
              </small>
            </div>
            <div>
              <Button
                variant="primary"
                size="sm"
                className="me-2"
                disabled={loadingId === entry.id}
                onClick={() => handleLoad(entry)}
              >
                {loadingId === entry.id ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Load"
                )}
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => entry.id !== undefined && handleRemove(entry.id)}
              >
                Remove
              </Button>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}
