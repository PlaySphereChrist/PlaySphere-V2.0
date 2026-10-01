import { useEffect, useState, useMemo } from 'react';
import { getSportStatDefinitions } from '../../features/sports/api';
import {
  getTournamentPlayerStatistics,
  getTournamentTeamStatistics,
} from '../../features/statistics/api';
import { PsAlert, PsCard, PsLoading } from '../../components/ui';

function formatValue(value) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Color palette for team distribution charts
const TEAM_COLORS = [
  '#8B0000', // Maroon
  '#C9972C', // Gold
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#DC2626', // Red
  '#0891B2', // Cyan
];

// Interactive Visual Bar Chart for Stat Leaders
function VisualStatBars({ rows, label, type = 'player' }) {
  const [expanded, setExpanded] = useState(false);

  if (!rows || rows.length === 0) {
    return <p className="mt-3 text-xs text-muted">No {label.toLowerCase()} recorded yet.</p>;
  }

  const maxValue = Math.max(...rows.map((r) => Number(r.stat_value) || 0), 1);
  const displayRows = expanded ? rows : rows.slice(0, 5);

  const getRankBadge = (index) => {
    if (index === 0) return <span className="text-sm shrink-0" title="1st Place">🥇</span>;
    if (index === 1) return <span className="text-sm shrink-0" title="2nd Place">🥈</span>;
    if (index === 2) return <span className="text-sm shrink-0" title="3rd Place">🥉</span>;
    return (
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-pill-hover text-[11px] font-semibold text-secondary shrink-0">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="mt-3 space-y-2.5">
      {displayRows.map((row, index) => {
        const val = Number(row.stat_value) || 0;
        const pct = Math.max(4, Math.min(100, Math.round((val / maxValue) * 100)));
        const name = row.display_name || row.team_name || 'Unknown';
        const isTop = index === 0;

        return (
          <div
            key={`${row.player_profile_id || row.team_id || index}-${row.stat_key}`}
            className="group relative"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {getRankBadge(index)}
                <span className={`truncate font-medium ${isTop ? 'text-primary font-semibold' : 'text-secondary'}`}>
                  {name}
                </span>
                {row.team_name && type === 'player' && (
                  <span className="hidden sm:inline-block text-[10px] text-muted truncate">
                    ({row.team_name})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted">{pct}%</span>
                <span className="font-bold text-primary tabular-nums text-xs">
                  {formatValue(row.stat_value)}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-2.5 w-full rounded-full bg-border/40 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  type === 'player'
                    ? isTop
                      ? 'bg-gradient-to-r from-maroon via-maroon to-red-500 shadow-sm'
                      : 'bg-maroon/80 group-hover:bg-maroon'
                    : isTop
                      ? 'bg-gradient-to-r from-[#C9972C] to-amber-500 shadow-sm'
                      : 'bg-[#C9972C]/80 group-hover:bg-[#C9972C]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      {rows.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-maroon hover:underline flex items-center gap-1 transition"
        >
          {expanded ? '▲ Show Top 5 only' : `▼ Show all ${rows.length} ${label.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}

// Team Distribution Segmented Chart
function TeamDistributionChart({ rows }) {
  if (!rows || rows.length <= 1) return null;

  const total = rows.reduce((acc, r) => acc + (Number(r.stat_value) || 0), 0);
  if (total <= 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-secondary uppercase tracking-wider text-[11px]">
          Team Share Distribution
        </span>
        <span className="text-muted text-[11px]">Total: {formatValue(total)}</span>
      </div>

      {/* Multi-segment horizontal bar */}
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-border/30">
        {rows.map((row, idx) => {
          const val = Number(row.stat_value) || 0;
          const sharePct = ((val / total) * 100).toFixed(1);
          if (val <= 0) return null;
          const color = TEAM_COLORS[idx % TEAM_COLORS.length];

          return (
            <div
              key={row.team_id || idx}
              style={{ width: `${sharePct}%`, backgroundColor: color }}
              className="h-full transition-all duration-300 relative group"
              title={`${row.team_name}: ${formatValue(val)} (${sharePct}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {rows.slice(0, 6).map((row, idx) => {
          const val = Number(row.stat_value) || 0;
          const sharePct = Math.round((val / total) * 100);
          const color = TEAM_COLORS[idx % TEAM_COLORS.length];

          return (
            <div key={row.team_id || idx} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-secondary truncate max-w-[120px]">{row.team_name}:</span>
              <span className="font-semibold text-primary">{sharePct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Spotlight MVP Card
function SpotlightCard({ title, leader, statName, icon }) {
  if (!leader) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md">
      <div className="absolute top-0 right-0 p-3 opacity-10 text-4xl select-none">
        {icon}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-1">
        <div className="min-w-0">
          <p className="font-serif font-bold text-lg text-primary truncate leading-tight">
            {leader.display_name || leader.team_name}
          </p>
          {leader.team_name && leader.display_name && (
            <p className="text-xs text-secondary truncate mt-0.5">{leader.team_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-maroon tabular-nums leading-none">
            {formatValue(leader.stat_value)}
          </div>
          <span className="text-[11px] text-muted uppercase font-medium">{statName}</span>
        </div>
      </div>
    </div>
  );
}

export default function TournamentSportStatsPanel({ tournamentId, sportId, sportName }) {
  const [definitions, setDefinitions] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [statisticsError, setStatisticsError] = useState('');

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError('');
    setStatisticsError('');

    const load = async () => {
      const catalogRequest = getSportStatDefinitions(sportId);
      const [catalogResult, playerResult, teamResult] = await Promise.allSettled([
        catalogRequest,
        getTournamentPlayerStatistics(tournamentId),
        getTournamentTeamStatistics(tournamentId),
      ]);

      if (!active) return;

      if (catalogResult.status === 'fulfilled') {
        setDefinitions(catalogResult.value.data?.statDefinitions || []);
      } else {
        setCatalogError(catalogResult.reason?.message || 'Could not load this sport’s statistic catalog.');
      }

      if (playerResult.status === 'fulfilled' && teamResult.status === 'fulfilled') {
        setPlayerStats(playerResult.value?.data?.statistics || []);
        setTeamStats(teamResult.value?.data?.statistics || []);
      } else {
        const failure = playerResult.status === 'rejected' ? playerResult.reason : teamResult.reason;
        setStatisticsError(failure?.message || 'Tournament totals could not be loaded.');
      }

      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [sportId, tournamentId]);

  // Derive sport-specific spotlight MVPs
  const spotlights = useMemo(() => {
    const findTopPlayer = (keys) => {
      for (const k of keys) {
        const rows = playerStats
          .filter((r) => r.stat_key === k)
          .sort((a, b) => Number(b.stat_value) - Number(a.stat_value));
        if (rows.length > 0 && Number(rows[0].stat_value) > 0) {
          return { leader: rows[0], statKey: k };
        }
      }
      return null;
    };

    const findTopTeam = (keys) => {
      for (const k of keys) {
        const rows = teamStats
          .filter((r) => r.stat_key === k)
          .sort((a, b) => Number(b.stat_value) - Number(a.stat_value));
        if (rows.length > 0 && Number(rows[0].stat_value) > 0) {
          return { leader: rows[0], statKey: k };
        }
      }
      return null;
    };

    const sport = (sportName || '').toLowerCase();
    const result = [];

    if (sport.includes('football')) {
      const topScorer = findTopPlayer(['goals']);
      if (topScorer) result.push({ title: 'Golden Boot', leader: topScorer.leader, statName: 'Goals', icon: '⚽' });
      const topAssists = findTopPlayer(['assists']);
      if (topAssists) result.push({ title: 'Top Playmaker', leader: topAssists.leader, statName: 'Assists', icon: '🎯' });
      const topTeam = findTopTeam(['goals']);
      if (topTeam) result.push({ title: 'Top Scoring Team', leader: topTeam.leader, statName: 'Team Goals', icon: '🏆' });
    } else if (sport.includes('cricket')) {
      const topRuns = findTopPlayer(['runs']);
      if (topRuns) result.push({ title: 'Orange Cap (Runs)', leader: topRuns.leader, statName: 'Runs', icon: '🏏' });
      const topWkts = findTopPlayer(['wickets']);
      if (topWkts) result.push({ title: 'Purple Cap (Wickets)', leader: topWkts.leader, statName: 'Wickets', icon: '🎯' });
      const topTeam = findTopTeam(['runs']);
      if (topTeam) result.push({ title: 'Highest Scoring Team', leader: topTeam.leader, statName: 'Team Runs', icon: '🏆' });
    } else if (sport.includes('basketball')) {
      const topPts = findTopPlayer(['points']);
      if (topPts) result.push({ title: 'Scoring King', leader: topPts.leader, statName: 'Points', icon: '🏀' });
      const topAst = findTopPlayer(['assists']);
      if (topAst) result.push({ title: 'Floor General', leader: topAst.leader, statName: 'Assists', icon: '⚡' });
      const topTeam = findTopTeam(['points']);
      if (topTeam) result.push({ title: 'Dominant Offense', leader: topTeam.leader, statName: 'Team Points', icon: '🏆' });
    } else if (sport.includes('volleyball')) {
      const topPts = findTopPlayer(['points']);
      if (topPts) result.push({ title: 'Spike Leader', leader: topPts.leader, statName: 'Points', icon: '🏐' });
      const topAces = findTopPlayer(['aces']);
      if (topAces) result.push({ title: 'Ace Master', leader: topAces.leader, statName: 'Service Aces', icon: '⚡' });
      const topBlk = findTopPlayer(['blocks']);
      if (topBlk) result.push({ title: 'Iron Wall', leader: topBlk.leader, statName: 'Blocks', icon: '🛡️' });
    } else if (sport.includes('badminton')) {
      const topPts = findTopPlayer(['points_won']);
      if (topPts) result.push({ title: 'Rally Master', leader: topPts.leader, statName: 'Points Won', icon: '🏸' });
      const topSmash = findTopPlayer(['smashes']);
      if (topSmash) result.push({ title: 'Smash King', leader: topSmash.leader, statName: 'Smashes', icon: '💥' });
      const topTeam = findTopTeam(['points_won']);
      if (topTeam) result.push({ title: 'Top Pair / Team', leader: topTeam.leader, statName: 'Points Won', icon: '🏆' });
    }

    return result;
  }, [playerStats, teamStats, sportName]);

  // Filter definitions based on category and search
  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (def.stat_name || '').toLowerCase().includes(q);
        const matchKey = (def.stat_key || '').toLowerCase().includes(q);
        const matchDesc = (def.description || '').toLowerCase().includes(q);
        if (!matchName && !matchKey && !matchDesc) return false;
      }

      // Tab category
      if (activeTab === 'all') return true;
      if (activeTab === 'scoring') {
        return ['goals', 'points', 'runs', 'points_won', 'smashes', 'shots_on_target', 'fours', 'sixes'].includes(def.stat_key);
      }
      if (activeTab === 'playmaking') {
        return ['assists', 'rallies_won', 'net_winners', 'service_aces', 'aces', 'strike_rate'].includes(def.stat_key);
      }
      if (activeTab === 'defense') {
        return ['tackles', 'saves', 'clean_sheets', 'wickets', 'catches', 'blocks', 'rebounds', 'digs', 'yellow_cards', 'red_cards', 'economy_rate'].includes(def.stat_key);
      }
      if (activeTab === 'participation') {
        return ['appearances', 'overs_bowled', 'turnovers', 'personal_fouls', 'service_errors', 'unforced_errors'].includes(def.stat_key);
      }
      return true;
    });
  }, [definitions, activeTab, searchQuery]);

  const trackedCount = definitions.filter((definition) => {
    const hasPlayers = playerStats.some((row) => row.stat_key === definition.stat_key);
    const hasTeams = teamStats.some((row) => row.stat_key === definition.stat_key);
    return hasPlayers || hasTeams;
  }).length;

  return (
    <PsCard className="overflow-hidden">
      {/* Header with Stats Summary */}
      <div className="border-b border-border bg-pill-hover px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-primary">{sportName} statistics & graphs</h2>
            <p className="mt-1 text-sm text-secondary">
              {definitions.length} trackable metrics for {sportName} · {trackedCount} with recorded data in this tournament.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-maroon/10 text-maroon border border-maroon/20">
              <span className="w-2 h-2 rounded-full bg-maroon animate-pulse" />
              Live Tournament Stats
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12"><PsLoading /></div>
      ) : catalogError ? (
        <div className="p-6"><PsAlert variant="error">{catalogError}</PsAlert></div>
      ) : (
        <div className="p-6 space-y-6">
          {statisticsError && (
            <PsAlert variant="warning">{statisticsError}</PsAlert>
          )}

          {/* Spotlight MVP Highlights Banner */}
          {spotlights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <span>⭐</span> Top Tournament Performers
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {spotlights.map((spot, idx) => (
                  <SpotlightCard
                    key={idx}
                    title={spot.title}
                    leader={spot.leader}
                    statName={spot.statName}
                    icon={spot.icon}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Controls: Search & Category Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Metrics' },
                { id: 'scoring', label: 'Scoring & Offense' },
                { id: 'playmaking', label: 'Creation & Assists' },
                { id: 'defense', label: 'Defense & Stops' },
                { id: 'participation', label: 'Other / Discipline' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-maroon text-white shadow-sm'
                      : 'bg-pill-hover text-secondary hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search statistics..."
                className="w-full rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-maroon"
              />
            </div>
          </div>

          {/* Stats & Charts Grid */}
          {definitions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-secondary">
              No trackable statistics have been configured for this sport yet.
            </p>
          ) : filteredDefinitions.length === 0 ? (
            <div className="py-8 text-center text-sm text-secondary border border-dashed border-border rounded-xl">
              No metrics matched the selected filter or search term.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredDefinitions.map((definition) => {
                const playerRows = playerStats
                  .filter((row) => row.stat_key === definition.stat_key)
                  .sort((a, b) => Number(b.stat_value) - Number(a.stat_value));
                const teamRows = teamStats
                  .filter((row) => row.stat_key === definition.stat_key)
                  .sort((a, b) => Number(b.stat_value) - Number(a.stat_value));
                const appliesTo = definition.applies_to === 'both'
                  ? 'Players and teams'
                  : definition.applies_to === 'team' ? 'Teams' : 'Players';

                const hasData = playerRows.length > 0 || teamRows.length > 0;

                return (
                  <article
                    key={definition.stat_key}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-border/80 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Metric Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-primary text-base flex items-center gap-2">
                            <span>{definition.stat_name}</span>
                            {hasData && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Has recorded data" />
                            )}
                          </h3>
                          <p className="mt-1 text-xs text-secondary leading-relaxed">
                            {definition.description || 'Trackable tournament statistic.'}
                          </p>
                        </div>
                        <span className="rounded-full bg-maroon/10 px-2.5 py-1 text-[11px] font-semibold text-maroon shrink-0">
                          {appliesTo}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
                        <span>{definition.is_cumulative ? 'Tournament total' : 'Match value'}</span>
                        <span>·</span>
                        <span>{definition.data_type}</span>
                      </div>

                      {/* Visual Player Graphs */}
                      {(definition.applies_to === 'player' || definition.applies_to === 'both') && (
                        <div className="mt-4 border-t border-border pt-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-maroon" />
                              Player Leaders Graph
                            </p>
                            {playerRows.length > 0 && (
                              <span className="text-[11px] text-muted">
                                {playerRows.length} {playerRows.length === 1 ? 'player' : 'players'}
                              </span>
                            )}
                          </div>
                          <VisualStatBars rows={playerRows} label="Players" type="player" />
                        </div>
                      )}

                      {/* Visual Team Graphs */}
                      {(definition.applies_to === 'team' || definition.applies_to === 'both') && (
                        <div className="mt-4 border-t border-border pt-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#C9972C]" />
                              Team Leaders Graph
                            </p>
                            {teamRows.length > 0 && (
                              <span className="text-[11px] text-muted">
                                {teamRows.length} {teamRows.length === 1 ? 'team' : 'teams'}
                              </span>
                            )}
                          </div>
                          <VisualStatBars rows={teamRows} label="Teams" type="team" />

                          {/* Team Share Distribution Visualization */}
                          <TeamDistributionChart rows={teamRows} statName={definition.stat_name} />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PsCard>
  );
}
