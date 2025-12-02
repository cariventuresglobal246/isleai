import { Routes, Route } from 'react-router-dom';
import { TourProvider } from '@reactour/tour';
import { AuthProvider } from './AuthContext';
import Signup1 from './SignUp1.jsx';
import Baje from './Baje.jsx';
import BajeTour from './BajeTour.jsx';
import Login from './Login.jsx';
import Home from './Home.jsx';
import Dashboard from './Dashboard.jsx';
import HelpPage from './FAQ.jsx';
import Packages from './Packages.jsx';
import Profile from './Profile.jsx';
import ReportIssue from './ReportIssue.jsx';
import SavedChat from './SavedChat.jsx';
import Settings from './Settings.jsx';
import Workbench from './Workbench.jsx';
import Notifications from './Notifications.jsx';
import PaymentCard from './PaymentCard.jsx';
import Onboarding from './Onboarding.jsx';
import Paywall from './PaymentWall.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import Loadscreen from './Loadscreen.jsx';
import ChatBarTourism from './ChatBarTourism.jsx';

const tourSteps = [
  {
    selector: '.chat-header',
    content: 'This is the chat header where you can see the app title and navigation options.',
  },
  {
    selector: '.hamburger-button',
    content: 'Click here to open the navigation menu.',
  },
  {
    selector: '.barbados-flag',
    content: 'Select a Caribbean country to explore!',
  },
  {
    selector: '.input-section',
    content: 'Type your questions here to interact with the guide.',
  },
];

function App() {
  return (
    <AuthProvider>
      <TourProvider
        steps={tourSteps}
        afterOpen={() => console.log('Tour opened at', new Date().toISOString())}
        showSkipButton={false}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup1 />} />
          <Route path="/login" element={<Login />} />
          <Route path="/baje" element={<Baje />} />
          <Route path="/baje-tour" element={<BajeTour />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/saved-chats" element={<SavedChat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/payment-card" element={<PaymentCard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/paywall" element={<Paywall />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/loadscreen" element={<Loadscreen />} />
          <Route path="/chat-bar-tourism" element={<ChatBarTourism />} />
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </TourProvider>
    </AuthProvider>
  );
}

export default App;