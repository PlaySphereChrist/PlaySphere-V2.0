import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listTournaments } from '../../features/tournaments/api';
import { getSports } from '../../features/sports/api';
import { useAuth } from '../../store/AuthContext';
import { resolveDemoImageUrl } from '../../utils/demoImages';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsBadge,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsErrorState
} from '../../components/ui';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ sportId: '', status: '', searchTerm: '' });
  const [retryKey, setRetryKey] = useState(0);

  const { user } = useAuth();
  const isOrganizerOrAdmin = user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN');

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await getSports();
        setSports(res.data.sports);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };
    fetchSports();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError('');
        const params = new window.URLSearchParams();
        if (appliedFilters.sportId) params.append('sport_id', appliedFilters.sportId);
        if (appliedFilters.status) params.append('status', appliedFilters.status);
        if (appliedFilters.searchTerm) params.append('search', appliedFilters.searchTerm);

        params.append('exclude_cancelled', 'true');
        const res = await listTournaments(params.toString());
        if (!active) return;
        const fetched = res.data.tournaments || [];
        setTournaments(fetched.filter((t) => t.status !== 'cancelled'));
        setError('');
      } catch (err) {
        if (active) setError(err.message || 'Failed to load tournaments');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTournaments();
    return () => { active = false; };
  }, [appliedFilters, isOrganizerOrAdmin, retryKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ sportId, status, searchTerm: searchInput.trim() });
  };

  const clearFilters = () => {
    setSportId('');
    setStatus('');
    setSearchInput('');
    setAppliedFilters({ sportId: '', status: '', searchTerm: '' });
  };

  const filtersChanged = sportId !== appliedFilters.sportId
    || status !== appliedFilters.status
    || searchInput.trim() !== appliedFilters.searchTerm;
  const hasActiveFilters = Boolean(appliedFilters.sportId || appliedFilters.status || appliedFilters.searchTerm);
  const appliedSportName = sports.find((sport) => sport.id === appliedFilters.sportId)?.name;

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

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

  const getStatusLabel = (s) => {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Tournaments" 
        actions={
          isOrganizerOrAdmin && (
            <Link to="/organizer/tournaments">
              <PsButton variant="secondary">Manage Tournaments</PsButton>
            </Link>
          )
        }
      />

      <PsCard className="p-4">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              label="Tournament Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All tournaments</option>
              <option value="past">Past tournaments</option>
              <option value="registration_open">Registration open</option>
              <option value="registration_closed">Registration closed</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
              {isOrganizerOrAdmin && <option value="draft">Draft</option>}
            </PsSelect>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <PsInput
              label="Search tournaments"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tournament, sport, or city"
            />
            <div className="flex shrink-0 gap-2">
              <PsButton type="submit">
                <span className="inline-flex items-center gap-2"><Search size={16} />Search</span>
              </PsButton>
              {hasActiveFilters || filtersChanged ? (
                <PsButton type="button" variant="secondary" onClick={clearFilters}>Clear filters</PsButton>
              ) : null}
            </div>
          </div>
          {filtersChanged && (
            <p className="mt-3 text-xs text-secondary" role="status">Filters changed. Select Search to update results.</p>
          )}
        </form>
      </PsCard>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2" role="status" aria-label="Applied tournament filters" aria-live="polite">
          <span className="text-sm text-secondary">Applied filters:</span>
          {appliedSportName && <PsBadge>{appliedSportName}</PsBadge>}
          {appliedFilters.status && <PsBadge>{getStatusLabel(appliedFilters.status)}</PsBadge>}
          {appliedFilters.searchTerm && <PsBadge>“{appliedFilters.searchTerm}”</PsBadge>}
        </div>
      )}

      {error ? (
        <PsErrorState message={error} retry={() => setRetryKey((key) => key + 1)} />
      ) : loading ? (
        <PsLoading />
      ) : tournaments.length === 0 ? (
        <PsEmpty title="No tournaments found" message="Try adjusting your filters." />
      ) : (
        <section aria-label={`${tournaments.length} tournaments`}>
          <p className="mb-3 text-sm text-secondary" aria-live="polite">Showing {tournaments.length} {tournaments.length === 1 ? 'tournament' : 'tournaments'}</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(tournament => (
            <PsCard key={tournament.id} className="flex flex-col hover:border-maroon/50 transition h-full">
              <div className="relative h-64 overflow-hidden rounded-t-2xl bg-gradient-to-br from-maroon to-gold/70">
                {tournament.banner_url && (
                  <img
                    src={resolveDemoImageUrl(tournament.banner_url, tournament.id || tournament.name)}
                    alt={`${tournament.name} poster`}
                    className="h-full w-full object-cover object-[center_68%]"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <PsBadge variant="default" className="shrink-0 flex items-center gap-1">
                    <span>{getSportEmoji(tournament.sport_name)}</span>
                    {tournament.sport_name}
                  </PsBadge>
                  <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="shrink-0">
                    {getStatusLabel(tournament.status)}
                  </PsBadge>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-primary mb-3 leading-tight">
                  {tournament.name}
                </h3>
                
                <div className="mt-auto space-y-2 text-sm text-secondary">
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📅</span> 
                    {new Date(tournament.starts_at).toLocaleDateString()} - {new Date(tournament.ends_at).toLocaleDateString()}
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <span className="text-muted">👥</span> 
                    <span className="capitalize">{tournament.participation_type}</span> ({tournament.format.replace(/_/g, ' ')})
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <span className="text-muted">📍</span> 
                    {tournament.city || 'TBD'}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border bg-pill-hover rounded-b-2xl">
                <Link to={`/tournaments/${tournament.id}`}>
                  <PsButton variant="secondary" className="w-full">
                    View Details
                  </PsButton>
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
