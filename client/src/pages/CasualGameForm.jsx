import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { getMyBookings } from '../features/bookings/api';
import {
  createCasualGame,
  getCasualGame,
  updateCasualGame,
} from '../features/casual-games/api';
import { getSports } from '../features/sports/api';
import { formatDate, toDateInputValue, toTimeInputValue } from '../utils/dateTime';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsTextarea,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsBackButton
} from '../components/ui';

// Ground bookings store the venue's wall-clock date/time, which is India time.
// Include the explicit offset so eligibility is independent of the browser TZ.
function getBookingEndTimestamp(booking) {
  const date = String(booking.slot_date || '').split('T')[0];
  const endTime = String(booking.end_time || '').slice(0, 8);
  if (!date || !endTime) return null;

  const slotEnd = new Date(`${date}T${endTime}+05:30`);
  return Number.isNaN(slotEnd.getTime()) ? null : slotEnd.getTime();
}

function hasUpcomingGroundTime(booking, now = Date.now()) {
  const slotEnd = getBookingEndTimestamp(booking);
  return slotEnd !== null && slotEnd > now;
}

export default function CasualGameForm() {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const paramBookingId = searchParams.get('booking_id');

  const isEditing = !!gameId;
  const navigate = useNavigate();

  const [sports, setSports] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingClock, setBookingClock] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    ground_booking_id: '',
    sport_id: '',
    title: '',
    description: '',
    game_date: '',
    start_time: '',
    location_name: '',
    max_players: '10',
    skill_level: 'Intermediate'
  });

  const availableBookings = userBookings.filter(booking =>
    hasUpcomingGroundTime(booking, bookingClock)
  );

  // Remove a booking from an already-open form as soon as its slot ends.
  useEffect(() => {
    const nextEnd = userBookings
      .map(getBookingEndTimestamp)
      .filter(timestamp => timestamp !== null && timestamp > Date.now())
      .sort((a, b) => a - b)[0];

    if (!nextEnd) return undefined;

    const timer = window.setTimeout(
      () => setBookingClock(Date.now()),
      Math.min(Math.max(0, nextEnd - Date.now() + 1), 2147483647)
    );
    return () => window.clearTimeout(timer);
  }, [userBookings, bookingClock]);

  useEffect(() => {
    const refreshClock = () => setBookingClock(Date.now());
    window.addEventListener('focus', refreshClock);
    document.addEventListener('visibilitychange', refreshClock);
    return () => {
      window.removeEventListener('focus', refreshClock);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, []);

  useEffect(() => {
    if (!isEditing && selectedBooking && !hasUpcomingGroundTime(selectedBooking, bookingClock)) {
      setSelectedBooking(null);
      setFormData(prev => ({ ...prev, ground_booking_id: '' }));
    }
  }, [isEditing, selectedBooking, bookingClock]);

  const applyBooking = useCallback((booking, sportsList = []) => {
    setSelectedBooking(booking);

    let dStr = booking.slot_date;
    if (dStr && dStr.includes('T')) dStr = dStr.split('T')[0];

    // Find matching sport if booking has sport_id or sport_name
    let matchedSportId = booking.sport_id;
    if (!matchedSportId && booking.sport_name && sportsList.length) {
      const match = sportsList.find(
        s => s.name.toLowerCase() === booking.sport_name.toLowerCase()
      );
      if (match) matchedSportId = match.id;
    }

    setFormData(prev => ({
      ...prev,
      ground_booking_id: booking.id,
      sport_id: matchedSportId || prev.sport_id || (sportsList[0]?.id || ''),
      game_date: dStr || '',
      start_time: booking.start_time?.slice(0, 5) || '',
      location_name: `${booking.ground_name}, ${booking.ground_address}, ${booking.ground_city}`,
      title: prev.title || `${booking.sport_name || 'Casual'} Match @ ${booking.ground_name}`
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Fetch sports
        const sportsRes = await getSports();
        const sportsList = sportsRes.data?.sports || [];
        if (isMounted) setSports(sportsList);

        if (isEditing) {
          // Editing existing game
          const gameRes = await getCasualGame(gameId);
          const game = gameRes.data.game;
          const scheduled = new Date(game.scheduled_at);

          if (isMounted) {
            setFormData({
              ground_booking_id: game.ground_booking_id || '',
              sport_id: game.sport_id,
              title: game.title,
              description: game.description || '',
              game_date: toDateInputValue(scheduled),
              start_time: toTimeInputValue(scheduled),
              location_name: game.location_name || '',
              max_players: String(game.max_participants),
              skill_level: game.skill_level || 'Intermediate'
            });
            if (game.ground_name) {
              setSelectedBooking({
                ground_name: game.ground_name,
                ground_address: game.ground_address,
                ground_city: game.ground_city,
                sport_name: game.sport_name,
                slot_date: toDateInputValue(scheduled),
                start_time: toTimeInputValue(scheduled),
                end_time: ''
              });
            }
          }
        } else {
          // Creating new game — fetch user's ground bookings
          const bookingsRes = await getMyBookings();
          const allBookings = bookingsRes.data?.bookings || [];

          // Only bookings that have not ended, are not cancelled, and do not
          // already have an active casual game. Keep old bookings in booking
          // history, but never offer them as a new game venue.
          const eligible = allBookings.filter(
            b => b.status !== 'cancelled'
              && hasUpcomingGroundTime(b)
              && (!b.casual_games_count || b.casual_games_count === 0)
          );

          if (isMounted) {
            setUserBookings(eligible);

            // Auto-select booking if param matches or if only one exists
            let toSelect = null;
            if (paramBookingId) {
              toSelect = eligible.find(b => b.id === paramBookingId);
            }
            if (!toSelect && eligible.length === 1) {
              toSelect = eligible[0];
            }

            if (toSelect) {
              applyBooking(toSelect, sportsList);
            }
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to initialize form');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [gameId, isEditing, paramBookingId, applyBooking]);

  const handleBookingChange = (e) => {
    const bId = e.target.value;
    if (!bId) {
      setSelectedBooking(null);
      setFormData(prev => ({ ...prev, ground_booking_id: '' }));
      return;
    }
    const b = availableBookings.find(x => x.id === bId);
    if (b) applyBooking(b, sports);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEditing && !formData.ground_booking_id) {
      setError('You must select a ground booking to host a casual game');
      return;
    }

    setSubmitting(true);

    try {
      const data = {
        ...formData,
        max_players: parseInt(formData.max_players, 10)
      };

      if (isEditing) {
        await updateCasualGame(gameId, data);
        navigate(`/casual-games/${gameId}`);
      } else {
        const res = await createCasualGame(data);
        navigate(`/casual-games/${res.data.game.id}`);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to save game');
      setSubmitting(false);
    }
  };

  if (loading) return <PsLoading />;

  // If user is trying to create a game but has no valid ground bookings
  if (!isEditing && availableBookings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <PsBackButton to="/casual-games" label="Back to Casual Games" />
        <PsPageHeader
          title="Host a Casual Game"
          subtitle="Reserve a ground first to create and host a game."
        />

        <PsCard className="p-8 text-center space-y-6 border-maroon/30 shadow-sm">
          <div className="w-16 h-16 bg-maroon/10 text-maroon rounded-2xl flex items-center justify-center text-3xl mx-auto">
            🏟️
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-primary">
              Ground Booking Required
            </h3>
            <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">
              To host a casual pickup game, you must first book a ground slot. Your game will be officially hosted at your reserved venue so players can join with confidence.
            </p>
          </div>

          <div className="bg-pill p-4 rounded-xl max-w-md mx-auto text-left text-xs text-secondary space-y-2">
            <p className="font-semibold text-primary">How it works:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Explore verified grounds &amp; book your preferred time slot</li>
              <li>Return here to host your game and set player limits</li>
              <li>Invite teammates or let the PlaySphere community join!</li>
            </ol>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/grounds">
              <PsButton className="w-full sm:w-auto px-6">
                Explore Grounds &amp; Book a Slot
              </PsButton>
            </Link>
            <Link to="/casual-games">
              <PsButton variant="ghost" className="w-full sm:w-auto">
                Browse Existing Games
              </PsButton>
            </Link>
          </div>
        </PsCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PsBackButton to={isEditing ? `/casual-games/${gameId}` : '/casual-games'} label="Back" />
      <PsPageHeader
        title={isEditing ? 'Edit Casual Game' : 'Host a Casual Game'}
        subtitle={isEditing ? 'Update your casual game details' : 'Your game is tied to your reserved ground booking.'}
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Selection (When creating new game) */}
          {!isEditing && (
            <div className="space-y-4 border-b border-border pb-6">
              <PsSelect
                label="Select Your Ground Booking *"
                name="ground_booking_id"
                required
                value={formData.ground_booking_id}
                onChange={handleBookingChange}
              >
                <option value="">-- Choose a booked ground slot --</option>
                {availableBookings.map(b => {
                  let dStr = b.slot_date;
                  if (dStr && dStr.includes('T')) dStr = dStr.split('T')[0];
                  return (
                    <option key={b.id} value={b.id}>
                      {b.ground_name} • {formatDate(dStr)} ({b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}) — {b.sport_name || 'All Sports'}
                    </option>
                  );
                })}
              </PsSelect>

              {/* Selected Booking Highlights Card */}
              {selectedBooking && (
                <div className="p-4 bg-maroon/5 border border-maroon/20 rounded-xl space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary text-base flex items-center gap-1.5">
                      <span>🏟️</span> {selectedBooking.ground_name}
                    </span>
                    <PsBadge variant="success">Slot Confirmed</PsBadge>
                  </div>
                  <p className="text-secondary text-xs flex items-center gap-1">
                    <span>📍</span> {selectedBooking.ground_address}, {selectedBooking.ground_city}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1 text-xs text-primary font-medium">
                    <span>📅 {formatDate(formData.game_date)}</span>
                    <span>⏰ {formData.start_time} onwards</span>
                    {selectedBooking.sport_name && <span>🏆 {selectedBooking.sport_name}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* If editing, show read-only venue info */}
          {isEditing && selectedBooking && (
            <div className="p-4 bg-pill border border-border rounded-xl text-sm space-y-1">
              <p className="font-bold text-primary">🏟️ {selectedBooking.ground_name}</p>
              <p className="text-xs text-secondary">📍 {formData.location_name}</p>
              <p className="text-xs text-muted">
                📅 {formatDate(formData.game_date)} at {formData.start_time}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <PsInput
                label="Game Title *"
                name="title"
                required
                placeholder="e.g. Sunday Morning 7v7 Football"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <PsSelect
              label="Sport *"
              name="sport_id"
              required
              disabled={isEditing}
              value={formData.sport_id}
              onChange={handleChange}
            >
              <option value="">Select a sport...</option>
              {sports.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </PsSelect>

            <PsSelect
              label="Skill Level *"
              name="skill_level"
              required
              value={formData.skill_level}
              onChange={handleChange}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
              <option value="Professional">Professional</option>
            </PsSelect>

            <div className="sm:col-span-2">
              <PsInput
                label="Maximum Players *"
                type="number"
                name="max_players"
                required
                min="2"
                max="50"
                value={formData.max_players}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-secondary">
                Total number of players needed (including you).
              </p>
            </div>

            <div className="sm:col-span-2">
              <PsTextarea
                label="Game Description &amp; Instructions (Optional)"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Details for players (e.g. Please bring astro turf shoes, bibs provided, reach 10 mins early)..."
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-border mt-6">
            <PsButton
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Cancel
            </PsButton>
            <PsButton
              type="submit"
              disabled={submitting || (!isEditing && !formData.ground_booking_id)}
            >
              {submitting ? 'Creating Game...' : (isEditing ? 'Save Changes' : 'Host Casual Game')}
            </PsButton>
          </div>
        </form>
      </PsCard>
    </div>
  );
}
