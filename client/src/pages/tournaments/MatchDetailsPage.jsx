import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getTournament } from '../../features/tournaments/api';
import {
  cancelMatch,
  completeMatch,
  createMatchPerformanceEvent,
  getMatch,
  getMatchParticipants,
  getMatchPerformanceEvents,
  getPerformanceEventPlayers,
  startMatch,
  getMatchScoreReports,
  submitMatchScoreReport,
  confirmMatchScoreReport,
  rejectMatchScoreReport
} from '../../features/matches/api';
import { getSportStatDefinitions } from '../../features/sports/api';
import { useMatchLive } from '../../hooks/useMatchLive';
import { Radio, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsBadge,
  PsAlert,
  PsLoading,
  PsEmpty,
  PsBackButton,
  PsErrorState
} from '../../components/ui';

export default function MatchDetailsPage() {
  const { tournamentId, matchId } = useParams();
  const { user } = useAuth();
  
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [statDefs, setStatDefs] = useState([]);
  const [scoreReports, setScoreReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [tournament, setTournament] = useState(null);

  // Captain Score Reporting state
  const [isReportingScore, setIsReportingScore] = useState(false);
  const [reportScores, setReportScores] = useState({ home: '', away: '', notes: '' });

  // Event recording state
  const [selectedStatDefId, setSelectedStatDefId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [performanceTeamSide, setPerformanceTeamSide] = useState('home');
  const [eventValue, setEventValue] = useState('');

  // Complete match state (Organizer direct entry)
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeData, setCompleteData] = useState({});

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      
      const [tournRes, matchRes, partsRes, eventsRes, reportsRes] = await Promise.all([
        getTournament(tournamentId),
        getMatch(matchId),
        getMatchParticipants(matchId),
        getMatchPerformanceEvents(matchId).catch(() => ({ data: { events: [] } })),
        getMatchScoreReports(matchId).catch(() => ({ data: { reports: [] } }))
      ]);

      const t = tournRes.data.tournament;
      setTournament(t);
      setMatch(matchRes.data.match);
      setParticipants(partsRes.data.participants || []);
      setScoreReports(reportsRes.data?.reports || []);
      
      const rawEvents = eventsRes.data.events || [];
      const eventsWithPlayers = await Promise.all(
        rawEvents.map(async (ev) => {
          try {
            const pRes = await getPerformanceEventPlayers(ev.id);
            return { ...ev, players: pRes.data.players || [] };
          } catch {
            return { ...ev, players: [] };
          }
        })
      );
      setEvents(eventsWithPlayers);

      const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === t.organizer_user_id;
      if (isOwnerOrAdmin) {
        try {
          const statsRes = await getSportStatDefinitions(t.sport_id);
          setStatDefs(statsRes.data.statDefinitions || []);
        } catch (err) {
          console.error("Could not fetch stat definitions", err);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load match details');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [matchId, tournamentId, user]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Connect to SSE live updates stream for real-time match events
  const { isConnected } = useMatchLive(matchId, useCallback(() => {
    loadData(false);
  }, [loadData]));

  const handleStartMatch = async () => {
    if (!window.confirm('Are you sure you want to start this match?')) return;
    setActionLoading(true);
    try {
      await startMatch(matchId);
      await loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to start match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelMatch = async () => {
    const reason = window.prompt('Enter cancellation reason (optional):');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await cancelMatch(matchId, reason);
      await loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartComplete = () => {
    setIsCompleting(true);
    const initialData = {};
    participants.forEach(p => {
      initialData[p.registration_id] = { result: '', score_numeric: '' };
    });
    setCompleteData(initialData);
  };

  const handleCompleteMatch = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to complete this match?')) return;
    setActionLoading(true);
    try {
      const payloadParticipants = Object.entries(completeData).map(([regId, data]) => ({
        registration_id: regId,
        result: data.result || undefined,
        score: data.score_numeric !== '' ? { numeric: Number(data.score_numeric) } : undefined
      }));
      const winner = payloadParticipants.find(p => p.result === 'win');
      
      const payload = {
        participants: payloadParticipants,
        winner_registration_id: winner ? winner.registration_id : undefined
      };
      
      await completeMatch(matchId, payload);
      setIsCompleting(false);
      await loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to complete match');
    } finally {
      setActionLoading(false);
    }
  };

  // Captain Score Report Submission
  const handleSubmitScoreReport = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await submitMatchScoreReport(matchId, {
        home_score: Number(reportScores.home),
        away_score: Number(reportScores.away),
        notes: reportScores.notes || undefined
      });
      setIsReportingScore(false);
      setReportScores({ home: '', away: '', notes: '' });
      setSuccessMsg('Score report submitted successfully.');
      await loadData(false);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to submit score report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReport = async (reportId) => {
    if (!window.confirm('Confirm this score report? This will finalize the match and advance the bracket.')) return;
    setActionLoading(true);
    setError(null);
    try {
      await confirmMatchScoreReport(matchId, reportId);
      setSuccessMsg('Score verified and match finalized!');
      await loadData(false);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to confirm score report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReport = async (reportId, isAuthor) => {
    const promptMsg = isAuthor ? 'Cancel your submitted score report?' : 'Reason for disputing this score report:';
    const reason = isAuthor ? '' : window.prompt(promptMsg);
    if (!isAuthor && reason === null) return;
    setActionLoading(true);
    setError(null);
    try {
      await rejectMatchScoreReport(matchId, reportId, reason);
      await loadData(false);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to reject score report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordEvent = async (e) => {
    e.preventDefault();
    if (!selectedStatDefId || !selectedPlayerId) return;
    setActionLoading(true);
    try {
      const payload = {
        sport_stat_definition_id: selectedStatDefId,
        players: [{
          player_profile_id: selectedPlayerId,
          value: eventValue ? Number(eventValue) : undefined
        }]
      };
      await createMatchPerformanceEvent(matchId, payload);
      setSelectedStatDefId('');
      setSelectedPlayerId('');
      setEventValue('');
      await loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to record event');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !match) {
    return (
      <div className="space-y-4">
        <PsBackButton to={`/tournaments/${tournamentId}/matches`} label="Back to Matches" />
        <PsErrorState message={error} retry={() => loadData(true)} />
      </div>
    );
  }
  
  if (!match || !tournament) return null;

  const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === tournament.organizer_user_id;

  const pendingReport = scoreReports.find(r => r.status === 'pending');
  const homeParticipant = participants.find(p => p.side === 'home');
  const awayParticipant = participants.find(p => p.side === 'away');
  const playersForSide = (side) => {
    const participant = participants.find(p => p.side === side);
    if (!participant) return [];

    if (participant.players?.length) {
      return participant.players.filter(player => player.player_profile_id);
    }

    const individualPlayerId = participant.player_profile_id || participant.individual_player_profile_id;
    return individualPlayerId
      ? [{ player_profile_id: individualPlayerId, display_name: participant.display_name || participant.registration_name }]
      : [];
  };
  const selectedSidePlayers = playersForSide(performanceTeamSide);
  const selectedSideParticipant = performanceTeamSide === 'home' ? homeParticipant : awayParticipant;
  const selectedSideName = selectedSideParticipant?.team_name || selectedSideParticipant?.registration_name || `${performanceTeamSide === 'home' ? 'Home' : 'Away'} team`;
  const matchSteps = [
    { label: 'Scheduled', complete: ['in_progress', 'completed'].includes(match.status), active: match.status === 'scheduled' },
    { label: 'Live', complete: match.status === 'completed', active: match.status === 'in_progress' },
    { label: 'Final', complete: match.status === 'completed', active: match.status === 'completed' },
  ];
  const nextMatchAction = pendingReport
    ? 'A score report is waiting for review. Confirm or dispute it above.'
    : match.status === 'scheduled' && isOwnerOrAdmin
      ? 'Organizer: start the match when both teams are ready.'
      : match.status === 'scheduled'
        ? 'The match has not started yet. Check the scheduled time and return for live updates.'
        : match.status === 'in_progress' && isOwnerOrAdmin
          ? 'Organizer: record player events as they happen, then enter the final result.'
          : match.status === 'in_progress'
            ? 'The match is live. Follow the event timeline and score updates below.'
            : match.status === 'completed'
              ? 'The match is complete. Review the final score and recorded events below.'
              : 'This match was cancelled.';
  const nextMatchTarget = pendingReport
    ? 'pending-score-report'
    : match.status === 'scheduled' && isOwnerOrAdmin
      ? 'organizer-controls'
      : match.status === 'in_progress' && isOwnerOrAdmin
        ? 'performance-event-form'
        : ['in_progress', 'completed'].includes(match.status)
          ? 'event-timeline'
          : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsBackButton to={`/tournaments/${tournamentId}/matches`} label="Back to Matches" />

      {error && <PsAlert variant="error">{error}</PsAlert>}
      {successMsg && (
        <PsAlert variant="success">
          <div className="flex justify-between items-center">
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-xs underline ml-2">Dismiss</button>
          </div>
        </PsAlert>
      )}

      {/* Pending Score Report Alert Banner */}
      {pendingReport && match.status !== 'completed' && (
        <div id="pending-score-report" className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-primary scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  Pending Score Verification: <span className="font-mono text-base font-bold">{pendingReport.home_score} – {pendingReport.away_score}</span>
                </p>
                <p className="text-xs text-secondary mt-0.5">
                  Submitted by {pendingReport.submitted_by_name} ({pendingReport.team_name || 'Participant'}).
                  {pendingReport.notes && ` Note: "${pendingReport.notes}"`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {pendingReport.submitted_by_user_id === user?.id ? (
                <PsButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRejectReport(pendingReport.id, true)}
                  disabled={actionLoading}
                  className="text-xs text-secondary"
                >
                  Cancel Submission
                </PsButton>
              ) : (
                <>
                  <PsButton
                    size="sm"
                    onClick={() => handleConfirmReport(pendingReport.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <CheckCircle2 size={13} /> Confirm Score
                  </PsButton>
                  <PsButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRejectReport(pendingReport.id, false)}
                    disabled={actionLoading}
                    className="text-xs text-error flex items-center gap-1"
                  >
                    <AlertTriangle size={13} /> Dispute
                  </PsButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <PsCard>
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">
              {match.round_name || `Round ${match.round_number}`} - Match {match.match_number}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {tournament.name}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-xs">
                <Radio size={11} className="text-emerald-500 animate-pulse" /> Live Feed
              </span>
            )}
            <PsBadge variant={
              match.status === 'completed' ? 'success' : 
              match.status === 'in_progress' ? 'maroon' : 
              match.status === 'cancelled' ? 'default' : 'warning'
            }>
              {match.status.replace('_', ' ').toUpperCase()}
            </PsBadge>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary mb-2">Participants</p>
            {participants.length === 0 ? (
              <p className="text-sm text-primary">TBD</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {participants.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-border bg-surface flex flex-col shadow-xs">
                    <span className="text-xs font-semibold text-secondary uppercase mb-1">{p.side}</span>
                    <span className="text-lg font-bold text-primary">{p.team_name || p.registration_name}</span>
                    {match.status === 'completed' && (
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <span className="text-2xl font-bold text-primary">{p.score?.numeric ?? '—'}</span>
                        <PsBadge variant={p.result === 'win' ? 'success' : p.result === 'draw' ? 'warning' : 'default'}>
                          {p.result ? p.result.toUpperCase() : 'FINAL'}
                        </PsBadge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {match.scheduled_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Scheduled Time</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.scheduled_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.started_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Started At</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.started_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.ended_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Ended At</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.ended_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Notes / Reason</p>
              <p className="mt-1 text-sm text-primary">
                {match.notes}
              </p>
            </div>
          )}
        </div>
      </PsCard>

      <PsCard className="p-5 sm:p-6" role="region" aria-labelledby="match-progress-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="match-progress-heading" className="text-base font-semibold text-primary">Match progress</h2>
            {match.status === 'cancelled' ? (
              <PsAlert variant="warning" className="mt-3">This match was cancelled.</PsAlert>
            ) : (
              <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Scheduled, live, and final stages">
                {matchSteps.map((step, index) => (
                  <li key={step.label} aria-current={step.active ? 'step' : undefined}>
                    <div className={`mb-2 h-1.5 rounded-full ${step.complete || step.active ? 'bg-maroon' : 'bg-border'}`} />
                    <p className={`text-xs sm:text-sm ${step.active ? 'font-semibold text-primary' : 'text-secondary'}`}>
                      <span aria-hidden="true">{step.complete ? '✓ ' : `${index + 1}. `}</span>{step.label}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-secondary">Next step</p>
            <p className="mt-1 text-sm text-secondary">{nextMatchAction}</p>
          </div>
          {nextMatchTarget && (
            <PsButton type="button" variant="secondary" onClick={() => document.getElementById(nextMatchTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {pendingReport ? 'Review score report' : match.status === 'scheduled' && isOwnerOrAdmin ? 'Organizer controls' : match.status === 'in_progress' && isOwnerOrAdmin ? 'Record an event' : 'View timeline'}
            </PsButton>
          )}
        </div>
      </PsCard>

      {/* Captain / Participant Score Reporting Drawer */}
      {user && (match.status === 'in_progress' || match.status === 'scheduled') && !pendingReport && (
        <PsCard id="score-report" className="p-6 border-border scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                <FileText size={16} className="text-maroon" /> Team Captain Score Reporting
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Team captains can submit the final score. The opposing team captain or organizer will verify and confirm it.
              </p>
            </div>
            {!isReportingScore && (
              <PsButton
                variant="secondary"
                size="sm"
                onClick={() => setIsReportingScore(true)}
                disabled={actionLoading}
              >
                Submit Match Score
              </PsButton>
            )}
          </div>

          {isReportingScore && (
            <form onSubmit={handleSubmitScoreReport} className="mt-6 border-t border-border pt-6 max-w-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="report-home-score" className="block text-xs font-semibold text-primary mb-1">
                    {homeParticipant?.team_name || 'Home Team'} Score
                  </label>
                  <input
                    id="report-home-score"
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 2"
                    value={reportScores.home}
                    onChange={e => setReportScores({ ...reportScores, home: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                  />
                </div>
                <div>
                  <label htmlFor="report-away-score" className="block text-xs font-semibold text-primary mb-1">
                    {awayParticipant?.team_name || 'Away Team'} Score
                  </label>
                  <input
                    id="report-away-score"
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 1"
                    value={reportScores.away}
                    onChange={e => setReportScores({ ...reportScores, away: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular time 1-1, penalties 4-3"
                  value={reportScores.notes}
                  onChange={e => setReportScores({ ...reportScores, notes: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <PsButton type="submit" disabled={actionLoading}>
                  Submit for Confirmation
                </PsButton>
                <PsButton variant="ghost" type="button" onClick={() => setIsReportingScore(false)}>
                  Cancel
                </PsButton>
              </div>
            </form>
          )}
        </PsCard>
      )}

      {/* Organizer Controls */}
      {isOwnerOrAdmin && (match.status === 'scheduled' || match.status === 'in_progress') && (
        <PsCard id="organizer-controls" className="p-6 border-maroon/20 scroll-mt-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-maroon">Organizer only</p>
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Organizer Controls</h2>
          <div className="flex flex-wrap gap-3">
            {match.status === 'scheduled' && (
              <>
                <PsButton onClick={handleStartMatch} disabled={actionLoading}>
                  Start Match
                </PsButton>
                <PsButton variant="ghost" onClick={handleCancelMatch} disabled={actionLoading} className="text-error">
                  Cancel Match
                </PsButton>
              </>
            )}
            {match.status === 'in_progress' && !isCompleting && (
              <PsButton onClick={handleStartComplete} disabled={actionLoading}>
                Complete Match (Direct)
              </PsButton>
            )}
          </div>
          
          {isCompleting && (
            <form onSubmit={handleCompleteMatch} className="mt-6 border-t border-border pt-6 max-w-lg">
              <h3 className="text-md font-semibold text-primary mb-4">Enter Results</h3>
              <div className="space-y-4">
                {participants.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-border rounded-xl bg-surface">
                    <div className="flex-1 font-medium text-primary">{p.team_name || p.registration_name}</div>
                    <select
                      aria-label={`Result for ${p.team_name || p.registration_name}`}
                      required
                      value={completeData[p.registration_id]?.result || ''}
                      onChange={e => setCompleteData({...completeData, [p.registration_id]: {...completeData[p.registration_id], result: e.target.value}})}
                      className="rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                    >
                      <option value="">-- Result --</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="draw">Draw</option>
                    </select>
                    <input
                      aria-label={`Score for ${p.team_name || p.registration_name}`}
                      type="number"
                      required
                      min="0"
                      placeholder="Score"
                      value={completeData[p.registration_id]?.score_numeric || ''}
                      onChange={e => setCompleteData({...completeData, [p.registration_id]: {...completeData[p.registration_id], score_numeric: e.target.value}})}
                      className="w-24 rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <PsButton type="submit" disabled={actionLoading}>Submit Results</PsButton>
                <PsButton variant="ghost" type="button" onClick={() => setIsCompleting(false)}>Cancel</PsButton>
              </div>
            </form>
          )}
        </PsCard>
      )}

      {/* Event Recording UI */}
      {isOwnerOrAdmin && match.status === 'in_progress' && (
        <PsCard id="performance-event-form" className="p-6 scroll-mt-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-maroon">Organizer only</p>
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Record Performance Event</h2>
          <form onSubmit={handleRecordEvent} className="space-y-4 max-w-lg">
            <PsSelect
              label="Event Type"
              required
              value={selectedStatDefId}
              onChange={e => setSelectedStatDefId(e.target.value)}
            >
              <option value="">-- Select Event Type --</option>
              {statDefs.map(def => (
                <option key={def.id} value={def.id}>{def.stat_name}</option>
              ))}
            </PsSelect>
            <div>
              <span className="block text-sm font-medium text-primary mb-2">Team</span>
              <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Choose team for player">
                {[
                  { side: 'home', participant: homeParticipant, fallback: 'Home team' },
                  { side: 'away', participant: awayParticipant, fallback: 'Away team' }
                ].map(({ side, participant, fallback }) => {
                  const teamName = participant?.team_name || participant?.registration_name || fallback;
                  const isSelected = performanceTeamSide === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        setPerformanceTeamSide(side);
                        setSelectedPlayerId('');
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isSelected ? 'border-maroon text-maroon' : 'border-transparent text-secondary hover:text-primary'}`}
                    >
                      {teamName}
                    </button>
                  );
                })}
              </div>
            </div>
            <PsSelect
              label={`Player suggestion — ${selectedSideName}`}
              required
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
            >
              <option value="">{selectedSidePlayers.length ? '-- Select Player --' : '-- No public players available --'}</option>
              {selectedSidePlayers.map(player => (
                <option key={player.player_profile_id} value={player.player_profile_id}>
                  {player.display_name}{player.jersey_number ? ` (#${player.jersey_number})` : ''}{player.is_captain ? ' · Captain' : ''}
                </option>
              ))}
            </PsSelect>
            <PsInput
              label="Value (Optional)"
              type="number"
              value={eventValue}
              onChange={e => setEventValue(e.target.value)}
            />
            <div className="pt-2">
              <PsButton type="submit" disabled={actionLoading}>
                Record Event
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}

      {/* Event Timeline */}
      {(match.status === 'in_progress' || match.status === 'completed') && (
        <PsCard id="event-timeline" className="p-6 scroll-mt-24">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Event Timeline</h2>
          {events.length === 0 ? (
            <PsEmpty title="No events" message="No performance events recorded yet." />
          ) : (
            <div className="flow-root mt-6">
              <ul className="-mb-8">
                {events.map((event, idx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {idx !== events.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-4">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-surface border-2 border-maroon flex items-center justify-center">
                            <span className="text-maroon text-xs font-bold">{idx + 1}</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-secondary">
                              <span className="font-medium text-primary">{event.stat_name}</span> 
                              {event.players && event.players.length > 0 && (
                                <span> by <span className="font-medium text-primary">{event.players[0].display_name}</span></span>
                              )}
                              {event.players && event.players.length > 0 && event.players[0].value !== null && (
                                <span> (Value: {event.players[0].value})</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-muted">
                            {new Date(event.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PsCard>
      )}

    </div>
  );
}
