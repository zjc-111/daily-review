import WelcomeSection from "./components/welcome-section";
import StreakSection from "./components/streak-section";
import HistoryTodaySection from "./components/history-today-section";
import { QuickActionsSection } from "./components/quick-actions-section";
import RecentReviewsSection from "./components/recent-reviews-section";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <WelcomeSection />
      <StreakSection />
      <HistoryTodaySection />
      <QuickActionsSection />
      <RecentReviewsSection />
    </div>
  );
}
