import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, MapPin, Clock, ArrowRight } from 'lucide-react';

/**
 * Derives a human-friendly round name based on distance from final.
 */
function getRoundLabel(roundNumber, totalRounds, customName) {
  if (customName) return customName;
  const fromFinal = totalRounds - roundNumber;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinals';
  if (fromFinal === 2) return 'Quarterfinals';
  if (fromFinal === 3) return 'Round of 16';
  if (fromFinal === 4) return 'Round of 32';
  return `Round ${roundNumber}`;
}

export default function TournamentBracketView({ tournament, fixtures = [] }) {
  const [selectedStage, setSelectedStage] = useState('knockout');

  // Discover distinct stages that belong to knockout / bracket play
  const availableStages = useMemo(() => {
    const stages = new Set();
    fixtures.forEach(f => {
      if (['knockout', 'double_elimination_winners', 'double_elimination_losers', 'grand_final'].includes(f.stage)) {
        stages.add(f.stage);
      }
    });
    return Array.from(stages);
  }, [fixtures]);

  const activeStage = availableStages.includes(selectedStage)
    ? selectedStage
    : availableStages[0] || 'knockout';

  // Filter fixtures for the active stage and group by round_number
  const { rounds, totalRounds } = useMemo(() => {
    const stageFixtures = fixtures.filter(f => {
      if (activeStage === 'grand_final') {
        return f.stage === 'grand_final' || f.stage === 'grand_final_reset';
      }
      return f.stage === activeStage;
    });

    const roundMap = new Map();
    stageFixtures.forEach(f => {
      const r = f.round_number || 1;
      if (!roundMap.has(r)) {
        roundMap.set(r, []);
      }
      roundMap.get(r).push(f);
    });

    // Sort rounds ascending
    const sortedRoundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
    const sortedRounds = sortedRoundNumbers.map(rNum => {
      const roundFixtures = roundMap.get(rNum);
      // Sort fixtures by bracket_position or match_number
      roundFixtures.sort((a, b) => (a.bracket_position || a.match_number || 0) - (b.bracket_position || b.match_number || 0));
      return {
        roundNumber: rNum,
        fixtures: roundFixtures,
        name: roundFixtures[0]?.round_name || null
      };
    });

    return {
      rounds: sortedRounds,
      totalRounds: sortedRounds.length
    };
  }, [fixtures, activeStage]);

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-secondary bg-surface border border-border rounded-xl p-8">
        <Trophy className="mx-auto h-10 w-10 text-muted mb-3 opacity-60" />
        <p className="font-semibold text-primary">No bracket matchups available</p>
        <p className="text-xs text-secondary mt-1">Brackets will appear once approved teams are seeded and fixtures are generated.</p>
      </div>
    );
  }

  const stageTitles = {
    knockout: 'Single Elimination Bracket',
    double_elimination_winners: "Winners' Bracket",
    double_elimination_losers: "Losers' Bracket",
    grand_final: 'Championship Final'
  };

  return (
    <div className="space-y-4">
      {/* Stage Selector if multiple bracket stages exist (e.g. double elimination) */}
      {availableStages.length > 1 && (
        <div className="flex items-center gap-2 border-b border-border pb-3">
          {availableStages.map(stage => (
            <button
              key={stage}
              type="button"
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeStage === stage
                  ? 'bg-maroon text-white shadow-sm'
                  : 'bg-surface hover:bg-pill-hover text-secondary border border-border'
              }`}
            >
              {stageTitles[stage] || stage}
            </button>
          ))}
        </div>
      )}

      {/* Horizontally scrollable Bracket Canvas */}
      <div className="overflow-x-auto pb-6 pt-2 rounded-xl bg-surface/50 border border-border/80 px-4 scrollbar-thin">
        <div className="flex items-stretch min-w-max gap-8 py-2">
          {rounds.map((round, rIdx) => {
            const isFinalRound = rIdx === rounds.length - 1;
            const roundTitle = getRoundLabel(round.roundNumber, totalRounds, round.name);

            return (
              <div key={round.roundNumber} className="flex flex-col w-72 flex-shrink-0">
                {/* Round Header */}
                <div className="mb-4 pb-2 border-b border-border/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      {isFinalRound && <Trophy size={13} className="text-amber-500" />}
                      {roundTitle}
                    </h3>
                    <p className="text-[11px] text-muted">
                      {round.fixtures.length} match{round.fixtures.length > 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pill-hover text-secondary border border-border">
                    R{round.roundNumber}
                  </span>
                </div>

                {/* Fixtures list with vertical flex spacing */}
                <div className="flex flex-col justify-around flex-grow gap-6">
                  {round.fixtures.map((fixture) => (
                    <BracketMatchCard
                      key={fixture.id}
                      fixture={fixture}
                      tournamentId={tournament.id}
                      isFinal={isFinalRound}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({ fixture, tournamentId, isFinal }) {
  const isBye = fixture.status === 'bye';
  const isLive = fixture.status === 'in_progress';
  const isCompleted = fixture.status === 'completed';

  const homeName = fixture.home_team_name || fixture.home_registration_name || 'TBD';
  const awayName = fixture.away_team_name || fixture.away_registration_name || 'TBD';

  const homeScore = fixture.home_score?.numeric;
  const awayScore = fixture.away_score?.numeric;
  const hasScore = homeScore !== undefined && awayScore !== undefined;

  const isHomeWinner = isCompleted && fixture.winner_registration_id && fixture.winner_registration_id === fixture.home_registration_id;
  const isAwayWinner = isCompleted && fixture.winner_registration_id && fixture.winner_registration_id === fixture.away_registration_id;

  const cardContent = (
    <div
      className={`group relative rounded-xl border transition-all duration-150 p-3 bg-surface shadow-sm ${
        isLive
          ? 'border-maroon ring-1 ring-maroon/20 hover:border-maroon/80'
          : isFinal && isCompleted
          ? 'border-amber-500/50 bg-amber-500/[0.02] hover:border-amber-500'
          : 'border-border hover:border-primary/40'
      } ${fixture.match_id ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      {/* Top micro-bar: Match #, Status */}
      <div className="flex items-center justify-between text-[11px] text-muted mb-2">
        <span className="font-mono text-[10px] font-semibold">
          Match {fixture.match_number || fixture.bracket_position || '—'}
        </span>
        <div>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-maroon bg-maroon/10 px-1.5 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-maroon"></span> LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Final
            </span>
          )}
          {isBye && (
            <span className="text-[10px] font-medium text-secondary bg-pill-hover px-1.5 py-0.5 rounded">
              BYE
            </span>
          )}
          {!isLive && !isCompleted && !isBye && (
            <span className="text-[10px] font-medium text-secondary">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Participants Container */}
      <div className="space-y-1.5">
        {/* Home Participant */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
            isHomeWinner
              ? 'bg-emerald-500/10 font-bold text-primary border border-emerald-500/20'
              : isCompleted && !isHomeWinner && !isBye
              ? 'text-muted line-through opacity-75'
              : 'bg-pill-hover/50 text-primary'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <span
              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0 ${
                isHomeWinner ? 'bg-emerald-500 text-white' : 'bg-surface border border-border text-secondary'
              }`}
            >
              {homeName.charAt(0)}
            </span>
            <span className="truncate">{homeName}</span>
            {isHomeWinner && <Trophy size={11} className="text-amber-500 flex-shrink-0" />}
          </div>
          <span className="font-mono font-bold text-xs pl-2">
            {hasScore ? homeScore : isBye && isHomeWinner ? 'Adv' : '—'}
          </span>
        </div>

        {/* Away Participant (Hidden if Bye with no away competitor) */}
        {!isBye ? (
          <div
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
              isAwayWinner
                ? 'bg-emerald-500/10 font-bold text-primary border border-emerald-500/20'
                : isCompleted && !isAwayWinner
                ? 'text-muted line-through opacity-75'
                : 'bg-pill-hover/50 text-primary'
            }`}
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <span
                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0 ${
                  isAwayWinner ? 'bg-emerald-500 text-white' : 'bg-surface border border-border text-secondary'
                }`}
              >
                {awayName.charAt(0)}
              </span>
              <span className="truncate">{awayName}</span>
              {isAwayWinner && <Trophy size={11} className="text-amber-500 flex-shrink-0" />}
            </div>
            <span className="font-mono font-bold text-xs pl-2">
              {hasScore ? awayScore : '—'}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-muted italic px-2 py-0.5">
            Automatic Bye advancement
          </div>
        )}
      </div>

      {/* Meta Footer (Time, Ground, Link Hint) */}
      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-secondary">
        <div className="flex items-center gap-2 truncate text-muted">
          {fixture.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {new Date(fixture.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {fixture.ground_name && (
            <span className="flex items-center gap-1 truncate max-w-[110px]" title={fixture.ground_name}>
              <MapPin size={10} />
              {fixture.ground_name}
            </span>
          )}
        </div>
        {fixture.match_id && (
          <span className="text-maroon font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            Details <ArrowRight size={10} />
          </span>
        )}
      </div>
    </div>
  );

  if (fixture.match_id) {
    return (
      <Link to={`/tournaments/${tournamentId}/matches/${fixture.match_id}`} className="block focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
