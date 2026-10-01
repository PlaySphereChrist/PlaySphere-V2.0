/* global FormData */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  createTournament,
  getTournament,
  updateTournament,
  createTournamentEligibilityRule
} from '../../../features/tournaments/api';
import { Sparkles, MessageSquare, Info } from 'lucide-react';
import TournamentCopilotModal from '../../../components/TournamentCopilotModal';
import { getSports } from '../../../features/sports/api';
import { uploadImage } from '../../../features/uploads/api';
import { localDateTimeToISOString, toDateTimeLocal } from '../../../utils/dateTime';
import { resolveDemoImageUrl } from '../../../utils/demoImages';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsTextarea,
  PsAlert,
  PsPageHeader,
  PsLoading
} from '../../../components/ui';

export default function TournamentFormPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(tournamentId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sports, setSports] = useState([]);
  const [tournamentStatus, setTournamentStatus] = useState('draft');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [pendingEligibilityRules, setPendingEligibilityRules] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    sport_id: '',
    format: 'knockout',
    participation_type: 'team',
    description: '',
    city: '',
    venue_details: '',
    registration_fee: 0,
    prize_pool: 0,
    max_teams: '',
    min_teams: '',
    registration_opens_at: '',
    registration_closes_at: '',
    starts_at: '',
    ends_at: '',
    banner_url: '',
    community_name: '',
    community_banner_url: ''
  });

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const sportsRes = await getSports();
        setSports(sportsRes.data.sports);

        if (isEdit) {
          const tRes = await getTournament(tournamentId);
          const t = tRes.data.tournament;
          setTournamentStatus(t.status || 'draft');
          const formatDate = (ds) => toDateTimeLocal(ds);
          
          setFormData({
            name: t.name,
            sport_id: t.sport_id,
            format: t.format,
            participation_type: t.participation_type,
            description: t.description || '',
            city: t.city || '',
            venue_details: t.venue_details || '',
            registration_fee: t.registration_fee || 0,
            prize_pool: t.prize_pool || 0,
            max_teams: t.max_teams || '',
            min_teams: t.min_teams || '',
            registration_opens_at: formatDate(t.registration_opens_at),
            registration_closes_at: formatDate(t.registration_closes_at),
            starts_at: formatDate(t.starts_at),
            ends_at: formatDate(t.ends_at),
            banner_url: t.banner_url || '',
            community_name: t.community_name || `${t.name} Community`,
            community_banner_url: t.community_banner_url || ''
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [tournamentId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && (!prev.community_name || prev.community_name === `${prev.name} Community`)) {
        next.community_name = value ? `${value} Community` : '';
      }
      return next;
    });
  };

  const handleApplyCopilotDraft = (result) => {
    const { draft, eligibility_rules } = result;
    setFormData(prev => ({
      ...prev,
      name: draft.name || prev.name,
      sport_id: draft.sport_id || prev.sport_id,
      format: draft.format || prev.format,
      participation_type: draft.participation_type || prev.participation_type,
      description: draft.description || prev.description,
      city: draft.city || prev.city,
      venue_details: draft.venue_details || prev.venue_details,
      registration_fee: draft.registration_fee ?? prev.registration_fee,
      prize_pool: draft.prize_pool ?? prev.prize_pool,
      max_teams: draft.max_teams || prev.max_teams,
      min_teams: draft.min_teams || prev.min_teams,
      registration_opens_at: draft.registration_opens_at || prev.registration_opens_at,
      registration_closes_at: draft.registration_closes_at || prev.registration_closes_at,
      starts_at: draft.starts_at || prev.starts_at,
      ends_at: draft.ends_at || prev.ends_at,
      community_name: prev.community_name || (draft.name ? `${draft.name} Community` : '')
    }));
    if (Array.isArray(eligibility_rules) && eligibility_rules.length > 0) {
      setPendingEligibilityRules(eligibility_rules);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...formData };
      ['max_teams', 'min_teams', 'registration_fee', 'prize_pool'].forEach(f => {
        if (payload[f] === '') payload[f] = null;
        else if (payload[f] !== null) payload[f] = Number(payload[f]);
      });
      ['registration_opens_at', 'registration_closes_at', 'starts_at', 'ends_at'].forEach(f => {
        if (!payload[f]) payload[f] = null;
        else payload[f] = localDateTimeToISOString(payload[f]);
      });

      let res;
      if (isEdit) {
        res = await updateTournament(tournamentId, payload);
      } else {
        res = await createTournament(payload);
        if (pendingEligibilityRules.length > 0 && res.data?.tournament?.id) {
          for (const rule of pendingEligibilityRules) {
            try {
              await createTournamentEligibilityRule(res.data.tournament.id, rule);
            } catch (ruleErr) {
              console.warn('Failed to auto-create copilot eligibility rule:', ruleErr);
            }
          }
        }
      }
      navigate(`/organizer/tournaments/${res.data.tournament.id}/manage`);
    } catch (err) {
      setError(err.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PsLoading />;

  const isLocked = isEdit && tournamentStatus !== 'draft';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PsPageHeader 
        title={isEdit ? 'Edit Tournament' : 'Create Tournament'} 
        actions={
          <div className="flex items-center gap-2">
            {!isEdit && (
              <PsButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-1.5 border-maroon/30 text-maroon hover:bg-maroon/10"
              >
                <Sparkles size={14} /> AI Setup Copilot
              </PsButton>
            )}
            <Link to="/organizer/tournaments">
              <PsButton variant="ghost">Cancel</PsButton>
            </Link>
          </div>
        }
      />

      {isLocked && (
        <PsAlert variant="info">
          <div className="flex items-start gap-2">
            <Info size={18} className="mt-0.5 shrink-0 text-accent-gold" />
            <div>
              <p className="font-semibold text-xs text-primary mb-1">
                Published Tournament ({tournamentStatus.replace(/_/g, ' ').toUpperCase()})
              </p>
              <p className="text-xs text-secondary">
                You can freely extend registration deadlines, update tournament timings, edit rules, prize pool, venue details, and community settings. Structural settings (sport, format, participation type) are locked to protect ongoing fixtures.
              </p>
            </div>
          </div>
        </PsAlert>
      )}

      {pendingEligibilityRules.length > 0 && !isEdit && (
        <PsAlert variant="info">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-primary mb-1">
                AI Copilot has staged {pendingEligibilityRules.length} eligibility rule{pendingEligibilityRules.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pendingEligibilityRules.map((rule, idx) => (
                  <span key={idx} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-surface border border-border text-secondary">
                    {rule.rule_type}: {rule.rule_value}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingEligibilityRules([])}
              className="text-xs text-secondary hover:text-primary underline ml-3"
            >
              Clear
            </button>
          </div>
        </PsAlert>
      )}

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <PsInput
                label="Tournament Name *"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <PsSelect
              label="Sport *"
              name="sport_id"
              required
              disabled={isLocked}
              value={formData.sport_id}
              onChange={handleChange}
            >
              <option value="">Select Sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </PsSelect>

            <PsSelect
              label="Format *"
              name="format"
              required
              disabled={isLocked}
              value={formData.format}
              onChange={handleChange}
            >
              <option value="knockout">Knockout</option>
              <option value="league">League</option>
              <option value="round_robin">Round Robin</option>
              <option value="group_stage_knockout">Group Stage & Knockout</option>
            </PsSelect>

            <PsSelect
              label="Participation Type *"
              name="participation_type"
              required
              disabled={isLocked}
              value={formData.participation_type}
              onChange={handleChange}
            >
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </PsSelect>
            
            <div className="sm:col-span-2">
              <PsTextarea
                label="Description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <PsInput
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
            
            <PsInput
              label="Venue Details"
              name="venue_details"
              value={formData.venue_details}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Opens At"
              type="datetime-local"
              name="registration_opens_at"
              value={formData.registration_opens_at}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Closes At"
              type="datetime-local"
              name="registration_closes_at"
              value={formData.registration_closes_at}
              onChange={handleChange}
            />

            <PsInput
              label="Tournament Starts At"
              type="datetime-local"
              name="starts_at"
              value={formData.starts_at}
              onChange={handleChange}
            />

            <PsInput
              label="Tournament Ends At"
              type="datetime-local"
              name="ends_at"
              value={formData.ends_at}
              onChange={handleChange}
            />

            <PsInput
              label={`Max Capacity (${formData.participation_type === 'team' ? 'Teams' : 'Players'})`}
              type="number"
              min="2"
              name="max_teams"
              value={formData.max_teams}
              onChange={handleChange}
            />

            <PsInput
              label={`Min Required (${formData.participation_type === 'team' ? 'Teams' : 'Players'})`}
              type="number"
              min="2"
              name="min_teams"
              value={formData.min_teams}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Fee (₹)"
              type="number"
              min="0"
              step="0.01"
              name="registration_fee"
              value={formData.registration_fee}
              onChange={handleChange}
            />

            <PsInput
              label="Prize Pool (₹)"
              type="number"
              min="0"
              step="0.01"
              name="prize_pool"
              value={formData.prize_pool}
              onChange={handleChange}
            />

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-primary mb-2">Tournament Banner Cover</label>
              <div className="flex items-center gap-4">
                {formData.banner_url ? (
                  <div className="relative w-32 h-20 rounded-md overflow-hidden bg-surface border border-border">
                    <img src={resolveDemoImageUrl(formData.banner_url)} alt="Banner Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFormData(prev => ({...prev, banner_url: ''}))} className="absolute top-1 right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100">✕</button>
                  </div>
                ) : (
                  <div className="w-32 h-20 rounded-md bg-surface border border-dashed border-border flex items-center justify-center text-xs text-secondary">
                    No Cover
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="banner-upload"
                    className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files || e.target.files.length === 0) return;
                      const file = e.target.files[0];
                      const uploadData = new FormData();
                      uploadData.append('image', file);
                      try {
                        const res = await uploadImage(uploadData);
                        setFormData(prev => ({...prev, banner_url: res.data.url}));
                      } catch (err) {
                        setError(err.message || 'Image upload failed');
                      }
                    }}
                  />
                  <label htmlFor="banner-upload" className="cursor-pointer inline-flex items-center justify-center bg-surface hover:bg-pill-hover border border-border text-primary font-medium px-4 py-2 rounded-md text-sm transition">
                    Upload Cover Image
                  </label>
                </div>
              </div>
            </div>

            {/* Dedicated Community Section for Updates & Announcements */}
            <div className="sm:col-span-2 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-accent-gold" />
                <h3 className="text-base font-serif font-semibold text-primary">
                  Tournament Community Hub
                </h3>
              </div>
              <p className="text-xs text-secondary mb-4">
                An official community is automatically created with your tournament. It is required for publishing match announcements, schedule updates, team notices, and answering player questions.
              </p>

              <div className="space-y-4 rounded-xl bg-pill-hover/50 p-4 border border-border">
                <PsInput
                  label="Community Name *"
                  name="community_name"
                  required
                  placeholder="e.g. Hyderabad Premier Cup Official Community"
                  value={formData.community_name}
                  onChange={handleChange}
                />

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">Community Header Banner</label>
                  <div className="flex items-center gap-4">
                    {formData.community_banner_url ? (
                      <div className="relative w-32 h-16 rounded-md overflow-hidden bg-surface border border-border">
                        <img src={resolveDemoImageUrl(formData.community_banner_url)} alt="Community Banner Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormData(prev => ({...prev, community_banner_url: ''}))} className="absolute top-1 right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100">✕</button>
                      </div>
                    ) : (
                      <div className="w-32 h-16 rounded-md bg-surface border border-dashed border-border flex items-center justify-center text-xs text-secondary">
                        Default Banner
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id="community-banner-upload"
                        className="hidden"
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const file = e.target.files[0];
                          const uploadData = new FormData();
                          uploadData.append('image', file);
                          try {
                            const res = await uploadImage(uploadData);
                            setFormData(prev => ({...prev, community_banner_url: res.data.url}));
                          } catch (err) {
                            setError(err.message || 'Image upload failed');
                          }
                        }}
                      />
                      <label htmlFor="community-banner-upload" className="cursor-pointer inline-flex items-center justify-center bg-surface hover:bg-pill-hover border border-border text-primary font-medium px-3 py-1.5 rounded-md text-xs transition">
                        Upload Community Banner
                      </label>
                      <p className="text-[11px] text-muted mt-1">Leave empty to use the tournament cover image.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-border mt-6">
            <Link to="/organizer/tournaments">
              <PsButton variant="ghost" type="button">Cancel</PsButton>
            </Link>
            <PsButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Tournament' : 'Create Tournament'}
            </PsButton>
          </div>
        </form>
      </PsCard>

      <TournamentCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onApplyDraft={handleApplyCopilotDraft}
      />
    </div>
  );
}
