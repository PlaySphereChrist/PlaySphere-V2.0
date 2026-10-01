import { useState } from 'react';
import {
  Sparkles, X, CheckCircle2, AlertCircle, XCircle, ArrowRight,
  Trophy, MapPin, ShieldAlert, RefreshCw
} from 'lucide-react';
import { generateTournamentDraft } from '../features/tournaments/api';
import { PsButton, PsAlert } from './ui';

const SAMPLE_PROMPTS = [
  {
    label: '⚽ 16-Team Weekend Football Cup',
    text: 'Indiranagar Monsoon Football Cup on October 10th to 12th. 16 teams single knockout, ₹2,500 entry fee and ₹25,000 prize pool. Players must be at least 16 years old.',
  },
  {
    label: '🏸 Badminton Singles Open (18+)',
    text: 'Bengaluru Badminton Singles Open next month at Koramangala. 8 players knockout format, 500 entry fee, 5000 prize pool. Minimum age 18.',
  },
  {
    label: '🏏 Corporate Cricket League',
    text: 'Bangalore Corporate Cricket League starting next month. 8 teams round robin format with group stages, ₹5,000 entry per team and ₹40,000 prize pool.',
  },
  {
    label: '🏀 3v3 Basketball Showdown',
    text: 'Indiranagar 3v3 Basketball Challenge on Oct 20-21. 8 teams knockout, open to men and women, 1000 entry fee, 8000 prize pool.',
  },
];

export default function TournamentCopilotModal({ isOpen, onClose, onApplyDraft }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async (textToUse) => {
    const activeText = typeof textToUse === 'string' ? textToUse : prompt;
    if (!activeText.trim()) {
      setError('Please describe your tournament.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await generateTournamentDraft(activeText.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to generate draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChip = (text) => {
    setPrompt(text);
    handleGenerate(text);
  };

  const handleApply = () => {
    if (!result?.draft) return;
    onApplyDraft(result);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-modal-title"
    >
      <div
        className="w-full max-w-2xl my-8 rounded-2xl border border-border bg-surface shadow-2xl p-6 sm:p-7 space-y-6 transition-all"
        style={{ background: 'var(--surface)' }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon/10 border border-maroon/20 flex items-center justify-center text-maroon shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="copilot-modal-title" className="text-xl font-serif font-bold text-primary flex items-center gap-2">
                Tournament Setup Copilot
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Describe your event in plain language. AI drafts the form, formats, and rules, validated by PlaySphere.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-secondary hover:bg-pill-hover hover:text-primary transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && <PsAlert variant="error">{error}</PsAlert>}

        {/* Input prompt view */}
        <div className="space-y-4">
          <div>
            <label htmlFor="copilot-prompt" className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
              Event Description
            </label>
            <textarea
              id="copilot-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 16-team weekend football cup at Indiranagar next month, ₹2,500 entry with ₹25,000 prize pool, players must be 16+..."
              className="w-full rounded-xl border border-border bg-surface text-primary placeholder-muted p-3 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 transition resize-none"
              disabled={loading}
            />
          </div>

          {/* Quick-start Chips */}
          <div>
            <p className="text-xs text-secondary mb-2">Or try an example prompt:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectChip(sample.text)}
                  disabled={loading}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-border text-secondary hover:bg-pill-hover hover:text-primary transition"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            {result && (
              <PsButton
                variant="secondary"
                size="sm"
                onClick={() => { setResult(null); setPrompt(''); }}
              >
                Clear
              </PsButton>
            )}
            <PsButton
              variant="primary"
              size="sm"
              disabled={loading || !prompt.trim()}
              onClick={() => handleGenerate(prompt)}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Drafting Event...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> {result ? 'Regenerate Draft' : 'Draft Tournament'}
                </>
              )}
            </PsButton>
          </div>
        </div>

        {/* Results Preview */}
        {result?.draft && (
          <div className="space-y-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                <Trophy size={15} className="text-gold" /> AI Draft Proposal
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-border text-secondary capitalize">
                Engine: {result.source || 'Verified'}
              </span>
            </div>

            {/* Extracted Fields Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-surface-elevated text-xs">
              <div>
                <span className="text-secondary block">Name</span>
                <strong className="text-primary font-medium truncate block">{result.draft.name}</strong>
              </div>
              <div>
                <span className="text-secondary block">Sport & Format</span>
                <strong className="text-primary font-medium block">
                  {result.draft.sport_name} · <span className="capitalize">{result.draft.format.replace(/_/g, ' ')}</span>
                </strong>
              </div>
              <div>
                <span className="text-secondary block">Bracket Size</span>
                <strong className="text-primary font-medium block">
                  {result.draft.max_teams} {result.draft.participation_type === 'team' ? 'teams' : 'players'}
                </strong>
              </div>
              <div>
                <span className="text-secondary block">Entry / Prize</span>
                <strong className="text-primary font-medium block">
                  ₹{result.draft.registration_fee} / ₹{result.draft.prize_pool}
                </strong>
              </div>
              <div>
                <span className="text-secondary block">City / Venue</span>
                <strong className="text-primary font-medium truncate block">
                  {result.draft.city || 'Bangalore'} {result.draft.venue_details ? `· ${result.draft.venue_details}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-secondary block">Tournament Dates</span>
                <strong className="text-primary font-medium truncate block">
                  {result.draft.starts_at ? result.draft.starts_at.replace('T', ' ') : 'Upcoming'}
                </strong>
              </div>
            </div>

            {/* Validation & Rule Checks */}
            {result.validation?.checklist && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  PlaySphere App Verification
                </h4>
                <div className="space-y-1.5">
                  {result.validation.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs p-2 rounded-lg border border-border/80 bg-surface"
                    >
                      {item.status === 'pass' && <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />}
                      {item.status === 'warning' && <AlertCircle size={15} className="text-gold shrink-0 mt-0.5" />}
                      {item.status === 'error' && <XCircle size={15} className="text-error shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <span className="font-semibold text-primary mr-1.5">{item.label}:</span>
                        <span className="text-secondary">{item.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Eligibility Rules */}
            {result.eligibility_rules?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={13} /> Suggested Eligibility Rules
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.eligibility_rules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-maroon/20 bg-maroon/5 text-maroon"
                    >
                      <strong>{rule.rule_type.replace(/_/g, ' ')}:</strong> {rule.rule_value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Venue Suggestions */}
            {result.venue_suggestions?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Recommended Grounds in PlaySphere
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.venue_suggestions.slice(0, 2).map((ground) => (
                    <div
                      key={ground.id}
                      className="p-2.5 rounded-xl border border-border text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <strong className="text-primary font-medium block truncate">{ground.name}</strong>
                        <span className="text-secondary block truncate">{ground.address || ground.city}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success shrink-0 font-medium">
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-secondary">
                You can review and modify any field in the form before publishing.
              </span>
              <PsButton variant="primary" size="md" onClick={handleApply}>
                Apply to Form <ArrowRight size={15} />
              </PsButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
