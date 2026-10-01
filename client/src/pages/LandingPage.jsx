import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronDown,
  ChevronRight, MapPin, Search, Trophy, Users
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { listGrounds } from '../features/grounds/api';
import { listCasualGames } from '../features/casual-games/api';
import { getSports } from '../features/sports/api';
import { listTournaments } from '../features/tournaments/api';
import { useAuth } from '../store/AuthContext';
import { formatDate, formatDateTime } from '../utils/dateTime';
import { resolveDemoImageUrl } from '../utils/demoImages';
import './LandingPage.css';

const SPORT_ORDER = ['badminton', 'football', 'cricket', 'swimming', 'tennis', 'table tennis', 'basketball', 'volleyball'];
const EVENT_TIME_ZONE = 'Asia/Kolkata';
const SPORT_ART = {
  badminton: '/images/demo/grounds/realistic/ground-badminton.jpg',
  football: '/images/demo/grounds/realistic/ground-football.jpg',
  cricket: '/images/demo/grounds/realistic/ground-cricket.jpg',
  basketball: '/images/demo/grounds/realistic/ground-basketball.jpg',
  volleyball: '/images/demo/grounds/realistic/ground-volleyball.jpg',
  default: '/images/demo/grounds/realistic/ground-multisport.jpg',
};
const SPORT_EMOJI = {
  badminton: '🏸', football: '⚽', cricket: '🏏', swimming: '🏊',
  tennis: '🎾', 'table tennis': '🏓', basketball: '🏀', volleyball: '🏐',
};
const TOURNAMENT_ART = {
  football: '/images/demo/grounds/realistic/ground-football.jpg',
  cricket: '/images/demo/grounds/realistic/ground-cricket.jpg',
  basketball: '/images/demo/grounds/realistic/ground-basketball.jpg',
  volleyball: '/images/demo/grounds/realistic/ground-volleyball.jpg',
  badminton: '/images/demo/grounds/realistic/ground-badminton.jpg',
};

function sportKey(name = '') {
  return name.toLowerCase().trim();
}

function sportEmoji(name) {
  return SPORT_EMOJI[sportKey(name)] || '🏆';
}

function sportArt(name) {
  return SPORT_ART[sportKey(name)] || SPORT_ART.default;
}

function groundImage(ground) {
  const firstImage = Array.isArray(ground.images) ? ground.images[0] : ground.images;
  const image = typeof firstImage === 'string' ? firstImage : firstImage?.url || firstImage?.src;
  if (image) return resolveDemoImageUrl(image, ground.id || ground.name);
  return sportArt(ground.sports?.[0]?.name);
}

function tournamentImage(tournament) {
  return resolveDemoImageUrl(tournament.banner_url, tournament.id || tournament.name) || TOURNAMENT_ART[sportKey(tournament.sport_name)] || SPORT_ART.default;
}

function displayPlace(value) {
  if (!value) return 'Location to be announced';
  return [value.city, value.state].filter(Boolean).join(', ') || value.city || value.address || 'Location to be announced';
}

function formatGameTime(game) {
  if (!game.scheduled_at) return 'Time to be announced';
  const options = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: EVENT_TIME_ZONE };
  const start = formatDateTime(game.scheduled_at, options);
  const duration = Number(game.duration_minutes || 0);
  if (!duration) return start;
  const end = new Date(new Date(game.scheduled_at).getTime() + duration * 60_000);
  return `${start} – ${formatDateTime(end, { hour: 'numeric', minute: '2-digit', timeZone: EVENT_TIME_ZONE })}`;
}

function safeList(response, key) {
  return response?.data?.[key] || [];
}

function BrandMark() {
  return (
    <svg viewBox="0 0 36 36" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="17" stroke="var(--accent-maroon)" strokeWidth="1.5" />
      <ellipse cx="18" cy="18" rx="17" ry="7" stroke="var(--accent-gold)" strokeWidth="1" />
      <ellipse cx="18" cy="18" rx="7" ry="17" stroke="var(--accent-gold)" strokeWidth="1" />
    </svg>
  );
}

