import type { School } from './schools';

// Original school-themed ambient emblem, not a university logo or location indicator.
export function CampusEmblem({ school }: { school: School }) {
  return <div className="campus-emblem" aria-hidden="true">
    <div className="emblem-halo"/>
    <svg className="emblem-rings" viewBox="0 0 320 280" fill="none">
      <ellipse className="emblem-orbit outer" cx="160" cy="140" rx="146" ry="85"/>
      <ellipse className="emblem-orbit inner" cx="160" cy="140" rx="112" ry="112"/>
      <ellipse className="emblem-orbit sweep" cx="160" cy="140" rx="145" ry="85"/>
      <circle className="emblem-satellite" cx="302" cy="120" r="3"/>
      <path className="emblem-ticks" d="M160 18v8m0 228v8M8 140h8m288 0h8"/>
    </svg>
    <div className="emblem-core"><span>{school.short}</span><small>CAMPUS EDITION</small></div>
    <div className="emblem-caption"><span/>{school.town}<small>IN GOOD COMPANY</small></div>
  </div>;
}
