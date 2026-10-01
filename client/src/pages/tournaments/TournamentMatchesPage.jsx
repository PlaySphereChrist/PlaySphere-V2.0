import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournament, getTournamentFixtures, getTournamentStandings } from '../../features/tournaments/api';
import { useTournamentLive } from '../../hooks/useTournamentLive';
import TournamentBracketView from '../../components/TournamentBracketView';
import { Trophy, ListFilter, Radio } from 'lucide-react';
import {
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsBackButton
} from '../../components/ui';

export default function TournamentMatchesPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('bracket'); // 'bracket' | 'list'

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      const [tournRes, fixturesRes, standingsRes] = await Promise.all([
        getTournament(tournamentId),
        getTournamentFixtures(tournamentId),
        getTournamentStandings(tournamentId)
      ]);
      setTournament(tournRes.data.tournament);
      setFixtures(fixturesRes.data.fixtures || []);
      setStandings(standingsRes.data.standings || []);
      
      // Auto-set default view mode based on format and stages
      if (isInitial) {
        const hasKnockout = (fixturesRes.data.fixtures || []).some(f =>
          ['knockout', 'double_elimination_winners', 'double_elimination_losers', 'grand_final'].includes(f.stage)
        );
        if (hasKnockout) {
          setViewMode('bracket');
        } else {
          setViewMode('list');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load matches');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Connect to SSE live updates stream for real-time bracket & score updates
  const { isConnected } = useTournamentLive(tournamentId, useCallback(() => {
    // Silently refresh fixtures and standings on live broadcast events
    loadData(false);
  }, [loadData]));

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to={`/tournaments/${tournamentId}`} label="Back to Tournament" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!tournament) return null;

  const hasKnockoutFixtures = fixtures.some(f =>
    ['knockout', 'double_elimination_winners', 'double_elimination_losers', 'grand_final'].includes(f.stage)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PsBackButton to={`/tournaments/${tournamentId}`} label={`Back to ${tournament.name}`} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PsPageHeader 
          title="Matches & Brackets" 
          subtitle={`Schedule, live scores, and brackets for ${tournament.name}`}
        />

        <div className="flex items-center gap-3">
          {/* Live Broadcast Indicator */}
          {isConnected && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio size={12} className="text-emerald-500" /> Live Updates
            </span>
          )}

          {/* View Mode Toggle */}
          {hasKnockoutFixtures && (
            <div className="inline-flex items-center p-1 rounded-xl bg-surface border border-border text-xs font-medium shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('bracket')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'bracket'
                    ? 'bg-maroon text-white shadow-xs font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-pill-hover'
                }`}
              >
                <Trophy size={13} /> Visual Bracket
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-maroon text-white shadow-xs font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-pill-hover'
                }`}
              >
                <ListFilter size={13} /> Match List
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {/* Group or League Standings */}
      {standings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {standings.map((group) => (
            <PsCard key={group.group_number ?? 'league'} className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-pill-hover">
                <h2 className="font-semibold text-primary">
                  {group.group_number ? `Group ${String.fromCharCode(64 + group.group_number)} Standings` : 'League Standings'}
                </h2>
                <p className="mt-1 text-xs text-secondary">3 points for a win, 1 for a draw. Ties use score difference, score scored, then name.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-secondary">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-medium">Team</th>
                      <th className="px-2 py-3 text-right font-medium">P</th>
                      <th className="px-2 py-3 text-right font-medium">W</th>
                      <th className="px-2 py-3 text-right font-medium">D</th>
                      <th className="px-2 py-3 text-right font-medium">L</th>
                      <th className="px-2 py-3 text-right font-medium">SD</th>
                      <th className="px-4 py-3 text-right font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.standings.map((entry) => (
                      <tr key={entry.registration_id} className={entry.rank <= 2 && group.group_number ? 'bg-success/5' : ''}>
                        <td className="px-4 py-3 font-medium text-primary">{entry.name}</td>
                        <td className="px-2 py-3 text-right text-secondary">{entry.played}</td>
                        <td className="px-2 py-3 text-right text-secondary">{entry.wins}</td>
                        <td className="px-2 py-3 text-right text-secondary">{entry.draws}</td>
                        <td className="px-2 py-3 text-right text-secondary">{entry.losses}</td>
                        <td className="px-2 py-3 text-right text-secondary">{entry.score_difference}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{entry.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PsCard>
          ))}
        </div>
      )}

      {/* Main Content: Visual Bracket View OR Match List View */}
      {viewMode === 'bracket' && hasKnockoutFixtures ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary">
              Knockout Tournament Tree
            </h2>
            <span className="text-xs text-muted">Scroll horizontally to view all rounds</span>
          </div>
          <TournamentBracketView tournament={tournament} fixtures={fixtures} />
        </div>
      ) : (
        <PsCard>
          {fixtures.length === 0 ? (
            <div className="py-8">
              <PsEmpty title="No fixtures" message="Fixtures have not been generated yet." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {fixtures.map((fixture) => {
                if (fixture.stage === 'grand_final_reset' && fixture.status === 'cancelled') return null;
                const participants = [
                  fixture.home_team_name || fixture.home_registration_name,
                  fixture.away_team_name || fixture.away_registration_name
                ];
                const hasFinalScore = fixture.home_score?.numeric !== undefined
                  && fixture.away_score?.numeric !== undefined;
                const title = fixture.stage === 'group'
                  ? fixture.round_name || `Group ${String.fromCharCode(64 + fixture.group_number)} · Round ${fixture.round_number}`
                  : `${fixture.round_name || `Round ${fixture.round_number}`} · Match ${fixture.match_number}`;
                const content = (
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-primary truncate">
                        {title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <PsBadge variant={
                          fixture.status === 'completed' ? 'success' :
                          fixture.status === 'in_progress' ? 'maroon' :
                          fixture.status === 'cancelled' || fixture.status === 'bye' ? 'default' : 'warning'
                        }>
                          {fixture.status.replace('_', ' ').toUpperCase()}
                        </PsBadge>
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:flex sm:justify-between items-end">
                      <div className="sm:flex">
                        <div className="text-sm font-medium text-primary bg-surface border border-border px-3 py-2 rounded-lg shadow-xs">
                          <p>{participants.map(name => name || 'TBD').join(' vs ')}</p>
                          {hasFinalScore && (
                            <p className="mt-1 text-base font-bold text-maroon" aria-label="Final score">
                              {fixture.home_score.numeric} – {fixture.away_score.numeric}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-secondary sm:mt-0">
                        {fixture.scheduled_at && (
                          <p className="flex items-center gap-1.5">
                            <span className="text-muted">🕒</span>
                            {new Date(fixture.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            {fixture.scheduled_end_at && ` – ${new Date(fixture.scheduled_end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                          </p>
                        )}
                        {fixture.ground_name && <p className="ml-3">📍 {fixture.ground_name}</p>}
                        {fixture.status === 'bye' && <span>Advances automatically</span>}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={fixture.id}>
                    {fixture.match_id ? (
                      <Link to={`/tournaments/${tournamentId}/matches/${fixture.match_id}`} className="block hover:bg-pill-hover transition">{content}</Link>
                    ) : content}
                  </li>
                );
              })}
            </ul>
          )}
        </PsCard>
      )}
    </div>
  );
}
