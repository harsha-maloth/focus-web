/** Plain-words comparison of this week's focus time with last week's. */
export function compareWeeks(week: number, last: number): string {
  if (week === 0 && last === 0) return 'no focus time yet this week or last'
  if (last === 0) return 'nothing recorded last week'
  if (week === last) return 'same as last week'
  const pct = Math.round((Math.abs(week - last) / last) * 100)
  return week > last ? `up ${pct}% on last week` : `down ${pct}% on last week`
}

export function milestoneLabel(type: string, value: number): string {
  switch (type) {
    case 'sessions':
      return value === 1 ? 'First session completed' : `${value} sessions completed`
    case 'hours':
      return `${value} ${value === 1 ? 'hour' : 'hours'} focused`
    case 'streak':
      return `${value}-day streak`
    default:
      return `${type} ${value}`
  }
}
