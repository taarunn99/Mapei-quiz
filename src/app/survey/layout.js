export const metadata = {
  title: 'Colleague Feedback Survey · LapizBlue HR',
  description: 'Digital Colleague Feedback Survey for LapizBlue staff',
}
export const viewport = { themeColor: '#FBF6F9' }

export default function SurveyLayout({ children }) {
  return <div className="hr">{children}</div>
}
