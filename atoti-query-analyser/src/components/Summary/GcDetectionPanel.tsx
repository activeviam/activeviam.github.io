import { Fragment, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import { RetrievalGraph } from "../../library/dataStructures/json/retrieval";
import {
  extractTimingSamples,
  GcDetectionReport,
  GcEvent,
} from "../../library/gcDetection/detectGcPauses";
import { useGcDetectorWorker } from "../../workers/useGcDetectorWorker";

const ms = (value: number) => `${Math.round(value)} ms`;

function ImpactedOperations({ event }: { event: GcEvent }) {
  return (
    <Table size="sm" bordered className="gc-impacted mb-0">
      <thead>
        <tr>
          <th>Retrieval</th>
          <th>Type</th>
          <th>Partition</th>
          <th>Start</th>
          <th>Elapsed</th>
          <th>Median</th>
          <th>Gap</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {event.impacted.map((op) => (
          <tr key={`${op.kind}#${op.retrievalId}#${op.partition}`}>
            <td>
              {op.kind}#{op.retrievalId}
            </td>
            <td>{op.type}</td>
            <td>{op.partition}</td>
            <td>{ms(op.start)}</td>
            <td>{ms(op.elapsed)}</td>
            <td>{ms(op.median)}</td>
            <td>{ms(op.excess)}</td>
            <td>{op.role}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function GcReport({ report }: { report: GcDetectionReport }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const { params } = report;
  return (
    <div className="gc-report">
      <p className="gc-report-params">
        Analyzed {report.analyzedSamples} partitions of {report.analyzedRetrievals} retrievals (with
        at least {params.minPartitions} partitions). Threshold: {params.minGapMs} ms above the
        median; confirmation by at least {params.minConfirmations} other operation(s) with a gap of{" "}
        {params.confirmRatio * 100}% of the GC. Candidates: {report.candidateCount}.
      </p>
      {report.events.length === 0 ? (
        <p className="gc-no-event">
          <i>No GC pause detected</i>
        </p>
      ) : (
        <Table striped bordered hover size="sm" className="gc-events">
          <thead>
            <tr>
              <th>#</th>
              <th>Window</th>
              <th>Estimated GC duration</th>
              <th>Gap range</th>
              <th>Impacted operations</th>
            </tr>
          </thead>
          <tbody>
            {report.events.map((event) => (
              <Fragment key={event.id}>
                <tr
                  className="gc-event"
                  onClick={() => toggle(event.id)}
                  title="Show the impacted operations"
                >
                  <td>{event.id}</td>
                  <td>
                    {ms(event.windowStart)} – {ms(event.windowEnd)}
                    {event.approximateWindow ? " (approx.)" : ""}
                  </td>
                  <td>{ms(event.estimatedDurationMs)}</td>
                  <td>
                    {ms(event.minGapMs)} – {ms(event.maxGapMs)}
                  </td>
                  <td>
                    {event.impacted.length} partitions in {event.retrievalCount} retrievals{" "}
                    {expanded.has(event.id) ? "▾" : "▸"}
                  </td>
                </tr>
                {expanded.has(event.id) ? (
                  <tr>
                    <td colSpan={5}>
                      <ImpactedOperations event={event} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/**
 * Detects, on demand and in a web worker, the GC pauses which slowed down the
 * partitions of a query plan, and displays the report.
 */
export function GcDetectionPanel({ graph }: { graph: RetrievalGraph }) {
  const { detect, state } = useGcDetectorWorker();

  return (
    <div className="gc-detection">
      <h4>GC pauses</h4>
      <Button
        variant="outline-primary"
        disabled={state.isRunning}
        onClick={() => detect(extractTimingSamples(graph))}
      >
        {state.isRunning ? (
          <Spinner as="span" animation="border" size="sm" className="me-2" />
        ) : null}
        Detect GC pauses
      </Button>
      {state.error ? <p className="text-danger">GC detection failed: {state.error}</p> : null}
      {state.report ? <GcReport report={state.report} /> : null}
    </div>
  );
}
