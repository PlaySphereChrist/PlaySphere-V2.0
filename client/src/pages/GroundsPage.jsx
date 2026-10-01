import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listGrounds } from '../features/grounds/api';
import { getSports } from '../features/sports/api';
import { formatDate } from '../utils/dateTime';
import { resolveDemoImageUrl } from '../utils/demoImages';
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
} from '../components/ui';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

export default function GroundsPage() {
  const [grounds, setGrounds] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ sportId: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    async function fetchSports() {
      try {
        const sportsData = await getSports();
        setSports(sportsData.data.sports || []);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    }
    fetchSports();
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchGrounds() {
      try {
        setLoading(true);
        setError('');
        const params = new window.URLSearchParams();
        if (appliedFilters.sportId) params.append('sport_id', appliedFilters.sportId);
        if (appliedFilters.location) params.append('location', appliedFilters.location);

        const groundsData = await listGrounds(params.toString());
        if (active) setGrounds(groundsData.data.grounds || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to fetch grounds');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchGrounds();
    return () => { active = false; };
  }, [appliedFilters, retryKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ sportId: selectedSport, location: locationInput.trim() });
  };

  const clearFilters = () => {
    setSelectedSport('');
    setLocationInput('');
    setAppliedFilters({ sportId: '', location: '' });
  };
  const filtersChanged = selectedSport !== appliedFilters.sportId
    || locationInput.trim() !== appliedFilters.location;
  const hasActiveFilters = Boolean(appliedFilters.sportId || appliedFilters.location);
  const appliedSportName = sports.find((sport) => sport.id === appliedFilters.sportId)?.name;

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  const getGroundImage = (ground) => {
    const image = Array.isArray(ground.images) ? ground.images[0] : null;
    const imageUrl = typeof image === 'string' ? image : image?.url || image?.src || '';
    return resolveDemoImageUrl(imageUrl, ground.id || ground.name);
  };

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Explore Grounds" 
        subtitle="Find and book sports grounds near you."
      />

      <PsCard className="p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
          <PsSelect
            label="Sport"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">All Sports</option>
            {sports.map(sport => (
              <option key={sport.id} value={sport.id}>{sport.name}</option>
            ))}
          </PsSelect>
          <PsInput
            label="Location"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="City, state, or address"
          />
          <div className="sm:col-span-2 sm:flex sm:justify-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {filtersChanged && <span className="text-xs text-secondary" role="status">Filters changed. Search to update results.</span>}
              <PsButton type="submit">Search</PsButton>
              {hasActiveFilters || filtersChanged ? (
                <PsButton type="button" variant="secondary" onClick={clearFilters}>Clear filters</PsButton>
              ) : null}
            </div>
          </div>
        </form>
      </PsCard>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2" role="status" aria-label="Applied ground filters" aria-live="polite">
          <span className="text-sm text-secondary">Applied filters:</span>
          {appliedSportName && <PsBadge>{appliedSportName}</PsBadge>}
          {appliedFilters.location && <PsBadge>📍 {appliedFilters.location}</PsBadge>}
        </div>
      )}

      {error ? (
        <PsErrorState message={error} retry={() => setRetryKey((key) => key + 1)} />
      ) : loading ? (
        <PsLoading />
      ) : grounds.length === 0 ? (
        <PsEmpty
          title="No grounds found"
          message={appliedFilters.sportId || appliedFilters.location ? 'Try adjusting your location or sport filters.' : 'Check back later for new venues.'}
        />
      ) : (
        <section aria-label={`${grounds.length} grounds`}>
          <p className="mb-3 text-sm text-secondary" aria-live="polite">Showing {grounds.length} {grounds.length === 1 ? 'ground' : 'grounds'}</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grounds.map((ground) => (
            <PsCard key={ground.id} className="flex flex-col hover:border-maroon/50 transition h-full">
              <div className="relative h-48 overflow-hidden rounded-t-2xl bg-gradient-to-br from-maroon/80 to-gold/50">
                {getGroundImage(ground) && (
                  <img
                    src={getGroundImage(ground)}
                    alt={`${ground.name} sample venue image`}
                    className="h-full w-full object-cover"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-widest text-white/90">
                  Sample venue image
                </span>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-serif font-bold text-primary truncate" title={ground.name}>
                  {ground.name}
                </h3>
                <p className="text-sm text-secondary mt-1 flex items-center gap-1.5 truncate">
                  <span className="text-muted">📍</span>
                  {ground.address}, {ground.city}
                </p>
                <div className="mt-4 rounded-xl border border-border bg-pill-hover p-3 text-sm">
                  {Number(ground.upcoming_slot_count) > 0 ? (
                    <>
                      <p className="font-medium text-primary">
                        Next slot: {formatDate(ground.next_slot_date)} at {ground.next_slot_start_time?.slice(0, 5)}
                      </p>
                      <p className="mt-1 text-secondary">
                        {ground.upcoming_slot_count} upcoming {Number(ground.upcoming_slot_count) === 1 ? 'slot' : 'slots'} · from {formatCurrency(ground.starting_price)} per slot
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        Next slot: {formatCurrency(ground.next_slot_price)} · advance to reserve: {formatCurrency(Math.round(Number(ground.next_slot_price) * 0.5 * 100) / 100)}
                      </p>
                      <p className="mt-1 text-xs text-secondary">Advance is refundable if cancelled more than 2 hours before the slot.</p>
                    </>
                  ) : (
                    <p className="text-secondary">No upcoming slots available</p>
                  )}
                </div>
                <div className="mt-4 text-sm text-secondary line-clamp-3">
                  {ground.description || 'No description provided.'}
                </div>
                
                {ground.sports && ground.sports.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 mt-auto pt-4">
                    {ground.sports.map(s => (
                      <PsBadge key={s.id} variant="default" className="text-xs">
                        {getSportEmoji(s.name)} {s.name}
                      </PsBadge>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border bg-pill-hover rounded-b-2xl">
                <Link to={`/grounds/${ground.id}`}>
                  <PsButton className="w-full">
                    Check Slots & Book
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
