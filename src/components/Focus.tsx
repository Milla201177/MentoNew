'use client'

/** Team roster and three principles; content remains static and readable without animation. */

import { Fragment } from 'react'

const FOCUS_ITEMS = [
  {
    num: '#01',
    title: 'Access',
    text: 'We are hands-on and put our network to making intros to A-players, customers, & investors.',
  },
  {
    num: '#02',
    title: 'Intelligence',
    text: 'The same data engine we use to find you, we run for you: market maps, comps, customer research.',
  },
  {
    num: '#03',
    title: 'Conviction',
    text: "We're always in your corner through pivots, down rounds, & the quarters nobody wants to report.",
  },
]

/**
 * Roster (Figma 460:2156), with the LinkedIn profiles the design hyperlinks off
 * each name — the link is on the NAME only, not the whole line.
 *
 * Vi and Margo have no profile in the design, so their names render as plain
 * text rather than as a link to nowhere. `linkedin` is optional for that reason
 * and not because the data is missing.
 */
const ROSTER: { name: string; role: string; emoji?: string; linkedin?: string }[] = [
  {
    name: 'Alex',
    role: 'General Partner',
    emoji: '\u{1F436}',
    linkedin: 'https://www.linkedin.com/in/alex-zhuravlev-mento/',
  },
  {
    name: 'Dima',
    role: 'Partner',
    emoji: '\u{1F9A6}',
    linkedin: 'https://www.linkedin.com/in/dmitry-golomidov/',
  },
  {
    name: 'Katie',
    role: 'Ops/Partner',
    emoji: '\u{1F451}',
    linkedin: 'https://www.linkedin.com/in/tatulova/',
  },
  { name: 'Vi', role: 'Ops', emoji: '\u{1F485}' },
  {
    name: 'Max',
    role: 'Tech',
    emoji: '\u{1F4BB}',
    linkedin: 'https://www.linkedin.com/in/maxim-kalpin/',
  },
  {
    name: 'Sofya',
    role: 'Invest',
    emoji: '\u{1F984}',
    linkedin: 'https://www.linkedin.com/in/sofya-bilich-1524a6229/',
  },
  { name: 'Margo', role: 'SMM', emoji: '\u{1F4F1}' },
  {
    name: 'Alina',
    role: 'EA/Ops',
    emoji: '\u{1F483}',
    linkedin: 'https://www.linkedin.com/in/alina-doronina/',
  },
  {
    name: 'Anastasia',
    role: 'EA/Ops',
    emoji: '\u{2728}',
    linkedin: 'https://www.linkedin.com/in/anastasiiaromaniuta/',
  },
]

export default function Focus() {
  return (
    <section className="section-focus" id="sectionFocus">
      <div className="focus-backdrop" aria-hidden="true" />
      <div className="focus-container">
        <h2 className="focus-heading" id="focusHeading">
          How we work
        </h2>
        <h3 className="focus-roster-heading">Who&apos;s behind the checks</h3>
        <div className="focus-grid">
          <div className="focus-roster">
            <ul className="focus-roster-list">
              {ROSTER.map((person) => (
                <li className="focus-roster-row" key={person.name}>
                  {/* Decorative: the name carries the meaning, so a reader that
                      announces "dog face Alex" is worse off than one that does
                      not. Rendered even when empty so the names stay aligned. */}
                  <span className="focus-roster-emoji" aria-hidden="true">
                    {person.emoji ?? ''}
                  </span>
                  <span className="focus-roster-body">
                    {person.linkedin ? (
                      <a
                        className="focus-roster-name focus-roster-link"
                        href={person.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${person.name} on LinkedIn`}
                      >
                        {person.name}
                      </a>
                    ) : (
                      <span className="focus-roster-name">{person.name}</span>
                    )}
                    {' — '}
                    <span className="focus-roster-role">{person.role}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="focus-list">
            {FOCUS_ITEMS.map((item, idx) => (
              <Fragment key={item.num}>
                <div
                  className={`focus-item${idx === 0 ? ' is-lead' : ''}${item.num === '#03' ? ' is-caption' : ''}`}
                >
                  <div className="focus-item-head">
                    <span className="focus-item-num">{item.num}</span>
                    <h2 className="focus-item-title">{item.title}</h2>
                  </div>
                  <p className="focus-item-text">{item.text}</p>
                </div>
                {idx < FOCUS_ITEMS.length - 1 && (
                  <div className="focus-divider" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
