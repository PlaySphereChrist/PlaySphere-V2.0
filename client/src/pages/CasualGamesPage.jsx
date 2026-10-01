import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listCasualGames } from '../features/casual-games/api';
import { getSports } from '../features/sports/api';
import { useAuth } from '../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsInput,
  PsBadge,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsErrorState
} from '../components/ui';

export default function CasualGamesPage() {
  const [games, setGames] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('open');
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ sportId: '', status: 'open', skillLevel: '', date: '' });
  const [retryKey, setRetryKey] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await getSports();
        setSports(res.data.sports || []);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };
    fetchSports();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError('');
        const params = new window.URLSearchParams();
        if (appliedFilters.sportId) params.append('sport_id', appliedFilters.sportId);
        if (appliedFilters.status) params.append('status', appliedFilters.status);
        if (appliedFilters.skillLevel) params.append('skill_level', appliedFilters.skillLevel);
        if (appliedFilters.date) params.append('date', appliedFilters.date);

        const res = await listCasualGames(params.toString());
        if (active) setGames(res.data.games || []);
      } catch (err) {
        if (active) setError(err.data?.error || err.message || 'Failed to load games');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchGames();
    return () => { active = false; };
  }, [appliedFilters, retryKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ sportId, status, skillLevel, date });
  };

  const clearFilters = () => {
    setSportId('');
    setStatus('');
    setSkillLevel('');
    setDate('');
    setAppliedFilters({ sportId: '', status: '', skillLevel: '', date: '' });
  };

  const filtersChanged = sportId !== appliedFilters.sportId
    || status !== appliedFilters.status
    || skillLevel !== appliedFilters.skillLevel
    || date !== appliedFilters.date;
  const hasActiveFilters = Boolean(appliedFilters.sportId || appliedFilters.status || appliedFilters.skillLevel || appliedFilters.date);
  const appliedSportName = sports.find((sport) => sport.id === appliedFilters.sportId)?.name;

  const getStatusVariant = (s) => {
    switch (s) {
      case 'open': return 'success';
      case 'full': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Casual Games" 
        subtitle="Find and join pickup games in your area."
        actions={
          <Link to={user ? '/casual-games/create' : '/login'} state={!user ? { from: '/casual-games' } : undefined}>
            <PsButton>{user ? 'Create Game' : 'Sign in to host a game'}</PsButton>
          </Link>
        }
      />

      <PsCard className="p-4 bg-surface">
        <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <PsSelect
            label="Sport"
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
          >
            <option value="">All Sports</option>
            {sports.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </PsSelect>

          <PsSelect
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="">All Statuses</option>
          </PsSelect>

          <PsSelect
            label="Skill Level"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Expert">Expert</option>
            <option value="Professional">Professional</option>
          </PsSelect>

          <PsInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {filtersChanged && <span className="mr-auto text-xs text-secondary" role="status">Filters changed. Search to update results.</span>}
          <PsButton type="submit">
            <span className="inline-flex items-center gap-2"><Search size={16} />Search</span>
          </PsButton>
          {hasActiveFilters || filtersChanged ? (
            <PsButton type="button" variant="secondary" onClick={clearFilters}>Clear filters</PsButton>
          ) : null}
        </div>
        </form>
      </PsCard>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2" role="status" aria-label="Applied casual game filters" aria-live="polite">
          <span className="text-sm text-secondary">Applied filters:</span>
          {appliedSportName && <PsBadge>{appliedSportName}</PsBadge>}
          {appliedFilters.status && <PsBadge>{appliedFilters.status[0].toUpperCase() + appliedFilters.status.slice(1)}</PsBadge>}
          {appliedFilters.skillLevel && <PsBadge>{appliedFilters.skillLevel}</PsBadge>}
          {appliedFilters.date && <PsBadge>{new Date(`${appliedFilters.date}T00:00:00`).toLocaleDateString()}</PsBadge>}
        </div>
      )}

      {error ? (
        <PsErrorState message={error} retry={() => setRetryKey((key) => key + 1)} />
      ) : loading ? (
        <PsLoading />
      ) : games.length === 0 ? (
        <PsEmpty 
          title="No casual games found" 
          message="No casual games found matching your filters." 
          action={
            <Link to={user ? '/casual-games/create' : '/login'} state={!user ? { from: '/casual-games' } : undefined}>
              <PsButton>{user ? 'Create Game' : 'Sign in to host a game'}</PsButton>
            </Link>
          }
        />
      ) : (
        <section aria-label={`${games.length} casual games`}>
          <p className="mb-3 text-sm text-secondary" aria-live="polite">Showing {games.length} {games.length === 1 ? 'casual game' : 'casual games'}</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map(game => (
            <PsCard key={game.id} className="flex flex-col hover:border-maroon/50 transition">
              <div className="p-6 flex-grow">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <PsBadge variant="default">
                    {getSportEmoji(game.sport_name)} {game.sport_name}
                  </PsBadge>
                  <PsBadge variant={getStatusVariant(game.status)}>
                    {game.status.toUpperCase()}
                  </PsBadge>
                </div>
                <h3 className="text-xl font-serif font-bold text-primary truncate" title={game.title}>
                  {game.title}
                </h3>
                <div className="mt-4 text-sm text-secondary space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📅</span>
                    {new Date(game.scheduled_at).toLocaleDateString()} at {new Date(game.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  {game.ground_name && (
                    <p className="flex items-center gap-2">
                      <span className="text-muted">🏟️</span>
                      <span className="truncate font-medium text-primary">{game.ground_name}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📍</span>
                    <span className="truncate">{game.location_name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted">⭐</span>
                    {game.skill_level}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-muted">👥</span>
                    <div className="flex-1 bg-surface border border-border h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-maroon/60 rounded-full" 
                        style={{ width: `${Math.min(100, (game.current_participants / game.max_participants) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-primary w-12 text-right">
                      {game.current_participants}/{game.max_participants}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-pill-hover px-6 py-4 border-t border-border flex justify-between items-center rounded-b-2xl">
                <div className="text-sm text-secondary">
                  By <span className="font-medium text-primary">{game.creator_id === user?.id ? 'You' : game.creator_name}</span>
                </div>
                <Link to={`/casual-games/${game.id}`}>
                  <PsButton size="sm">View</PsButton>
                </Link>
              </div>
            </PsCard>
          ))}
          </div>
        </section>
      )}
    </div>
  );
}
