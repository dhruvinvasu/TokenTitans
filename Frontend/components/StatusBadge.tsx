const REJECTED = ['SKILL_REJECTED', 'SALARY_REJECTED', 'TEST_FAILED', 'REJECTED']
const SUCCESS = ['SKILL_PASSED', 'SALARY_PASSED', 'JOINED', 'OFFER_SENT']
const WARNING = ['TEST_PENDING', 'UNDER_HR_REVIEW', 'INTERVIEW_SCHEDULED']

export default function StatusBadge({ status }: { status: string }) {
  let cls = 'badge'
  if (REJECTED.includes(status)) cls += ' badge-danger'
  else if (SUCCESS.includes(status)) cls += ' badge-success'
  else if (WARNING.includes(status)) cls += ' badge-warning'
  return <span className={cls}>{status.replace(/_/g, ' ')}</span>
}
