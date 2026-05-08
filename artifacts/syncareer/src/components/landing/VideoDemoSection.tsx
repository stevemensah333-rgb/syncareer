import AnimatedSection from "./AnimatedSection";

const DEMO_VIDEO_URL = "https://fsorkxlcasekndigezlx.supabase.co/storage/v1/object/public/videos/demo-video.mp4";

export default function VideoDemoSection() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            See Syncareer in Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From career assessment to interview practice in under 5 minutes
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-border bg-card shadow-2xl shadow-black/10">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground max-w-md mx-auto text-center">
                    syncareer.lovable.app
                  </div>
                </div>
              </div>
              <div className="relative aspect-video bg-foreground/5">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={DEMO_VIDEO_URL} type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
