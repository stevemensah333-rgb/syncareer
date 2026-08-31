import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mentorshipApi, type AdminMentorVerification } from '@/features/mentorship/api';
import { toast } from 'sonner';

export default function MentorVerification() {
  const [items, setItems] = useState<AdminMentorVerification[]>([]);
  const [company, setCompany] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => mentorshipApi.adminVerifications().then((data) => { setItems(data); setCompany(Object.fromEntries(data.map((item) => [item.id, item.canonical_company_name ?? item.claimed_organization]))); }).catch(() => toast.error('Verification queue could not be loaded.'));
  useEffect(() => { void load(); }, []);
  const decide = async (item: AdminMentorVerification, decision: 'approved' | 'rejected' | 'revoked') => { if (decision === 'approved' && !company[item.id]?.trim()) { toast.error('Confirm the company name.'); return; } if (decision === 'rejected' && !reason[item.id]?.trim()) { toast.error('Add a rejection reason.'); return; } setBusy(item.id); try { await mentorshipApi.decideVerification(item.id, decision, company[item.id], reason[item.id]); await load(); toast.success(`Mentor ${decision}`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Decision could not be saved.'); } finally { setBusy(null); } };
  return <AdminLayout title="Mentor verification"><div className="space-y-4"><div><h1 className="text-2xl font-semibold">Company-email verification</h1><p className="text-sm text-muted-foreground">Confirm the organization behind each mentor’s authenticated email domain.</p></div>{items.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No verification submissions.</CardContent></Card>}{items.map((item) => <Card key={item.id}><CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-2"><div className="flex items-center gap-2"><h2 className="font-semibold">{item.full_name}</h2><Badge variant="secondary">{item.status}</Badge></div><p className="text-sm">{item.current_role}</p><p className="text-sm text-muted-foreground">{item.organization_email} · domain {item.email_domain}</p><p className="text-sm text-muted-foreground">Claimed organization: {item.claimed_organization}</p><p className="text-sm">{item.bio}</p><div className="flex flex-wrap gap-1">{item.expertise_tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div></div><div className="space-y-3"><div className="space-y-2"><Label htmlFor={`company-${item.id}`}>Canonical company name</Label><Input id={`company-${item.id}`} value={company[item.id] ?? ''} onChange={(e) => setCompany({ ...company, [item.id]: e.target.value })} /></div><div className="space-y-2"><Label htmlFor={`reason-${item.id}`}>Rejection reason</Label><Textarea id={`reason-${item.id}`} value={reason[item.id] ?? ''} onChange={(e) => setReason({ ...reason, [item.id]: e.target.value })} /></div><div className="flex gap-2">{item.status !== 'approved' && <Button disabled={busy === item.id} onClick={() => decide(item, 'approved')}>Approve</Button>}{item.status === 'approved' ? <Button variant="destructive" disabled={busy === item.id} onClick={() => decide(item, 'revoked')}>Revoke</Button> : <Button variant="outline" disabled={busy === item.id} onClick={() => decide(item, 'rejected')}>Reject</Button>}</div></div></CardContent></Card>)}</div></AdminLayout>;
}
