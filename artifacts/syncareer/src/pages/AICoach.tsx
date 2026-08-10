
import React, { useState, useRef, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ai-coach/ChatMessage";
import { ChatInput } from "@/components/ai-coach/ChatInput";
import { TypingIndicator } from "@/components/ai-coach/TypingIndicator";
import { QuickActions } from "@/components/ai-coach/QuickActions";
import { CareerInsightsPanel } from "@/components/ai-coach/CareerInsightsPanel";
import { useAICoachAccess } from "@/hooks/useSubscription";
import { checkFeatureAccessServer, FREE_LIMITS } from "@/lib/featureAccess";
import { } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle } from "lucide-react";
import { useUserContext } from "@/hooks/useUserContext";
import AnimatedSection from "@/components/landing/AnimatedSection";

type Message = { role: "user" | "assistant"; content: string };

function buildGreeting(context: ReturnType<typeof useUserContext>['context']): string {
  if (!context) {
    return "Hello! I'm SynAI, your career intelligence assistant. How can I help you today?";
  }

  const name = context.fullName ? `, ${context.fullName.split(' ')[0]}` : '';
  const hasProfile = context.major || context.skills.length > 0 || context.primaryInterest;

  if (hasProfile) {
    const parts: string[] = [];
    if (context.major) parts.push(`your ${context.degree || 'degree'} in ${context.major}`);
    if (context.primaryInterest) parts.push(`your ${context.primaryInterest} interests`);
    if (context.skills.length > 0) parts.push(`${context.skills.length} skills on your profile`);

    const contextSummary = parts.length > 0
      ? `I can see ${parts.join(', ')}. `
      : '';

    return `Hello${name}! I'm SynAI, your career intelligence assistant. ${contextSummary}Ask me about career paths, skill gaps, interview prep, or CV improvements and I'll give you advice tailored to your profile.`;
  }

  return `Hello${name}! I'm SynAI, your career intelligence assistant. Complete your profile to get personalized career guidance. How can I help you today?`;
}

export default function AICoach() {
  const { context: userContext, loading: contextLoading } = useUserContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { allowed, used, limit, loading: accessLoading, isPremium, refetchUsage } = useAICoachAccess();

  // Set greeting once user context loads
  useEffect(() => {
    if (!contextLoading) {
      setMessages([{ role: "assistant", content: buildGreeting(userContext) }]);
    }
  }, [contextLoading, userContext]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-guidance`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Authentication required", description: "Please sign in to use the AI coach.", variant: "destructive" });
        return;
      }

      // Track usage for free users
      if (!isPremium && session.user) {
        await checkFeatureAccessServer('ai_coach_session', true);
        refetchUsage?.();
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          userContext: userContext ?? undefined,
        }),
      });

      if (resp.status === 429) { toast({ title: "Rate limit exceeded", description: "Please try again in a moment.", variant: "destructive" }); return; }
      if (resp.status === 402) { toast({ title: "Usage limit reached", description: "Please contact support to continue.", variant: "destructive" }); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: "assistant", content: assistantContent };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage ?? input).trim();
    if (!userMessage || isLoading) return;

    // Block free users who've hit the limit
    if (!accessLoading && !isPremium && !allowed) {
      toast({
        title: "Monthly limit reached",
        description: `Free plan allows ${FREE_LIMITS.ai_coach_session.limit} sessions/month. Upgrade to Premium for unlimited access.`,
        variant: "destructive",
      });
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    await streamChat(userMessage);
    setIsLoading(false);
  };

  const showQuickActions = messages.length <= 1;
  const isLimited = !accessLoading && !isPremium && typeof used === "number" && typeof limit === "number";
  const sessionsLeft = isLimited ? Math.max(0, (limit as number) - (used as number)) : null;

  return (
    <PageLayout title="SynAI" breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Practice", to: "/practice" }, { label: "SynAI" }]}>
      <div className="h-[calc(100vh-12rem)] flex gap-4">
        {/* Main chat area */}
        <AnimatedSection y={20} className="flex-1 flex">
        <Card className="flex-1 flex flex-col p-4 bg-card overflow-hidden">
          {/* Usage banner for free users */}
          {isLimited && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-md mb-3 text-sm ${
              sessionsLeft === 0
                ? "bg-destructive/10 border border-destructive/20 text-destructive"
                : sessionsLeft! <= 2
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted border border-border text-muted-foreground"
            }`}>
              <div className="flex items-center gap-2">
                {sessionsLeft === 0
                  ? <AlertCircle className="h-4 w-4" />
                  : <Sparkles className="h-4 w-4" />
                }
                <span>
                  {sessionsLeft === 0
                    ? "Monthly session limit reached"
                    : `${sessionsLeft} of ${limit} free sessions remaining this month`}
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/pricing')}>
                Upgrade
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} role={msg.role} content={msg.content} />
              ))}
              {isLoading && <TypingIndicator />}
            </div>
          </ScrollArea>

          {showQuickActions && (
            <div className="mb-2 mt-2">
              <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
              <QuickActions onSelect={(prompt) => handleSend(prompt)} disabled={isLoading || (!isPremium && !allowed && !accessLoading)} />
            </div>
          )}

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            isLoading={isLoading}
            disabled={!accessLoading && !isPremium && !allowed}
          />
        </Card>
        </AnimatedSection>

        {/* Career insights sidebar */}
        <AnimatedSection delay={0.08} y={20} className="hidden lg:flex w-72 shrink-0">
          <div className="flex flex-col w-full gap-3 overflow-y-auto">
            <CareerInsightsPanel />
          </div>
        </AnimatedSection>
      </div>
    </PageLayout>
  );
}
