# Spin

Interactive explainers of motion and rotation. Most of them show the same motion from two points of
view, so you can see why it looks the way it does. Open `index.html` for the list, or open one
explainer directly, for example `coriolis/index.html`.

Each explainer is one page in its own folder. They run in a browser and need no build step and no
sign-in. They work when opened from disk, except that two of them (the Coriolis effect and the launch
heading) load [three.js](https://threejs.org) from a public CDN, so those need an internet
connection. The Earth picture on the Coriolis page also needs the page to be served
(for example with `python -m http.server`), because browsers do not load textures from disk.

## The explainers

**Rotating frames**

- `coriolis`: a thrown ball flies straight, but the ground under it turns. A roundabout, a space
  station, cannon shells, a Foucault pendulum, storms, trade winds, ocean loops, the Eötvös effect, a
  dropped ball, with 2D and 3D views. ([Details](coriolis/README.md))
- `centrifugal`: a ball on a string (cut it), water in a spinning bucket (a parabola), and a wall
  ride that pins you with friction. The outward force is a pretend force of the turning frame.
- `jump`: do you float if you jump on a spinning station? No. You fly straight, the curved floor
  comes up to meet you, and you land a little ahead of where you left (a jump straight up lands
  about 25 cm ahead on a 60 m wheel). Forward and backward jumps, any size of station.
- `hub`: arriving at the center of a spinning station. You weigh nothing there, the rim rushes past at
  31 m/s (for 100 m and 1 g), a gentle push-off sends you out in a spiral, and a ladder gives you the
  station's spin with a sideways push (2 m ω u).
- `lagrange`: the five points of the restricted three-body problem, on a map of the effective
  potential. Place a particle anywhere. L4 and L5 are stable for a mass ratio below 0.0385.

**Rotating bodies**

- `gyroscope`: a heavy top with precession and nutation (Euler's equations), and a wheel you push.
  The axle turns at right angles to the push.
- `momentum`: a skater pulling in the arms (I × ω is fixed, the energy rises), a falling cat (zero
  angular momentum, two halves), and a tumbling box (the tennis racket theorem).
- `stability`: the benchmark bicycle (stable between about 4.3 and 6.0 m/s, from the published
  matrices), and a spinning coin (Moffatt's finite-time singularity, with sound).
- `rolling`: a point on a rolling wheel (hub, rim, flange), slipping and skidding, and the turning
  point. The cycloid, 8R long, with an area of 3πR².
- `magnus`: why a spinning ball curves. Spin axis × velocity gives the push: a free kick, a curveball,
  a topspin lob, a golf drive, with drag, a wind (head, tail or cross) and a "no spin" path to compare.
  A close-up shows the ball turning and the air flowing past it.
- `race`: a ring, a disk, a cylinder and a sphere race down a slope (the shape of the mass decides
  the winner, not the mass), and a spool pulled by a thread rolls toward you or away from you.

**Orbits and gravity**

- `orbits`: Kepler's laws with equal-area wedges, Newton's cannon with the energy well, and an orbit
  that turns slowly (the 1/r⁴ pull, as in Mercury).
- `maneuvers`: burns in orbit, a Hohmann transfer (LEO to geostationary: 3.8 km/s), and a chase of a
  station seen from the station.
- `slingshot`: a gravity assist seen from the Sun and from the planet. The speed gained, and the
  speed in the planet's frame, which does not change.
- `inclination`: how the launch heading and the latitude decide the tilt of an orbit,
  cos i = sin A · cos φ. (From the former `orbit-tilt` page.)
- `tides`: two tides a day, spring and neap tides with the Sun, and tidal locking.
- `day`: why a solar day is longer than a sidereal day (3 min 56 s on Earth), a day on Mercury and
  Venus, and the 25,772-year turn of Earth's axis (precession of the equinoxes, with the pole stars).

**Moving observers**

- `relativity`: a light clock (moving clocks run slow), a train and two lightning strikes
  (simultaneity), a spacetime diagram with events you can drag, and boosts as rotations by a
  hyperbolic angle (rapidities add, which is why speeds never reach c).
- `observers`: rain on a moving person (run or walk), the Doppler effect of a passing siren (with
  sound and a Mach cone), and aberration of starlight at high speed.

**Waves and oscillation**

- `resonance`: a driven, damped oscillator, with its response curve and phase.
- `coupled`: two coupled pendulums (normal modes and beats), and a chain of masses.
- `waves`: standing waves, the harmonics of a plucked string (with sound), and reflection from a
  fixed and a free end.
- `fourier`: circles that add up to a square, sawtooth or triangle wave, or to a picture you draw.

**Fields and charges**

- `charged`: a charge in a magnetic field, the E×B drift (the same in the lab and in the drift
  frame), and a particle trapped in Earth's field (mirror points and drift).
- `bloch`: quantum spin as an arrow on the Bloch sphere. Precession in a magnetic field, a resonant
  pulse (π and π/2 pulses, mistuning), and Stern–Gerlach measurement with counts.
- `induction`: a magnet and a coil (in the frame of each), a generator, and a magnet falling through
  a copper tube.

**The math of turning**

- `circle`: sine and cosine as the two shadows of a point going round a circle, radians as arc length
  (and why sin θ ≈ θ), and adding waves as adding turning arrows.
- `complex`: multiplying as a turn and a stretch, Euler's formula (built arrow by arrow from its
  series), Euler's identity as a half turn, and De Moivre's formula with the roots of unity.
- `rotvec`: the speed of a turning arrow is ω × r, the cross product with the right-hand
  rule, and the centripetal and Coriolis terms from differentiating a walk on a turntable.
- `rot3d`: turns that do not commute, gimbal lock, Euler's rotation theorem (one axis, one angle),
  and the quaternion going through −1 after 360° and back to +1 after 720°.
- `spirograph`: a toothed wheel rolling inside or outside a ring. The pen is two turning arrows, and
  the teeth decide the petals and when the curve closes.
- `sphere`: carry an arrow round a loop on a globe without turning it. It comes back turned by the
  angle excess of the triangle, or by 360° × sin(latitude) round a circle (the Foucault pendulum).

**Machines and signals**

- `gears`: gear ratios (speed against torque, idlers), planetary gears with the Willis equation (a
  gear train seen from a turning frame), and a car differential in a bend.
- `wagon`: wheels on film that seem to run backward or stand still, and the same aliasing in any
  sampled signal (the Nyquist limit).
- `levers`: torque as force × distance from the pivot. Balancing a beam (the balance point is the
  centre of mass), the three classes of lever, the trade of force for distance (the work stays the
  same), and why a push at an angle wastes force (F sin θ).

**The human body**

- `diver`: a diver keeps the angular momentum from take-off. Tuck to turn about four times faster
  and stretch to slow down (I × ω is fixed), and start a twist in the air with the arms alone (a torque-free
  body with moving arms, the mechanism of the falling cat), or on the board.
- `gait`: why the arms swing. Seen from above, both legs push the body round the same way about a
  vertical axis. The arms cancel it. Walking and running, and arms the wrong way.
- `throwing`: a chain of four parts from the trunk to the hand, with joint stops and torque pulses.
  The sequence and its delay give a much faster ball than all the muscles at once, and the reverse order is worse.
- `balance`: standing as a tall pendulum with a late reflex and a limit on the pressure under the foot (a
  shove, a slow reflex, a short foot), and the semicircular canals as a fluid ring (why you feel a turn
  after you stop spinning).
- `pilots`: the pressure of a column of blood under g-force (grey-out near 5 g, better with a tilted seat and
  a g-suit), and how large and how slow a spinning station must be to feel comfortable.

## How it is built

- `shared/spin.js`: the code every explainer uses. A list of the explainers, the top bar, the page
  layout, the controls, the play bar (Go, Pause, Loop, Speed), a 2D drawing pen with charts and mouse
  input, a small 3D camera for flat canvases, and some number helpers. It is a classic script, so the
  pages also work from disk.
- `shared/spin.css` and `shared/topbar.css`: the look.
- One folder per explainer, with an `index.html` that builds its page with `Spin.app({...})`.

To add an explainer: copy a small one (for example `resonance/index.html`), add an entry to
`TOPICS` and `ICONS` in `shared/spin.js`, and it appears on the home page and in the menu. If the page
has tabs (`app.modes(...)`), copy them into `MODES` in the same file, and add words people may search
for to `KEYS`.

Search: every page has a search box in the top bar (press `/` to start typing). It finds pages by title,
description and `KEYS`, and finds the tabs inside pages by name. A result for a tab opens the page on
that tab, because a page address such as `momentum/#cat` selects the tab named `cat`. The home page
has the same search box, with the same drop-down list of results.

## Credits

- `coriolis/earth.webp`: NASA Blue Marble, by NASA's Earth Observatory (public domain).
- The bicycle numbers are the benchmark bicycle of Meijaard, Papadopoulos, Ruina and Schwab (2007).
- three.js is used by the Coriolis and the launch heading pages.
