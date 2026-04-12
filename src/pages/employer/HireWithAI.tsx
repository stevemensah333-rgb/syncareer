import { useState, useRef, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ai-coach/ChatMessage";
import { ChatInput } from "@/components/ai-coach/ChatInput";
import { TypingIndicator } from "@/components/ai-coach/TypingIndicator";
import { TalentRecommendationsPanel } from "@/components/hire-ai/TalentRecommendationsPanel";
import { HireQuickActions } from "@/components/hire-ai/HireQuickActions";

type Message = { role: "user" | "assistant"; content: string };

export default function HireWithAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI hiring assistant. I can help you find candidates, craft job descriptions, screen applications, and provide talent market insights. How can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        toast({ title: "Authentication required", description: "Please sign in to use the AI hiring assistant.", variant: "destructive" });
        return;
      }

      const systemContext = `You are an AI hiring assistant for employers on the Syncareer platform. Your sole purpose is to assist with hiring and talent acquisition.

Topics you handle: candidate screening, job description writing, salary benchmarks, talent market insights, interview question suggestions, evaluating candidate profiles, employer branding, onboarding planning, and workforce planning.

SCOPE ENFORCEMENT — CRITICAL:
If the employer asks anything unrelated to hiring, recruitment, or talent management, respond with:
"I'm your Syncareer hiring assistant — focused exclusively on recruitment and talent acquisition. That topic is outside what I can help with. If you have questions about finding candidates, writing job descriptions, or market insights, I'm ready to assist."

Always be professional, data-driven, and focused on helping employers make informed hiring decisions.`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemContext },
            ...messages,
            { role: "user", content: userMessage }
          ]
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

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    await streamChat(userMessage);
    setIsLoading(false);
  };

  const showQuickActions = messages.length <= 1;

  return (
    <PageLayout title="Hire with AI">
      <div className="h-[calc(100vh-12rem)] flex gap-4">
        {/* Main chat area */}
        <Card className="flex-1 flex flex-col p-4 bg-card">
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
              <HireQuickActions onSelect={(prompt) => handleSend(prompt)} disabled={isLoading} />
            </div>
          )}

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            isLoading={isLoading}
          />
        </Card>

        {/* Talent insights sidebar - hidden on mobile */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 gap-3 overflow-y-auto">
          <TalentRecommendationsPanel />
        </div>
      </div>
    </PageLayout>
  );
}
