"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { EndpointMeta, ScenarioFile } from "@/types/studio";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading editor…
    </div>
  ),
});

interface Props {
  endpoint: EndpointMeta | null;
  scenario: ScenarioFile | null;
  isActive: boolean;
  onSave: (s: ScenarioFile) => void | Promise<void>;
  onSetActive: (s: ScenarioFile) => void | Promise<void>;
  baseUrl: string;
}

export function ScenarioEditor({
  endpoint,
  scenario,
  isActive,
  onSave,
  onSetActive,
  baseUrl,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(200);
  const [latencyMs, setLatencyMs] = useState(0);
  const [bodyText, setBodyText] = useState("{}");
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!scenario) return;
    setName(scenario.name);
    setDescription(scenario.description ?? "");
    setStatus(scenario.response.status);
    setLatencyMs(scenario.latencyMs ?? 0);
    setBodyText(JSON.stringify(scenario.response.body, null, 2));
    setNotes(scenario.notes ?? "");
    setBodyError(null);
  }, [scenario]);

  if (!endpoint || !scenario) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        Select an endpoint and a scenario.
      </div>
    );
  }

  const fullMockUrl = `${baseUrl}${endpoint.mockPath}`;

  const handleSave = async () => {
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
      setBodyError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid JSON";
      setBodyError(msg);
      toast.error("Response body is not valid JSON");
      return;
    }
    await onSave({
      ...scenario,
      name,
      description,
      latencyMs: latencyMs > 0 ? latencyMs : undefined,
      notes: notes || undefined,
      response: {
        status,
        headers: scenario.response.headers,
        body,
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {endpoint.method}
              </Badge>
              <h2 className="truncate text-base font-semibold">{endpoint.name}</h2>
              {isActive && (
                <Badge variant="default" className="bg-emerald-500 text-white">
                  Active
                </Badge>
              )}
            </div>
            <code className="mt-1 block truncate text-xs text-muted-foreground">
              Mock: {fullMockUrl}
            </code>
            <code className="block truncate text-[11px] text-muted-foreground">
              SF: {endpoint.sfPath}
            </code>
            <p className="mt-1.5 text-xs text-muted-foreground">{endpoint.description}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!isActive && (
              <Button variant="secondary" size="sm" onClick={() => onSetActive(scenario)}>
                Set active
              </Button>
            )}
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name" className="text-xs">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="status" className="text-xs">
              HTTP status
            </Label>
            <Input
              id="status"
              type="number"
              min={100}
              max={599}
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value, 10) || 200)}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="latency" className="text-xs">
              Latency (ms)
            </Label>
            <Input
              id="latency"
              type="number"
              min={0}
              max={30000}
              step={50}
              value={latencyMs}
              onChange={(e) => setLatencyMs(parseInt(e.target.value, 10) || 0)}
              className="h-8"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-xs">
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8"
            placeholder="What is this scenario for?"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <Label className="text-xs">Response body (JSON)</Label>
          {bodyError && (
            <span className="text-xs text-destructive">JSON error: {bodyError}</span>
          )}
        </div>
        <div className="min-h-0 flex-1">
          <MonacoEditor
            height="100%"
            language="json"
            theme="vs-dark"
            value={bodyText}
            onChange={(v) => setBodyText(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      <div className="border-t p-4">
        <Label htmlFor="notes" className="text-xs">
          Notes for the dev (not sent in response)
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 text-xs"
          placeholder="Edge cases, gotchas, things to assert in the cartridge…"
        />
      </div>
    </div>
  );
}
