import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTournament,
  getTournamentConfigurationValidation,
  getTournamentRegistrations,
  getTournamentWaitlist,
  getTournamentFixtures,
  generateTournamentFixtures,
  updateTournamentFixtureSchedule,
  updateTournament,
  assignTournamentCoOrganizer,
  removeTournamentCoOrganizer,
  postTournamentAnnouncement
} from '../../../features/tournaments/api';
import { recordMatchScore, startMatch } from '../../../features/matches/api';
import { listGrounds } from '../../../features/grounds/api';
import { localDateTimeToISOString, toDateTimeLocal as formatDateTimeLocal } from '../../../utils/dateTime';
import { useAuth } from '../../../store/AuthContext';
import TournamentBracketView from '../../../components/TournamentBracketView';
import {
  Trophy,
  Users,
  MessageSquare,
  Calendar,
  Zap,
  Edit,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton
} from '../../../components/ui';

export default function TournamentManagePage() {
  const { tournamentId } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [validation, setValidation] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [grounds, setGrounds] = useState([]);

  // Active view tab in right column: 'bracket' | 'matches' | 'registrations'
  const [activeTab, setActiveTab] = useState('matches');

  // Schedule fixture editor state
  const [scheduleFixtureId, setScheduleFixtureId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: '', scheduled_end_at: '', ground_id: '' });
  const [announceScheduleUpdate, setAnnounceScheduleUpdate] = useState(true);

  // Score recording modal/form state
  const [scoreModalFixture, setScoreModalFixture] = useState(null);
  const [scoreForm, setScoreForm] = useState({ home_score: '', away_score: '', notes: '' });

  // Co-organizer state
  const [coOrganizerEmail, setCoOrganizerEmail] = useState('');
  const [coOrganizerLoading, setCoOrganizerLoading] = useState(false);

  // Announcement state
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [announcementPosting, setAnnouncementPosting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, vRes, rRes, wRes, fRes] = await Promise.all([
        getTournament(tournamentId),
        getTournamentConfigurationValidation(tournamentId),
        getTournamentRegistrations(tournamentId),
        getTournamentWaitlist(tournamentId),
        getTournamentFixtures(tournamentId)
      ]);
      setTournament(tRes.data.tournament);
      setValidation(vRes.data);
      setRegistrations(rRes.data.registrations || []);
      setWaitlist(wRes.data.waitlist || []);
      setFixtures(fRes.data.fixtures || []);
      const groundsRes = await listGrounds(`sport_id=${encodeURIComponent(tRes.data.tournament.sport_id)}`).catch(() => null);
      setGrounds(groundsRes?.data?.grounds || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tournament management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const handleStatusTransition = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change tournament status to ${newStatus}?`)) return;
    
    setActionLoading(true);
    try {
      await updateTournament(tournamentId, { status: newStatus });
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Force Start Tournament (Early / On Demand)
  const handleForceStart = async () => {
    const confirmMsg = fixtures.length === 0
      ? 'Start tournament early? This will close registration immediately, generate initial fixtures from all approved registrations, and set tournament to IN PROGRESS even if the scheduled start time has not arrived yet.'
      : 'Start tournament early? This will set tournament status to IN PROGRESS immediately.';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      if (tournament.status === 'registration_open') {
        await updateTournament(tournamentId, { status: 'registration_closed' });
      }
      if (fixtures.length === 0) {
        await generateTournamentFixtures(tournamentId);
      }
      await updateTournament(tournamentId, { status: 'in_progress' });
      setActiveTab('matches');
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to force start tournament');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!window.confirm('Generate fixtures from all approved registrations?')) return;
    setActionLoading(true);
    try {
      await generateTournamentFixtures(tournamentId);
      setActiveTab('matches');
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to generate fixtures');
    } finally {
      setActionLoading(false);
    }
  };

  // Co-organizer actions
  const handleAssignCoOrganizer = async (e) => {
    e.preventDefault();
    if (!coOrganizerEmail.trim()) return;
    setCoOrganizerLoading(true);
    try {
      const res = await assignTournamentCoOrganizer(tournamentId, { email: coOrganizerEmail.trim() });
      setTournament(res.data.tournament);
      setCoOrganizerEmail('');
      window.alert('Co-organizer assigned successfully!');
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to assign co-organizer');
    } finally {
      setCoOrganizerLoading(false);
    }
  };

  const handleRemoveCoOrganizer = async () => {
    if (!window.confirm('Remove co-organizer from this tournament?')) return;
    setCoOrganizerLoading(true);
    try {
      const res = await removeTournamentCoOrganizer(tournamentId);
      setTournament(res.data.tournament);
      window.alert('Co-organizer removed.');
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to remove co-organizer');
    } finally {
      setCoOrganizerLoading(false);
    }
  };

  // Community announcement action
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) return;
    setAnnouncementPosting(true);
    try {
      await postTournamentAnnouncement(tournamentId, announcementForm);
      setAnnouncementForm({ title: '', body: '' });
      window.alert('📢 Announcement posted to the tournament community!');
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to post announcement');
    } finally {
      setAnnouncementPosting(false);
    }
  };

  // Direct score recording
  const openScoreModal = (fixture) => {
    setScoreModalFixture(fixture);
    const summary = fixture.result_summary;
    setScoreForm({
      home_score: summary?.home_score !== undefined ? String(summary.home_score) : '',
      away_score: summary?.away_score !== undefined ? String(summary.away_score) : '',
      notes: summary?.notes || ''
    });
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!scoreModalFixture) return;
    const matchId = scoreModalFixture.match_id;
    if (!matchId) {
      window.alert('This fixture has not yet been initialized with a match.');
      return;
    }
    setActionLoading(true);
    try {
      await recordMatchScore(matchId, {
        home_score: Number(scoreForm.home_score),
        away_score: Number(scoreForm.away_score),
        notes: scoreForm.notes || null
      });
      setScoreModalFixture(null);
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to record match score');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartIndividualMatch = async (matchId) => {
    if (!matchId) return;
    setActionLoading(true);
    try {
      await startMatch(matchId);
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to start match');
    } finally {
      setActionLoading(false);
    }
  };

  // Schedule fixture
  const openScheduleEditor = (fixture) => {
    setScheduleFixtureId(fixture.id);
    setScheduleForm({
      scheduled_at: formatDateTimeLocal(fixture.scheduled_at),
      scheduled_end_at: formatDateTimeLocal(fixture.scheduled_end_at),
      ground_id: fixture.ground_id || ''
    });
  };

  const handleSaveFixtureSchedule = async (event) => {
    event.preventDefault();
    if (!scheduleForm.scheduled_at) return;
    setActionLoading(true);
    try {
      await updateTournamentFixtureSchedule(tournamentId, scheduleFixtureId, {
        scheduled_at: localDateTimeToISOString(scheduleForm.scheduled_at),
        scheduled_end_at: scheduleForm.scheduled_end_at
          ? localDateTimeToISOString(scheduleForm.scheduled_end_at)
          : null,
        ground_id: scheduleForm.ground_id || null
      });

      // Optionally announce schedule change to community
      if (announceScheduleUpdate) {
        const fix = fixtures.find(f => f.id === scheduleFixtureId);
        const home = fix?.home_team_name || fix?.home_registration_name || 'Team 1';
        const away = fix?.away_team_name || fix?.away_registration_name || 'Team 2';
        const dateStr = new Date(scheduleForm.scheduled_at).toLocaleString();
        try {
          await postTournamentAnnouncement(tournamentId, {
            title: `Schedule Update: ${home} vs ${away}`,
            body: `Fixture #${fix?.match_number || ''} has been scheduled for ${dateStr}.${scheduleForm.ground_id ? ' Venue ground assigned.' : ''}`
          });
        } catch (annErr) {
          console.warn('Auto announcement skipped:', annErr);
        }
      }

      setScheduleFixtureId(null);
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to save fixture schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearFixtureSchedule = async (fixtureId) => {
    setActionLoading(true);
    try {
      await updateTournamentFixtureSchedule(tournamentId, fixtureId, {
        scheduled_at: null,
        scheduled_end_at: null,
        ground_id: null
      });
      setScheduleFixtureId(null);
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to clear fixture schedule');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/organizer/tournaments" label="Back to Managed Tournaments" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!tournament) return null;

  const isOwner = tournament.organizer_user_id === user?.id;
  const isCoOrganizer = tournament.co_organizer_user_id === user?.id;
  const canEdit = tournament.status !== 'cancelled' && tournament.status !== 'archived';

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'registration_open': return 'success';
      case 'in_progress': return 'maroon';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PsBackButton to="/organizer/tournaments" label="Back to Managed Tournaments" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-serif font-bold text-primary">{tournament.name}</h1>
            {isCoOrganizer && (
              <PsBadge variant="default" className="text-xs bg-accent-gold/20 text-accent-gold border-accent-gold/40">
                Co-Organizer
              </PsBadge>
            )}
          </div>
          <p className="mt-1 text-sm text-secondary">
            Manage tournament lifecycle, scores, schedule, bracket, and announcements.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="text-sm px-3 py-1">
            {tournament.status.replace(/_/g, ' ').toUpperCase()}
          </PsBadge>

          {/* 6. Edit Details button visible for all active/published statuses */}
          {canEdit && (
            <Link to={`/organizer/tournaments/${tournamentId}/edit`}>
              <PsButton variant="secondary" className="flex items-center gap-1.5">
                <Edit size={14} /> Edit Details
              </PsButton>
            </Link>
          )}

          <Link to={`/tournaments/${tournamentId}`}>
            <PsButton variant="ghost" size="sm" className="flex items-center gap-1">
              Public Page <ExternalLink size={13} />
            </PsButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Management, Co-Organizer & Community */}
        <div className="space-y-6 lg:col-span-1">
          {/* Lifecycle Card */}
          <PsCard className="p-6">
            <h3 className="text-lg font-serif font-semibold text-primary mb-4">Lifecycle Actions</h3>
            
            <div className="space-y-3">
              {tournament.status === 'draft' && (
                <PsButton
                  className="w-full"
                  onClick={() => handleStatusTransition('registration_open')}
                  disabled={actionLoading || !validation?.valid}
                >
                  Publish (Open Registration)
                </PsButton>
              )}

              {/* 1. Force Start option from registration_open or registration_closed */}
              {tournament.status === 'registration_open' && (
                <>
                  <PsButton
                    className="w-full flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#16A34A', color: 'white' }}
                    onClick={handleForceStart}
                    disabled={actionLoading}
                  >
                    <Zap size={16} /> Start Tournament (Early)
                  </PsButton>
                  <p className="text-[11px] text-muted text-center">
                    Starts immediately, closes registration, and seeds approved teams.
                  </p>

                  <PsButton
                    className="w-full"
                    style={{ backgroundColor: '#D97706', color: 'white' }}
                    onClick={() => handleStatusTransition('registration_closed')}
                    disabled={actionLoading}
                  >
                    Close Registration
                  </PsButton>
                </>
              )}

              {tournament.status === 'registration_closed' && (
                <>
                  {fixtures.length === 0 && (
                    <PsButton
                      className="w-full"
                      onClick={handleGenerateFixtures}
                      disabled={actionLoading}
                    >
                      Generate Fixtures
                    </PsButton>
                  )}
                  {fixtures.length > 0 && (
                    <PsButton
                      className="w-full flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#2563EB', color: 'white' }}
                      onClick={() => handleStatusTransition('in_progress')}
                      disabled={actionLoading}
                    >
                      <Zap size={16} /> Start Tournament
                    </PsButton>
                  )}
                </>
              )}

              {tournament.status === 'in_progress' && (
                <div className="p-3 rounded-xl bg-accent-gold/10 border border-accent-gold/30 text-center">
                  <p className="text-xs font-semibold text-accent-gold flex items-center justify-center gap-1.5">
                    <Trophy size={14} /> Tournament is In Progress
                  </p>
                  <p className="text-[11px] text-secondary mt-1">
                    Enter match scores below to advance teams through the bracket.
                  </p>
                </div>
              )}
              
              <PsButton
                variant="ghost"
                className="w-full text-error border border-error/50 hover:bg-error/10"
                onClick={() => handleStatusTransition('cancelled')}
                disabled={actionLoading || tournament.status === 'cancelled' || tournament.status === 'archived'}
              >
                Cancel Tournament
              </PsButton>
            </div>
          </PsCard>

          {/* 3. Co-Organizer Assignment Card */}
          <PsCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-accent-gold" />
              <h3 className="text-base font-serif font-semibold text-primary">Co-Organizer</h3>
            </div>
            <p className="text-xs text-secondary mb-4">
              A co-organizer can manage match schedules, record and update final scores, and post community updates.
            </p>

            {tournament.co_organizer_user_id ? (
              <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    {tournament.co_organizer_name || 'Assigned User'}
                  </span>
                  <PsBadge variant="success" className="text-[10px]">Active</PsBadge>
                </div>
                {tournament.co_organizer_email && (
                  <p className="text-xs text-secondary break-all">{tournament.co_organizer_email}</p>
                )}
                {isOwner && (
                  <PsButton
                    variant="danger"
                    size="sm"
                    className="w-full mt-2 text-xs py-1"
                    onClick={handleRemoveCoOrganizer}
                    disabled={coOrganizerLoading}
                  >
                    Remove Co-Organizer
                  </PsButton>
                )}
              </div>
            ) : isOwner ? (
              <form onSubmit={handleAssignCoOrganizer} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="co-organizer@playsphere.local"
                  value={coOrganizerEmail}
                  onChange={(e) => setCoOrganizerEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-primary"
                />
                <PsButton
                  type="submit"
                  size="sm"
                  className="w-full text-xs"
                  disabled={coOrganizerLoading}
                >
                  {coOrganizerLoading ? 'Assigning...' : 'Assign Co-Organizer'}
                </PsButton>
              </form>
            ) : (
              <p className="text-xs text-muted">No co-organizer assigned.</p>
            )}
          </PsCard>

          {/* 4 & 5. Community Announcements Card */}
          <PsCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent-gold" />
                <h3 className="text-base font-serif font-semibold text-primary">Community Hub</h3>
              </div>
              <Link to="/community" className="text-xs text-maroon hover:underline flex items-center gap-1">
                Open <ExternalLink size={11} />
              </Link>
            </div>
            <p className="text-xs text-secondary mb-4">
              Post official announcements and schedule updates directly to the tournament community.
            </p>

            <form onSubmit={handlePostAnnouncement} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Notice title (e.g. Weather delay, Schedule update)"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-primary"
              />
              <textarea
                required
                rows={2}
                placeholder="Details of the announcement..."
                value={announcementForm.body}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-primary"
              />
              <PsButton
                type="submit"
                size="sm"
                className="w-full text-xs"
                disabled={announcementPosting}
              >
                {announcementPosting ? 'Posting...' : '📢 Post Announcement'}
              </PsButton>
            </form>
          </PsCard>

          {/* Validation Card for drafts */}
          {tournament.status === 'draft' && validation && (
            <PsCard className={`p-6 border ${validation.valid ? 'border-success/50 bg-success/5' : 'border-error/50 bg-error/5'}`}>
              <h3 className={`text-lg font-serif font-semibold ${validation.valid ? 'text-success' : 'text-error'}`}>
                Configuration Status
              </h3>
              {validation.valid ? (
                <p className="mt-2 text-sm text-success">Tournament is ready to be published.</p>
              ) : (
                <div className="mt-2 text-sm text-error/90">
                  <p>Cannot publish until the following are resolved:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {validation.missing.map(m => <li key={m}>Missing: {m}</li>)}
                    {validation.errors.map(e => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
            </PsCard>
          )}
        </div>

        {/* Right Column: Tabbed Content (Bracket / Matches & Scores / Registrations) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'matches'
                  ? 'bg-maroon text-white shadow-sm'
                  : 'text-secondary hover:bg-pill-hover'
              }`}
            >
              <Calendar size={15} /> Matches & Scoring ({fixtures.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bracket')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'bracket'
                  ? 'bg-maroon text-white shadow-sm'
                  : 'text-secondary hover:bg-pill-hover'
              }`}
            >
              <Trophy size={15} /> 2. Visual Bracket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registrations')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'registrations'
                  ? 'bg-maroon text-white shadow-sm'
                  : 'text-secondary hover:bg-pill-hover'
              }`}
            >
              <Users size={15} /> Registrations ({registrations.length})
            </button>
          </div>

          {/* TAB 1: MATCHES & SCORING */}
          {activeTab === 'matches' && (
            <PsCard>
              <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Match Control & Score Entry</h3>
                  <p className="mt-0.5 text-xs text-secondary">
                    Update scores directly, start matches, and adjust ground schedules.
                  </p>
                </div>
                <Link to={`/tournaments/${tournamentId}/matches`}>
                  <PsButton variant="secondary" size="sm" className="text-xs">
                    Live Scoreboard ↗
                  </PsButton>
                </Link>
              </div>

              {fixtures.length === 0 ? (
                <div className="p-8 text-center text-secondary">
                  <p className="font-semibold text-primary">No fixtures generated yet</p>
                  <p className="text-xs text-secondary mt-1">
                    Once registrations close (or you click Start Tournament), fixtures will appear here with instant score entry.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {fixtures.map((fixture) => {
                    const home = fixture.home_team_name || fixture.home_registration_name || 'TBD';
                    const away = fixture.away_team_name || fixture.away_registration_name || 'TBD';
                    const title = fixture.stage === 'group'
                      ? fixture.round_name || `Group ${String.fromCharCode(64 + fixture.group_number)} · Round ${fixture.round_number}`
                      : fixture.round_name || `Round ${fixture.round_number}`;
                    const hasParticipants = fixture.home_registration_id && fixture.away_registration_id;
                    const isCompleted = fixture.status === 'completed';
                    const isInProgress = fixture.status === 'in_progress';
                    const summary = fixture.result_summary;

                    return (
                      <li key={fixture.id} className="p-5 hover:bg-pill-hover/40 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-maroon">{title}</span>
                              <span className="text-xs text-muted">· Match {fixture.match_number}</span>
                              <PsBadge
                                variant={
                                  isCompleted ? 'success' :
                                  isInProgress ? 'maroon' :
                                  fixture.status === 'bye' ? 'default' : 'warning'
                                }
                                className="text-[10px] px-2 py-0.5"
                              >
                                {fixture.status.toUpperCase()}
                              </PsBadge>
                            </div>

                            {/* Teams and Scores Display */}
                            <div className="mt-2 flex items-center gap-3">
                              <span className={`text-base font-bold ${fixture.winner_registration_id === fixture.home_registration_id ? 'text-accent-gold' : 'text-primary'}`}>
                                {home}
                              </span>
                              {summary?.home_score !== undefined && (
                                <span className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-sm font-bold text-primary">
                                  {summary.home_score} - {summary.away_score}
                                </span>
                              )}
                              <span className="text-xs text-muted">vs</span>
                              <span className={`text-base font-bold ${fixture.winner_registration_id === fixture.away_registration_id ? 'text-accent-gold' : 'text-primary'}`}>
                                {away}
                              </span>
                            </div>

                            {/* Time & Ground */}
                            <p className="mt-1 text-xs text-secondary">
                              {fixture.scheduled_at ? new Date(fixture.scheduled_at).toLocaleString() : 'No time scheduled'}
                              {fixture.ground_name ? ` · 📍 ${fixture.ground_name}` : ''}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Start Match button if scheduled & tournament in progress */}
                            {hasParticipants && fixture.status === 'scheduled' && fixture.match_id && tournament.status === 'in_progress' && (
                              <PsButton
                                size="sm"
                                variant="secondary"
                                onClick={() => handleStartIndividualMatch(fixture.match_id)}
                                disabled={actionLoading}
                                className="text-xs text-maroon hover:bg-maroon/10 border-maroon/30"
                              >
                                ▶ Start Match
                              </PsButton>
                            )}

                            {/* Score Entry / Update Button */}
                            {hasParticipants && (
                              <PsButton
                                size="sm"
                                variant={isCompleted ? 'secondary' : 'default'}
                                onClick={() => openScoreModal(fixture)}
                                disabled={actionLoading}
                                className="text-xs"
                              >
                                {isCompleted ? '✏️ Edit Score' : '🏆 Enter Score'}
                              </PsButton>
                            )}

                            {/* Schedule Editor Button */}
                            {hasParticipants && !isCompleted && (
                              <PsButton
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => openScheduleEditor(fixture)}
                                className="text-xs"
                              >
                                {fixture.scheduled_at ? 'Reschedule' : 'Set Time'}
                              </PsButton>
                            )}
                          </div>
                        </div>

                        {/* Inline Score Entry Modal / Form */}
                        {scoreModalFixture?.id === fixture.id && (
                          <form onSubmit={handleSaveScore} className="mt-4 p-4 rounded-xl border border-accent-gold/40 bg-accent-gold/5 space-y-3">
                            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                              <Trophy size={14} className="text-accent-gold" />
                              Record Final Score: {home} vs {away}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <label className="text-xs font-medium text-secondary">
                                {home} Score *
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={scoreForm.home_score}
                                  onChange={(e) => setScoreForm({ ...scoreForm, home_score: e.target.value })}
                                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono font-bold text-primary"
                                />
                              </label>
                              <label className="text-xs font-medium text-secondary">
                                {away} Score *
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={scoreForm.away_score}
                                  onChange={(e) => setScoreForm({ ...scoreForm, away_score: e.target.value })}
                                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono font-bold text-primary"
                                />
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder="Optional result note (e.g. Won by penalty shootout, 3-2)"
                              value={scoreForm.notes}
                              onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
                              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-primary"
                            />
                            <div className="flex gap-2">
                              <PsButton type="submit" size="sm" disabled={actionLoading}>
                                {isCompleted ? 'Update Final Score' : 'Save & Complete Match'}
                              </PsButton>
                              <PsButton type="button" variant="ghost" size="sm" onClick={() => setScoreModalFixture(null)}>
                                Cancel
                              </PsButton>
                            </div>
                          </form>
                        )}

                        {/* Inline Reschedule Form */}
                        {scheduleFixtureId === fixture.id && (
                          <form onSubmit={handleSaveFixtureSchedule} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4">
                            <label className="text-xs font-medium text-secondary">
                              Start time
                              <input
                                type="datetime-local"
                                required
                                value={scheduleForm.scheduled_at}
                                onChange={event => setScheduleForm({ ...scheduleForm, scheduled_at: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            <label className="text-xs font-medium text-secondary">
                              End time
                              <input
                                type="datetime-local"
                                required
                                value={scheduleForm.scheduled_end_at}
                                onChange={event => setScheduleForm({ ...scheduleForm, scheduled_end_at: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            <label className="text-xs font-medium text-secondary sm:col-span-2">
                              Ground
                              <select
                                value={scheduleForm.ground_id}
                                onChange={event => setScheduleForm({ ...scheduleForm, ground_id: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary"
                              >
                                <option value="">No ground selected</option>
                                {grounds.map(ground => <option key={ground.id} value={ground.id}>{ground.name} · {ground.city}</option>)}
                              </select>
                            </label>

                            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id="announce-checkbox"
                                checked={announceScheduleUpdate}
                                onChange={(e) => setAnnounceScheduleUpdate(e.target.checked)}
                                className="rounded text-maroon"
                              />
                              <label htmlFor="announce-checkbox" className="text-xs text-secondary cursor-pointer">
                                📢 Broadcast schedule update to tournament community
                              </label>
                            </div>

                            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
                              <PsButton type="submit" disabled={actionLoading}>Save Schedule</PsButton>
                              {fixture.scheduled_at && (
                                <PsButton type="button" variant="ghost" disabled={actionLoading} onClick={() => handleClearFixtureSchedule(fixture.id)}>
                                  Clear Schedule
                                </PsButton>
                              )}
                              <PsButton type="button" variant="ghost" disabled={actionLoading} onClick={() => setScheduleFixtureId(null)}>
                                Close
                              </PsButton>
                            </div>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </PsCard>
          )}

          {/* TAB 2: VISUAL BRACKET & GRAPHICAL PROGRESSION */}
          {activeTab === 'bracket' && (
            <PsCard className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-primary">Graphical Tournament Progression</h3>
                <p className="text-xs text-secondary">
                  Interactive bracket tree showing matchups, winners, and real-time round advancements.
                </p>
              </div>
              <TournamentBracketView tournament={tournament} fixtures={fixtures} />
            </PsCard>
          )}

          {/* TAB 3: REGISTRATIONS & WAITLIST */}
          {activeTab === 'registrations' && (
            <div className="space-y-6">
              {/* Registrations */}
              <PsCard>
                <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
                  <h3 className="font-semibold text-primary">
                    Registrations ({registrations.length} {tournament.max_teams ? `/ ${tournament.max_teams}` : ''})
                  </h3>
                </div>
                <div>
                  {registrations.length === 0 ? (
                    <p className="p-6 text-sm text-secondary text-center">No registrations yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {registrations.map(reg => (
                        <li key={reg.id} className="px-6 py-4 flex items-center justify-between hover:bg-pill-hover transition">
                          <div>
                            <p className="font-medium text-primary">{reg.registration_name}</p>
                            <p className="text-xs text-secondary mt-1">Registered {new Date(reg.registered_at).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                            <PsBadge variant={
                              reg.status === 'approved' ? 'success' :
                              reg.status === 'pending' ? 'warning' :
                              reg.status === 'withdrawn' ? 'default' : 'danger'
                            }>
                              {reg.status}
                            </PsBadge>
                            <PsBadge variant="default" className="text-xs">
                              {reg.eligibility_status}
                            </PsBadge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PsCard>

              {/* Waitlist */}
              <PsCard>
                <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
                  <h3 className="font-semibold text-primary">
                    Waitlist ({waitlist.length})
                  </h3>
                </div>
                <div>
                  {waitlist.length === 0 ? (
                    <p className="p-6 text-sm text-secondary text-center">Waitlist is empty.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {waitlist.map(w => (
                        <li key={w.id} className="px-6 py-4 flex items-center justify-between hover:bg-pill-hover transition">
                          <div>
                            <p className="font-medium text-primary">#{w.position} - {w.participant_name}</p>
                          </div>
                          <PsBadge variant="warning">
                            {w.status}
                          </PsBadge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PsCard>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
