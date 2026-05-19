"use client";

import {
  Calendar,
  ListTodo,
  Mail,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import { ScrollArea } from "@/components/Ui/ScrollArea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/Ui/Sheet";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const QUICK_ACTIONS = [
  {
    id: "next_sale",
    label: "Next revenue move",
    icon: TrendingUp,
  },
  {
    id: "pipeline",
    label: "Unstick pipeline",
    icon: Target,
  },
  {
    id: "meet",
    label: "Book revenue call",
    icon: Calendar,
  },
  {
    id: "email",
    label: "Closing email",
    icon: Mail,
  },
  {
    id: "task",
    label: "Close-loop task",
    icon: ListTodo,
  },
] as const;

function replyForAction(actionId: string): string {
  switch (actionId) {
    case "next_sale":
      return [
        "**Push:** your fastest lift this week is urgency where probability and € already line up.",
        "",
        "1) **Call Wave Payments today.** Negotiation stage, strong weight. One exec conversation moves **€84k** toward signature better than starting fresh elsewhere.",
        "2) **Northwind Ventures** is your upside ceiling in proposal. Send a **one-page ROI** plus two concrete dates for legal review, or it drifts.",
        "3) **Work qualified leads top-down by €** in Leads. Three short calls usually beat one perfect deck.",
        "",
        "Say **book** or **email** and I'll draft the Wave touchpoint next.",
      ].join("\n");
    case "pipeline":
      return [
        "**Push:** revenue hides in velocity, not volume.",
        "",
        "Pick **three deals** stuck before proposal with no dated next step - force **another meeting or disqualify**. Dead stages poison forecast.",
        "Run **negotiation hygiene**: every deal there needs a dated close plan and named signer on your side.",
        "Mine **lost reasons** (e.g. Kraków Robotics). Pattern-match so reps stop repeating the same miss.",
        "",
        "When live data plugs in, I'll rank stalls automatically. For now, use Pipeline + Tasks to chase **one advance per deal per day**.",
      ].join("\n");
    case "meet":
      return "I'll propose **Tue or Wed morning CET** with the **economic buyer** on **Wave Payments**. Title: **Decision checkpoint · scope & commercials**. Body stresses **time-box** and **single next step** so the meeting converts to a dated quote or pilot. Calendar OAuth later, I'll drop invites straight into Google or Outlook.";
    case "email":
      return "Subject: **Closing the gap on Wave Payments**. Lead with **value already delivered**, anchor **one pricing choice** (not five), end with **two bookable slots** this week. Tie to **renewal window** so scarcity feels real, not gimmicky. Hook live CRM notes when the API exists.";
    case "task":
      return "**Push:** lock one outcome before EOD. Suggested task: **Send revised proposal to Wave Payments**, due **today 16:00**, owner **you**, link **Deal · Wave Payments**. Small shipped tasks compound into **forecast you can trust**.";
    default:
      return genericReply();
  }
}

function genericReply(): string {
  return [
    "I'm still a **preview agent** (no live model). To push sales harder once wired: ask **\"what's my next revenue move?\"** or **\"how do I unstick pipeline?\"**.",
    "",
    "Plug **Vercel AI SDK** + deals/leads/tasks APIs so I can rank **who to call first** and draft outreach from real rows.",
  ].join("\n");
}

function replyForUserText(text: string): string {
  const t = text.toLowerCase();
  if (
    /next\b|priorit|what.*do|sell more|more sales|revenue|grow pipeline|forecast/.test(
      t,
    )
  ) {
    return replyForAction("next_sale");
  }
  if (
    /pipeline|stuck|stale|hygiene|qualif|negotiat|velocity|unstick/.test(t)
  ) {
    return replyForAction("pipeline");
  }
  if (/meet|calendar|invite|slot|book\b/.test(t)) return replyForAction("meet");
  if (/email|mail|draft|inbox|outreach/.test(t)) return replyForAction("email");
  if (/task|todo|follow|remind|close.loop/.test(t))
    return replyForAction("task");
  return genericReply();
}

function BoldChunks({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-foreground font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MessageBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {lines.map((line, i) => (
        <p key={i} className={line === "" ? "min-h-[0.35rem]" : ""}>
          {line ? <BoldChunks text={line} /> : "\u00a0"}
        </p>
      ))}
    </div>
  );
}

const INTRO = [
  "I'm here to **push what closes revenue**, not busywork.",
  "",
  "Ask **what to do next** to grow sales, or tap **Next revenue move** for a stacked priority list (calls, deals, leads). Everything below is **demo copy** until you wire CRM data + an AI backend.",
].join("\n");

export function AiAssistantDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: crypto.randomUUID(), role: "assistant", content: INTRO },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, typing, scrollToEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        if (
          target?.closest("[data-ai-assistant-input]") ||
          target?.closest("[contenteditable=true]")
        ) {
          return;
        }
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pushAssistant = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content },
    ]);
  }, []);

  const pushUser = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);
  }, []);

  const runReply = useCallback(
    (reply: string) => {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        pushAssistant(reply);
      }, 520);
    },
    [pushAssistant],
  );

  const handleQuickAction = useCallback(
    (id: string, label: string) => {
      pushUser(label);
      runReply(replyForAction(id));
    },
    [pushUser, runReply],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = input.trim();
      if (!t) return;
      setInput("");
      pushUser(t);
      runReply(replyForUserText(t));
    },
    [input, pushUser, runReply],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setMessages([
        { id: crypto.randomUUID(), role: "assistant", content: INTRO },
      ]);
      setTyping(false);
      setInput("");
    }
  }, []);

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className={cn(
            "flex h-full max-h-dvh flex-col gap-0 border-white/[0.08] bg-[color-mix(in_oklab,var(--popover)_96%,transparent)] p-0 backdrop-blur-xl sm:max-w-none md:max-w-[440px]",
          )}
        >
          <SheetHeader className="border-sidebar-border shrink-0 gap-1 border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/35 via-primary/15 to-transparent ring-1 ring-primary/30">
                <Sparkles className="text-primary size-[22px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold tracking-tight">
                  NordFlow Agent
                </SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs leading-snug">
                  Sales copilot preview · ⌘K / Ctrl+K · mock nudges only
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 px-4 py-4 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-220px)]">
            <div className="space-y-4 pr-2 pb-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] px-4 py-3 text-[13px] leading-relaxed rounded-2xl",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "border-sidebar-border bg-[color-mix(in_oklab,var(--card)_70%,transparent)] border border-white/[0.06] text-foreground/95 rounded-bl-md",
                    )}
                  >
                    <MessageBody text={m.content} />
                  </div>
                </div>
              ))}
              {typing ? (
                <div className="flex justify-start">
                  <div className="border-sidebar-border flex gap-1 rounded-2xl rounded-bl-md border border-white/[0.06] bg-[color-mix(in_oklab,var(--card)_55%,transparent)] px-4 py-3">
                    <span className="bg-primary/70 size-2 animate-pulse rounded-full" />
                    <span className="bg-primary/50 size-2 animate-pulse rounded-full [animation-delay:150ms]" />
                    <span className="bg-primary/35 size-2 animate-pulse rounded-full [animation-delay:300ms]" />
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <div className="border-sidebar-border shrink-0 space-y-3 border-t border-white/[0.06] px-4 py-4">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
              Push sales
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleQuickAction(id, label)}
                  className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 border-0 border-b border-white/20 px-0 pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors hover:border-primary/55"
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex gap-2 pt-1"
              data-ai-assistant-input
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What should I do next to sell more?"
                autoComplete="off"
                className="h-11 flex-1 rounded-full border-white/[0.1] bg-[color-mix(in_oklab,var(--secondary)_55%,transparent)] px-4 text-sm shadow-none focus-visible:ring-primary/30 [&::placeholder]:text-foreground/45"
              />
              <Button
                type="submit"
                variant="solid"
                size="icon"
                className="size-11 shrink-0 rounded-full"
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 sm:right-6 md:right-8">
        <span className="text-muted-foreground pointer-events-none rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] tracking-wide backdrop-blur-sm">
          ⌘K
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "pointer-events-auto flex size-14 items-center justify-center rounded-full",
            "bg-gradient-to-br from-primary via-primary to-[color-mix(in_oklab,var(--chart-2)_75%,var(--primary))]",
            "text-primary-foreground shadow-lg ring-2 ring-white/[0.12] transition-transform hover:scale-[1.03]",
            "focus-visible:ring-primary focus-visible:ring-offset-background active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
          aria-label="Open sales copilot"
        >
          <Sparkles className="size-7" aria-hidden />
        </button>
      </div>
    </>
  );
}
