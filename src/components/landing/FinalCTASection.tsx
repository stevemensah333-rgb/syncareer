import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";

export default function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-primary/5 p-12 md:p-20 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

            <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 max-w-2xl mx-auto leading-tight">
              Take Your Free Career Assessment
            </h2>
            <p className="relative text-lg text-muted-foreground max-w-xl mx-auto mb-9">
              5 minutes. No sign-up required. Discover which careers fit you best.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/assessment')}
              className="relative rounded-full px-8 h-12 text-base gap-2"
            >
              Start Assessment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
