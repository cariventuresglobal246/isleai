// tabs/SurveyTab.jsx
export default function SurveyTab({ S, onOpenSurvey }) {
  return (
    <div style={S.card}>
      <h2 style={S.h2}>End-of-Trip Survey</h2>
      <button style={S.btnPrimary} onClick={onOpenSurvey}>
        Open Survey
      </button>
    </div>
  );
}
