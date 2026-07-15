"use client";

import { useEffect, type ReactNode } from "react";
import {
  BookOpenIcon,
  PlugIcon,
  ListChecksIcon,
  ToggleRightIcon,
  TerminalIcon,
  FlaskConicalIcon,
  GlobeIcon,
  TriangleAlertIcon,
  XIcon,
  CopyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EndpointMeta } from "@/types/studio";

interface Props {
  open: boolean;
  onClose: () => void;
  endpoints: EndpointMeta[];
  baseUrl: string;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }}
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
    >
      <CopyIcon className="size-3" />
      {label}
    </button>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  );
}

function CodeBlock({ children, copy }: { children: string; copy?: string }) {
  return (
    <div className="relative rounded-md border bg-muted/50">
      {copy !== undefined && (
        <div className="absolute right-1.5 top-1.5">
          <CopyButton text={copy} />
        </div>
      )}
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-foreground">
        {children}
      </pre>
    </div>
  );
}

export function HelpGuide({ open, onClose, endpoints, baseUrl }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const origin = baseUrl || "http://localhost:3000";
  const curlExample = `curl -X POST ${origin}/api/loyalty/promotion-execution \\
  -H 'content-type: application/json' \\
  -H 'x-mock-scenario: 04-bogof-as-line-discount' \\
  -d '{}'`;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Developer guide"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-background shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Developer guide</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 gap-1 text-xs">
            <XIcon className="size-3.5" />
            Close
          </Button>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-5 py-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              This studio mocks the Salesforce Loyalty APIs on{" "}
              <Mono>localhost</Mono> so the SFCC cartridge (
              <Mono>int_loyalty_adapter</Mono>) can be built and tested before
              the SF org is ready. Pick a scenario per endpoint, edit the JSON
              it returns, and watch live traffic in the right-hand log.
            </p>

            <Section icon={<PlugIcon className="size-4" />} title="1 · Point your cartridge at the mock">
              <p>
                Copy this base URL into your SFCC service definitions (the
                credential URLs in <Mono>metadata/services.xml</Mono>), one
                service per endpoint below.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
                  {origin}
                </code>
                <CopyButton text={origin} label="Copy base URL" />
              </div>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th className="px-2 py-1.5 font-medium">Method</th>
                      <th className="px-2 py-1.5 font-medium">Endpoint</th>
                      <th className="px-2 py-1.5 font-medium">Mock path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints.map((e) => (
                      <tr key={e.id} className="border-b last:border-0 align-top">
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className="font-mono text-[9px]">
                            {e.method}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-foreground">{e.name}</td>
                        <td className="px-2 py-1.5 font-mono text-muted-foreground">
                          {e.mockPath}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section icon={<ListChecksIcon className="size-4" />} title="2 · Choose what the mock returns">
              <p>
                Each endpoint (top tabs) has a set of <strong>scenarios</strong>{" "}
                in the left column, one JSON file each. The scenario with the
                green dot is <strong>active</strong>: every incoming request to
                that endpoint gets it.
              </p>
              <p>
                Edit the response body, HTTP status and artificial latency in
                the middle pane, then <strong>Save</strong>; the studio writes
                back to <Mono>fixtures/&lt;endpoint&gt;/&lt;id&gt;.json</Mono>,
                so a Save is a git diff you can commit. Add a brand-new scenario
                by dropping a JSON file in <Mono>fixtures/&lt;endpoint&gt;/</Mono>{" "}
                and reloading the tab.
              </p>
            </Section>

            <Section icon={<ToggleRightIcon className="size-4" />} title="3 · Promotion API mode">
              <p>
                The header toggle <Mono>Auto · GPM · GetMember</Mono> mirrors
                the adapter&apos;s <Mono>LoyaltyConfig.PROMOTION_API</Mono>. It
                can&apos;t change the cartridge config (that lives in SFCC), but
                it makes the studio match the mode you&apos;re testing:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <strong>Auto</strong>: both promotion endpoints answer
                  normally.
                </li>
                <li>
                  <strong>GPM</strong> / <strong>GetMember</strong>: the chosen
                  endpoint answers; the <em>other</em> promotion endpoint returns{" "}
                  <Mono>409</Mono>. So if the cartridge is pointed at the wrong
                  resource for the mode you set, it fails loudly instead of
                  getting a silently-wrong answer.
                </li>
              </ul>
            </Section>

            <Section icon={<TerminalIcon className="size-4" />} title="4 · Force a scenario from a test">
              <p>
                To pick a scenario without touching the GUI (e.g. from automated
                tests), send the <Mono>x-mock-scenario</Mono> header with the
                fixture id:
              </p>
              <CodeBlock copy={curlExample}>{curlExample}</CodeBlock>
            </Section>

            <Section icon={<FlaskConicalIcon className="size-4" />} title="5 · Local test workflow">
              <p>The adapter ships a contract-test harness that reads these very fixtures off disk, no server, tunnel or sandbox needed:</p>
              <CodeBlock copy={"cd ../int_loyalty_adapter && npm install && npm test"}>
                {"cd ../int_loyalty_adapter && npm install && npm test"}
              </CodeBlock>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <strong>Tier 1 (offline)</strong>: edit a fixture here →{" "}
                  <Mono>npm test</Mono> re-checks the adapter against it.
                </li>
                <li>
                  <strong>Tier 2</strong>: SFCC service mock mode on a sandbox.
                </li>
                <li>
                  <strong>Tier 3</strong>: the live mock over ngrok, for
                  interactive joint sessions only.
                </li>
              </ul>
            </Section>

            <Section icon={<GlobeIcon className="size-4" />} title="6 · Using a cloud sandbox">
              <p>
                A cloud SFCC sandbox can&apos;t reach your laptop&apos;s{" "}
                <Mono>localhost</Mono>. Tunnel the studio (e.g.{" "}
                <Mono>ngrok http 3000</Mono>) and set the{" "}
                <Mono>services.xml</Mono> credential URLs to the ngrok host for
                the duration of the session.
              </p>
            </Section>

            <Section icon={<TriangleAlertIcon className="size-4" />} title="Confirmed vs. open questions">
              <p>
                Fixtures are reconciled to the official{" "}
                <strong>Loyalty Management Developer Guide</strong> (Summer
                &apos;26), <em>not</em> derived from a live org. Two contract
                facts worth knowing:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <strong>Voucher reserve/release IS supported.</strong> The
                  Redeem Voucher resource takes an <Mono>action</Mono> field
                  (since API v62.0): <Mono>Reserve</Mono> (Issued→Reserved,
                  returns a <Mono>reservationKey</Mono>),{" "}
                  <Mono>Reinstate</Mono> (the release), and{" "}
                  <Mono>Redeem</Mono>. Same <Mono>/redeem</Mono> resource for
                  all three, see the <Mono>03-reserve-success</Mono> /{" "}
                  <Mono>04-reinstate-success</Mono> fixtures.
                </li>
                <li>
                  <strong>BOGOF is a discount on a line already in the cart</strong>
                  , not an injected product, see{" "}
                  <Mono>04-bogof-as-line-discount</Mono>.
                </li>
              </ul>
              <p>Still open for the Salesforce-side team to confirm:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>GPM Promotion Execution vs. a GetMemberPromotions process.</li>
                <li>How (or whether) a free bonus product is expressed.</li>
                <li>Whether Global Promotions Management is enabled in the org.</li>
              </ul>
            </Section>

            <p className="border-t pt-4 text-[11px] text-muted-foreground">
              Full reference, endpoint shapes and file layout live in the
              project <Mono>README.md</Mono>.
            </p>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
