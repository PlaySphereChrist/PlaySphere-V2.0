import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createGroundBooking, getAvailableGroundSlots, getGround } from '../features/grounds/api';
import { useAuth } from '../store/AuthContext';
import { formatDate } from '../utils/dateTime';
import { resolveDemoImageUrl } from '../utils/demoImages';
import {
  PsButton,
  PsCard,
  PsTextarea,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton,
  PsErrorState
} from '../components/ui';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

export default function GroundDetailsPage() {
  const { groundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ground, setGround] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const fetchDetailsAndSlots = async () => {
    try {
      setLoading(true);
      setError('');
      const groundData = await getGround(groundId);
      setGround(groundData.data.ground);

      const slotsData = await getAvailableGroundSlots(groundId);
      setSlots(slotsData.data.slots || []);
    } catch (err) {
      setError(err.message || 'Failed to load ground details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailsAndSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId]);

  const slotsByDate = slots.reduce((acc, slot) => {
    let dStr = slot.slot_date;
    if (dStr.includes('T')) dStr = dStr.split('T')[0];
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(slot);
    return acc;
  }, {});

  const dates = Object.keys(slotsByDate).sort();
  const activeDate = selectedDate || (dates.length > 0 ? dates[0] : '');
  const activeSlots = activeDate ? slotsByDate[activeDate] : [];
  const slotGroupsBySport = activeSlots.reduce((groups, slot) => {
    const sportName = slot.sport_name || 'General';
    if (!groups[sportName]) groups[sportName] = [];
    groups[sportName].push(slot);
    return groups;
  }, {});
  const activeSlotGroups = Object.entries(slotGroupsBySport)
    .sort(([sportA], [sportB]) => sportA.localeCompare(sportB))
    .map(([sportName, sportSlots]) => ({
      sportName,
      slots: sportSlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }));
  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedSlotTotal = Number(selectedSlot?.price || 0);
  const selectedSlotAdvance = Math.round(selectedSlotTotal * 0.5 * 100) / 100;
  const selectedSlotRemaining = Math.round((selectedSlotTotal - selectedSlotAdvance) * 100) / 100;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    try {
      setBookingLoading(true);
      setBookingError('');
      const res = await createGroundBooking(groundId, {
        slot_id: selectedSlotId,
        notes: bookingNotes
      });
      navigate(`/bookings/${res.data.booking.id}`);
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
      if (err.status === 409) {
        setSelectedSlotId('');
        fetchDetailsAndSlots();
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/grounds" label="Back to Grounds" />
        <PsErrorState message={error} retry={fetchDetailsAndSlots} />
      </div>
    );
  }

  if (!ground) return null;

  const coverImage = Array.isArray(ground.images)
    ? resolveDemoImageUrl(typeof ground.images[0] === 'string' ? ground.images[0] : ground.images[0]?.url || ground.images[0]?.src, ground.id || ground.name)
    : '';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PsBackButton to="/grounds" label="Back to Grounds" />

      <PsCard>
        <div className="h-48 sm:h-64 bg-maroon/10 border-b border-border relative overflow-hidden flex flex-col justify-end p-6 rounded-t-2xl">
          {coverImage && (
            <img
              src={coverImage}
              alt={`${ground.name} sample venue image`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow-md">
              {ground.name}
            </h1>
            <p className="mt-2 text-white/90 flex items-center gap-1.5 drop-shadow-sm">
              <span>📍</span>
              {ground.address}, {ground.city} {ground.state ? `, ${ground.state}` : ''}
            </p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-primary leading-relaxed whitespace-pre-wrap">
            {ground.description || 'No description provided.'}
          </p>
          
          {ground.sports && ground.sports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-secondary mb-3">Supported Sports</h3>
              <div className="flex flex-wrap gap-2">
                {ground.sports.map(s => (
                  <PsBadge key={s.id} variant="default">
                    {s.name} {s.surface_type ? `(${s.surface_type})` : ''}
                  </PsBadge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PsCard>

      <PsCard className="p-6 border-maroon/20">
        <h2 className="text-2xl font-serif font-bold text-primary mb-6">Book a Slot</h2>

        {dates.length === 0 ? (
          <div className="text-sm text-secondary py-8 bg-surface border border-dashed border-border rounded-xl text-center">
            No available slots at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-3">Select Date</label>
                <div className="flex overflow-x-auto gap-2 pb-2">
                  {dates.map(date => (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={activeDate === date}
                      onClick={() => { setSelectedDate(date); setSelectedSlotId(''); }}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition ${
                        activeDate === date
                          ? 'bg-maroon text-white shadow-md'
                          : 'bg-surface border border-border text-secondary hover:bg-pill-hover hover:text-primary'
                      }`}
                    >
                      {formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-3">
                  Available Slots for {formatDate(activeDate)}
                </label>
                <div className="space-y-5">
                  {activeSlotGroups.map(group => (
                    <section key={group.sportName} aria-label={`${group.sportName} booking slots`}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-primary">{group.sportName}</h3>
                        <span className="text-xs text-muted">{group.slots.length} {group.slots.length === 1 ? 'slot' : 'slots'}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {group.slots.map(slot => (
                          <button
                            key={slot.id}
                            type="button"
                            aria-pressed={selectedSlotId === slot.id}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm transition ${
                              selectedSlotId === slot.id
                                ? 'border-maroon bg-maroon/5 text-maroon shadow-inner ring-1 ring-maroon/50'
                                : 'border-border bg-surface text-primary hover:border-maroon/50 hover:bg-pill-hover'
                            }`}
                          >
                            <span className="font-bold">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</span>
                            <span className="text-sm font-semibold mt-1 text-primary">{formatCurrency(slot.price)}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm sticky top-6">
                <h3 className="text-lg font-serif font-bold text-primary mb-4 border-b border-border pb-3">Booking Summary</h3>
                {selectedSlot ? (
                  user ? (
                  <form onSubmit={handleBook} className="space-y-4">
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary">Date</span>
                        <span className="font-medium text-primary">{formatDate(activeDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Time</span>
                        <span className="font-medium text-primary">{selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Sport</span>
                        <span className="font-medium text-primary">{selectedSlot.sport_name || 'General'}</span>
                      </div>
                      <div className="flex justify-between pt-3 mt-3 border-t border-border">
                        <span className="text-secondary font-medium">Total Price</span>
                        <span className="font-bold text-xl text-primary">{formatCurrency(selectedSlotTotal)}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-secondary">Advance due now (50%)</span><span className="font-medium text-primary">{formatCurrency(selectedSlotAdvance)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary">Remaining, due at venue</span><span className="font-medium text-primary">{formatCurrency(selectedSlotRemaining)}</span></div>
                      </div>
                      <p className="text-xs text-secondary bg-pill p-3 rounded-lg mt-2">
                        Cancel more than 2 hours before the slot for a full advance refund. Within 2 hours, the advance is retained.
                      </p>
                    </div>

                    <div className="pt-2">
                      <PsTextarea
                        label="Notes (Optional)"
                        rows={2}
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                      />
                    </div>

                    <p className="text-xs text-secondary">This reserves the slot as pending. You’ll review the booking and pay the advance on the next screen.</p>

                    {bookingError && <PsAlert variant="error">{bookingError}</PsAlert>}

                    <PsButton
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full"
                    >
                      {bookingLoading ? 'Reserving slot...' : 'Reserve this slot'}
                    </PsButton>
                  </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm space-y-3">
                        <div className="flex justify-between"><span className="text-secondary">Date</span><span className="font-medium text-primary">{formatDate(activeDate)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary">Time</span><span className="font-medium text-primary">{selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary">Sport</span><span className="font-medium text-primary">{selectedSlot.sport_name || 'General'}</span></div>
                        <div className="flex justify-between pt-3 mt-3 border-t border-border"><span className="text-secondary font-medium">Total price</span><span className="font-bold text-xl text-primary">{formatCurrency(selectedSlotTotal)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary">Advance due on booking (50%)</span><span className="font-medium text-primary">{formatCurrency(selectedSlotAdvance)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary">Remaining, due at venue</span><span className="font-medium text-primary">{formatCurrency(selectedSlotRemaining)}</span></div>
                        <p className="text-xs text-secondary bg-pill p-3 rounded-lg mt-2">Cancel more than 2 hours before the slot for a full advance refund. Within 2 hours, the advance is retained.</p>
                      </div>
                      <Link to="/login" state={{ from: `/grounds/${groundId}` }}>
                        <PsButton className="w-full">Sign in to book this slot</PsButton>
                      </Link>
                    </div>
                  )
                ) : (
                  <div className="text-sm text-secondary text-center py-8">
                    Select a slot to view summary and proceed.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PsCard>
    </div>
  );
}
