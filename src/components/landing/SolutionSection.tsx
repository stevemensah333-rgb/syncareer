import { Brain, FileText, Mic } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const features = [
  {
    icon: Brain,
    title: "Career Assessment",
    description: "Take a 45-question RIASEC assessment and get matched to careers that fit your personality, skills, and interests.",
    accent: "text-primary bg-primary/10",
  },
  {
    icon: FileText,
    title: "CV Builder",
    description: "Build a professional, ATS-friendly CV that passes screening filters and gets you callbacks from employers.",
    accent: "text-secondary bg-secondary/10",
  },
  {
    icon: Mic,
    title: "Interview Simulator",
    description: "Practice realistic voice interviews with SynAssist and get structured feedback to walk into your interview confident.",
    accent: "text-accent bg-accent/10",
  },
];

export default function SolutionSection() {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <AnimatedSection className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-sm font-medium text-primary mb-3 uppercase tracking-[0.2em]">What You Get</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Three tools to get you hired
          </h2>
          <p className="text-muted-foreground text-lg">
            No fluff. Just the tools students actually need to land their first role.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.08}>
              <div className="group rounded-2xl p-6 h-full border border-border bg-card hover:border-primary/20 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl ${feature.accent.split(" ")[1]} flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-5 w-5 ${feature.accent.split(" ")[0]}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
