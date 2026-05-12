import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Palette, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PORTFOLIO_TEMPLATES, parseDesignTokens, type TemplateId } from '@/lib/portfolioTemplates';

interface Settings {
  template: TemplateId;
  accent_color: string;
  headline: string;
  subheadline: string;
  contact_email: string;
  available_for: string;
  cv_url: string;
  og_image_url: string;
  external_portfolio_url: string;
}

const DEFAULT: Settings = {
  template: 'minimal',
  accent_color: '#0FB5B5',
  headline: '',
  subheadline: '',
  contact_email: '',
  available_for: '',
  cv_url: '',
  og_image_url: '',
  external_portfolio_url: '',
};

export function PortfolioCustomizer({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [tokensInput, setTokensInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('portfolio_settings' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setSettings({ ...DEFAULT, ...(data as any) });
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('portfolio_settings' as any)
      .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast.error('Failed to save customization');
      return;
    }
    toast.success('Portfolio customization saved');
  };

  const importTokens = () => {
    const tokens = parseDesignTokens(tokensInput);
    if (!tokens) {
      toast.error('Could not parse JSON. Paste an export from Figma Tokens Studio.');
      return;
    }
    setSettings((s) => ({
      ...s,
      accent_color: tokens.accent || s.accent_color,
    }));
    toast.success('Design tokens imported');
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" /> Customize Public Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template */}
        <div className="space-y-2">
          <Label className="text-xs">Template</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(PORTFOLIO_TEMPLATES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, template: t.id }))}
                className={`text-left border rounded-md p-2 text-xs transition-colors ${
                  settings.template === t.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold">{t.name}</div>
                <div className="text-muted-foreground line-clamp-2">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <Label className="text-xs">Accent color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={settings.accent_color}
              onChange={(e) => setSettings((s) => ({ ...s, accent_color: e.target.value }))}
              className="h-9 w-14 p-1"
            />
            <Input
              value={settings.accent_color}
              onChange={(e) => setSettings((s) => ({ ...s, accent_color: e.target.value }))}
              className="flex-1"
            />
          </div>
        </div>

        {/* Headline / sub */}
        <div className="space-y-2">
          <Label className="text-xs">Headline</Label>
          <Input
            placeholder="Frontend Engineer building delightful UIs"
            value={settings.headline}
            onChange={(e) => setSettings((s) => ({ ...s, headline: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Subheadline</Label>
          <Textarea
            rows={2}
            placeholder="Final-year CS student at KNUST. React, TypeScript, design systems."
            value={settings.subheadline}
            onChange={(e) => setSettings((s) => ({ ...s, subheadline: e.target.value }))}
          />
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs">Contact email</Label>
            <Input
              type="email"
              placeholder="you@email.com"
              value={settings.contact_email}
              onChange={(e) => setSettings((s) => ({ ...s, contact_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Available for</Label>
            <Input
              placeholder="Internships · Junior roles"
              value={settings.available_for}
              onChange={(e) => setSettings((s) => ({ ...s, available_for: e.target.value }))}
            />
          </div>
        </div>

        {/* CV + OG */}
        <div className="space-y-2">
          <Label className="text-xs">CV download URL</Label>
          <Input
            placeholder="https://link-to-your-cv.pdf"
            value={settings.cv_url}
            onChange={(e) => setSettings((s) => ({ ...s, cv_url: e.target.value }))}
          />
          <p className="text-[11px] text-muted-foreground">Generate your CV in CV Builder, host the PDF (Drive, Dropbox), and paste the link.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Social preview image URL (1200×630)</Label>
          <Input
            placeholder="https://link-to-cover.jpg"
            value={settings.og_image_url}
            onChange={(e) => setSettings((s) => ({ ...s, og_image_url: e.target.value }))}
          />
        </div>

        {/* External wrap */}
        <div className="space-y-2">
          <Label className="text-xs">External portfolio URL (optional)</Label>
          <Input
            placeholder="https://yourname.com  · behance / notion / personal site"
            value={settings.external_portfolio_url}
            onChange={(e) => setSettings((s) => ({ ...s, external_portfolio_url: e.target.value }))}
          />
          <p className="text-[11px] text-muted-foreground">If set, your /u/{`{username}`} link wraps your existing site with a Syncareer header (CV, contact, endorsements stay on Syncareer).</p>
        </div>

        {/* Tokens import */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Import design tokens (Figma Tokens Studio JSON)
          </Label>
          <Textarea
            rows={3}
            placeholder='{"accent":"#FF3366","headingFont":"Inter"}'
            value={tokensInput}
            onChange={(e) => setTokensInput(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={importTokens} disabled={!tokensInput.trim()}>
            Import tokens
          </Button>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save customization'}
        </Button>
      </CardContent>
    </Card>
  );
}