function SectionTitle({ eyebrow, title, description, action, onAction }) {
  return (
    <div className="home-section-heading">
      <div>
        {eyebrow && <p className="home-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="home-section-description">{description}</p>}
      </div>
      {action && (
        <button className="home-text-link" type="button" onClick={onAction}>
          {action}<ChevronRight size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function RailControls({ railRef, label }) {
  const scroll = (direction) => {
    railRef.current?.scrollBy({ left: direction * Math.max(280, railRef.current.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <div className="home-rail-controls" aria-label={`${label} carousel controls`}>
      <button type="button" aria-label={`Scroll ${label} backward`} onClick={() => scroll(-1)}><ArrowLeft size={18} /></button>
      <button type="button" aria-label={`Scroll ${label} forward`} onClick={() => scroll(1)}><ArrowRight size={18} /></button>
    </div>
  );
}

function HomeEmpty({ title, message, loading = false }) {
  return (
    <div className={`home-empty${loading ? ' is-loading' : ''}`}>
      {loading ? <span className="home-spinner" aria-hidden="true" /> : <Trophy size={20} aria-hidden="true" />}
      <div><strong>{title}</strong><span>{message}</span></div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="home-footer">
      <Link className="home-brand" to="/" aria-label="PlaySphere home"><span className="home-brand-mark"><BrandMark /></span> PlaySphere</Link>
      <p>Find your people. Find your game.</p>
      <span>© {new Date().getFullYear()} PlaySphere</span>
    </footer>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grounds, setGrounds] = useState([]);
  const [games, setGames] = useState([]);
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiErrors, setApiErrors] = useState({});

  const venueRail = useRef(null);
  const gameRail = useRef(null);
  const tournamentRail = useRef(null);
  const guideRail = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    let active = true;
    const loadDiscovery = async () => {
      const results = await Promise.allSettled([
        listGrounds(),
        listCasualGames('status=open&upcoming_only=true'),
        getSports(),
        listTournaments(),
      ]);
      if (!active) return;
      const errors = {};
      if (results[0].status === 'fulfilled') setGrounds(safeList(results[0].value, 'grounds'));
      else errors.grounds = true;
      if (results[1].status === 'fulfilled') setGames(safeList(results[1].value, 'games'));
      else errors.games = true;
      if (results[2].status === 'fulfilled') setSports(safeList(results[2].value, 'sports'));
      else errors.sports = true;
      if (results[3].status === 'fulfilled') {
        setTournaments(safeList(results[3].value, 'tournaments').filter((tournament) => tournament.status === 'registration_open'));
      }
      else errors.tournaments = true;
      setApiErrors(errors);
      setLoading(false);
    };
    loadDiscovery();
    return () => { active = false; };
  }, []);

  const orderedSports = useMemo(() => {
    const rank = (sport) => {
      const index = SPORT_ORDER.indexOf(sportKey(sport.name));
      return index < 0 ? SPORT_ORDER.length : index;
    };
    return [...sports].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 8);
  }, [sports]);

  const filteredGrounds = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return grounds.filter((ground) => {
      const matchesText = !query || [ground.name, ground.address, ground.city, ground.state]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesSport = !selectedSport || ground.sports?.some((sport) => sport.id === selectedSport);
      return matchesText && matchesSport;
    });
  }, [grounds, searchText, selectedSport]);

  const venueSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query || query.length < 2) return [];
    const seen = new Set();
    const results = [];
    for (const ground of grounds) {
      // City suggestion
      if (ground.city) {
        const city = ground.city.trim();
        const key = `city:${city.toLowerCase()}`;
        if (!seen.has(key) && city.toLowerCase().includes(query)) {
          seen.add(key);
          results.push({ type: 'city', label: city, sub: ground.state || '' });
        }
      }
      // Venue name suggestion
      if (ground.name) {
        const name = ground.name.trim();
        const key = `venue:${name.toLowerCase()}`;
        if (!seen.has(key) && name.toLowerCase().includes(query)) {
          seen.add(key);
          results.push({ type: 'venue', label: name, sub: ground.city || '' });
        }
      }
      if (results.length >= 8) break;
    }
    return results;
  }, [grounds, searchText]);

  const goTo = (path, label = 'this section') => {
    if (user) navigate(path);
    else navigate('/login', { state: { message: `Log in to continue to ${label}`, from: path } });
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    scrollTo('venues');
  };

  const guideCards = [
    {
      category: 'GET STARTED', title: 'Your first game on PlaySphere',
      summary: 'Find a nearby game, check the details, and join a team of local players.',
      image: '/images/demo/grounds/realistic/ground-badminton.jpg', action: 'Find a game', path: '/casual-games',
    },
    {
      category: 'TOURNAMENTS', title: 'A better way to compete',
      summary: 'Discover open registrations and follow your tournament from fixtures to final.',
      image: '/images/demo/grounds/realistic/ground-football.jpg', action: 'Explore tournaments', path: '/tournaments',
    },
    {
      category: 'VENUES', title: 'Make match day happen',
      summary: 'Browse local grounds and find a place that fits your sport and your squad.',
      image: '/images/demo/grounds/realistic/ground-multisport.jpg', action: 'Browse venues', path: '/grounds',
    },
  ];

  return (
    <main className="playsphere-home">
      <Navbar />

      <section className="home-hero">
        <div className="home-hero-art" aria-hidden="true" />
        <div className="home-hero-content">
          <p className="home-hero-kicker"><span /> THE HOME OF LOCAL SPORT</p>
          <h1>Find your next<br /><em>reason to play.</em></h1>
          <p className="home-hero-copy">Book a ground, join a game, or take your team all the way. Your next match starts here.</p>
          <form className="home-search" onSubmit={submitSearch}>
            <label className="home-search-field">
              <MapPin size={18} aria-hidden="true" />
              <span className="sr-only">Venue or city</span>
              <input
                value={searchText}
                onChange={(event) => { setSearchText(event.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(event) => { if (event.key === 'Escape') setShowSuggestions(false); }}
                placeholder="Venue or city"
                autoComplete="off"
              />
              {showSuggestions && venueSuggestions.length > 0 && (
                <ul className="home-search-suggestions" role="listbox" aria-label="Venue suggestions">
                  {venueSuggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      role="option"
                      tabIndex={-1}
                      className="home-search-suggestion-item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSearchText(suggestion.label);
                        setShowSuggestions(false);
                        window.setTimeout(() => scrollTo('venues'), 80);
                      }}
                    >
                      {suggestion.type === 'city' ? <MapPin size={14} aria-hidden="true" /> : <Trophy size={14} aria-hidden="true" />}
                      <strong>{suggestion.label}</strong>
                      {suggestion.sub && <span>{suggestion.sub}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <label className="home-search-field home-search-sport">
              <Trophy size={18} aria-hidden="true" />
              <span className="sr-only">Sport</span>
              <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
                <option value="">Any sport</option>
                {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
            <button className="home-search-button" type="submit"><Search size={18} /> Explore</button>
          </form>
          <div className="home-hero-meta"><span><Users size={16} /> Made for every kind of player</span><button type="button" onClick={() => scrollTo('venues')}>See what’s happening <ArrowDown size={15} /></button></div>
        </div>
        <div className="home-hero-caption"><span>PLAY TOGETHER</span><span>PLAY MORE</span></div>
      </section>

      <div className="home-content">
        <section className="home-section home-venues-section" id="venues">
          <SectionTitle eyebrow="FIND YOUR HOME COURT" title="Book venues" description="Good games start with a great place to play." action="See all venues" onAction={() => goTo('/grounds', 'venues')} />
          {loading ? <HomeEmpty loading title="Finding venues" message="Loading active grounds near you…" /> : apiErrors.grounds ? <HomeEmpty title="Venues aren’t available right now" message="Please try again in a little while." /> : filteredGrounds.length === 0 ? <HomeEmpty title="No venues match those filters" message="Try another city, venue name, or sport." /> : (
            <>
              <div className="home-rail" ref={venueRail} aria-label="Available sports venues">
                {filteredGrounds.slice(0, 12).map((ground) => (
                  <button className="venue-card" key={ground.id} type="button" onClick={() => goTo(`/grounds/${ground.id}`, 'this venue')}>
                    <span className="venue-card-image"><img src={groundImage(ground)} alt={`${ground.name} demo venue`} loading="lazy" /><span className="venue-image-sports">{ground.sports?.slice(0, 2).map((sport) => <span key={sport.id}>{sportEmoji(sport.name)} {sport.name}</span>)}</span></span>
                    <span className="venue-card-body"><strong>{ground.name}</strong><span className="venue-location"><MapPin size={14} />{displayPlace(ground)}</span><span className="venue-card-footer"><span>{ground.sports?.length ? `${ground.sports.length} ${ground.sports.length === 1 ? 'sport' : 'sports'}` : 'Sports venue'}</span><span>View venue <ArrowUpRight size={14} /></span></span></span>
                  </button>
                ))}
              </div>
              {filteredGrounds.length > 12 && <p className="home-result-count">Showing 12 of {filteredGrounds.length} venues. Use “See all venues” to browse the full list.</p>}
              <RailControls railRef={venueRail} label="venues" />
            </>
          )}
        </section>

        <section className="home-section" id="games">
          <SectionTitle eyebrow="YOUR PEOPLE ARE PLAYING" title="Discover games" description="Drop into a local game and meet your next teammates." action="See all games" onAction={() => goTo('/casual-games', 'casual games')} />
          {loading ? <HomeEmpty loading title="Looking for games" message="Loading upcoming open games…" /> : apiErrors.games ? <HomeEmpty title="Games aren’t available right now" message="Please try again in a little while." /> : games.length === 0 ? <HomeEmpty title="No open games yet" message="Check back soon for games looking for players." /> : (
            <>
              <div className="home-rail home-game-rail" ref={gameRail} aria-label="Upcoming casual games">
                {games.slice(0, 10).map((game) => {
                  const joined = Number(game.current_participants || 0);
                  const max = Number(game.max_participants || 0);
                  return (
                    <button className="game-card" key={game.id} type="button" onClick={() => goTo(`/casual-games/${game.id}`, 'this game')}>
                      <span className="game-card-top"><span>{sportEmoji(game.sport_name)} {game.sport_name}</span><span>{game.skill_level || 'All levels'}</span></span>
                      <strong className="game-card-title">{game.title}</strong>
                      <span className="game-host"><span className="game-avatar">{(game.creator_name || 'P').slice(0, 1).toUpperCase()}</span><span>Hosted by <b>{game.creator_name || 'PlaySphere player'}</b></span></span>
                      <span className="game-card-info"><CalendarDays size={15} />{formatGameTime(game)}</span>
                      <span className="game-card-info"><MapPin size={15} />{game.ground_name || game.location_name || game.ground_city || 'Location to be announced'}</span>
                      <span className="game-card-footer"><span className="game-spots">{max > 0 ? `${joined}/${max} playing` : `${joined} playing`}</span><span>View game <ArrowUpRight size={14} /></span></span>
                    </button>
                  );
                })}
              </div>
              <RailControls railRef={gameRail} label="games" />
            </>
          )}
        </section>

        <section className="home-sports-panel" id="sports">
          <SectionTitle eyebrow="PICK YOUR PLAY" title="Popular sports" description="From a friendly rally to a full-on final." action="Explore sports" onAction={() => goTo('/sports', 'sports')} />
          {orderedSports.length === 0 ? (
            <div className="home-sport-grid">
              {SPORT_ORDER.slice(0, 6).map((name) => <button className="sport-tile" key={name} type="button" onClick={() => goTo('/sports', 'sports')}><img src={sportArt(name)} alt="" loading="lazy" /><span className="sport-tile-shade" /><span className="sport-tile-name"><span>{sportEmoji(name)}</span>{name}</span></button>)}
            </div>
          ) : (
            <div className="home-sport-grid">
              {orderedSports.slice(0, 6).map((sport) => <button className="sport-tile" key={sport.id} type="button" onClick={() => { setSelectedSport(sport.id); scrollTo('venues'); }}><img src={sportArt(sport.name)} alt="" loading="lazy" /><span className="sport-tile-shade" /><span className="sport-tile-name"><span>{sportEmoji(sport.name)}</span>{sport.name}</span></button>)}
            </div>
          )}
        </section>

        <section className="home-promo-strip" aria-label="Explore PlaySphere">
          <article className="home-promo home-promo-tournament"><Trophy size={24} /><p>Ready to compete?</p><h3>Make your next tournament count.</h3><button type="button" onClick={() => goTo('/tournaments', 'tournaments')}>Explore tournaments <ArrowUpRight size={16} /></button></article>
          <article className="home-promo home-promo-game"><Users size={24} /><p>Better together</p><h3>Find players who love the game.</h3><button type="button" onClick={() => goTo('/casual-games', 'casual games')}>Find a game <ArrowUpRight size={16} /></button></article>
          <article className="home-promo home-promo-venue"><MapPin size={24} /><p>Game on</p><h3>Your local court is waiting.</h3><button type="button" onClick={() => goTo('/grounds', 'venues')}>Browse venues <ArrowUpRight size={16} /></button></article>
        </section>

        <section className="home-section" id="tournaments">
          <SectionTitle eyebrow="THE NEXT BIG MATCH" title="Open tournaments" description="Find your competition and put your team on the board." action="See all tournaments" onAction={() => goTo('/tournaments', 'tournaments')} />
          {loading ? <HomeEmpty loading title="Finding tournaments" message="Loading open registrations…" /> : apiErrors.tournaments ? <HomeEmpty title="Tournaments aren’t available right now" message="Please try again in a little while." /> : tournaments.length === 0 ? <HomeEmpty title="No open tournaments yet" message="New competitions will show up here when registration opens." /> : (
            <>
              <div className="home-rail home-tournament-rail" ref={tournamentRail} aria-label="Open tournaments">
                {tournaments.slice(0, 8).map((tournament) => (
                  <button className="tournament-card" key={tournament.id} type="button" onClick={() => goTo(`/tournaments/${tournament.id}`, 'this tournament')}>
                    <span className="tournament-card-image"><img src={tournamentImage(tournament)} alt={`${tournament.name} event artwork`} loading="lazy" /><span className="tournament-open-label"><span />Registration open</span></span>
                    <span className="tournament-card-body"><span className="tournament-sport">{sportEmoji(tournament.sport_name)} {tournament.sport_name}</span><strong>{tournament.name}</strong><span><CalendarDays size={15} />{tournament.starts_at ? formatDate(tournament.starts_at, { day: 'numeric', month: 'short', year: 'numeric', timeZone: EVENT_TIME_ZONE }) : 'Dates to be announced'}{tournament.ends_at && ` – ${formatDate(tournament.ends_at, { day: 'numeric', month: 'short', timeZone: EVENT_TIME_ZONE })}`}</span><span><MapPin size={15} />{displayPlace(tournament)}</span><span className="tournament-card-footer"><span>{tournament.participation_type === 'team' ? 'Team event' : 'Individual event'}</span><span>Details <ArrowUpRight size={14} /></span></span></span>
                  </button>
                ))}
              </div>
              <RailControls railRef={tournamentRail} label="tournaments" />
            </>
          )}
        </section>

        <section className="home-guides-section" id="guides">
          <SectionTitle eyebrow="A LITTLE INSPIRATION" title="PlaySphere guides" description="A few helpful pointers for making more of every match." action="More ways to play" onAction={() => goTo('/sports', 'sports')} />
          <div className="home-rail home-guide-rail" ref={guideRail} aria-label="PlaySphere getting started guides">
            {guideCards.map((guide) => (
              <article className="guide-card" key={guide.title}>
                <button className="guide-card-image" type="button" onClick={() => goTo(guide.path, guide.action)} aria-label={guide.action}><img src={guide.image} alt="" loading="lazy" /><span>{guide.category}</span></button>
                <div className="guide-card-copy"><h3>{guide.title}</h3><p>{guide.summary}</p><button type="button" onClick={() => goTo(guide.path, guide.action)}>{guide.action}<ArrowUpRight size={15} /></button></div>
              </article>
            ))}
          </div>
          <RailControls railRef={guideRail} label="guides" />
        </section>

        <section className="home-bottom-cta">
          <div><span>YOUR NEXT GAME IS OUT THERE</span><h2>So, what are you waiting for?</h2><p>Join your local sports community and make it a match.</p></div>
          <Link to={user ? '/sports' : '/signup'}>{user ? 'Explore PlaySphere' : 'Get started'} <ArrowUpRight size={18} /></Link>
        </section>
      </div>
      <Footer />
    </main>
  );
}
