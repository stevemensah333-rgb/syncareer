import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, Filter, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackRow {
  id: string;
  user_id: string;
  feature_name: string;
  response_type: string;
  comment: string | null;
  created_at: string;
}

const FEATURE_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  cv_builder: 'CV Builder',
  interview_simulator: 'Interview Simulator',
  cv_strength_score: 'CV Strength Score',
};

const FeedbackDashboard = () => {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.functions.invoke('admin-feedback', {
        body: { action: 'delete', feedback_id: id },
      });
      setFeedback(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('admin-feedback', {
          body: { feature_filter: featureFilter, date_range: dateRange },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setFeedback((data?.data as FeedbackRow[]) || []);
      } catch (err: any) {
        setError('Failed to load feedback data.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [featureFilter, dateRange]);

  const stats = useMemo(() => {
    const total = feedback.length;
    const positive = feedback.filter(f => f.response_type === 'positive').length;
    const negative = feedback.filter(f => f.response_type === 'negative').length;
    const withComments = feedback.filter(f => f.comment).length;
    return { total, positive, negative, withComments, positiveRate: total ? Math.round((positive / total) * 100) : 0 };
  }, [feedback]);

  const featureBreakdown = useMemo(() => {
    const map: Record<string, { positive: number; negative: number }> = {};
    feedback.forEach(f => {
      if (!map[f.feature_name]) map[f.feature_name] = { positive: 0, negative: 0 };
      map[f.feature_name][f.response_type as 'positive' | 'negative']++;
    });
    return Object.entries(map).map(([name, counts]) => ({
      name: FEATURE_LABELS[name] || name,
      positive: counts.positive,
      negative: counts.negative,
      total: counts.positive + counts.negative,
      rate: Math.round((counts.positive / (counts.positive + counts.negative)) * 100),
    }));
  }, [feedback]);

  const topKeywords = useMemo(() => {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'to', 'and', 'of', 'in', 'for', 'was', 'not', 'i', 'my', 'me', 'this', 'that', 'with', 'on', 'but', 'be', 'have', 'had', 'do', 'did', 'so', 'too', 'very']);
    const words: Record<string, number> = {};
    feedback
      .filter(f => f.response_type === 'negative' && f.comment)
      .forEach(f => {
        f.comment!.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
          if (w.length > 2 && !stopWords.has(w)) {
            words[w] = (words[w] || 0) + 1;
          }
        });
      });
    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }, [feedback]);

  const filteredComments = useMemo(() => {
    let items = feedback.filter(f => f.comment);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(f => f.comment!.toLowerCase().includes(q));
    }
    return items;
  }, [feedback, searchQuery]);

  const pieData = [
    { name: 'Positive', value: stats.positive, color: 'hsl(142, 71%, 45%)' },
    { name: 'Negative', value: stats.negative, color: 'hsl(0, 84%, 60%)' },
  ];

  if (loading) {
    return (
      <AdminLayout title="Feedback Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading feedback data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Feedback Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Feedback Dashboard">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={featureFilter} onValueChange={setFeatureFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Features" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Features</SelectItem>
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ThumbsUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.positiveRate}%</p>
                  <p className="text-xs text-muted-foreground">Positive Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ThumbsDown className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{stats.negative}</p>
                  <p className="text-xs text-muted-foreground">Negative</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-accent-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.withComments}</p>
                  <p className="text-xs text-muted-foreground">With Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              {featureBreakdown.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="positive" fill="hsl(142, 71%, 45%)" name="Positive" stackId="a" />
                      <Bar dataKey="negative" fill="hsl(0, 84%, 60%)" name="Negative" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No feedback data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total > 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {topKeywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Complaint Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topKeywords.map(({ word, count }) => (
                  <Badge key={word} variant="outline" className="text-sm">
                    {word} <span className="ml-1 text-muted-foreground">({count})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Comments</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search comments..."
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredComments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-auto">
                {filteredComments.map(f => (
                  <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    {f.response_type === 'positive' ? (
                      <ThumbsUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {FEATURE_LABELS[f.feature_name] || f.feature_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(f.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{f.comment}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      title="Delete feedback"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No comments found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default FeedbackDashboard;
