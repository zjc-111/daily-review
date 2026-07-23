import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { PhoneLoginGate } from "@/components/login-gate";
import HomePage from "@/pages/HomePage/HomePage";
import DailyPage from "@/pages/DailyPage/DailyPage";
import WeeklyPage from "@/pages/WeeklyPage/WeeklyPage";
import MonthlyPage from "@/pages/MonthlyPage/MonthlyPage";
import YearlyPage from "@/pages/YearlyPage/YearlyPage";
import RecordsPage from "@/pages/RecordsPage/RecordsPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <PhoneLoginGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/weekly" element={<WeeklyPage />} />
          <Route path="/monthly" element={<MonthlyPage />} />
          <Route path="/yearly" element={<YearlyPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </PhoneLoginGate>
  );
}
