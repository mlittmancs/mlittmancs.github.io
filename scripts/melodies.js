// Melody library for the Sight-Reading Trainer.
//
// Each melody is written key-independently: every note's "s" is a diatonic
// scale step counted from the tonic (0 = do, 1 = re, 2 = mi, 3 = fa,
// 4 = sol, 5 = la, 6 = ti; negative or >6 values reach neighboring
// octaves). melody-theory.js turns a step into a concrete pitch for
// whichever practice key (C, F, G, Bb) is chosen for a round. "d" is a
// duration code: w, h, q, 8 (eighth), optionally suffixed with "." for a
// dotted note. A note with s: null is a rest.
//
// Rhythms are intentionally simplified (no ties/16ths/compound meters) so
// the transcriptions stay easy to verify and easy to sight-read. To add a
// melody, append an object with a unique id/title, a "4/4" or "3/4" meter,
// and 3-4 measures whose durations sum to the meter's beat count.

(function (global) {
  'use strict';

  const MELODIES = [
    { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 5, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 3, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 1, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'h' }],
    ]},
    { id: 'mary_lamb', title: 'Mary Had a Little Lamb', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 1, d: 'q' }, { s: 1, d: 'q' }, { s: 1, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'h' }],
    ]},
    { id: 'row_boat', title: 'Row, Row, Row Your Boat', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'h' }],
    ]},
    { id: 'hot_cross_buns', title: 'Hot Cross Buns', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'h' }],
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 0, d: '8' }, { s: 0, d: '8' }, { s: 1, d: '8' }, { s: 1, d: '8' }, { s: 1, d: '8' }, { s: 1, d: '8' }],
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'h' }],
    ]},
    { id: 'frere_jacques', title: 'Frère Jacques (Are You Sleeping)', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'h' }],
    ]},
    { id: 'london_bridge', title: 'London Bridge Is Falling Down', meter: '4/4', measures: [
      [{ s: 4, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'h' }],
    ]},
    { id: 'old_macdonald', title: 'Old MacDonald Had a Farm', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 5, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
    { id: 'this_old_man', title: 'This Old Man', meter: '4/4', measures: [
      [{ s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'h' }],
      [{ s: 5, d: 'q' }, { s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'q' }],
    ]},
    { id: 'ring_around_rosie', title: 'Ring Around the Rosie', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 0, d: 'w' }],
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
    { id: 'mulberry_bush', title: 'Here We Go Round the Mulberry Bush', meter: '4/4', measures: [
      [{ s: -3, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 2, d: 'w' }],
    ]},
    { id: 'yankee_doodle', title: 'Yankee Doodle', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'h' }],
      [{ s: 1, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 1, d: 'h' }],
    ]},
    { id: 'my_country_tis', title: "My Country 'Tis of Thee", meter: '3/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 3, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }],
    ]},
    { id: 'america_beautiful', title: 'America the Beautiful', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
    ]},
    { id: 'star_spangled_banner', title: 'The Star-Spangled Banner', meter: '3/4', measures: [
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'h' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 5, d: 'h' }, { s: 3, d: 'q' }],
    ]},
    { id: 'grand_old_flag', title: "You're a Grand Old Flag", meter: '4/4', measures: [
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
    ]},
    { id: 'battle_hymn', title: 'Battle Hymn of the Republic', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 3, d: 'q' }, { s: 5, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 5, d: 'q' }, { s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 3, d: 'q' }, { s: 2, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 3, d: 'h' }],
    ]},
    { id: 'oh_susanna', title: 'Oh! Susanna', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 1, d: 'h' }, { s: 0, d: 'h' }],
    ]},
    { id: 'camptown_races', title: 'Camptown Races', meter: '4/4', measures: [
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 5, d: 'h' }, { s: 4, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 0, d: 'h' }],
    ]},
    { id: 'shell_be_comin', title: "She'll Be Comin' Round the Mountain", meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 4, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
    { id: 'home_on_range', title: 'Home on the Range', meter: '3/4', measures: [
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'h' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 3, d: 'q' }, { s: 4, d: 'h' }],
    ]},
    { id: 'clementine', title: 'Clementine', meter: '3/4', measures: [
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 3, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
    ]},
    { id: 'take_me_out', title: 'Take Me Out to the Ball Game', meter: '3/4', measures: [
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'h' }, { s: 4, d: 'q' }],
    ]},
    { id: 'when_saints', title: 'When the Saints Go Marching In', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 0, d: 'h' }],
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 4, d: 'w' }],
    ]},
    { id: 'my_bonnie', title: 'My Bonnie Lies Over the Ocean', meter: '3/4', measures: [
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 7, d: 'q' }],
      [{ s: 5, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 7, d: 'q' }, { s: 6, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'q' }],
    ]},
    { id: 'jingle_bells', title: 'Jingle Bells', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 0, d: 'q.' }, { s: 1, d: '8' }],
      [{ s: 2, d: 'w' }],
    ]},
    { id: 'deck_the_halls', title: 'Deck the Halls', meter: '4/4', measures: [
      [{ s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 0, d: 'h' }, { s: 1, d: 'h' }],
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 4, d: 'w' }],
    ]},
    { id: 'we_wish_you', title: 'We Wish You a Merry Christmas', meter: '3/4', measures: [
      [{ s: 4, d: 'q' }, { s: 7, d: 'q' }, { s: 7, d: 'q' }],
      [{ s: 7, d: 'q' }, { s: 6, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 7, d: 'q' }],
      [{ s: 5, d: 'h' }, { s: 4, d: 'q' }],
    ]},
    { id: 'joy_to_world', title: 'Joy to the World', meter: '4/4', measures: [
      [{ s: 7, d: 'q' }, { s: 6, d: 'q' }, { s: 5, d: '8' }, { s: 4, d: 'q.' }],
      [{ s: 3, d: '8' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 0, d: 'q.' }],
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 4, d: 'w' }],
    ]},
    { id: 'silent_night', title: 'Silent Night', meter: '3/4', measures: [
      [{ s: 4, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 0, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 0, d: 'q' }],
    ]},
    { id: 'away_in_manger', title: 'Away in a Manger', meter: '3/4', measures: [
      [{ s: 4, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 5, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'q' }],
    ]},
    { id: 'auld_lang_syne', title: 'Auld Lang Syne', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'h' }, { s: 5, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
    { id: 'amazing_grace', title: 'Amazing Grace', meter: '3/4', measures: [
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 1, d: 'q' }, { s: 0, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 4, d: 'q' }],
    ]},
    { id: 'ode_to_joy', title: 'Ode to Joy (Beethoven, Symphony No. 9)', meter: '4/4', measures: [
      [{ s: 2, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 3, d: 'q' }, { s: 2, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 1, d: 'q' }, { s: 1, d: 'h' }],
    ]},
    { id: 'minuet_g', title: 'Minuet in G (Bach/Petzold)', meter: '3/4', measures: [
      [{ s: -3, d: 'q' }, { s: 0, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 3, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 7, d: 'q' }, { s: 6, d: 'q' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'q' }],
    ]},
    { id: 'william_tell', title: 'William Tell Overture (Finale)', meter: '4/4', measures: [
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }, { s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }],
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }, { s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }],
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 4, d: 'q' }, { s: 2, d: 'h' }],
    ]},
    { id: 'surprise_symphony', title: 'Surprise Symphony (Haydn)', meter: '4/4', measures: [
      [{ s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'h' }],
      [{ s: 3, d: 'q' }, { s: 3, d: 'q' }, { s: 1, d: 'q' }, { s: 1, d: 'q' }],
      [{ s: 7, d: 'w' }],
    ]},
    { id: 'hickory_dickory', title: 'Hickory Dickory Dock', meter: '4/4', measures: [
      [{ s: 7, d: 'q' }, { s: 7, d: 'q' }, { s: 4, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'h' }, { s: 0, d: 'h' }],
      [{ s: 0, d: 'q' }, { s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 7, d: 'q' }],
      [{ s: 7, d: 'w' }],
    ]},
    { id: 'pop_weasel', title: 'Pop Goes the Weasel', meter: '4/4', measures: [
      [{ s: 0, d: '8' }, { s: 0, d: '8' }, { s: 2, d: '8' }, { s: 2, d: '8' }, { s: 4, d: '8' }, { s: 4, d: '8' }, { s: 5, d: 'q' }],
      [{ s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 0, d: 'q' }, { s: 4, d: 'q' }],
      [{ s: 2, d: 'q' }, { s: 4, d: 'q' }, { s: 5, d: 'q' }, { s: 7, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
    { id: 'wheels_bus', title: 'The Wheels on the Bus', meter: '4/4', measures: [
      [{ s: -3, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }, { s: 0, d: 'q' }],
      [{ s: 0, d: 'q' }, { s: 1, d: 'q' }, { s: 2, d: 'q' }, { s: 3, d: 'q' }],
      [{ s: 2, d: 'w' }],
    ]},
    { id: 'raining_pouring', title: "It's Raining, It's Pouring", meter: '4/4', measures: [
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
      [{ s: 4, d: 'h' }, { s: 2, d: 'h' }],
      [{ s: 4, d: 'q' }, { s: 4, d: 'q' }, { s: 2, d: 'q' }, { s: 2, d: 'q' }],
      [{ s: 0, d: 'w' }],
    ]},
  ];

  global.MELODIES = MELODIES;
})(window);
