import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, ListGroup, Spinner } from "react-bootstrap";
import {
  deleteRecentQueryPlan,
  getRecentQueryPlans,
  loadRecentQueryPlanData,
  RecentQueryPlanEntry,
  updateRecentQueryPlanLabel,
} from "../../library/storage/recentQueryPlans";
import { prettySize } from "../../library/utilities/textUtils";

export function RecentQueryPlans({
  onLoad,
}: {
  onLoad: (data: unknown) => void;
}) {
  const [entries, setEntries] = useState<RecentQueryPlanEntry[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const startEditing = (entry: RecentQueryPlanEntry) => {
    setEditingId(entry.id ?? null);
    setEditValue(entry.label);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveLabel = async () => {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    if (trimmed === "") {
      cancelEditing();
      return;
    }
    try {
      await updateRecentQueryPlanLabel(editingId, trimmed);
      refresh();
    } catch (err) {
      console.warn("Failed to update label:", err);
    } finally {
      setEditingId(null);
      setEditValue("");
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
              {editingId === entry.id ? (
                <Form.Control
                  size="sm"
                  type="text"
                  value={editValue}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveLabel();
                    } else if (e.key === "Escape") {
                      cancelEditing();
                    }
                  }}
                  onBlur={() => saveLabel()}
                />
              ) : (
                <span>
                  <strong>{entry.label}</strong>{" "}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-muted"
                    title="Edit label"
                    onClick={() => startEditing(entry)}
                  >
                    &#9998;
                  </Button>
                </span>
              )}
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
